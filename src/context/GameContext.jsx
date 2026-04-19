import React, { useState, useCallback, useEffect } from 'react';
import { GameContext } from './GameContextInstance';
import scenarioData from '../data/Scenario.json';
import charactersData from '../data/Characters.json';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT, generateMap } from '../data/mapData';
import SoundEngine from '../utils/SoundEngine';
import { GAME_SETTINGS } from '../constants/gameData';
import { DEBUG_SEEDS } from '../utils/debugData';
import { useEffects } from './EffectContext.jsx';
import { useAudio } from './AudioContext.jsx';
import { useEncounter } from './EncounterContext.jsx';
import { useSaveSystem } from './SaveContext.jsx';

/**
 * 都の理（状態管理）を司る心臓。
 */
export const GameProvider = ({ children }) => {
  // 分霊から力を借りる
  const { 
    visualEffects, setVisualEffects, 
    flashColor, setFlashColor, 
    displayShake, setDisplayShake, 
    triggerVisualEffect 
  } = useEffects();

  const { isMuted, setIsMuted, toggleMute } = useAudio();
  const { encounteredEnemies, setEncounteredEnemies, defeatedEnemies, setDefeatedEnemies } = useEncounter();
  const { saveGame: _save, loadGame: _load } = useSaveSystem();

  // --- 基本状態 ---
  const [gameState, setGameState] = useState('TITLE'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  
  // 探索・地図
  const [playerState, setPlayerState] = useState({ x: 0, y: 0, dir: DIRECTIONS.S });
  const [party, setParty] = useState(charactersData.map(c => ({ ...c, items: [] })));
  const [mapData, setMapData] = useState(generateMap());
  const [bossDefeated, setBossDefeated] = useState(false);
  
  // 戦闘
  const [enemy, setEnemy] = useState(null);
  const [activeBattlerIndex, setActiveBattlerIndex] = useState(null);
  
  // UI演出
  const [activeDialog, setActiveDialog] = useState(null);
  const [combatInterjection, setCombatInterjection] = useState(null);
  const [isShake, setIsShake] = useState(false);
  
  // --- 記憶の理（Save/Load） ---

  /**
   * 記録の術式 (Save)
   */
  /**
   * 記録の術式 (Save)
   */
  const saveGame = useCallback(() => {
    const result = _save({
      playerState,
      party,
      mapData: mapData.map(row => row.map(cell => ({ ...cell }))),
      bossDefeated,
      encounteredEnemies,
      defeatedEnemies,
      messages: messages.slice(-10)
    });
    return result;
  }, [_save, playerState, party, mapData, bossDefeated, encounteredEnemies, defeatedEnemies, messages]);

  /**
   * 想起の術式 (Load)
   */
  const loadGame = useCallback(() => {
    const data = _load();
    if (!data) return false;

    setPlayerState(data.playerState);
    setParty(data.party);
    setMapData(data.mapData);
    setBossDefeated(data.bossDefeated || false);
    setEncounteredEnemies(data.encounteredEnemies || []);
    setDefeatedEnemies(data.defeatedEnemies || []);
    if (data.messages) setMessages(data.messages);
    
    return true;
  }, [_load, setEncounteredEnemies, setDefeatedEnemies]);

  // 起動時の自動ロードおよびシード注入の理
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seedKey = params.get('seed');
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (seedKey && DEBUG_SEEDS[seedKey]) {
      console.log(`⛩️ 神速の理：シード【${seedKey}】を注入します。`);
      const data = DEBUG_SEEDS[seedKey];
      
      setPlayerState(data.playerState);
      setParty(data.party);
      if (data.mapData) setMapData(data.mapData);
      setBossDefeated(data.bossDefeated || false);
      setEncounteredEnemies(data.encounteredEnemies || []);
      setDefeatedEnemies(data.defeatedEnemies || []);
      setGameState('EXPLORING'); // 即座に冒険へ
      SoundEngine.transitionTo('EXPLORING');
    }
  }, [setEncounteredEnemies, setDefeatedEnemies]);

  // --- 共通アクション ---

  const handleResurrection = useCallback(() => {
    console.log("⛩️ 【再起の儀】を執り行います。");
    
    // 復活する者たちの魂を特定（HPが最大でない者を救い主として扱う）
    const resurrected = party.filter(m => m.hp < m.maxHp || (m.statusEffects && m.statusEffects.length > 0));

    setGameState('EXPLORING');
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
    setBossDefeated(false);
    setEnemy(null);
    SoundEngine.transitionTo('EXPLORING');
    
    // パーティを全快
    setParty(charactersData.map(c => ({ 
      ...c, 
      hp: c.maxHp, 
      mp: c.maxMp, 
      status: '平安', 
      items: [] 
    })));
    
    setMapData(generateMap());
    setMessages([{ text: scenarioData.events.gameStart, type: 'event' }]);
    
    // 復活のメッセージを余韻をもって表示（独白の連鎖）
    const showNextResMsg = (list) => {
      if (list.length === 0) return;
      const [current, ...remaining] = list;
      if (current.resurrectionMessage) {
        setCombatInterjection({
          member: current,
          quotes: [{ text: current.resurrectionMessage }],
          currentPage: 0,
          onClose: () => {
            setTimeout(() => showNextResMsg(remaining), 400);
          }
        });
      } else {
        showNextResMsg(remaining);
      }
    };

    if (resurrected.length > 0) {
      setTimeout(() => showNextResMsg(resurrected), 1200);
    }

    setActiveDialog({
      title: "【再起の儀】",
      speaker: charactersData[0]?.id || "abe_seimei", 
      pages: ["……戻ったのか。この社の風、御神木の香りがする。息を吹き返した心地よ……。"],
      currentPage: 0,
      type: 'narration',
      isStory: true
    });
  }, [setGameState, setPlayerState, setParty, setMapData, setMessages, setBossDefeated, setEnemy, setActiveDialog, party]);

  const value = {
    gameState, setGameState,
    messages, setMessages,
    playerState, setPlayerState,
    party, setParty,
    mapData, setMapData,
    bossDefeated, setBossDefeated,
    enemy, setEnemy,
    activeBattlerIndex, setActiveBattlerIndex,
    activeDialog, setActiveDialog,
    combatInterjection, setCombatInterjection,
    isShake, setIsShake,
    visualEffects, setVisualEffects,
    flashColor, setFlashColor,
    displayShake, setDisplayShake,
    triggerVisualEffect,
    isMuted, setIsMuted,
    toggleMute,
    saveGame, 
    loadGame,
    handleRestart: handleResurrection,
    encounteredEnemies, setEncounteredEnemies,
    defeatedEnemies, setDefeatedEnemies
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
