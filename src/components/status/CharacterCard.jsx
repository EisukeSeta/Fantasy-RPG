// src/components/status/CharacterCard.jsx
import React from 'react';
import { CHAR_IMAGES, varGold } from '../../constants/gameData';
import { getRequiredExp } from '../../logic/growth';
import itemsData from '../../data/Items.json';

/**
 * 個別の隊員情報を表示するカード部品
 * @param {object} m - 隊員データ
 * @param {number} i - インデックス
 * @param {string} variant - 'sidebar' (PC/Mobile詳細) or 'mini' (Mobileダッシュボード)
 */
export const CharacterCard = ({ 
  member: m, 
  index: i, 
  variant = 'sidebar', 
  activeBattler, 
  gameState, 
  visualEffects 
}) => {
  const isActive = gameState === 'BATTLE' && activeBattler === i;
  
  // サイドバー版 (詳細)
  if (variant === 'sidebar') {
    return (
      <div 
        className={`status-item ${isActive ? 'active-battler' : ''}`} 
        style={{ opacity: m.hp <= 0 ? 0.4 : 1, position: 'relative', overflow: 'visible' }}
      >
        {visualEffects.filter(e => e.target === `party_${i}`).map(e => (
          <div 
            key={e.id} 
            className={`popup-number ${e.type === 'damage' ? 'popup-damage' : 'popup-heal'}`} 
            style={{ zIndex: 10005, top: '20%', fontSize: '1.6rem' }}
          >
            {e.value}
          </div>
        ))}
        <div className="status-portrait"><img src={CHAR_IMAGES[m.image]} alt={m.name} /></div>
        <div className="status-info">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="status-name" style={{ color: m.hp === 1 ? '#f66' : '#fff' }}>{m.name}</span>
            <span style={{ color: varGold, fontSize: '0.8rem' }}>Lv {m.lv}</span>
          </div>
          <div className={`hp-bar-container ${m.hp === 1 ? 'danger-blink' : ''}`}>
            <div className="hp-bar" style={{ width: `${(m.hp / m.maxHp) * 100}%` }} />
          </div>
          <div className="mp-bar-container">
            <div className="mp-bar" style={{ width: `${(m.mp / m.maxMp) * 100}%` }} />
          </div>
          <div className="xp-bar-container">
            <div className="xp-bar" style={{ 
              width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` 
            }} />
          </div>
          {/* 武勲（アイテム）の表示 */}
          <div className="item-medals" style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {m.items && m.items.map(itemId => {
              const item = itemsData.find(it => it.id === itemId);
              return item ? (
                <span key={item.id} title={`${item.name}: ${item.flavor}`} style={{ 
                  fontSize: '1rem', 
                  filter: 'drop-shadow(0 0 3px rgba(184, 154, 66, 0.6))' 
                }}>
                  {item.icon}
                </span>
              ) : null;
            })}
          </div>
        </div>
      </div>
    );
  }

  // ミニ版 (スマホダッシュボード)
  return (
    <div className={`mini-member-card ${isActive ? 'active-member' : ''}`} style={{ position: 'relative' }}>
      {visualEffects.filter(e => e.target === `party_${i}`).map(e => (
        <div key={e.id} className={`popup-number ${e.type === 'damage' ? 'popup-damage' : 'popup-heal'}`} style={{ fontSize: '1.2rem' }}>
          {e.value}
        </div>
      ))}
      <div className="card-top">
        <span className="card-name">{m.name.slice(0, 2)}</span>
        <span className="card-lv">L{m.lv}</span>
      </div>
      <div className="card-bars">
        <div className="mini-bar hp-mini"><div className="fill" style={{ width: `${(m.hp / m.maxHp) * 100}%` }} /></div>
        <div className="mini-bar mp-mini"><div className="fill" style={{ width: `${(m.mp / m.maxMp) * 100}%` }} /></div>
        <div className="mini-bar xp-mini"><div className="fill" style={{ 
          width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` 
        }} /></div>
      </div>
      {/* モバイル版：右上に勲章を配置 */}
      <div className="mini-medals" style={{ position: 'absolute', top: '-5px', right: '-5px', display: 'flex', gap: '2px' }}>
        {m.items && m.items.map(itemId => {
          const item = itemsData.find(it => it.id === itemId);
          return item ? (
            <span key={item.id} style={{ fontSize: '0.7rem' }}>{item.icon}</span>
          ) : null;
        })}
      </div>
    </div>
  );
};
