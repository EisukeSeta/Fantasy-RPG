import { useState, useEffect, useCallback } from 'react';
import { generateMap, DIRECTIONS, MAP_WIDTH, MAP_HEIGHT } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST } from './data/enemyData';
import { StatusPane } from './components/status/StatusPane';
import { CombatArea } from './components/battle/CombatArea';
import { CharacterCard } from './components/status/CharacterCard';
import { LabyrinthMap } from './components/navigation/LabyrinthMap';
import { ControlPanel } from './components/navigation/ControlPanel';
import { MessageLog } from './components/navigation/MessageLog';
import SoundEngine from './utils/SoundEngine';

import { 
  BOSS_POS, 
  isDebug 
} from './constants/gameData';

import balanceData from './data/Balance.json';
import scenarioData from './data/Scenario.json';
import charactersData from './data/Characters.json';
import mapEventsData from './data/MapEvents.json';

import { useNavigation } from './hooks/useNavigation';
import { useCombat } from './hooks/useCombat';

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(isDebug);
  const [isShake, setIsShake] = useState(false);
  const [isBossIntro, setIsBossIntro] = useState(false);
  const [party, setParty] = useState(charactersData.map(c => ({ ...c })));
  const [bossDefeated, setBossDefeated] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDebug, setShowDebug] = useState(isDebug);
  const [visualEffects, setVisualEffects] = useState([]); // { id, target, value, type }
  const [flashColor, setFlashColor] = useState(null); // 'red', etc.
  const [displayShake, setDisplayShake] = useState(null); // 'normal', 'heavy'
  const [enemy, setEnemy] = useState(null);
  const [activeDialog, setActiveDialog] = useState({ ...scenarioData.opening, currentPage: 0 });

  const isForceMobile = (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) || new URLSearchParams(window.location.search).get('mobile') === '1';

  const addMessage = useCallback((msg, providedType = null) => {
    let type = providedType || 'normal';
    if (!providedType) {
      if (msg.includes('ダメージ') || msg.includes('傷') || msg.includes('痛打')) type = 'damage_party';
      if (msg.includes('回復') || msg.includes('全快') || msg.includes('癒えた')) type = 'heal';
      if (msg.includes('昇格') || msg.includes('レベルアップ') || msg.includes('初期化') || msg.includes('功徳')) type = 'level_up';
      if (msg.includes('這い出た') || msg.includes('震撼') || msg.includes('気配') || msg.includes('立ちはだかった')) type = 'event'; 
    }
    setMessages(prev => [...prev, { text: msg, type }].slice(-30));
  }, []);

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

  // --- 理の分権 (Hooks) ---
  const { 
    playerState, 
    setPlayerState, 
    mapData, 
    setMapData, 
    processMove 
  } = useNavigation(generateMap(), { x: 1, y: 1, dir: DIRECTIONS.S }, {
    gameState, activeDialog, bossDefeated, party, addMessage, 
    setGameState, setEnemy, setIsShake, setIsBossIntro, setActiveDialog, setParty, scenarioData, mapEventsData
  });

  const {
    activeBattler,
    isAutoBattle,
    setIsAutoBattle,
    showVictory,
    showSpells,
    setShowSpells,
    handleFight,
    castSpell
  } = useCombat({
    gameState, setGameState, party, setParty, enemy, setEnemy, 
    addMessage, triggerVisualEffect, scenarioData, balanceData, 
    generateMap, setPlayerState, setMapData, setActiveDialog, setBossDefeated
  });

  // 音響の理
  const initAudio = useCallback(() => {
    SoundEngine.init(); SoundEngine.setVolume(isMuted ? 0 : volume); SoundEngine.transitionTo(gameState);
    if (!isAudioInitialized) { setAudioInitialized(true); addMessage('⛩️ 奏曲が初期化されました。', 'level_up'); }
  }, [gameState, volume, isMuted, isAudioInitialized, addMessage]);

  useEffect(() => {
    const unlock = () => { initAudio(); window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
    window.addEventListener('click', unlock); window.addEventListener('touchstart', unlock);
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
  }, [initAudio]);

  // キー入力の理
  useEffect(() => {
    const hk = (e) => {
      if (gameState !== 'EXPLORING' || activeDialog) return;
      if (e.key === 'w' || e.key === 'ArrowUp') processMove('FORWARD');
      else if (e.key === 's' || e.key === 'ArrowDown') processMove('BACKWARD');
      else if (e.key === 'a' || e.key === 'ArrowLeft') processMove('TURN_LEFT');
      else if (e.key === 'd' || e.key === 'ArrowRight') processMove('TURN_RIGHT');
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [gameState, activeDialog, processMove]);

  const partyInDanger = party.some(m => m.hp > 0 && (m.hp <= m.maxHp * 0.2 || m.hp === 1));

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''} ${isShake || displayShake === 'normal' ? 'shake-anim' : ''} ${displayShake === 'heavy' ? 'shake-heavy' : ''} ${partyInDanger ? 'danger-state' : ''}`}>
      {/* 閃光エフェクト */}
      {flashColor === 'red' && <div className="flash-red"></div>}
      {isBossIntro && <div className="boss-intro-overlay"><span>{scenarioData.events.bossWarning}</span></div>}
      
      {/* クリア特別表示 */}
      {gameState === 'TITLE' && (
        <div className="boss-intro-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 20000 }}>
          <div style={{ textAlign: 'center' }}>
             <h1 style={{ color: 'var(--primary-gold)', fontSize: '3rem', textShadow: '0 0 20px #b89a42' }}>平安魔道伝</h1>
             <p style={{ color: '#fff', fontSize: '1.5rem' }}>羅生門編・第一章 完</p>
             <button className="dialog-btn" onClick={() => window.location.reload()} style={{ marginTop: '50px' }}>再び都を救う（リロード）</button>
          </div>
        </div>
      )}
      
      {/* --- UIコンポーネントの配置 --- */}
      <StatusPane 
        party={party}
        activeBattler={activeBattler}
        gameState={gameState}
        visualEffects={visualEffects}
        isForceMobile={isForceMobile}
        showStatus={showStatus}
        setShowStatus={setShowStatus}
      />

      <div className={`pane-main ${isForceMobile && gameState === 'BATTLE' ? 'battle-mode' : ''}`}>
        <div className="view-window window" style={{ flex: 1, position: 'relative', overflow: 'visible', margin: 0 }}>
          {!isForceMobile && <span className="window-title">都の景色</span>}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
          </div>
          {isForceMobile && (
            <div 
              style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'pointer' }} 
              onClick={() => processMove('FORWARD')} 
              title="前進"
            />
          )}
          <CombatArea 
            enemy={enemy}
            visualEffects={visualEffects}
            showVictory={showVictory}
            gameState={gameState}
          />
          
          {isForceMobile && (
            <div className="mobile-status-dashboard">
              {party.map((m, i) => (
                <CharacterCard 
                  key={i}
                  member={m}
                  index={i}
                  variant="mini"
                  activeBattler={activeBattler}
                  gameState={gameState}
                  visualEffects={visualEffects}
                />
              ))}
            </div>
          )}
          
          {/* モバイル専用：探索画面上の没入型十字キー */}
          {isForceMobile && gameState !== 'BATTLE' && (
            <div className="mobile-btn-container overlay-dpad">
               <div />
               <button className="move-btn dpad-btn" onClick={() => processMove('FORWARD')}>⬆️</button>
               <div />
               <button className="move-btn dpad-btn" onClick={() => processMove('TURN_LEFT')}>⬅️</button>
               <button className="move-btn dpad-btn" onClick={() => processMove('BACKWARD')}>⬇️</button>
               <button className="move-btn dpad-btn" onClick={() => processMove('TURN_RIGHT')}>➡️</button>
            </div>
          )}
        </div>

        {!isForceMobile && (
          <ControlPanel 
            gameState={gameState}
            party={party}
            activeBattler={activeBattler}
            isAutoBattle={isAutoBattle}
            setIsAutoBattle={setIsAutoBattle}
            handleFight={handleFight}
            castSpell={castSpell}
            processMove={processMove}
            addMessage={addMessage}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isForceMobile={isForceMobile}
            showSpells={showSpells}
            setShowSpells={setShowSpells}
            setShowStatus={setShowStatus}
            setShowMap={setShowMap}
            scenarioData={scenarioData}
          />
        )}
      </div>

      {isForceMobile && (
        <>
          <ControlPanel 
            gameState={gameState}
            party={party}
            activeBattler={activeBattler}
            isAutoBattle={isAutoBattle}
            setIsAutoBattle={setIsAutoBattle}
            handleFight={handleFight}
            castSpell={castSpell}
            processMove={processMove}
            addMessage={addMessage}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isForceMobile={isForceMobile}
            showSpells={showSpells}
            setShowSpells={setShowSpells}
            setShowStatus={setShowStatus}
            setShowMap={setShowMap}
            scenarioData={scenarioData}
          />
          <div className="mobile-log-area" style={{ borderTop: '1px solid #333', background: 'rgba(0,0,0,0.7)' }}>
            <MessageLog 
              messages={messages}
              isForceMobile={isForceMobile}
            />
          </div>
        </>
      )}

      {isForceMobile ? (
        /* モバイル版：オーバーレイとして機能する地図 */
        <LabyrinthMap 
          mapData={mapData}
          playerState={playerState}
          mapEventsData={mapEventsData}
          isForceMobile={isForceMobile}
          showMap={showMap}
          setShowMap={setShowMap}
          scenarioData={scenarioData}
        />
      ) : (
        /* PC版：右側に固定表示されるパネル */
        <div className="pane-right">
          <div className="pane-log-map-wrapper pc-layout">
            <LabyrinthMap 
              mapData={mapData}
              playerState={playerState}
              mapEventsData={mapEventsData}
              isForceMobile={isForceMobile}
              showMap={showMap}
              setShowMap={setShowMap}
              scenarioData={scenarioData}
            />
            <MessageLog 
              messages={messages}
              isForceMobile={isForceMobile}
            />
          </div>
        </div>
      )}

      {/* ダイアログ表示 */}
      {activeDialog && (
        <div className="dialog-overlay" onClick={(e) => {
          if (e.target.className === 'dialog-overlay' && !activeDialog.showChoices) {
            if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
              setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1});
            } else {
              if (activeDialog.onConfirm) activeDialog.onConfirm();
              setActiveDialog(null);
            }
          }
        }}>
          <div className="dialog-title">{activeDialog.title}</div>
          <div className="dialog-content">
            <p>{activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : ''}</p>
            {activeDialog.showChoices ? (
              <div className="dialog-choices">
                <button className="dialog-btn" onClick={() => { if(activeDialog.onConfirm) activeDialog.onConfirm(); setActiveDialog(null); }}>御意</button>
                <button className="dialog-btn" onClick={() => { if(activeDialog.onCancel) activeDialog.onCancel(); setActiveDialog(null); }}>必要なし</button>
              </div>
            ) : (
              <div className="dialog-footer">
                <button className="dialog-btn" onClick={() => {
                  if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
                    setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1});
                  } else {
                    if (activeDialog.onConfirm) activeDialog.onConfirm();
                    setActiveDialog(null);
                  }
                }}>
                  {activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1 ? '続く' : '承知'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* デバッグパネル */}
      {isDebug && (
        <>
          <button 
            className="debug-btn" 
            onClick={() => setShowDebug(!showDebug)} 
            style={{ position: 'fixed', bottom: '5px', left: '5px', zIndex: 10001, padding: '5px 8px', fontSize: '1rem', background: '#222', border: '1px solid var(--primary-gold)' }}
          >
            {showDebug ? '✖' : '🛠️'}
          </button>
          
          {showDebug && (
            <div className="debug-panel" style={{ bottom: '40px', left: '5px' }}>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })))}>全員全快</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: 1, status: '平安' })))} style={{ color: '#f55' }}>瀕死状態</button>
              <button className="debug-btn" onClick={() => setEnemy(e => e ? { ...e, hp: 1 } : null)}>敵一撃</button>
              <button className="debug-btn" onClick={() => { setEnemy(null); setGameState('EXPLORING'); }}>敵消滅</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, exp: m.exp + 2000 })))}>大量功徳</button>
              <button className="debug-btn" onClick={() => {
                const input = prompt("跳躍先の座標(x,y)を入力せよ (例: 9,1)", `${playerState.x},${playerState.y}`);
                if (input) {
                  const [nx, ny] = input.split(',').map(Number);
                  if (!isNaN(nx) && !isNaN(ny)) {
                    setPlayerState({ x: nx, y: ny, dir: DIRECTIONS.S });
                    addMessage(`(x:${nx}, y:${ny}) への神速の跳躍。`, 'event');
                  }
                }
              }} style={{ color: '#f1c40f' }}>神速跳躍</button>
              <button className="debug-btn" onClick={() => { setPlayerState({ x: 1, y: 1, dir: DIRECTIONS.S }); addMessage('社へ帰還。', 'event'); }}>社へ帰還</button>
              <button className="debug-btn" onClick={() => { setMapData(p => p.map(r => r.map(c => ({...c, visited: true})))); addMessage('霧が晴れた。', 'event'); }}>全地図開</button>
              <button className="debug-btn" onClick={() => {
                const eid = prompt("怪異の番付(0-10)を入力せよ (10:鵺)", "10");
                const e = ENEMY_LIST[Number(eid)] || ENEMY_LIST[0];
                setEnemy({ ...e, hp: e.maxHp }); setGameState('BATTLE'); addMessage(`【${e.name}】を召喚。`, 'event');
              }}>怪異召喚</button>
              <button className="debug-btn" onClick={() => { setBossDefeated(!bossDefeated); addMessage(`因縁の変転：ボス討伐状態を ${!bossDefeated} へ。`, 'event'); }}>ボスフラグ</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
