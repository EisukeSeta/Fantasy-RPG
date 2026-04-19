import React, { useCallback } from 'react';
import { GameContext } from './GameContextInstance';
import scenarioData from '../data/Scenario.json';
import charactersData from '../data/Characters.json';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT, generateMap } from '../data/mapData';
import SoundEngine from '../utils/SoundEngine';
import { GAME_SETTINGS } from '../constants/gameData';
import { useEffects } from './EffectContext.jsx';
import { useAudio } from './AudioContext.jsx';
import { useEncounter } from './EncounterContext.jsx';
import { useSaveSystem } from './SaveContext.jsx';
import { resolveInitialState } from '../utils/stateResolver';
import { getEncounterPatch } from '../logic/combat';
import { Logger } from '../utils/logger';
import itemsData from '../data/Items.json';
import { getRequiredExp } from '../logic/growth';

export const GameProvider = ({ children }) => {
  const { triggerVisualEffect, useEffects: unused_effects } = useEffects(); // 修正：不要なプロパティを整理
  const { isMuted } = useAudio();
  const { encounteredEnemies, setEncounteredEnemies, defeatedEnemies, setDefeatedEnemies } = useEncounter();
  const { saveGame: _save, loadGame: _load } = useSaveSystem();

  const initialData = React.useMemo(() => {
    // 救済措置: 旧キーがあれば新キーへ移行
    const oldRaw = localStorage.getItem('fantasy_rpg_save');
    if (oldRaw && !localStorage.getItem('RASHOMON_SAVE_V1')) {
      localStorage.setItem('RASHOMON_SAVE_V1', oldRaw);
      localStorage.removeItem('fantasy_rpg_save');
      console.log("⛩️ 記憶の鍵を現代の法(V1)へ鋳造し直しました。");
    }

    let saved = null;
    try {
      const raw = localStorage.getItem('RASHOMON_SAVE_V1');
      saved = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("⛩️ 記憶の想起に失敗しました:", e);
    }

    return resolveInitialState({
      search: window.location.search,
      savedData: saved,
      forceGameState: 'TITLE',
      defaultState: {
        gameState: 'TITLE',
        messages: [{ text: scenarioData.events.gameStart, type: 'event' }],
        playerState: { x: 0, y: 0, dir: DIRECTIONS.S },
        party: charactersData.map(c => ({ ...c, items: [] })),
        mapData: generateMap(),
        bossDefeated: false,
        enemy: null,
        activeDialog: null,
        activeBattlerIndex: null,
        encounteredEnemies: [],
        defeatedEnemies: []
      }
    });
  }, []);

  const [gameState, setGameState] = React.useState(initialData.gameState); 
  const [messages, setMessages] = React.useState(initialData.messages);
  const [playerState, setPlayerState] = React.useState(initialData.playerState);
  const [party, setParty] = React.useState(initialData.party);
  const [mapData, setMapData] = React.useState(initialData.mapData);
  const [bossDefeated, setBossDefeated] = React.useState(initialData.bossDefeated);
  const [enemy, setEnemy] = React.useState(initialData.enemy);
  const [activeBattlerIndex, setActiveBattlerIndex] = React.useState(initialData.activeBattlerIndex);

  const handleRestart = useCallback(() => {
    setGameState('TITLE');
    setPlayerState({ x:0, y:0, dir: DIRECTIONS.S });
  }, []);

  const saveGame = useCallback(() => { _save({ gameState, playerState, party, mapData, bossDefeated, encounteredEnemies, defeatedEnemies }); }, [_save, gameState, playerState, party, mapData, bossDefeated, encounteredEnemies, defeatedEnemies]);
  
  const loadGame = useCallback(() => {
    const data = _load();
    if (data) {
      setGameState(data.gameState);
      setPlayerState(data.playerState);
      setParty(data.party);
      setMapData(data.mapData);
      setBossDefeated(data.bossDefeated);
      setEncounteredEnemies(data.encounteredEnemies || []);
      setDefeatedEnemies(data.defeatedEnemies || []);
      return true;
    }
    return false;
  }, [_load, setEncounteredEnemies, setDefeatedEnemies]);

  const value = {
    gameState, setGameState,
    messages, setMessages,
    playerState, setPlayerState,
    party, setParty,
    mapData, setMapData,
    bossDefeated, setBossDefeated,
    enemy, setEnemy,
    activeBattlerIndex, setActiveBattlerIndex,
    isMuted,
    saveGame, loadGame,
    handleRestart,
    scenarioData
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
