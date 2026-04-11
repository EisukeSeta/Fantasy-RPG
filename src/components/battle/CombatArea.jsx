// src/components/battle/CombatArea.jsx
import React from 'react';
import { ENEMY_IMAGES } from '../../constants/gameData';

/**
 * 戦闘中の敵表示と演出を担当するコンポーネント
 */
export const CombatArea = ({ 
  enemy, 
  visualEffects, 
  showVictory, 
  gameState 
}) => {
  if (gameState !== 'BATTLE' || !enemy) return null;

  return (
    <div className={`pane-enemy ${enemy.isBoss ? 'boss-aura' : ''}`} style={{ position: 'relative', overflow: 'visible' }}>
      {/* 敵側のポップアップ演出 */}
      {visualEffects.filter(e => e.target === 'enemy').map(e => (
        <div 
          key={e.id} 
          className={`popup-number ${e.type === 'damage' ? 'popup-damage' : 'popup-heal'}`} 
          style={{ left: '50%', top: '30%', zIndex: 10001, fontSize: '2.8rem' }}
        >
          {e.value}
        </div>
      ))}

      {/* 勝利スプラッシュ (怪異調伏) */}
      {showVictory && (
        <div className="victory-splash" style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'radial-gradient(circle, rgba(184, 154, 66, 0.45) 0%, transparent 85%)', 
          zIndex: 10002, 
          borderRadius: '8px', 
          animation: 'victoryIn 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards' 
        }}>
          <div style={{ 
            color: '#fff', 
            fontSize: '3.6rem', 
            fontWeight: 'bold', 
            textShadow: '0 0 20px #b89a42, 0 0 40px #fff, 0 0 10px #000', 
            fontFamily: 'Sawarabi Mincho, serif', 
            letterSpacing: '8px' 
          }}>
            怪異調伏
          </div>
        </div>
      )}

      {/* 敵の情報表示 */}
      <div className={enemy.isBoss ? 'boss-name' : 'enemy-name'}>
        {enemy.isBoss ? `＊＊＊ ${enemy.name} ＊＊＊` : enemy.name}
      </div>
      
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', width: '100%' }}>
        <img 
          src={ENEMY_IMAGES[enemy.image]} 
          alt={enemy.name} 
          style={{ 
            maxWidth: '85%', 
            maxHeight: '85%', 
            objectFit: 'contain', 
            filter: enemy.isBoss 
              ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' 
              : 'drop-shadow(0 0 15px rgba(184, 154, 66, 0.4))' 
          }} 
        />
      </div>

      {/* 敵HPバー */}
      <div className="hp-bar-container" style={{ width: '70%', margin: '15px 0' }}>
        <div className="hp-bar" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
      </div>
    </div>
  );
};
