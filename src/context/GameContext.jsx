import React, { useState, useCallback, useEffect } from 'react';
import { GameContext } from './GameContextInstance';
import scenarioData from '../data/Scenario.json';
import charactersData from '../data/Characters.json';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT, generateMap } from '../data/mapData';
import SoundEngine from '../utils/SoundEngine';
import { isDebug, GAME_SETTINGS } from '../constants/gameData';
import { DEBUG_SEEDS } from '../utils/debugData';

const SAVE_KEY = 'RASHOMON_SAVE_V1';

/**
 * 都の理（状態管理）を司る心臓。
 * 記録（セーブ）と想起（ロード）の術式を司る。
 */
export const GameProvider = ({ children }) => {
  // --- 基本状態 ---
  const [gameState, setGameState] = useState('TITLE'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  
  // 探索・地図
  const [playerState, setPlayerState] = useState({ x: 0, y: 0, dir: DIRECTIONS.S });
  const [party, setParty] = useState(charactersData.map(c => ({ ...c, items: [] })));
  const [mapData, setMapData] = useState(generateMap());
  const [bossDefeated, setBossDefeated] = useState(false);
  const [encounteredEnemies, setEncounteredEnemies] = useState([]);
  const [defeatedEnemies, setDefeatedEnemies] = useState([]);
  
  // 戦闘
  const [enemy, setEnemy] = useState(null);
  const [activeBattlerIndex, setActiveBattlerIndex] = useState(null);
  
  // UI演出
  const [activeDialog, setActiveDialog] = useState(null);
  const [combatInterjection, setCombatInterjection] = useState(null);
  const [isShake, setIsShake] = useState(false);
  
  // 視覚演出（エフェクト）の理
  const [visualEffects, setVisualEffects] = useState([]); 
  const [flashColor, setFlashColor] = useState(null); 
  const [displayShake, setDisplayShake] = useState(null); 
  
  // 音響
  const [isMuted, setIsMuted] = useState(isDebug);

  // --- 記憶の理（Save/Load） ---

  /**
   * 記録の術式 (Save)
   */
  const saveGame = useCallback(() => {
    try {
      const saveData = {
        playerState,
        party,
        mapData: mapData.map(row => row.map(cell => ({ ...cell }))), // 参照切り
        bossDefeated,
        encounteredEnemies,
        defeatedEnemies,
        messages: messages.slice(-10), // 重すぎないよう直近10件
        timestamp: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log("💾 都の記録を完了しました。");
      return true;
    } catch (e) {
      console.error("❌ 記録に失敗しました：", e);
      return false;
    }
  }, [playerState, party, mapData, bossDefeated, messages, encounteredEnemies, defeatedEnemies]);

  /**
   * 相起の術式 (Load)
   * 【一期一会】読み込みに成功した瞬間に記録は消滅し、新たな人生が始まる。
   */
  const loadGame = useCallback(() => {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (!stored) return false;
      const data = JSON.parse(stored);
      
      setPlayerState(data.playerState);
      setParty(data.party);
      setMapData(data.mapData);
      setBossDefeated(data.bossDefeated || false);
      setEncounteredEnemies(data.encounteredEnemies || []);
      setDefeatedEnemies(data.defeatedEnemies || []);
      if (data.messages) setMessages(data.messages);
      
      // 記憶の消去（次はない）
      localStorage.removeItem(SAVE_KEY);
      
      console.log("⛩️ 過去の記憶を呼び戻しました。この記録はこれにて消失します。");
      return true;
    } catch (e) {
      console.error("❌ 想起に失敗しました：", e);
      return false;
    }
  }, []);

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
  }, []);

  // --- 共通アクション ---

  const triggerVisualEffect = useCallback((target, value, type, effectStyle = 'normal') => {
    const id = Date.now() + Math.random();
    setVisualEffects(prev => [...prev, { id, target, value, type }]);
    setTimeout(() => {
      setVisualEffects(prev => prev.filter(e => e.id !== id));
    }, 800);

    if (type === 'damage' && target.startsWith('party')) {
      setFlashColor('red');
      setTimeout(() => setFlashColor(null), 400);
      setDisplayShake(effectStyle === 'heavy' ? 'heavy' : 'normal');
      setTimeout(() => setDisplayShake(null), 400);
    } else if (type === 'damage' && target === 'enemy') {
      setDisplayShake('normal');
      setTimeout(() => setDisplayShake(null), 300);
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    SoundEngine.setMuted(nextMuted);
  }, [isMuted]);

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
