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
import { 
  generatePhysicalAttackCommands, 
  generateEnemyAttackCommands, 
  generateStatusEffectCommands,
  generateSpellAttackCommands,
  generateSpellHealCommands,
  generateSpellCureCommands,
  generateSpellStatusCommands
} from '../logic/combatResult';
import { Logger } from '../utils/logger';

/**
 * 戦闘ロジックを管理するカスタムフック
 */
export const useCombat = (onFirstDefeat, forceHit) => {
  const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';
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

  const executeCommands = useCallback((commands) => {
    commands.forEach(cmd => {
      try {
        switch (cmd.type) {
          case 'MESSAGE':
            addMessage(cmd.value, cmd.messageType || 'normal');
            break;
          case 'VFX':
            triggerVisualEffect(cmd.target, cmd.value, cmd.vfxType, cmd.variation || 'normal');
            break;
          case 'SOUND':
            SoundEngine.play(cmd.value);
            break;
          default:
            break;
        }
      } catch (e) {
        Logger.warn('System', 'Command Execution Error', { error: e.message, command: cmd });
      }
    });
  }, [addMessage, triggerVisualEffect]);

  // デバッグの天啓：写本の公開
  useEffect(() => {
    if (isDebug) {
      window.downloadRashomonLogs = () => Logger.downloadLogs();
      Logger.info('System', 'Debug Commands Registered: window.downloadRashomonLogs()');
    }
  }, []);

  const forceLoot = false; 
  const [activeBattler, setActiveBattler] = useState(0);
  const [battleTurn, setBattleTurn] = useState(0);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showVictory, setShowVictory] = useState(false);
  const [showSpells, setShowSpells] = useState(null);
  const [yugenEnemy, setYugenEnemy] = useState(null);
  const lastActionTurnRef = useRef(-1);
  const lastProcessedTurnRef = useRef(-1); // ターン処理予約用

  // アルゴリズムの真髄：最新の状態を常に Ref で追跡し、クロージャ問題を撲滅する
  const partyRef = useRef(party);
  const enemyRef = useRef(enemy);
  useEffect(() => { partyRef.current = party; }, [party]);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);

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
    Logger.info('Combat', 'Finalizing battle state');
    setGameState('EXPLORING'); 
    setEnemy(null); 
    setShowVictory(false);
    setCombatInterjection(null);
    setYugenEnemy(null);
    lastActionTurnRef.current = -1;
    lastProcessedTurnRef.current = -1;
  }, [setGameState, setEnemy, setCombatInterjection]);

  const endBattle = useCallback((won) => {
    const curEnemy = enemyRef.current;
    if (!curEnemy) return;
    
    Logger.info('Combat', 'Battle Ending', { won, enemy: curEnemy.name });
    const isNewDefeat = curEnemy.id && !defeatedEnemies.includes(curEnemy.id);
    
    const showLoreIfNew = () => {
      if (isNewDefeat) {
        setYugenEnemy(curEnemy);
      } else {
        finalizeBattle();
      }
    };

    if (won) {
        if (!encounteredEnemies.includes(curEnemy.id)) {
          setEncounteredEnemies(prev => [...prev, curEnemy.id]);
        }
        if (isNewDefeat) {
          setDefeatedEnemies(prev => [...prev, curEnemy.id]);
          addMessage(`……怪異【${curEnemy.name}】の正体が都の図録に刻まれた……`, 'event');
          if (onFirstDefeat) onFirstDefeat(curEnemy);
        }

        setShowVictory(true);
        addMessage(`${curEnemy.name}${scenarioData.battle.defeat}`, 'level_up');

        if (curEnemy.isBoss) { 
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
        
        const potentialMedals = (curEnemy.drops || []).map(d => itemsData.find(it => it.id === d.itemId)).filter(Boolean);
        let anyoneResonated = false;

        setParty(p => p.map((m, idx) => {
          let updated = handleLevelUp({ ...m, exp: m.exp + Math.floor(curEnemy.exp * balanceData.rates.expShare) });
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
          const alive = partyRef.current.filter(m => m.hp > 0);
          const luckyOne = alive.length > 0 ? alive[0] : partyRef.current[0];
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
            return curEnemy.isBoss;
          }
        }
        setTimeout(showLoreIfNew, GAME_SETTINGS.DELAYS.VICTORY_NORMAL);
        return curEnemy.isBoss;
    } else {
        Logger.warn('Combat', 'Party Defeated');
        setGameState('DEAD'); 
        SoundEngine.transitionTo('GAMEOVER');
        setActiveDialog({ 
          title: "【終焉】", 
          pages: scenarioData.events.badEnding.pages, 
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
    lastActionTurnRef.current = -1;
    lastProcessedTurnRef.current = -1;
  }, [enemy, addMessage, handleLevelUp, setGameState, setEnemy, setParty, setActiveDialog, setBossDefeated, setPlayerState, setMapData, setCombatInterjection, party, forceLoot, encounteredEnemies, defeatedEnemies, setEncounteredEnemies, setDefeatedEnemies, onFirstDefeat, finalizeBattle, setActiveBattler, setBattleTurn]);

  const handleFight = useCallback(() => {
    const curEnemy = enemyRef.current;
    if (gameState !== 'BATTLE' || !curEnemy || showVictory) return;
    if (!isValidAction(lastActionTurnRef.current, battleTurn)) return;
    lastActionTurnRef.current = battleTurn; 
    
    const curParty = partyRef.current;
    const poisonRes = applyStatusEffects(curParty[activeBattler]);
    if (poisonRes.messages.length > 0) {
      poisonRes.messages.forEach(msg => addMessage(msg, 'damage_party'));
      setParty(p => p.map((m, i) => i === activeBattler ? poisonRes.updatedActor : m));
      triggerVisualEffect(`party_${activeBattler}`, `-${Math.abs(curParty[activeBattler].hp - poisonRes.updatedActor.hp)}`, 'damage');
    }
    
    const currentActorForCheck = poisonRes.updatedActor;
    if (currentActorForCheck.hp <= 0) {
       setBattleTurn(prev => prev + 1);
       return;
    }

    const ability = checkActionAbility(currentActorForCheck);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      setBattleTurn(prev => prev + 1);
      return;
    }

    const attacker = getEffectiveStats(currentActorForCheck, itemsData);
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, curEnemy.ac);
    if (forceHit) res.hit = true; 
    
    Logger.info('Combat', 'Player Attack', { attacker: attacker.name, target: curEnemy.name, hit: res.hit, damage: res.damage });
    const attackCmds = generatePhysicalAttackCommands(attacker, curEnemy, res, 'enemy');
    executeCommands(attackCmds);
    
    let nEh = curEnemy.hp;
    if (res.hit) nEh -= res.damage; 
    
    if (nEh <= 0) { 
      endBattle(true); 
      return; 
    }
    setEnemy({...curEnemy, hp: nEh});
    
    const nextIdx = curParty.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextIdx !== -1) {
      setActiveBattler(nextIdx);
      setBattleTurn(prev => prev + 1);
    } else {
      setTimeout(() => {
        const latestP = partyRef.current;
        const alive = latestP.filter(m => m.hp > 0);
        if (alive.length === 0) return;
        
        const latestE = enemyRef.current;
        if (!latestE || latestE.hp <= 0) return;

        const abilityE = checkActionAbility(latestE);
        if (!abilityE.canAction) {
            addMessage(abilityE.message);
            setBattleTurn(prev => prev + 1);
            return;
        }
        
        const baseTarget = alive[Math.floor(Math.random() * alive.length)];
        const target = getEffectiveStats(baseTarget, itemsData);
        const targetIdx = latestP.findIndex(m => m.name === target.name);
        const eRes = calculateHitAndDamage(latestE.ac, latestE.minDmg, latestE.maxDmg, target.ac);
        
        Logger.info('Combat', 'Enemy Attack', { attacker: latestE.name, target: target.name, hit: eRes.hit, damage: eRes.damage });
        const enemyCmds = generateEnemyAttackCommands(latestE, target, targetIdx, eRes);
        executeCommands(enemyCmds);

        if (eRes.hit) {
          const nextHP = Math.max(0, target.hp - eRes.damage);
          let nextStatusEffects = target.statusEffects || [];
          if (latestE.statusEffect && !nextStatusEffects.includes(latestE.statusEffect)) {
            nextStatusEffects = [...nextStatusEffects, latestE.statusEffect];
            addMessage(`${target.name}は${latestE.statusEffect === 'POISON' ? '毒' : '麻痺'}に侵された！`, 'damage_party');
          }
          setParty(p => {
            const latestPartyForUpdate = p.map(m => m.name === target.name ? { 
              ...m, 
              hp: nextHP, 
              status: nextHP === 0 ? '討死' : '平安',
              statusEffects: nextHP === 0 ? [] : nextStatusEffects
            } : m);
            
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

            if (latestPartyForUpdate.every(m => m.hp <= 0)) {
               endBattle(false);
            }
            return latestPartyForUpdate;
          });
          triggerVisualEffect(`party_${targetIdx}`, `-${eRes.damage}`, 'damage');
        } else {
          addMessage(`${target.name}${scenarioData.battle.evade}`);
          setBattleTurn(prev => prev + 1);
        }
      }, GAME_SETTINGS.DELAYS.ENEMY_TURN);
    }
  }, [gameState, activeBattler, addMessage, endBattle, triggerVisualEffect, setEnemy, setParty, setCombatInterjection, setActiveBattler, setBattleTurn, forceHit, showVictory, battleTurn]);

  const castSpell = useCallback((spell) => {
    const curEnemy = enemyRef.current;
    if (gameState !== 'BATTLE' || !curEnemy || showVictory) return;
    if (!isValidAction(lastActionTurnRef.current, battleTurn)) return;
    lastActionTurnRef.current = battleTurn; 

    const curParty = partyRef.current;
    const poisonRes = applyStatusEffects(curParty[activeBattler]);
    if (poisonRes.messages.length > 0) {
      poisonRes.messages.forEach(msg => addMessage(msg, 'damage_party'));
      setParty(p => p.map((m, i) => i === activeBattler ? poisonRes.updatedActor : m));
      triggerVisualEffect(`party_${activeBattler}`, `-${Math.abs(curParty[activeBattler].hp - poisonRes.updatedActor.hp)}`, 'damage');
    }
    const currentActorForSpell = poisonRes.updatedActor;
    if (currentActorForSpell.hp <= 0) { 
      setBattleTurn(prev => prev + 1); 
      return; 
    }
    const ability = checkActionAbility(currentActorForSpell);
    if (!ability.canAction) {
      addMessage(ability.message, 'damage_party');
      setBattleTurn(prev => prev + 1);
      return;
    }

    const attacker = getEffectiveStats(currentActorForSpell, itemsData);
    if (attacker.mp < spell.mp) { 
      addMessage(scenarioData.battle.noMana); 
      return; 
    }
    
    let nextP = [...curParty]; 
    nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...curEnemy };
    const effectRes = calculateSpellEffect(spell, attacker);
    
    Logger.info('Combat', 'Cast Spell', { caster: attacker.name, spell: spell.name, type: spell.type });

    if (spell.type === 'ATTACK') {
      const dmg = effectRes.value;
      const cmds = generateSpellAttackCommands(attacker, curEnemy, spell, dmg);
      executeCommands(cmds);
      nextE.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const targetIdx = nextP.findIndex(m => m.name === target.name);
      const heal = effectRes.value;
      target.hp = Math.min(target.maxHp, target.hp + heal);
      const cmds = generateSpellHealCommands(attacker, target, targetIdx, spell, heal);
      executeCommands(cmds);
    } else if (spell.type === 'CURE') {
      nextP = nextP.map(m => ({ ...m, statusEffects: [] }));
      const cmds = generateSpellCureCommands(attacker, spell);
      executeCommands(cmds);
    } else if (spell.type === 'STATUS') {
      const cmds = generateSpellStatusCommands(attacker, curEnemy, spell, effectRes.statusEffect);
      executeCommands(cmds);
      if (effectRes.statusEffect) {
        if (!nextE.statusEffects) nextE.statusEffects = [];
        if (!nextE.statusEffects.includes(effectRes.statusEffect)) {
            nextE.statusEffects.push(effectRes.statusEffect);
        }
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
        lastActionTurnRef.current = -1;
        handleFight();
      }
    }
  }, [activeBattler, addMessage, endBattle, gameState, handleFight, triggerVisualEffect, setParty, setEnemy, setShowSpells, battleTurn, showVictory]);

  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemyRef.current && !showVictory && !activeDialog && !combatInterjection) {
      if (lastProcessedTurnRef.current === battleTurn) return;
      
      const currentParty = partyRef.current;
      const a = currentParty[activeBattler];
      if (!a || a.hp <= 0) {
        const nextIdx = currentParty.findIndex(m => m.hp > 0);
        if (nextIdx !== -1) {
          setActiveBattler(nextIdx);
          setBattleTurn(prev => prev + 1);
        }
        return;
      }

      lastProcessedTurnRef.current = battleTurn;

      const t = setTimeout(() => {
        if (gameState !== 'BATTLE' || showVictory || activeDialog || combatInterjection) return;
        
        const curActor = partyRef.current[activeBattler];
        if (!curActor || curActor.hp <= 0) return;

        const spells = (SPELLS[curActor.jobKey] || []).filter(s => s.lv <= curActor.lv && curActor.mp >= s.mp);
        const statusVictim = partyRef.current.find(m => m.hp > 0 && m.statusEffects && m.statusEffects.length > 0);
        
        if (curActor.jobKey === 'NISOU' && statusVictim) {
           const cureSpell = spells.find(s => s.type === 'CURE');
           if (cureSpell) { castSpell(cureSpell); return; }
        }
        
        const curEnemy = enemyRef.current;
        const isStrong = curEnemy && (curEnemy.isBoss || curEnemy.hp > 50);
        if (isStrong && spells.length > 0) castSpell(spells[spells.length - 1]);
        else handleFight();
      }, GAME_SETTINGS.DELAYS.AUTO_BATTLE);
      return () => clearTimeout(t);
    }
  }, [isAutoBattle, gameState, activeBattler, battleTurn, showVictory, activeDialog, combatInterjection, handleFight, castSpell]);

  return {
    activeBattler, setActiveBattler, battleTurn, setBattleTurn, isAutoBattle, setIsAutoBattle,
    showVictory, setShowVictory, showSpells, setShowSpells, handleFight, castSpell, endBattle,
    yugenEnemy, setYugenEnemy, finalizeBattle
  };
};
