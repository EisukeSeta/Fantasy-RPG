// src/components/navigation/LabyrinthMap.jsx
import React, { useState } from 'react';
import { ICON_MAPPING } from '../../constants/gameData';
import { MAP_WIDTH } from '../../data/mapData';

/**
 * 迷宮の踏破状況を表示する地図コンポーネント (ピンチズーム対応)
 */
export const LabyrinthMap = ({ 
  mapData, 
  playerState, 
  mapEventsData, 
  isForceMobile, 
  showMap, 
  setShowMap,
  scenarioData
}) => {
  const [mapZoom, setMapZoom] = useState(1);
  const [lastDist, setLastDist] = useState(0);
  
  const activeClass = showMap ? 'mobile-active-pane' : '';

  return (
    <div className={`pane-map window ${activeClass}`}>
      <span className="window-title">
        {scenarioData.ui.labyrinthMap} 
        <span style={{ color: 'var(--soft-gold)', marginLeft: '15px', textShadow: '0 0 10px rgba(184, 154, 66, 0.8)' }}>
          〔 {playerState.x}, {playerState.y} 〕
        </span>
      </span>
      
      {isForceMobile && (
        <div className="mobile-nav-tabs">
          <button className="nav-tab-btn" onClick={() => setShowMap(false)}>🏰 迷宮</button>
          <button className="nav-tab-btn active">🗺️ 迷宮図</button>
        </div>
      )}
      
      <div 
        className="map-view-area"
        style={{ 
          flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', background: '#000', overflow: 'hidden', touchAction: 'none' 
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            setLastDist(d);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            if (lastDist > 0) {
              const diff = d - lastDist;
              setMapZoom(prev => Math.min(2.5, Math.max(0.5, prev + diff * 0.005)));
            }
            setLastDist(d);
          }
        }}
        onTouchEnd={() => setLastDist(0)}
      >
        <div style={{ transform: `scale(${mapZoom})`, transition: 'transform 0.1s ease-out', display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 22px)`, gap: 0, border: '1px solid #111' }}>
          {mapData.map((row, y) => row.map((cell, x) => {
            const ev = mapEventsData.events.find(e => e.x === x && e.y === y);
            const isPlayer = playerState.x === x && playerState.y === y;
            return (
              <div 
                key={`${x}-${y}`} 
                className={`map-cell ${cell.visited ? 'visited' : ''} ${isPlayer ? 'player' : ''}`}
                style={cell.visited ? {
                  borderTop: cell.n ? '2.5px solid var(--primary-gold)' : '1px solid #1a1a1a',
                  borderBottom: cell.s ? '2.5px solid var(--primary-gold)' : '1px solid #1a1a1a',
                  borderLeft: cell.w ? '2.5px solid var(--primary-gold)' : '1px solid #1a1a1a',
                  borderRight: cell.e ? '2.5px solid var(--primary-gold)' : '1px solid #1a1a1a',
                  boxSizing: 'border-box'
                } : {}}
              >
                {cell.visited && !isPlayer && ev && (ICON_MAPPING[ev.type] || '')}
                {isPlayer && <span className="player-icon" style={{ transform: `rotate(${playerState.dir * 90}deg)` }}>▲</span>}
              </div>
            );
          }))}
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '0.75rem', color: '#aaa', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {mapEventsData.legend.map((l, idx) => (
            <span key={idx} style={{ textAlign: 'center' }}>{l.icon}:{l.name}</span>
          ))}
        </div>
        
        {isForceMobile && (
          <button className="dialog-btn" onClick={() => setShowMap(false)} style={{ marginTop: '30px', width: '80%', flexShrink: 0 }}>
            閉じる
          </button>
        )}
      </div>
    </div>
  );
};
