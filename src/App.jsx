import { useState, useEffect, useCallback } from 'react';
import { generateMap, DIRECTIONS, MAP_WIDTH, MAP_HEIGHT } from './data/mapData';
import TitleBg from './images/闇夜の平安京.png';
import packageJson from '../package.json';
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
  isDebug,
  CHAR_IMAGES,
  DIALOG_SPEAKERS
} from './constants/gameData';

import balanceData from './data/Balance.json';
import scenarioData from './data/Scenario.json';
import charactersData from './data/Characters.json';
import mapEventsData from './data/MapEvents.json';

import { useNavigation } from './hooks/useNavigation';
import { useCombat } from './hooks/useCombat';

function App() {
  const [gameState, setGameState] = useState('TITLE'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(isDebug);
  const [isShake, setIsShake] = useState(false);
  const [party, setParty] = useState(charactersData.map(c => ({ ...c })));
  const [bossDefeated, setBossDefeated] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDebug, setShowDebug] = useState(isDebug);
  const [visualEffects, setVisualEffects] = useState([]); // { id, target, value, type }
  const [flashColor, setFlashColor] = useState(null); // 'red', etc.
  const [displayShake, setDisplayShake] = useState(null); // 'normal', 'heavy'
  const [enemy, setEnemy] = useState(null);
  const [activeDialog, setActiveDialog] = useState(null); // 開始時にダイアログは表示しない
  const [forceLoot, setForceLoot] = useState(false);
  const [combatInterjection, setCombatInterjection] = useState(null); // { member, quotes, currentPage, onClose }

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
    setGameState, setEnemy, setIsShake, setActiveDialog, setParty, scenarioData, mapEventsData
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
    setPlayerState, setMapData, setActiveDialog, setBossDefeated, forceLoot, activeDialog,
    combatInterjection, setCombatInterjection
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

  const handleRestart = useCallback(() => {
    setGameState('EXPLORING');
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
    setParty(charactersData.map(c => ({ ...c, items: [] })));
    setMapData(generateMap());
    setMessages([{ text: scenarioData.events.gameStart, type: 'event' }]);
    setBossDefeated(false);
    setActiveDialog(null);
    setEnemy(null);
    SoundEngine.transitionTo('EXPLORING');
  }, [setPlayerState, setParty, setMapData, setMessages, setBossDefeated, setGameState, setActiveDialog, setEnemy]);

  const partyInDanger = party.some(m => m.hp > 0 && (m.hp <= m.maxHp * 0.2 || m.hp === 1));

  return (
    <>
      {/* ゲームオーバー（終焉）表示：最上位に配置して中央揃えを確実に */}
      {gameState === 'GAMEOVER' && (
        <div className="boss-intro-overlay" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 30000, flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', margin: 0, padding: 0 }}>
          <div style={{ textAlign: 'center', maxWidth: '80%', padding: '20px' }}>
             <h1 style={{ color: '#600', fontSize: '4rem', fontFamily: 'Sawarabi Mincho, serif', textShadow: '0 0 10px #000', marginBottom: '10px' }}>終焉</h1>
             <p style={{ color: '#ccc', fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px' }}>
                {(() => {
                  const data = scenarioData.events.badEnding;
                  if (typeof data === 'string') return data;
                  if (data.pages && data.pages.length > 0) {
                    const lastPage = data.pages[data.pages.length - 1];
                    return typeof lastPage === 'object' ? lastPage.text : lastPage;
                  }
                  return '';
                })()}
             </p>
             <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
               <button className="dialog-btn" onClick={handleRestart}>物語を再び辿る</button>
               <button className="dialog-btn" style={{ opacity: 0.6 }} onClick={() => setGameState('FINISHED')}>終了</button>
             </div>
          </div>
        </div>
      )}

      {/* 真の終焉（完全に終了） */}
      {gameState === 'FINISHED' && (
        <div className="boss-intro-overlay" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 40000, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', margin: 0, padding: 0 }}>
          <div style={{ textAlign: 'center', maxWidth: '80%' }}>
             <p style={{ color: '#888', fontSize: '1.2rem', fontStyle: 'italic', lineHeight: '2' }}>
                {(() => {
                  const data = scenarioData.events.totalSilence;
                  return typeof data === 'string' ? data : (data.pages?.[0]?.text || '');
                })()}
             </p>
             <div style={{ marginTop: '100px', color: '#333', fontSize: '1rem', letterSpacing: '10px' }}>完</div>
          </div>
        </div>
      )}

      <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''} ${isShake || displayShake === 'normal' ? 'shake-anim' : ''} ${displayShake === 'heavy' ? 'shake-heavy' : ''} ${partyInDanger ? 'danger-state' : ''}`}>
        {/* 閃光エフェクト */}
        {flashColor === 'red' && <div className="flash-red"></div>}
        
        {/* 真・タイトル画面（闇夜の平安京） */}
        {gameState === 'TITLE' && (
          <div className="boss-intro-overlay" style={{ 
            position: 'fixed',
            inset: 0,
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${TitleBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 30000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
              textAlign: 'center', 
              animation: 'fadeIn 2s ease-out',
              padding: 'clamp(20px, 5vw, 60px)',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(184, 154, 66, 0.4)',
              boxShadow: '0 0 40px rgba(0,0,0,0.8)',
              width: '90%',
              maxWidth: '600px'
            }}>
              <h1 style={{ 
                color: 'var(--primary-gold)', 
                fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
                textShadow: '0 0 10px rgba(184, 154, 66, 0.8), 2px 2px 4px #000',
                fontFamily: 'Sawarabi Mincho, serif',
                margin: 0,
                letterSpacing: 'min(15px, 3vw)'
              }}>
                平安魔道伝
              </h1>
              <p style={{ 
                color: '#fff', 
                fontSize: 'clamp(1rem, 4vw, 1.8rem)', 
                letterSpacing: '8px', 
                marginTop: '10px',
                fontFamily: 'Sawarabi Mincho, serif',
                opacity: 0.8
              }}>
                羅生門編・第一章
              </p>
              
              <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'center' }}>
                <button className="dialog-btn" onClick={() => {
                  setAudioInitialized(true);
                  SoundEngine.init();
                  SoundEngine.transitionTo('EXPLORING');
                  setGameState('EXPLORING');
                  setActiveDialog({ ...scenarioData.opening, currentPage: 0, bgImage: TitleBg, isStory: true });
                }} style={{ 
                  padding: '15px 40px', 
                  fontSize: '1.4rem',
                  boxShadow: '0 0 15px rgba(184, 154, 66, 0.4)'
                }}>
                  魂の旅を始める
                </button>
              </div>

              {bossDefeated && (
                <div style={{ marginTop: '30px' }}>
                  <button className="dialog-btn" onClick={() => window.location.reload()} style={{ opacity: 0.7 }}>
                    再び都を救う（転生）
                  </button>
                </div>
              )}
              
              <div style={{ marginTop: '40px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                &copy; Antigravity RPG System - Rashomon v{packageJson.version}
              </div>
            </div>
          </div>
        )}
      
      {/* --- メインUI（探索・戦闘中のみ表示） --- */}
      {(gameState === 'EXPLORING' || gameState === 'BATTLE') && (
        <>
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
        </>
      )}

      {/* 共通ダイアログシステム（肖像画・名前対応） */}
      {activeDialog && (
        <div className={`dialog-overlay ${gameState === 'BATTLE' ? 'battle-interjection' : ''} ${activeDialog.isStory ? 'story-mode-overlay' : ''}`} 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: activeDialog.bgImage ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), radial-gradient(circle, transparent 20%, rgba(0,0,0,0.8) 100%), url(${activeDialog.bgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 30000,
            display: 'flex',
            flexDirection: activeDialog.isStory ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: activeDialog.isStory ? '40px 20px' : '0'
          }}
          onClick={(e) => {
            // 選択肢が表示されている間は、誤操作防止のため画面全体のクリックを無効化する
            if (activeDialog.showChoices) return;

            if (activeDialog.isStory || e.target.className.includes('dialog-overlay')) {
              if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
                setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1});
              } else {
                if (activeDialog.onConfirm) activeDialog.onConfirm();
                setActiveDialog(null);
              }
            }
          }}
        >
          {activeDialog.isStory ? (
            /* 幽玄モード：枠無し・中央特大文字 */
            <div style={{ 
              width: '85%', 
              maxWidth: '1200px', 
              textAlign: 'center', 
              animation: 'fadeInText 2.5s ease-out',
              color: '#fff',
              textShadow: '0 0 30px rgba(0,0,0,1), 0 0 15px rgba(184, 154, 66, 0.4)'
            }}>
              {/* 肖像と名前：背景に溶け込む演出 */}
              {(() => {
                const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : null;
                let speakerKey = null;
                if (currentPage && typeof currentPage === 'object' && currentPage.speaker) {
                  speakerKey = currentPage.speaker;
                } else if (activeDialog.speakers && activeDialog.speakers[activeDialog.currentPage]) {
                  speakerKey = activeDialog.speakers[activeDialog.currentPage].split('.')[0];
                }
                const speakerInfo = DIALOG_SPEAKERS[speakerKey];
                if (speakerInfo && speakerInfo.image) {
                  return (
                    <div className="story-speaker-spirit" style={{ marginBottom: '40px', animation: 'fadeIn 2s ease-out' }}>
                      <div className="spirit-portrait">
                        <img src={speakerInfo.image} alt={speakerInfo.name} />
                      </div>
                      <div className="spirit-name" style={{ color: 'var(--primary-gold)', fontSize: '1.4rem', marginTop: '10px', letterSpacing: '8px', textShadow: '0 0 10px rgba(184, 154, 66, 0.6)' }}>
                        {speakerInfo.name}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="story-mode-text-wrapper" style={{ 
                fontFamily: 'Sawarabi Mincho, serif', 
                fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
                lineHeight: 2.0,
                letterSpacing: '0.4em',
                marginBottom: '10vh',
                maxWidth: '90%',
                whiteSpace: 'pre-wrap'
              }}>
                {(() => {
                  const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : '';
                  return typeof currentPage === 'object' ? currentPage.text : currentPage;
                })()}
              </div>
              
              {activeDialog.showChoices ? (
                <div className="dialog-footer" style={{ border: 'none', background: 'transparent', justifyContent: 'center', gap: '40px' }}>
                  <button className="btn-shura" style={{ padding: '15px 40px', fontSize: '1.2rem' }} onClick={() => { if (activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}> {activeDialog.labelConfirm || "御意"} </button>
                  <button className="btn-kegare" style={{ padding: '15px 40px', fontSize: '1.2rem' }} onClick={() => { if (activeDialog.onCancel) activeDialog.onCancel(); else setActiveDialog(null); }}> {activeDialog.labelCancel || "撤退"} </button>
                </div>
              ) : (
                <div style={{ fontSize: '1.2rem', opacity: 0.5, letterSpacing: '0.6em', animation: 'pulse-story 3s infinite', fontFamily: 'Sawarabi Mincho, serif' }}>
                  ‥ 次第を追う ‥
                </div>
              )}
            </div>
          ) : (
            /* 通常モード：肖像画あり・ウィンドウ枠あり */
            <div className="dialog-window" style={{ background: activeDialog.bgImage ? 'rgba(10, 10, 10, 0.4)' : 'rgba(10, 10, 10, 0.95)', border: activeDialog.bgImage ? '1px solid rgba(184, 154, 66, 0.4)' : '2px solid var(--primary-gold)' }}>
              <div className="dialog-title">{activeDialog.title}</div>
              <div className="dialog-content">
                {/* 発話者アイコンの表示（構造化データまたはレガシー配列に対応） */}
                {(() => {
                  const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : null;
                  let speakerKey = null;

                  if (currentPage && typeof currentPage === 'object' && currentPage.speaker) {
                    speakerKey = currentPage.speaker;
                  } else if (activeDialog.speakers && activeDialog.speakers[activeDialog.currentPage]) {
                    speakerKey = activeDialog.speakers[activeDialog.currentPage].split('.')[0];
                  }

                  const speakerInfo = DIALOG_SPEAKERS[speakerKey];
                  if (speakerInfo && speakerInfo.image) {
                    return (
                      <>
                        <div className="dialog-speaker">
                          <img src={speakerInfo.image} alt={speakerInfo.name || "speaker"} />
                        </div>
                        {speakerInfo.name && <div className="dialog-speaker-name">{speakerInfo.name}</div>}
                      </>
                    );
                  }
                  return null;
                })()}
                <p>
                  {(() => {
                    const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : '';
                    return typeof currentPage === 'object' ? currentPage.text : currentPage;
                  })()}
                </p>
                {activeDialog.showChoices ? (
                  <div className="dialog-footer">
                    <button className="btn-shura" onClick={() => { if (activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}> {activeDialog.labelConfirm || "御意"} </button>
                    <button className="btn-kegare" onClick={() => { if (activeDialog.onCancel) activeDialog.onCancel(); else setActiveDialog(null); }}> {activeDialog.labelCancel || "撤退"} </button>
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
        </div>
      )}

      {/* 合戦専用：差し込みウィンドウ（独白・検分など） */}
      {combatInterjection && (
        <div className="combat-interjection-overlay">
          <div className="combat-interjection-window window">
            <div className="interjection-speaker">
              <img src={CHAR_IMAGES[combatInterjection.member.image]} alt="interjection-speaker" />
            </div>
            <div className="interjection-content">
              <div className="interjection-name">{combatInterjection.member.name}</div>
              <p>{combatInterjection.quotes[combatInterjection.currentPage].text}</p>
              <div style={{ textAlign: 'right' }}>
                <button className="dialog-btn" onClick={() => {
                  if (combatInterjection.currentPage < combatInterjection.quotes.length - 1) {
                    setCombatInterjection({ ...combatInterjection, currentPage: combatInterjection.currentPage + 1 });
                  } else {
                    const callback = combatInterjection.onClose;
                    setCombatInterjection(null);
                    if (callback) callback();
                  }
                }}>
                  {combatInterjection.currentPage < combatInterjection.quotes.length - 1 ? "続く" : "承知"}
                </button>
              </div>
            </div>
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
                    addMessage("(x:" + nx + ", y:" + ny + ") への神速の跳躍。", "event");
                  }
                }
              }} style={{ color: '#f1c40f' }}>神速跳躍</button>
              <button className="debug-btn" onClick={() => { setPlayerState({ x: 1, y: 1, dir: DIRECTIONS.S }); addMessage("社へ帰還。", "event"); }}>社へ帰還</button>
              <button className="debug-btn" onClick={() => { setMapData(p => p.map(r => r.map(c => ({...c, visited: true})))); addMessage("霧が晴れた。", "event"); }}>全地図開</button>
              <button className="debug-btn" onClick={() => {
                const eid = prompt("怪異の番付(0-10)を入力せよ (10:鵺)", "10");
                const e = ENEMY_LIST[Number(eid)] || ENEMY_LIST[0];
                setEnemy({ ...e, hp: e.maxHp }); setGameState('BATTLE'); addMessage("【" + e.name + "】を召喚。", "event");
              }}>怪異召喚</button>
              <button className="debug-btn" onClick={() => { setBossDefeated(!bossDefeated); addMessage("因縁の変転：ボス討伐状態を " + (!bossDefeated) + " へ。", "event"); }}>ボスフラグ</button>
              <button 
                className="debug-btn" 
                onClick={() => { setForceLoot(!forceLoot); addMessage("武勲の理：ドロップ必中を " + (!forceLoot) + " へ。", "event"); }}
                style={{ color: forceLoot ? '#f1c40f' : '#666' }}
              >
                武勲必中: {forceLoot ? "ON" : "OFF"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

export default App;
