// src/components/status/StatusPane.jsx
import React from 'react';
import { CharacterCard } from './CharacterCard';

/**
 * 隊員のステータス一覧を表示するコンポーネント (左ペイン)
 */
export const StatusPane = ({ 
  party, 
  visualEffects, 
  gameState, 
  activeBattler, 
  isForceMobile, 
  showStatus,
  setShowStatus,
  setShowMap,
  setActiveDialog
}) => {
  const activeClass = showStatus ? 'mobile-active-pane' : '';

  return (
    <div className={`pane-status window ${activeClass}`}>
      {!isForceMobile && <span className="window-title">隊員之証</span>}
      
      {isForceMobile && (
        <div className="mobile-nav-tabs">
          <button className="nav-tab-btn" onClick={() => { setShowStatus(false); setShowMap(false); }}>🏰 迷宮</button>
          <button className="nav-tab-btn" onClick={() => { setShowStatus(false); setShowMap(true); }}>🗺️ 迷宮図</button>
          <button className="nav-tab-btn active">👥 隊員証</button>
        </div>
      )}
      
      <div className="status-grid">
        {party.map((m, i) => (
          <CharacterCard 
            key={i}
            member={m}
            index={i}
            variant="sidebar"
            activeBattler={activeBattler}
            gameState={gameState}
            visualEffects={visualEffects}
            setActiveDialog={setActiveDialog}
          />
        ))}
      </div>
      {isForceMobile && (
        <button className="dialog-btn" onClick={() => setShowStatus(false)} style={{ margin: '20px' }}>
          閉じる
        </button>
      )}
    </div>
  );
};
