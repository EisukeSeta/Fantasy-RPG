// src/components/ui/YugenOverlay.jsx
import React, { useEffect, useState } from 'react';
import { varGold, ENEMY_IMAGES } from '../../constants/gameData';

/**
 * 幽玄の理：初めての怪異調伏時の特別演出
 */
export const YugenOverlay = ({ enemy, onClose }) => {
  const [phase, setPhase] = useState('fade-in');

  useEffect(() => {
    // 演出の進行
    const timer = setTimeout(() => setPhase('show-lore'), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!enemy) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
      zIndex: 20000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 2s ease-in-out',
      fontFamily: "'Sawarabi Mincho', serif", color: '#fff',
      cursor: 'pointer'
    }} onClick={onClose}>
      
      {/* 墨絵風の背景円 */}
      <div style={{
        position: 'absolute', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(184, 154, 66, 0.1) 0%, rgba(0,0,0,0) 70%)',
        animation: 'pulse 4s infinite alternate'
      }}></div>

      <div style={{ zIndex: 1, textAlign: 'center', animation: 'fadeIn 1.5s ease-out' }}>
        <p style={{ color: varGold, letterSpacing: '8px', fontSize: '1.2rem', marginBottom: '40px' }}>―― 怪異調伏 ――</p>
        
        <div style={{ marginBottom: '40px', filter: 'drop-shadow(0 0 10px rgba(184, 154, 66, 0.4))' }}>
          <img src={ENEMY_IMAGES[enemy.image]} alt={enemy.name} style={{ height: '250px', objectFit: 'contain' }} />
        </div>

        <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', letterSpacing: '12px', color: '#eee' }}>{enemy.name}</h2>

        <div style={{
          maxWidth: '600px', padding: '20px', borderTop: `1px solid ${varGold}`,
          opacity: phase === 'show-lore' ? 1 : 0,
          transition: 'opacity 2s ease-in-out',
          lineHeight: '2', fontSize: '1.2rem', color: '#ccc', fontStyle: 'italic'
        }}>
          {enemy.flavor || "（その正体は、語るに及ばず……）"}
          <p style={{ marginTop: '30px', fontSize: '0.9rem', color: varGold, opacity: 0.6 }}>[ 画面を選択して次へ ]</p>
        </div>
      </div>

      <style>{`
        @keyframes pulse { from { opacity: 0.3; transform: scale(1); } to { opacity: 0.6; transform: scale(1.1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
