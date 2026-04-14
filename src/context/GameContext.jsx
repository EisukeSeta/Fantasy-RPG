import React, { createContext, useContext, useState, useCallback } from 'react';
import scenarioData from '../data/Scenario.json';
import charactersData from '../data/Characters.json';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT, generateMap } from '../data/mapData';
import SoundEngine from '../utils/SoundEngine';
import { isDebug } from '../constants/gameData';

const GameContext = createContext();

/**
 * 都の理（状態管理）を司る心臓。
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
  
  // 戦闘
  const [enemy, setEnemy] = useState(null);
  const [activeBattlerIndex, setActiveBattlerIndex] = useState(null);
  
  // UI演出
  const [activeDialog, setActiveDialog] = useState(null);
  const [combatInterjection, setCombatInterjection] = useState(null);
  const [isShake, setIsShake] = useState(false);
  
  // 視覚演出（エフェクト）の理
  const [visualEffects, setVisualEffects] = useState([]); // { id, target, value, type }
  const [flashColor, setFlashColor] = useState(null); // 'red', etc.
  const [displayShake, setDisplayShake] = useState(null); // 'normal', 'heavy'
  
  // 音響
  const [isMuted, setIsMuted] = useState(isDebug);

  // --- 共通アクション ---

  /**
   * 視覚演出の起動
   */
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
  
  /** 
   * 都の音響を沈める（消音）
   */
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    SoundEngine.setMuted(nextMuted);
  }, [isMuted]);

  /**
   * 探索の再開（再起の儀）
   */
  /**
   * 探索の再開（再起の儀）
   */
  /**
   * 再起の儀（黄泉からの帰還）
   */
  const handleResurrection = useCallback(() => {
    console.log("⛩️ 【再起の儀】を執り行います。");
    
    // 状態の初期化
    setGameState('EXPLORING');
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
    setBossDefeated(false);
    setEnemy(null);
    SoundEngine.transitionTo('EXPLORING');
    
    // パーティを初期状態（Characters.json）に基づいて完全浄化
    setParty(charactersData.map(c => ({ 
      ...c, 
      hp: c.maxHp, 
      mp: c.maxMp, 
      status: '平安', 
      items: [] 
    })));

    setMapData(generateMap());
    setMessages([{ text: scenarioData.events.gameStart, type: 'event' }]);
    
    // 安堵の独白を演出
    const leaderName = charactersData[0]?.name || "晴明";
    setActiveDialog({
      speaker: leaderName,
      text: "……戻ったのか。この社の風、御神木の香りがする。息を吹き返した心地よ……。",
      type: 'narration'
    });
  }, [setGameState, setPlayerState, setParty, setMapData, setMessages, setBossDefeated, setEnemy, setActiveDialog]);

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
    handleRestart: handleResurrection // handleRestart としても公開（互換用）
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};
