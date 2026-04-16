// src/components/status/CharacterCard.jsx
import React from 'react';
import { CHAR_IMAGES, varGold } from '../../constants/gameData';
import { getRequiredExp } from '../../logic/growth';
import itemsData from '../../data/Items.json';
import { useUIState } from '../../hooks/useUIState.jsx';

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
  const { openView, setShowStatus } = useUIState();
  const isActive = gameState === 'BATTLE' && activeBattler === i;

  // 勲章（パッシブ強化）の補正合計を算出
  const bonuses = (m.items || []).reduce((acc, itemId) => {
    const item = itemsData.find(it => it.id === itemId);
    if (item && item.effect) {
      if (item.effect.atk) acc.atk += item.effect.atk;
      if (item.effect.ac) acc.ac += item.effect.ac;
      if (item.effect.mgk) acc.mgk += item.effect.mgk;
    }
    return acc;
  }, { atk: 0, ac: 0, mgk: 0 });

  const handleMedalClick = () => {
    // アーカイブを開く前に、ステータス詳細（スマホ版）を閉じる
    setShowStatus(false);
    openView('ARCHIVES', { tab: 'ACHIEVEMENTS' });
  };
  
  // サイドバー版 (詳細)
  if (variant === 'sidebar') {
    return (
      <div 
        className={`status-item ${isActive ? 'active-battler' : ''} ${m.statusEffects?.includes('POISON') ? 'status-poison-pulse' : ''} ${m.statusEffects?.includes('PARALYZED') ? 'status-paralyze-pulse' : ''}`} 
        style={{ opacity: m.hp <= 0 ? 0.4 : 1, position: 'relative', overflow: 'visible' }}
      >
        {/* 状態異常表示 */}
        <div className="status-indicators" style={{ position: 'absolute', top: '-8px', left: '10px', display: 'flex', gap: '4px', zIndex: 10 }}>
          {m.statusEffects?.includes('POISON') && <span title="毒" style={{ filter: 'drop-shadow(0 0 4px #8a2be2)' }}>💜</span>}
          {m.statusEffects?.includes('PARALYZED') && <span title="麻痺" style={{ filter: 'drop-shadow(0 0 4px #ffff00)' }}>⚡</span>}
        </div>
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
            <div style={{ position: 'absolute', right: '4px', top: '1px', fontSize: '0.65rem' }}>{m.hp}/{m.maxHp}</div>
          </div>
          <div className="mp-bar-container">
            <div className="mp-bar" style={{ width: `${(m.mp / m.maxMp) * 100}%` }} />
            <div style={{ position: 'absolute', right: '4px', top: '1px', fontSize: '0.65rem' }}>{m.mp}/{m.maxMp}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>
             <span>攻 {m.minDmg}-{m.maxDmg}{bonuses.atk !== 0 && <span style={{ color: varGold }}> ({bonuses.atk > 0 ? `+${bonuses.atk}` : bonuses.atk})</span>}</span>
             <span>避 {m.ac}{bonuses.ac !== 0 && <span style={{ color: varGold }}> ({bonuses.ac > 0 ? `+${bonuses.ac}` : bonuses.ac})</span>}</span>
          </div>

          <div className="xp-bar-container" style={{ height: '2px', marginTop: '4px' }}>
            <div className="xp-bar" style={{ 
              width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` 
            }} />
          </div>

          {/* 武勲（アイテム）の表示 */}
          <div className="item-medals" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            {m.items && m.items.map(itemId => {
              const item = itemsData.find(it => it.id === itemId);
              return item ? (
                <span 
                  key={item.id} 
                  title={item.name} 
                  onClick={(e) => { e.stopPropagation(); handleMedalClick(); }}
                  style={{ 
                    fontSize: '1.2rem', 
                    cursor: 'pointer',
                    filter: 'drop-shadow(0 0 4px rgba(184, 154, 66, 0.8))',
                    transition: 'transform 0.2s'
                  }}
                  className="medal-icon"
                >
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
    <div className={`mini-member-card ${isActive ? 'active-member' : ''} ${m.statusEffects?.includes('POISON') ? 'status-poison-pulse' : ''} ${m.statusEffects?.includes('PARALYZED') ? 'status-paralyze-pulse' : ''}`} style={{ position: 'relative' }}>
      {/* モバイル版状態異常 */}
      <div className="mini-status-indicators" style={{ position: 'absolute', top: '-10px', left: '0', display: 'flex', fontSize: '0.8rem' }}>
        {m.statusEffects?.includes('POISON') && <span>💜</span>}
        {m.statusEffects?.includes('PARALYZED') && <span>⚡</span>}
      </div>
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
      <div 
        className="mini-medals" 
        onClick={(e) => { e.stopPropagation(); handleMedalClick(); }}
        style={{ position: 'absolute', top: '-5px', right: '-5px', display: 'flex', gap: '2px', cursor: 'pointer' }}
      >
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
