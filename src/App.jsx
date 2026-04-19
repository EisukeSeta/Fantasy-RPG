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
import { Logger } from './utils/logger';

import { 
  BOSS_POS, 
  isDebug
} from './constants/gameData';
import { DIRECTIONS } from './data/mapData';
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
    loadGame,
    scenarioData
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

  const [volume] = useState(0.5);
  const [showDebug, setShowDebug] = useState(isDebug);

  const isForceMobile = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mobile') === '1';

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
  const { handleFight, castSpell, combatPhase, finalizeBattle, yugenEnemy } = useCombat();

  useEffect(() => {
    const hk = (e) => {
      if (activeDialog || combatInterjection) return;
      if (gameState === 'EXPLORING') {
        if (e.key === 'w' || e.key === 'ArrowUp') processMove('FORWARD');
        else if (e.key === 's' || e.key === 'ArrowDown') processMove('BACKWARD');
        else if (e.key === 'a' || e.key === 'ArrowLeft') processMove('TURN_LEFT');
        else if (e.key === 'd' || e.key === 'ArrowRight') processMove('TURN_RIGHT');
      } else if (gameState === 'BATTLE' && combatPhase === 'READY') {
        if (e.key === '1') handleFight();
      }
      if (e.key === 'm' || e.key === 'M') toggleView('map');
      else if (e.key === 'i' || e.key === 'I') toggleView('status');
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [gameState, combatPhase, activeDialog, combatInterjection, processMove, toggleView]);

  return (
    <>
      {gameState === 'GAMEOVER' && (
        <div className="boss-intro-overlay" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 10002, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '80%', padding: '20px' }}>
             <h1 style={{ color: '#600', fontSize: '4rem', fontFamily: 'Sawarabi Mincho, serif', textShadow: '0 0 20px #f00' }}>全滅</h1>
             <p style={{ color: '#ccc', fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px' }}>
                一行の魂は闇に呑まれた。
             </p>
             <button className="dialog-btn" onClick={() => handleRestart()}>魂の再生（再開）</button>
          </div>
        </div>
      )}

      <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''} ${isShake || displayShake ? 'shake' : ''}`}>
        {flashColor === 'red' && <div className="flash-red"></div>}
        {flashColor === 'white' && <div className="flash-white"></div>}
        
        {gameState === 'TITLE' && (
          <div className="boss-intro-overlay" style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${TitleBg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', padding: 'clamp(20px, 5vw, 60px)', background: 'rgba(0,0,0,0.7)', borderRadius: '15px', border: '1px solid rgba(241,196,15,0.2)', backdropFilter: 'blur(5px)', width: 'min(90%, 600px)' }}>
              <h1 style={{ color: 'var(--primary-gold)', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', textShadow: '0 0 30px rgba(241,196,15,0.5)', fontFamily: 'Sawarabi Mincho, serif' }}>平安魔道伝</h1>
              <p style={{ color: '#fff', fontSize: 'clamp(1rem, 4vw, 1.8rem)', letterSpacing: '8px', margin: '20px 0', opacity: 0.8 }}>羅生門編・第一章</p>
              
              <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <button className="dialog-btn" onClick={() => { 
                  SoundEngine.init(); 
                  SoundEngine.setVolume(volume); 
                  setActiveDialog({ 
                    title: scenarioData.events.prologue.title, 
                    pages: scenarioData.events.prologue.pages, 
                    currentPage: 0, 
                    isStory: true,
                    onConfirm: () => setGameState('EXPLORING')
                  }); 
                }}>旅を始める</button>

                {localStorage.getItem('RASHOMON_SAVE_V1') && (
                  <button className="dialog-btn" onClick={() => { 
                    SoundEngine.init(); 
                    const data = loadGame(); 
                    if (data) setGameState('EXPLORING'); 
                  }}>旅路の続きを追う</button>
                )}
              </div>
              <div style={{ marginTop: '40px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>&copy; Antigravity RPG System - Rashomon v{packageJson.version}</div>
            </div>
          </div>
        )}

        <GameArea 
          gameState={gameState}
          combatPhase={"IDLE"}
          party={party}
          activeBattlerIndex={null}
          visualEffects={visualEffects}
          isForceMobile={isForceMobile} 
          showStatus={showStatus}
          setShowStatus={setShowStatus}
          setActiveDialog={setActiveDialog}
          mapData={mapData}
          playerState={playerState} 
          processMove={processMove}
          enemy={enemy}
          showVictory={false}
          isAutoBattle={false}
          setIsAutoBattle={() => {}}
          handleFight={handleFight}
          castSpell={castSpell}
          addMessage={addMessage}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          showSpells={null}
          setShowSpells={() => {}}
          showMap={showMap}
          setShowMap={setShowMap}
          scenarioData={scenarioData}
          messages={messages}
          mapEventsData={mapEventsData}
          saveGame={saveGame}
          setShowGrimoire={setShowGrimoire}
          setShowArchives={setShowArchives}
          setShowShortcutHelp={setShowShortcutHelp}
        />

        <DialogManager 
          gameState={gameState} 
          activeDialog={activeDialog} 
          setActiveDialog={setActiveDialog} 
          combatInterjection={combatInterjection} 
          setCombatInterjection={setCombatInterjection} 
        />

        {yugenEnemy && <YugenOverlay enemy={yugenEnemy} onClose={finalizeBattle} />}
        {showArchives && <ArchivesView onClose={() => setShowArchives(false)} defaultTab={archivesTab} />}
        {showGrimoire && <SpellGrimoire isOpen={showGrimoire} onClose={() => setShowGrimoire(false)} />}
        {showShortcutHelp && <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />}
      </div>
    </>
  );
}

export default App;
