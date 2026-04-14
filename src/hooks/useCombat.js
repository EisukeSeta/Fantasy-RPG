import { useState, useCallback, useEffect } from 'react';
import { calculateHitAndDamage, SPELLS } from '../logic/combat';
import { getRequiredExp } from '../logic/growth';
import SoundEngine from '../utils/SoundEngine';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT } from '../data/mapData';
import { BOSS_POS, GAME_SETTINGS } from '../constants/gameData';
import { calculateSpellEffect } from '../logic/spells';
import itemsData from '../data/Items.json';
import { useGame } from './useGame';
import { applyStatusEffects, checkActionAbility } from '../logic/status';
import scenarioData from '../data/Scenario.json';
import balanceData from '../data/Balance.json';

/**
 * 戦闘ロジックを管理するカスタムフック
 */
export const useCombat = () => {
  const {
    gameState, setGameState,
    party, setParty,
    enemy, setEnemy,
    setBossDefeated,
    setPlayerState,
    setMapData,
    activeDialog, setActiveDialog,
    combatInterjection, setCombatInterjection,
    triggerVisualEffect,
    setMessages
  } = useGame();

  const addMessage = useCallback((msg, type = 'normal') => {
    setMessages(prev => [...prev, { text: msg, type }].slice(-GAME_SETTINGS.LOG_CAPACITY));
  }, [setMessages]);

  const forceLoot = false; // 必要に応じて Context へ移行
  const [activeBattler, setActiveBattler] = useState(0);
  const [battleTurn, setBattleTurn] = useState(0);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const [showSpells, setShowSpells] = useState(null);

  const handleLevelUp = useCallback((member) => {
    let m = { ...member };
    while (m.lv < balanceData.experience.maxLevel && m.exp >= getRequiredExp(m.lv + 1)) {
      m.lv += 1; 
      m.maxHp += balanceData.partyBase.hpPerLevel; 
      m.maxMp += balanceData.partyBase.mpPerLevel;
      m.hp = m.maxHp; 
      m.mp = m.maxMp;
      addMessage(`${m.name}${scenarioData.ui.levelUp.replace('%LV%', m.lv)}`, 'level_up');
    }
    return m;
  }, [addMessage]);

  const endBattle = useCallback((won) => {
    if (won) {
        // 戦闘終了時の浄化：毒は自然治癒するが、麻痺は残る
        setParty(p => p.map(m => ({
          ...m,
          statusEffects: m.statusEffects ? m.statusEffects.filter(eff => eff !== 'POISON') : []
        })));
        
        setShowVictory(true);
        addMessage(`${enemy.name}${scenarioData.battle.defeat}`, 'level_up');
        
        if (enemy.isBoss) { 
          setBossDefeated(true);
          setTimeout(() => setActiveDialog({ 
            title: '怪異調伏', 
            pages: [scenarioData.events.bossDefeated], 
            currentPage: 0,
            isStory: true,
            bgImage: enemy.image // 戦っていたボスの姿を背景に残す
          }), GAME_SETTINGS.DELAYS.VICTORY_BOSS);
          // ボス討伐成功時に階段（出口）を設置
          setMapData(prev => {
            const next = [...prev.map(row => [...row])];
            if (next[BOSS_POS.y] && next[BOSS_POS.y][BOSS_POS.x]) {
              next[BOSS_POS.y][BOSS_POS.x].isExit = true;
              next[BOSS_POS.y][BOSS_POS.x].visited = true;
            }
            return next;
          });
        }
        
        // --- 武勲のドリップロジック ---
        let droppedItem = null;
        if (enemy.drops && enemy.drops.length > 0) {
          for (const drop of enemy.drops) {
            if (forceLoot || Math.random() < drop.rate) {
              droppedItem = itemsData.find(it => it.id === drop.itemId);
              if (droppedItem) break;
            }
          }
        }

        setParty(p => p.map((m, idx) => {
          let updated = handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * balanceData.rates.expShare) });
          
          // アイテム適用 (生存しているランダムな一人が入手)
          const liveIndices = p.map((char, i) => char.hp > 0 ? i : -1).filter(i => i !== -1);
          const luckyIdx = liveIndices[Math.floor(Math.random() * liveIndices.length)];
          
          if (droppedItem && idx === luckyIdx) {
             // 既に持っていないか確認 (勲章なので重複なしとする)
             if (!updated.items) updated.items = [];
             if (!updated.items.includes(droppedItem.id)) {
               updated.items.push(droppedItem.id);
               addMessage(`【武勲】${m.name}は『${droppedItem.name}』を授かった！`, 'level_up');
               addMessage(`《${droppedItem.flavor}》`, 'event');
               // ステータス反映
               if (droppedItem.effect.atk) { updated.minDmg += droppedItem.effect.atk; updated.maxDmg += droppedItem.effect.atk; }
               if (droppedItem.effect.ac) { updated.ac += droppedItem.effect.ac; }
               // mgk は暫定的に術ダメージ全体へのゲインとして扱う（将来的に拡張）
             }
          }
          return updated;
        }));
        
        // --- 武勲の検分（アイテム獲得独白） ---
        if (droppedItem) {
          const luckyOne = party.find(m => m.hp > 0) || party[0];
          const speakerKey = luckyOne.image.split('.')[0].replace(/-/g, '_');
          const quotes = scenarioData.events.lootQuotes[speakerKey];
          
          if (quotes) {
            setCombatInterjection({
              member: luckyOne,
              quotes: quotes,
              currentPage: 0,
              onClose: () => {
                setShowVictory(true);
                setTimeout(() => {
                  setGameState('EXPLORING'); 
                  setEnemy(null); 
                  setShowVictory(false);
                }, GAME_SETTINGS.DELAYS.VICTORY_NORMAL);
              }
            });
            return enemy.isBoss;
          }
        }

        setTimeout(() => {
          setGameState('EXPLORING'); 
          setEnemy(null); 
          setShowVictory(false);
        }, GAME_SETTINGS.DELAYS.VICTORY_NORMAL);

        return enemy.isBoss;
    } else {
        setGameState('DEAD'); 
        SoundEngine.transitionTo('GAMEOVER');
        setActiveDialog({ 
          title: "【終焉】", 
          pages: [scenarioData.events.gameOver], 
          currentPage: 0, 
          isStory: true,
          showChoices: true,
          labelConfirm: "御意（復活）",
          labelCancel: "虚無に還る",
          onConfirm: () => {
            // 転生ダイアログへ移行
            setActiveDialog({
              title: "【反魂の儀】", 
              pages: [scenarioData.ui.resurrection, "生命の燈火は微か……。再び、現世（うつしよ）へ。"], 
              currentPage: 0,
              isStory: true,
              onConfirm: () => {
                setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
                setParty(p => p.map(m => ({ ...m, hp: 1, mp: 1, exp: getRequiredExp(m.lv), status: '平安' })));
                addMessage(scenarioData.ui.resurrection, 'heal'); 
                setGameState('EXPLORING');
                setActiveDialog(null); // ここで初めて閉じる
              }
            });
          },
          onCancel: () => {
            setActiveDialog({
              ...scenarioData.events.badEnding,
              currentPage: 0,
              isStory: true,
              bgImage: "src/images/闇夜の平安京.png", // 都が闇に沈むイメージとして再利用
              onConfirm: () => { 
                setActiveDialog(null); 
                setGameState('GAMEOVER'); 
                SoundEngine.stop(); 
              }
            });
          }
        });
    }
    setActiveBattler(0); 
    setBattleTurn(0); 
    setShowSpells(null);
  }, [enemy, addMessage, handleLevelUp, setGameState, setEnemy, setParty, setActiveDialog, setBossDefeated, setPlayerState, setMapData, setCombatInterjection, party, forceLoot]);

  // --- 実効能力値の計算（パッシブ効果反映：勲章の霊力） ---
  const getEffectiveStats = useCallback((member) => {
    let stats = { ...member };
    if (member.items) {
      member.items.forEach(itemId => {
        const item = itemsData.find(it => it.id === itemId);
        if (item && item.effect) {
          if (item.effect.atk) {
            stats.minDmg += item.effect.atk;
            stats.maxDmg += item.effect.atk;
          }
          if (item.effect.ac) stats.ac += item.effect.ac;
          if (item.effect.mgk) stats.mgk = (stats.mgk || 0) + item.effect.mgk;
        }
      });
    }
    return stats;
  }, []);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    
    // 業（特殊状態）：継続ダメージの処理
    const poisonRes = applyStatusEffects(party[activeBattler]);
    if (poisonRes.messages.length > 0) {
      poisonRes.messages.forEach(msg => addMessage(msg, 'damage_party'));
      setParty(p => p.map((m, i) => i === activeBattler ? poisonRes.updatedActor : m));
      triggerVisualEffect(`party_${activeBattler}`, `-${Math.abs(party[activeBattler].hp - poisonRes.updatedActor.hp)}`, 'damage');
    }
    
    // 更新されたステートを反映した actor で以降の処理を行う
    const currentActor = poisonRes.updatedActor;
    if (currentActor.hp <= 0) {
       // 毒で討死した場合、行動不能
       setBattleTurn(prev => prev + 1);
       return;
    }

    // 業（特殊状態）：行動判定
    const ability = checkActionAbility(currentActor);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      // 行動不能時は次の者の番へ（または敵の番へ）
      const nextIdx = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
      if (nextIdx !== -1) {
        setActiveBattler(nextIdx);
        setBattleTurn(prev => prev + 1);
      } else {
        // 敵の反撃ターンのトリガー
        setBattleTurn(prev => prev + 1);
      }
      return;
    }
    const attacker = getEffectiveStats(currentActor);
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let nEh = enemy.hp;

    if (res.hit) { 
      addMessage(`${attacker.name}${scenarioData.battle.attack} ${res.damage}${scenarioData.battle.damage}`); 
      nEh -= res.damage; 
      triggerVisualEffect('enemy', `-${res.damage}`, 'damage', res.critical ? 'heavy' : 'normal');
    } else {
      addMessage(`${attacker.name}${scenarioData.battle.miss}`);
    }
    
    if (nEh <= 0) { 
      endBattle(true); 
      return; 
    }
    setEnemy({...enemy, hp: nEh});
    
    const nextIdx = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextIdx !== -1) {
      setActiveBattler(nextIdx);
      setBattleTurn(prev => prev + 1);
    } else {
      // 敵の反撃ターン
      setTimeout(() => {
        const alive = party.filter(m => m.hp > 0);
        if (alive.length === 0) return;

        // --- 敵の行動判定（業） ---
        const ability = checkActionAbility(enemy);
        if (!ability.canAction) {
            addMessage(ability.message);
            setBattleTurn(prev => prev + 1);
            return;
        }
        
        const baseTarget = alive[Math.floor(Math.random() * alive.length)];
        const target = getEffectiveStats(baseTarget);
        const targetIdx = party.findIndex(m => m.name === target.name);
        const eRes = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, target.ac);
        
        if (eRes.hit) {
          addMessage(`${enemy.name}${scenarioData.battle.counter} ${target.name}${scenarioData.battle.wound.replace('%DMG%', eRes.damage)}`, 'damage_party');
          const nextHP = Math.max(0, target.hp - eRes.damage);
          
          // --- 状態異常の付与 ---
          let nextStatusEffects = target.statusEffects || [];
          if (enemy.statusEffect && !nextStatusEffects.includes(enemy.statusEffect)) {
            nextStatusEffects = [...nextStatusEffects, enemy.statusEffect];
            addMessage(`${target.name}は${enemy.statusEffect === 'POISON' ? '毒' : '麻痺'}に侵された！`, 'damage_party');
          }

          setParty(p => p.map(m => m.name === target.name ? { 
            ...m, 
            hp: nextHP, 
            status: nextHP === 0 ? '討死' : '平安',
            statusEffects: nextHP === 0 ? [] : nextStatusEffects // 討死時は解除
          } : m));
          triggerVisualEffect(`party_${targetIdx}`, `-${eRes.damage}`, 'damage');
          
          // --- 散り際の余韻（合戦専用：デス・インタージェクション） ---
          if (nextHP === 0) {
            let speakerKey = target.image.split('.')[0];
            speakerKey = speakerKey.replace(/-/g, '_');
            
            const quotes = scenarioData.events.deathQuotes[speakerKey];
            if (quotes) {
              setCombatInterjection({
                member: target,
                quotes: quotes,
                currentPage: 0,
                onClose: () => {
                  // 独白終了後、もしオートバトル中なら次のターンへ進むきっかけを作る
                  if (isAutoBattle) setBattleTurn(prev => prev + 1);
                }
              });
            }
          }

          if (party.every(m => (m.name === target.name ? nextHP : m.hp) <= 0)) {
            endBattle(false);
          }
        } else {
          addMessage(`${target.name}${scenarioData.battle.evade}`);
        }
        
    setActiveBattler(party.findIndex(m => m.hp > 0));
        setBattleTurn(prev => prev + 1);
      }, GAME_SETTINGS.DELAYS.ENEMY_TURN);
    }
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle, triggerVisualEffect, setEnemy, setParty, isAutoBattle, setCombatInterjection, getEffectiveStats, setActiveBattler, setBattleTurn]);

  const castSpell = useCallback((spell) => {
    if (gameState !== 'BATTLE' || !enemy) return;

    // 業（特殊状態）：継続ダメージの処理
    const poisonRes = applyStatusEffects(party[activeBattler]);
    if (poisonRes.messages.length > 0) {
      poisonRes.messages.forEach(msg => addMessage(msg, 'damage_party'));
      setParty(p => p.map((m, i) => i === activeBattler ? poisonRes.updatedActor : m));
      triggerVisualEffect(`party_${activeBattler}`, `-${Math.abs(party[activeBattler].hp - poisonRes.updatedActor.hp)}`, 'damage');
    }
    
    const currentActor = poisonRes.updatedActor;
    if (currentActor.hp <= 0) {
       setBattleTurn(prev => prev + 1);
       return;
    }

    // 業（特殊状態）による行動判定
    const ability = checkActionAbility(currentActor);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      // 行動不能時はターンのみ進める
      setBattleTurn(prev => prev + 1);
      return;
    }

    const attacker = getEffectiveStats(currentActor);
    if (attacker.mp < spell.mp) { addMessage(scenarioData.battle.noMana); return; }
    
    let nextP = [...party]; 
    nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...enemy };

    // 術名の言霊を放つ
    triggerVisualEffect('enemy', spell.name, 'action');
    
    // 魔道の理（spells.js）を用いて効果を算出
    const effectRes = calculateSpellEffect(spell, attacker);
    
    if (spell.type === 'ATTACK') {
      const dmg = effectRes.value;
      addMessage(`${spell.name}${scenarioData.battle.spellAttack.replace('%ENEMY%', enemy.name).replace('%DMG%', dmg)}`); 
      nextE.hp -= dmg;
      triggerVisualEffect('enemy', `-${dmg}`, 'damage');
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const heal = effectRes.value;
      target.hp = Math.min(target.maxHp, target.hp + heal);
      addMessage(`${spell.name}${scenarioData.battle.spellHeal.replace('%TARGET%', target.name).replace('%HEAL%', heal)}`, 'heal');
      triggerVisualEffect(`party_${nextP.findIndex(m => m.name === target.name)}`, `+${heal}`, 'heal');
    } else if (spell.type === 'CURE') {
      // 浄化の理：パーティ全員の状態異常を消し去る
      nextP = nextP.map(m => ({ ...m, statusEffects: [] }));
      addMessage(`${spell.name}：真言の光がパーティ全員の穢れを浄化した！`, 'level_up');
      triggerVisualEffect('party_all', '浄化', 'heal');
    } else if (spell.type === 'STATUS' && effectRes.statusEffect) {
      // 付与の理：敵に状態異常を与える
      if (!nextE.statusEffects) nextE.statusEffects = [];
      if (!nextE.statusEffects.includes(effectRes.statusEffect)) {
          nextE.statusEffects.push(effectRes.statusEffect);
          addMessage(`${enemy.name}を${effectRes.statusEffect === 'PARALYZED' ? '麻痺' : '毒'}に陥れた！`, 'level_up');
      }
    }
    
    setParty(nextP); 
    setEnemy(nextE); 
    setShowSpells(null);
    
    if (nextE.hp <= 0) {
      endBattle(true);
    } else {
      const nextIdx = nextP.findIndex((m, i) => i > activeBattler && m.hp > 0);
      if (nextIdx !== -1) {
        setActiveBattler(nextIdx);
        setBattleTurn(prev => prev + 1);
      } else {
        handleFight();
      }
    }
  }, [party, activeBattler, enemy, addMessage, endBattle, gameState, handleFight, triggerVisualEffect, setParty, setEnemy, getEffectiveStats]);

  // オートバトル・ループ
  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemy && !activeDialog && !combatInterjection) {
      const a = party[activeBattler];
      if (!a || a.hp <= 0) {
        const nextIdx = party.findIndex(m => m.hp > 0);
        if (nextIdx !== -1) setTimeout(() => setActiveBattler(nextIdx), 0);
        return;
      }
      const t = setTimeout(() => {
        const spells = (SPELLS[a.jobKey] || []).filter(s => s.lv <= a.lv && a.mp >= s.mp);
        
        // --- 救済者（NISOU）の高度な判断 ---
        const statusVictim = party.find(m => m.hp > 0 && m.statusEffects && m.statusEffects.length > 0);
        if (a.jobKey === 'NISOU' && statusVictim) {
           const cureSpell = spells.find(s => s.type === 'CURE');
           if (cureSpell) {
             castSpell(cureSpell);
             return;
           }
        }

        const isStrong = enemy.isBoss || enemy.hp > 50;
        if (isStrong && spells.length > 0) castSpell(spells[spells.length - 1]);
        else handleFight();
      }, GAME_SETTINGS.DELAYS.AUTO_BATTLE);
      return () => clearTimeout(t);
    }
  }, [isAutoBattle, gameState, enemy, party, activeBattler, handleFight, castSpell, battleTurn, activeDialog, combatInterjection]);

  // オート戦闘の最後の一人修正のために battleTurn を監視
  useEffect(() => {
    if (gameState === 'BATTLE' && isAutoBattle && enemy) {
      // ターンが進んだ際、もし全員行動済みなら自走させる
    }
  }, [battleTurn, isAutoBattle, gameState, enemy]);

  return {
    activeBattler,
    setActiveBattler,
    battleTurn,
    setBattleTurn,
    isAutoBattle,
    setIsAutoBattle,
    showVictory,
    setShowVictory,
    showSpells,
    setShowSpells,
    handleFight,
    castSpell,
    endBattle
  };
};
