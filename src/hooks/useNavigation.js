import { useCallback } from 'react';
import { MAP_WIDTH, MAP_HEIGHT, DIRECTIONS } from '../data/mapData';
import { BOSS_POS } from '../constants/gameData';
import { ENEMY_LIST } from '../data/enemyData';
import { getRandomEnemy } from '../logic/combat';
import { useGame } from '../context/GameContext';
import scenarioData from '../data/Scenario.json';
import mapEventsData from '../data/MapEvents.json';

/**
 * 迷宮内の移動・探索ロジックを管理するカスタムフック
 */
export const useNavigation = () => {
  const {
    gameState, setGameState,
    playerState, setPlayerState,
    party, setParty,
    mapData, setMapData,
    bossDefeated,
    setEnemy,
    activeDialog, setActiveDialog,
    setIsShake,
    setMessages
  } = useGame();

  const addMessage = useCallback((msg, type = 'normal') => {
    setMessages(prev => [...prev, { text: msg, type }].slice(-30));
  }, [setMessages]);

  const processMove = useCallback((type) => {
    if (activeDialog || gameState !== 'EXPLORING') return;
    
    const currentCell = mapData[playerState.y][playerState.x];
    const dx = playerState.dir === 1 ? 1 : playerState.dir === 3 ? -1 : 0;
    const dy = playerState.dir === 0 ? -1 : playerState.dir === 2 ? 1 : 0;
    
    let nX = playerState.x, nY = playerState.y, nD = playerState.dir;
    
    if (type === 'FORWARD') {
      // 進行方向の壁チェック
      let hasWall = false;
      if (playerState.dir === DIRECTIONS.N) hasWall = currentCell.n;
      else if (playerState.dir === DIRECTIONS.E) hasWall = currentCell.e;
      else if (playerState.dir === DIRECTIONS.S) hasWall = currentCell.s;
      else if (playerState.dir === DIRECTIONS.W) hasWall = currentCell.w;

      if (!hasWall) {
        const tx = nX + dx, ty = nY + dy;
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) { nX = tx; nY = ty; }
      }
    } else if (type === 'BACKWARD') {
      // 背後方向の壁チェック
      let hasWall = false;
      if (playerState.dir === DIRECTIONS.N) hasWall = currentCell.s;
      else if (playerState.dir === DIRECTIONS.E) hasWall = currentCell.w;
      else if (playerState.dir === DIRECTIONS.S) hasWall = currentCell.n;
      else if (playerState.dir === DIRECTIONS.W) hasWall = currentCell.e;

      if (!hasWall) {
        const tx = nX - dx, ty = nY - dy;
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) { nX = tx; nY = ty; }
      }
    } else if (type === 'TURN_LEFT') {
      nD = (nD + 3) % 4;
    } else if (type === 'TURN_RIGHT') {
      nD = (nD + 1) % 4;
    }

    if (nX !== playerState.x || nY !== playerState.y || nD !== playerState.dir) {
      setPlayerState({ x: nX, y: nY, dir: nD });
      
      if (nX !== playerState.x || nY !== playerState.y) {
        // 階段（クリア）判定
        if (bossDefeated && nX === BOSS_POS.x && nY === BOSS_POS.y) {
          setActiveDialog({
            title: "【都への凱旋】",
            pages: [
              "鵺の咆哮は消え、迷宮に静寂が戻った……。",
              "古の階段が黄金の光を放ち、現世（うつしよ）への道を指し示している。",
              "平安の都は、貴殿らの帰還を待っていることだろう。"
            ],
            currentPage: 0,
            isStory: true,
            bgImage: "src/images/闇夜の平安京.png", // 凱旋のイメージとしてタイトル背景を再利用
            onConfirm: () => {
               addMessage("⛩️ 羅生門編・第一章 完。都への道が開かれた。", "level_up");
               setGameState('TITLE'); // または専用のクリア画面へ
            }
          });
          return;
        }

        // ボス遭遇判定（鵺の咆哮と三将の呼応）
        if (!bossDefeated && nX === BOSS_POS.x && nY === BOSS_POS.y) {
          setIsShake(true); 
          setActiveDialog({
            ...scenarioData.events.nueAura,
            currentPage: 0,
            isStory: true,
            onConfirm: () => {
              setIsShake(false);
              const b = ENEMY_LIST.find(e => e.id === 10); 
              setEnemy({...b, hp: b.maxHp}); 
              setGameState('BATTLE'); 
              addMessage(scenarioData.events.nueAppear, 'event'); 
            }
          });
          return;
        }

        // エンカウント判定 (15%)
        if (Math.random() < 0.15) {
          const lSum = party.reduce((s, m) => s + m.lv, 0); 
          const e = getRandomEnemy(lSum);
          setEnemy({ ...e, hp: e.maxHp }); 
          setGameState('BATTLE'); 
          addMessage(scenarioData.events.encounter.replace('%ENEMY%', e.name), 'event');
        }
        
        // 周辺8マス(壁含む)を視認化
        setMapData(p => {
          const n = [...p.map(row => [...row])];
          for(let dy2=-1; dy2<=1; dy2++) for(let dx2=-1; dx2<=1; dx2++) {
            const tx = nX + dx2, ty = nY + dy2;
            if(tx>=0 && tx<MAP_WIDTH && ty>=0 && ty<MAP_HEIGHT) {
              n[ty][tx].visited = true;
            }
          }
          return n;
        });

        // マップイベント判定
        const event = mapEventsData.events.find(e => e.x === nX && e.y === nY);
        if (event) {
          const isNarrative = ['shrine', 'well', 'scroll'].includes(event.type) || event.isStart;
          setActiveDialog({ 
            title: event.name, 
            pages: [event.description], 
            currentPage: 0,
            isStory: isNarrative
          });
          if (event.isHeal) { 
            setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' }))); 
            addMessage(`【${event.name}】の静寂にて隊員の心身が癒やされ、生命と霊力が再び漲った。`, 'heal'); 
          }
        }
      }
    }
  }, [playerState, mapData, gameState, activeDialog, bossDefeated, party, addMessage, setGameState, setEnemy, setIsShake, setActiveDialog, setParty, setMapData, setPlayerState]);

  return {
    playerState,
    setPlayerState,
    mapData,
    setMapData,
    processMove
  };
};
