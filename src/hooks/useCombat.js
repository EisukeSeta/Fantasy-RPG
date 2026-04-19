import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateHitAndDamage, SPELLS, getEffectiveStats, isValidAction } from '../logic/combat';
import { getRequiredExp } from '../logic/growth';
import SoundEngine from '../utils/SoundEngine';
import { DIRECTIONS } from '../data/mapData';
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
export const useCombat = (onFirstDefeat, forceHit) => {
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
    setMessages,
    defeatedEnemies, setDefeatedEnemies,
    encounteredEnemies, setEncounteredEnemies
  } = useGame();

  const addMessage = useCallback((msg, type = 'normal') => {
    setMessages(prev => [...prev, { text: msg, type }].slice(-GAME_SETTINGS.LOG_CAPACITY));
  }, [setMessages]);

  const forceLoot = false; 
  const [activeBattler, setActiveBattler] = useState(0);
  const [battleTurn, setBattleTurn] = useState(0);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const [showSpells, setShowSpells] = useState(null);
  const [yugenEnemy, setYugenEnemy] = useState(null);
  const lastActionTurnRef = useRef(-1);
  const lastProcessedTurnRef = useRef(-1); // ターン処理予約用

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

  const finalizeBattle = useCallback(() => {
    setGameState('EXPLORING'); 
    setEnemy(null); 
    setShowVictory(false);
    setCombatInterjection(null);
    setYugenEnemy(null);
    lastActionTurnRef.current = -1;
    lastProcessedTurnRef.current = -1;
  }, [setGameState, setEnemy, setCombatInterjection]);

  const endBattle = useCallback((won) => {
    const isNewDefeat = enemy && enemy.id && !defeatedEnemies.includes(enemy.id);
    
    const showLoreIfNew = () => {
      if (isNewDefeat) {
        setYugenEnemy(enemy);
      } else {
        finalizeBattle();
      }
    };

    if (won) {
        // 遭遇済フラグも確実に立てる（図鑑の名前表示に必要）
        if (!encounteredEnemies.includes(enemy.id)) {
          setEncounteredEnemies(prev => [...prev, enemy.id]);
        }
        if (isNewDefeat) {
          setDefeatedEnemies(prev => [...prev, enemy.id]);
          addMessage(`……怪異【${enemy.name}】の正体が都の図録に刻まれた……`, 'event');
          if (onFirstDefeat) onFirstDefeat(enemy);
        }

        setShowVictory(true);
        addMessage(`${enemy.name}${scenarioData.battle.defeat}`, 'level_up');

        if (enemy.isBoss) { 
          setBossDefeated(true);
          setMapData(prev => {
            const next = [...prev.map(row => [...row])];
            if (next[BOSS_POS.y] && next[BOSS_POS.y][BOSS_POS.x]) {
              next[BOSS_POS.y][BOSS_POS.x].isExit = true;
              next[BOSS_POS.y][BOSS_POS.x].visited = true;
            }
            return next;
          });
        }
        
        const potentialMedals = (enemy.drops || []).map(d => itemsData.find(it => it.id === d.itemId)).filter(Boolean);
        let anyoneResonated = false;

        setParty(p => p.map((m, idx) => {
          let updated = handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * balanceData.rates.expShare) });
          if (m.hp > 0) {
            potentialMedals.forEach(medal => {
              const resonanceRate = 0.3; 
              const isLastChance = (idx === p.length - 1 && !anyoneResonated);
              if (forceLoot || Math.random() < resonanceRate || isLastChance) {
                anyoneResonated = true;
                if (!updated.medals) updated.medals = {};
                const currentRank = updated.medals[medal.id] || 0;
                if (currentRank < 10) {
                  const nextRank = currentRank + 1;
                  updated.medals[medal.id] = nextRank;
                  addMessage(`【武勲】${m.name}は『${medal.name}』の霊力を深めた！(Rank ${nextRank})`, 'level_up');
                  if (currentRank === 0) {
                    if (!updated.items) updated.items = [];
                    updated.items.push(medal.id);
                    addMessage(`《${medal.flavor}》`, 'event');
                  }
                }
              }
            });
          }
          return updated;
        }));
        
        if (anyoneResonated) {
          const luckyOne = party.find(m => m.hp > 0) || party[0];
          const speakerKey = luckyOne.image.split('.')[0].replace(/-/g, '_');
          const quotes = scenarioData.events.lootQuotes[speakerKey];
          if (quotes) {
            setCombatInterjection({
              member: luckyOne,
              quotes: quotes,
              currentPage: 0,
              onClose: () => {
                setCombatInterjection(null);
                setTimeout(showLoreIfNew, 500);
              }
            });
            return enemy.isBoss;
          }
        }
        setTimeout(showLoreIfNew, GAME_SETTINGS.DELAYS.VICTORY_NORMAL);
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
            setActiveDialog({
              title: "【反魂の儀】", 
              pages: [scenarioData.ui.resurrection, "生命の燈火は微か……。再び、現世（うつしよ）へ。"], 
              currentPage: 0,
              isStory: true,
              onConfirm: () => {
                setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
                setParty(p => p.map(m => ({ ...m, hp: 1, mp: 1, exp: getRequiredExp(m.lv), status: '平安', statusEffects: [] })));
                addMessage(scenarioData.ui.resurrection, 'heal'); 
                setGameState('EXPLORING');
                setActiveDialog(null);
              }
            });
          },
          onCancel: () => {
            setActiveDialog({
              ...scenarioData.events.badEnding,
              currentPage: 0,
              isStory: true,
              bgImage: "src/images/闇夜の平安京.png",
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
    lastActionTurnRef.current = -1;     // 戦闘終了時に Ref をリセット（次の戦闘でのフリーズ防止）
    lastProcessedTurnRef.current = -1;  // 戦闘終了時に Ref をリセット（次の戦闘でのフリーズ防止）
  }, [enemy, addMessage, handleLevelUp, setGameState, setEnemy, setParty, setActiveDialog, setBossDefeated, setPlayerState, setMapData, setCombatInterjection, party, forceLoot, encounteredEnemies, defeatedEnemies, setEncounteredEnemies, setDefeatedEnemies, onFirstDefeat, finalizeBattle, setActiveBattler, setBattleTurn]);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy || showVictory) return;
    if (!isValidAction(lastActionTurnRef.current, battleTurn)) return;
    lastActionTurnRef.current = battleTurn; // このターンの行動を記録（二重実行防止）
    
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

    const ability = checkActionAbility(currentActor);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      setBattleTurn(prev => prev + 1);
      return;
    }

    const attacker = getEffectiveStats(currentActor, itemsData);
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    if (forceHit) res.hit = true; 
    
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
      setTimeout(() => {
        const alive = party.filter(m => m.hp > 0);
        if (alive.length === 0) return;
        const abilityE = checkActionAbility(enemy);
        if (!abilityE.canAction) {
            addMessage(abilityE.message);
            setBattleTurn(prev => prev + 1);
            return;
        }
        const baseTarget = alive[Math.floor(Math.random() * alive.length)];
        const target = getEffectiveStats(baseTarget, itemsData);
        const targetIdx = party.findIndex(m => m.name === target.name);
        const eRes = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, target.ac);
        
        if (eRes.hit) {
          addMessage(`${enemy.name}${scenarioData.battle.counter} ${target.name}${scenarioData.battle.wound.replace('%DMG%', eRes.damage)}`, 'damage_party');
          const nextHP = Math.max(0, target.hp - eRes.damage);
          let nextStatusEffects = target.statusEffects || [];
          if (enemy.statusEffect && !nextStatusEffects.includes(enemy.statusEffect)) {
            nextStatusEffects = [...nextStatusEffects, enemy.statusEffect];
            addMessage(`${target.name}は${enemy.statusEffect === 'POISON' ? '毒' : '麻痺'}に侵された！`, 'damage_party');
          }
          setParty(p => {
            const latestParty = p.map(m => m.name === target.name ? { 
              ...m, 
              hp: nextHP, 
              status: nextHP === 0 ? '討死' : '平安',
              statusEffects: nextHP === 0 ? [] : nextStatusEffects
            } : m);
            
            // 演出の予約
            if (nextHP === 0) {
              let speakerKey = target.image.split('.')[0].replace(/-/g, '_');
              const quotes = scenarioData.events.deathQuotes[speakerKey];
              if (quotes) {
                setCombatInterjection({
                  member: target,
                  quotes: quotes,
                  currentPage: 0,
                  onClose: () => { setBattleTurn(prev => prev + 1); }
                });
              } else {
                setBattleTurn(prev => prev + 1);
              }
            } else {
              setBattleTurn(prev => prev + 1);
            }

            // 全滅判定（最新の latestParty を使用）
            if (latestParty.every(m => m.hp <= 0)) {
               endBattle(false);
            }
            
            return latestParty;
          });
          triggerVisualEffect(`party_${targetIdx}`, `-${eRes.damage}`, 'damage');
        } else {
          addMessage(`${target.name}${scenarioData.battle.evade}`);
          setBattleTurn(prev => prev + 1);
        }
        // 次の行動者は、useEffect の battleTurn 更新によって自動的に再計算される
      }, GAME_SETTINGS.DELAYS.ENEMY_TURN);
    }
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle, triggerVisualEffect, setEnemy, setParty, setCombatInterjection, setActiveBattler, setBattleTurn, forceHit, showVictory, battleTurn]);

  const castSpell = useCallback((spell) => {
    if (gameState !== 'BATTLE' || !enemy || showVictory) return;
    if (!isValidAction(lastActionTurnRef.current, battleTurn)) return;
    lastActionTurnRef.current = battleTurn; 

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
    const ability = checkActionAbility(currentActor);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      setBattleTurn(prev => prev + 1);
      return;
    }

    const attacker = getEffectiveStats(currentActor, itemsData);
    if (attacker.mp < spell.mp) { 
      addMessage(scenarioData.battle.noMana); 
      return; 
    }
    
    let nextP = [...party]; 
    nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...enemy };
    triggerVisualEffect('enemy', spell.name, 'action');
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
      nextP = nextP.map(m => ({ ...m, statusEffects: [] }));
      addMessage(`${spell.name}：真言の光がパーティ全員の穢れを浄化した！`, 'level_up');
      triggerVisualEffect('party_all', '浄化', 'heal');
    } else if (spell.type === 'STATUS' && effectRes.statusEffect) {
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
      // 適切な次の行動者を決定（生存者のみを対象）
      const nextIdx = nextP.findIndex((m, i) => i > activeBattler && m.hp > 0);
      if (nextIdx !== -1) {
        setActiveBattler(nextIdx);
        setBattleTurn(prev => prev + 1);
      } else {
        // 全員行動済み → 絶縁を一時解除し敵ターンへ
        lastActionTurnRef.current = -1;
        handleFight();
      }
    }
  }, [party, activeBattler, enemy, addMessage, endBattle, gameState, handleFight, triggerVisualEffect, setParty, setEnemy, setShowSpells, battleTurn, showVictory]);

  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemy && !showVictory && !activeDialog && !combatInterjection) {
      if (lastProcessedTurnRef.current === battleTurn) return;
      
      const a = party[activeBattler];
      if (!a || a.hp <= 0) {
        // 現在の行動者が討死している場合は、速やかに次の生存者へ手番を譲る
        const nextIdx = party.findIndex(m => m.hp > 0);
        if (nextIdx !== -1) {
          setActiveBattler(nextIdx);
          setBattleTurn(prev => prev + 1);
        }
        return;
      }

      lastProcessedTurnRef.current = battleTurn;

      const t = setTimeout(() => {
        if (gameState !== 'BATTLE' || showVictory || activeDialog || combatInterjection) return;
        
        const spells = (SPELLS[a.jobKey] || []).filter(s => s.lv <= a.lv && a.mp >= s.mp);
        const statusVictim = party.find(m => m.hp > 0 && m.statusEffects && m.statusEffects.length > 0);
        
        if (a.jobKey === 'NISOU' && statusVictim) {
           const cureSpell = spells.find(s => s.type === 'CURE');
           if (cureSpell) { castSpell(cureSpell); return; }
        }
        
        const isStrong = enemy.isBoss || enemy.hp > 50;
        if (isStrong && spells.length > 0) castSpell(spells[spells.length - 1]);
        else handleFight();
      }, GAME_SETTINGS.DELAYS.AUTO_BATTLE);
      return () => clearTimeout(t);
    }
  }, [isAutoBattle, gameState, enemy, activeBattler, battleTurn, showVictory, activeDialog, combatInterjection, handleFight, castSpell]);

  return {
    activeBattler, setActiveBattler, battleTurn, setBattleTurn, isAutoBattle, setIsAutoBattle,
    showVictory, setShowVictory, showSpells, setShowSpells, handleFight, castSpell, endBattle,
    yugenEnemy, setYugenEnemy, finalizeBattle
  };
};
