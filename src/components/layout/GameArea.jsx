import React from 'react';
import { StatusPane } from '../status/StatusPane';
import { WireframeView } from '../WireframeView';
import { CombatArea } from '../battle/CombatArea';
import { CharacterCard } from '../status/CharacterCard';
import { ControlPanel } from '../navigation/ControlPanel';
import { MessageLog } from '../navigation/MessageLog';
import { LabyrinthMap } from '../navigation/LabyrinthMap';

/**
 * 都の活動領域（探索・合戦）を統括する器。
 * PC版の3ペイン構造およびモバイル版の縦積構造を制御する。
 */
const GameArea = ({
  gameState,
  party,
  activeBattler,
  visualEffects,
  isForceMobile,
  showStatus,
  setShowStatus,
  setActiveDialog,
  mapData,
  playerState,
  processMove,
  enemy,
  showVictory,
  isAutoBattle,
  setIsAutoBattle,
  handleFight,
  castSpell,
  addMessage,
  isMuted,
  setIsMuted,
  showSpells,
  setShowSpells,
  showMap,
  setShowMap,
  scenarioData,
  messages,
  mapEventsData,
  setShowGrimoire,
  setShowArchives,
  saveGame
}) => {
  if (gameState !== 'EXPLORING' && gameState !== 'BATTLE') return null;

  return (
    <>
      <StatusPane 
        party={party}
        activeBattler={activeBattler}
        gameState={gameState}
        visualEffects={visualEffects}
        isForceMobile={isForceMobile}
        showStatus={showStatus}
        setShowStatus={setShowStatus}
        setActiveDialog={setActiveDialog}
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
            saveGame={saveGame}
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
              setShowGrimoire={setShowGrimoire}
              setShowArchives={setShowArchives}
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
              setShowGrimoire={setShowGrimoire}
              setShowArchives={setShowArchives}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default GameArea;
