import { useCallback } from 'react';
import { MAP_WIDTH, MAP_HEIGHT, DIRECTIONS } from '../data/mapData';
import { BOSS_POS, GAME_SETTINGS } from '../constants/gameData';
import { ENEMY_LIST } from '../data/enemyData';
import { getRandomEnemy } from '../logic/combat';
import { useGame } from './useGame';
import scenarioData from '../data/Scenario.json';
import mapEventsData from '../data/MapEvents.json';

/**
 * 迷宮内の移動・探索ロジックを管理するカスタムフック
 */
export const useNavigation = () => {
  const {
    playerState, setPlayerState,
    party, setParty,
    mapData, setMapData,
    bossDefeated,
    startEncounter,
    setActiveBattlerIndex,
    activeDialog, setActiveDialog,
    setIsShake,
    setMessages,
    setCombatInterjection,
    gameState, setGameState
  } = useGame();

  const addMessage = useCallback((msg, type = 'normal') => {
    setMessages(prev => [...prev, { text: msg, type }].slice(-GAME_SETTINGS.LOG_CAPACITY));
  }, [setMessages]);

  const processMove = useCallback((type) => {
    if (activeDialog || gameState !== 'EXPLORING') return;
    
    let nX = playerState.x, nY = playerState.y, nD = playerState.dir;
    let hasWall = false;
    const currentCell = mapData[playerState.y][playerState.x];

    if (type === 'FORWARD') {
      if (playerState.dir === DIRECTIONS.N) { nY--; hasWall = currentCell.n; }
      else if (playerState.dir === DIRECTIONS.E) { nX++; hasWall = currentCell.e; }
      else if (playerState.dir === DIRECTIONS.S) { nY++; hasWall = currentCell.s; }
      else if (playerState.dir === DIRECTIONS.W) { nX--; hasWall = currentCell.w; }
      
      if (nX < 0 || nX >= MAP_WIDTH || nY < 0 || nY >= MAP_HEIGHT) { nX = playerState.x; nY = playerState.y; }
      else if (hasWall) { nX = playerState.x; nY = playerState.y; }
    } else if (type === 'BACKWARD') {
      if (playerState.dir === DIRECTIONS.N) { nY++; hasWall = currentCell.s; }
      else if (playerState.dir === DIRECTIONS.E) { nX--; hasWall = currentCell.w; }
      else if (playerState.dir === DIRECTIONS.S) { nY--; hasWall = currentCell.n; }
      else if (playerState.dir === DIRECTIONS.W) { nX++; hasWall = currentCell.e; }
      
      if (nX < 0 || nX >= MAP_WIDTH || nY < 0 || nY >= MAP_HEIGHT) { nX = playerState.x; nY = playerState.y; }
      else if (hasWall) { nX = playerState.x; nY = playerState.y; }
    } else if (type === 'TURN_LEFT') {
      if (playerState.dir === DIRECTIONS.N) nD = DIRECTIONS.W;
      else if (playerState.dir === DIRECTIONS.E) nD = DIRECTIONS.N;
      else if (playerState.dir === DIRECTIONS.S) nD = DIRECTIONS.E;
      else if (playerState.dir === DIRECTIONS.W) nD = DIRECTIONS.S;
    } else if (type === 'TURN_RIGHT') {
      if (playerState.dir === DIRECTIONS.N) nD = DIRECTIONS.E;
      else if (playerState.dir === DIRECTIONS.E) nD = DIRECTIONS.S;
      else if (playerState.dir === DIRECTIONS.S) nD = DIRECTIONS.W;
      else if (playerState.dir === DIRECTIONS.W) nD = DIRECTIONS.N;
    }

    if (nX !== playerState.x || nY !== playerState.y || nD !== playerState.dir) {
      setPlayerState({ x: nX, y: nY, dir: nD });

      // 移動が発生した場合の追加判定
      if (nX !== playerState.x || nY !== playerState.y) {
        // クリア後の帰還判定
        if (bossDefeated && nX === BOSS_POS.x && nY === BOSS_POS.y) {
          setActiveDialog({
            title: "平安京への帰還",
            pages: [
              "鵺の気配は消え、都を覆っていた瘴気も霧散しつつある。",
              "一行は社の奥にある結界の裂け目から、再び人間の世へと歩を進めた。"
            ],
            currentPage: 0,
            isStory: true,
            bgImage: "src/images/闇夜の平安京.png",
            onConfirm: () => {
               addMessage("?? 旅の終わり ?? 平安京への扉が開かれた。", "level_up");
               setGameState('TITLE');
            }
          });
          return;
        }

        // ボス遭遇判定
        if (!bossDefeated && nX === BOSS_POS.x && nY === BOSS_POS.y) {
          setIsShake(true);
          setActiveDialog({
            ...scenarioData.events.nueAura,
            onConfirm: () => {
              setIsShake(false);
              const b = ENEMY_LIST.find(e => e.id === 10); 
              startEncounter(b);
              addMessage(scenarioData.events.nueAppear, 'event'); 
            }
          });
          return;
        }

        // ランダムエンカウント判定
        if (Math.random() < GAME_SETTINGS.ENCOUNTER_RATE) {
          const lSum = party.reduce((s, m) => s + m.lv, 0); 
          const e = getRandomEnemy(lSum);
          startEncounter(e);
          addMessage(scenarioData.events.encounter.replace('%ENEMY%', e.name), 'event');
        }
        
        // 周辺8マスの視認化
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

        // 施設・イベント判定
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
            const resurrected = party.filter(m => m.hp <= 0 || (m.statusEffects && m.statusEffects.length > 0)); 
            setParty(p => p.map(m => ({ 
                ...m, 
                hp: m.maxHp, 
                mp: m.maxMp, 
                status: '平安', 
                statusEffects: [] 
            })));
            setActiveBattlerIndex(null);
            addMessage(`⛩️ ${event.name} の静寂にて隊員の穢れは浄化され、生命と霊力が再び漲った。`, 'heal');
            
            // 蘇生メッセージの連鎖表示
            const showNextResMsg = (list) => {
              if (list.length === 0) return;
              const [current, ...remaining] = list;
              if (current.resurrectionMessage) {
                setCombatInterjection({
                  member: current,
                  quotes: [{ text: current.resurrectionMessage }],
                  currentPage: 0,
                  onClose: () => {
                    setTimeout(() => showNextResMsg(remaining), 300);
                  }
                });
              } else {
                showNextResMsg(remaining);
              }
            };
            if (resurrected.length > 0) {
              setTimeout(() => showNextResMsg(resurrected), 800);
            }
          }
        }
      }
    }
  }, [playerState, mapData, gameState, activeDialog, bossDefeated, party, addMessage, startEncounter, setIsShake, setActiveDialog, setParty, setMapData, setPlayerState, setCombatInterjection, setGameState, setActiveBattlerIndex]);

  return {
    playerState,
    setPlayerState,
    mapData,
    setMapData,
    processMove
  };
};
