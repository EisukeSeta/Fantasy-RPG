import { useState, useCallback, useEffect } from 'react';
import TitleBg from './images/闇夜の平安京.png';
import packageJson from '../package.json';
import { ENEMY_LIST } from './data/enemyData';
import GameArea from './components/layout/GameArea';
import DialogManager from './components/ui/DialogManager';
import { SpellGrimoire } from './components/ui/SpellGrimoire';
import { ArchivesView } from './components/ui/ArchivesView';
import { YugenOverlay } from './components/ui/YugenOverlay';
import { ShortcutHelp } from './components/ui/ShortcutHelp';
import SoundEngine from './utils/SoundEngine';

import { 
  BOSS_POS, 
  isDebug
} from './constants/gameData';
import { DIRECTIONS } from './data/mapData';
import scenarioData from './data/Scenario.json';
import mapEventsData from './data/MapEvents.json';

import { useNavigation } from './hooks/useNavigation';
import { useCombat } from './hooks/useCombat';
import { useGame } from './hooks/useGame';
import { useUIState } from './hooks/useUIState.jsx';

/**
 * 羅生門 RPG: メインアプリケーション
 */
function App() {
  const {
    gameState, setGameState,
    messages, setMessages,
    playerState, setPlayerState,
    party, setParty,
    mapData, setMapData,
    bossDefeated, setBossDefeated,
    enemy, setEnemy,
    activeDialog, setActiveDialog,
    combatInterjection, setCombatInterjection,
    isShake,
    visualEffects,
    flashColor,
    displayShake,
    isMuted, setIsMuted,
    handleRestart,
    saveGame,
    loadGame
  } = useGame();

  const {
    showGrimoire, setShowGrimoire,
    showArchives, setShowArchives,
    archivesTab,
    showShortcutHelp, setShowShortcutHelp,
    showStatus, setShowStatus,
    showMap, setShowMap,
    toggleView
  } = useUIState();

  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume] = useState(0.5);
  const [showDebug, setShowDebug] = useState(isDebug);
  const [forceLoot, setForceLoot] = useState(false);
  const [forceHit, setForceHit] = useState(false);

  const isForceMobile = (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) || new URLSearchParams(window.location.search).get('mobile') === '1';

  const addMessage = useCallback((msg, providedType = null) => {
    let type = providedType || 'normal';
    if (!providedType) {
      if (msg.includes('ダメージ') || msg.includes('傷') || msg.includes('痛打')) type = 'damage_party';
      if (msg.includes('回復') || msg.includes('全快') || msg.includes('癒えた')) type = 'heal';
      if (msg.includes('昇格') || msg.includes('レベルアップ') || msg.includes('功徳')) type = 'level_up';
      if (msg.includes('這い出た') || msg.includes('震撼') || msg.includes('気配') || msg.includes('立ちはだかった')) type = 'event'; 
    }
    setMessages(prev => [...prev, { text: msg, type }].slice(-30));
  }, [setMessages]);

  const { processMove } = useNavigation();
  
  // useCombat から必要な状態とアクションを取得
  const {
    activeBattler,
    isAutoBattle,
    setIsAutoBattle,
    showVictory,
    showSpells,
    setShowSpells,
    handleFight,
    castSpell,
    yugenEnemy,
    setYugenEnemy,
    finalizeBattle
  } = useCombat(null, forceHit);

  const initAudio = useCallback(() => {
    SoundEngine.init(); SoundEngine.setVolume(isMuted ? 0 : volume); SoundEngine.transitionTo(gameState);
    if (!isAudioInitialized) { setAudioInitialized(true); addMessage('⛩️ 奏曲が初期化されました。', 'level_up'); }
  }, [gameState, volume, isMuted, isAudioInitialized, addMessage]);

  useEffect(() => {
    const unlock = () => { initAudio(); window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
    window.addEventListener('click', unlock); window.addEventListener('touchstart', unlock);
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
  }, [initAudio]);

  useEffect(() => {
    const hk = (e) => {
      if (gameState !== 'EXPLORING' && gameState !== 'BATTLE') return;
      if (activeDialog) return;

      const key = e.key.toLowerCase();
      
      if (e.key === 'w' || e.key === 'ArrowUp') processMove('FORWARD');
      else if (e.key === 's' || e.key === 'ArrowDown') processMove('BACKWARD');
      else if (e.key === 'a' || e.key === 'ArrowLeft') processMove('TURN_LEFT');
      else if (e.key === 'd' || e.key === 'ArrowRight') processMove('TURN_RIGHT');
      else if (key === 'k') toggleView('GRIMOIRE');
      else if (key === 'v') toggleView('ARCHIVES');
      else if (key === 'h' || e.key === '?') toggleView('SHORTCUTS');
      else if (key === 'c') toggleView('STATUS');
      else if (key === 'm') toggleView('MAP');
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [gameState, activeDialog, processMove, toggleView]);

  const partyInDanger = party.some(m => m.hp > 0 && (m.hp <= m.maxHp * 0.2 || m.hp === 1));

  return (
    <>
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
               <button className="dialog-btn" onClick={() => { handleRestart(); setActiveDialog({ title: "【再起の儀】", speaker: "abe_seimei", pages: ["……戻ったのか。この社の風、御神木の香りがする。息を吹き返した心地よ……。"], currentPage: 0, bgImage: TitleBg, isStory: true }); }}>物語を再び辿る</button>
               <button className="dialog-btn" style={{ opacity: 0.6 }} onClick={() => setGameState('FINISHED')}>終了</button>
             </div>
          </div>
        </div>
      )}

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
        {flashColor === 'red' && <div className="flash-red"></div>}
        
        {gameState === 'TITLE' && (
          <div className="boss-intro-overlay" style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${TitleBg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', animation: 'fadeIn 2s ease-out', padding: 'clamp(20px, 5vw, 60px)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(184, 154, 66, 0.4)', boxShadow: '0 0 40px rgba(0,0,0,0.8)', width: '90%', maxWidth: '600px' }}>
              <h1 style={{ color: 'var(--primary-gold)', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', textShadow: '0 0 10px rgba(184, 154, 66, 0.8), 2px 2px 4px #000', fontFamily: 'Sawarabi Mincho, serif', margin: 0, letterSpacing: 'min(15px, 3vw)' }}>平安魔道伝</h1>
              <p style={{ color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.8rem)', letterSpacing: '8px', marginTop: '10px', fontFamily: 'Sawarabi Mincho, serif', opacity: 0.8 }}>羅生門編・第一章</p>
              
              <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                {localStorage.getItem('RASHOMON_SAVE_V1') ? (
                  <>
                    <button className="dialog-btn" onClick={() => { setAudioInitialized(true); SoundEngine.init(); SoundEngine.transitionTo('EXPLORING'); setActiveDialog({ ...scenarioData.opening, currentPage: 0, bgImage: TitleBg, isStory: true, onConfirm: () => { setGameState('EXPLORING'); } }); }} style={{ padding: '12px 40px', fontSize: '1.2rem', width: '260px', boxShadow: '0 0 15px rgba(184, 154, 66, 0.4)' }}>一から旅を始める</button>
                    <button className="dialog-btn" onClick={() => { const success = loadGame(); if (success) { setAudioInitialized(true); SoundEngine.init(); SoundEngine.transitionTo('EXPLORING'); setGameState('EXPLORING'); addMessage("……途切れた意識の先、再び平安の闇が口を開く。", "event"); } }} style={{ padding: '12px 40px', fontSize: '1.2rem', width: '260px', backgroundColor: 'rgba(184, 154, 66, 0.1)', borderStyle: 'dashed' }}>過去の記憶を辿る</button>
                  </>
                ) : (
                  <button className="dialog-btn" onClick={() => { setAudioInitialized(true); SoundEngine.init(); SoundEngine.transitionTo('EXPLORING'); setActiveDialog({ ...scenarioData.opening, currentPage: 0, bgImage: TitleBg, isStory: true, onConfirm: () => { setGameState('EXPLORING'); } }); }} style={{ padding: '15px 40px', fontSize: '1.4rem', width: '300px', boxShadow: '0 0 20px rgba(184, 154, 66, 0.5)' }}>旅を始める</button>
                )}
              </div>
              <div style={{ marginTop: '40px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>&copy; Antigravity RPG System - Rashomon v{packageJson.version}</div>
            </div>
          </div>
        )}
      
      <GameArea 
        gameState={gameState} party={party} activeBattler={activeBattler} visualEffects={visualEffects} isForceMobile={isForceMobile} 
        showStatus={showStatus} setShowStatus={setShowStatus} setActiveDialog={setActiveDialog} mapData={mapData} playerState={playerState} 
        processMove={processMove} enemy={enemy} showVictory={showVictory} isAutoBattle={isAutoBattle} setIsAutoBattle={setIsAutoBattle}
        handleFight={handleFight} castSpell={castSpell} addMessage={addMessage} isMuted={isMuted} setIsMuted={setIsMuted}
        showSpells={showSpells} setShowSpells={setShowSpells} showMap={showMap} setShowMap={setShowMap} scenarioData={scenarioData}
        messages={messages} mapEventsData={mapEventsData} setShowGrimoire={setShowGrimoire} setShowArchives={setShowArchives} setShowShortcutHelp={setShowShortcutHelp} saveGame={saveGame}
      />

      <DialogManager gameState={gameState} activeDialog={activeDialog} setActiveDialog={setActiveDialog} combatInterjection={combatInterjection} setCombatInterjection={setCombatInterjection} />

      {/* --- 全画面モーダル UI（優先度最高） --- */}
      {yugenEnemy && <YugenOverlay enemy={yugenEnemy} onClose={finalizeBattle} />}
      {showArchives && <ArchivesView onClose={() => setShowArchives(false)} defaultTab={archivesTab} />}
      {showGrimoire && <SpellGrimoire isOpen={showGrimoire} onClose={() => setShowGrimoire(false)} />}
      {showShortcutHelp && <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />}

      {isDebug && (
        <>
          <button className="debug-btn" onClick={() => setShowDebug(!showDebug)} style={{ position: 'fixed', bottom: '5px', left: '5px', zIndex: 10001, padding: '5px 8px', fontSize: '1rem', background: '#222', border: '1px solid var(--primary-gold)' }}>{showDebug ? '✖' : '🛠️'}</button>
          {showDebug && (
            <div className="debug-panel" style={{ bottom: '40px', left: '5px' }}>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })))}>全員全快</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: 1, status: '平安' })))} style={{ color: '#f55' }}>瀕死状態</button>
              <button className="debug-btn" onClick={() => setEnemy(e => e ? { ...e, hp: 1 } : null)}>敵一撃</button>
              <button className="debug-btn" onClick={() => { setEnemy(null); setGameState('EXPLORING'); }}>敵消滅</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, exp: m.exp + 2000 })))}>大量功徳</button>
              <button className="debug-btn" onClick={() => { const input = prompt("跳躍先の座標(x,y)を入力せよ", `${playerState.x},${playerState.y}`); if (input) { const [nx, ny] = input.split(',').map(Number); if (!isNaN(nx) && !isNaN(ny)) { setPlayerState({ x: nx, y: ny, dir: DIRECTIONS.S }); addMessage("(x:" + nx + ", y:" + ny + ") への神速の跳躍。", "event"); } } }} style={{ color: '#f1c40f' }}>神速跳躍</button>
              <button className="debug-btn" onClick={() => { setPlayerState({ x: 1, y: 1, dir: DIRECTIONS.S }); addMessage("社へ帰還。", "event"); }}>社へ帰還</button>
              <button className="debug-btn" onClick={() => { setMapData(p => p.map(r => r.map(c => ({...c, visited: true})))); addMessage("霧が晴れた。", "event"); }}>全地図開</button>
              <button className="debug-btn" onClick={() => { const eid = prompt("怪異の番付(0-10)を入力せよ", "10"); const e = ENEMY_LIST[Number(eid)] || ENEMY_LIST[0]; setEnemy({ ...e, hp: e.maxHp }); setGameState('BATTLE'); addMessage("【" + e.name + "】を召喚。", "event"); }}>怪異召喚</button>
              <button className="debug-btn" onClick={() => { setBossDefeated(!bossDefeated); addMessage("因縁の変転：ボス討伐状態を " + (!bossDefeated) + " へ。", "event"); }}>ボスフラグ</button>
              <button className="debug-btn" onClick={() => { setForceLoot(!forceLoot); addMessage("武勲の理：ドロップ必中を " + (!forceLoot) + " へ。", "event"); }} style={{ color: forceLoot ? '#f1c40f' : '#666' }}>武勲必中: {forceLoot ? "ON" : "OFF"}</button>
              <button className="debug-btn" onClick={() => { setForceHit(!forceHit); addMessage("神速の理：攻撃必中を " + (!forceHit) + " へ。", "event"); }} style={{ color: forceHit ? '#f1c40f' : '#666' }}>神速必中: {forceHit ? "ON" : "OFF"}</button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

export default App;
