// src/components/ui/ShortcutHelp.jsx
import React from 'react';
import { varGold } from '../../constants/gameData';

/**
 * 捷径（ショートカット）の一覧表示
 */
export const ShortcutHelp = ({ onClose }) => {
  const shortcuts = [
    { key: 'V', desc: '都の図録・武勲（Encyclopedia）' },
    { key: 'K', desc: '術経典（Spell Grimoire）' },
    { key: 'M', desc: '迷宮図（Map Toggle）' },
    { key: 'C', desc: '隊員之証（Character Stats）' },
    { key: 'Space', desc: '決定 / 合戦打ちかかり' },
    { key: 'Arrows', desc: '歩法（移動）' },
    { key: 'H / ?', desc: '捷径（ショートカット）一覧' }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 15000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', fontFamily: "'Sawarabi Mincho', serif"
    }} onClick={onClose}>
      <div style={{
        background: '#0a0a0a', border: `1px solid ${varGold}`, padding: '40px',
        maxWidth: '500px', width: '90%', boxShadow: '0 0 50px rgba(0,0,0,0.8)',
        position: 'relative', animation: 'slideIn 0.3s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: varGold, borderBottom: `1px solid ${varGold}`, paddingBottom: '10px', marginTop: 0, letterSpacing: '4px' }}>⛩️ 都の捷径（ショートカット）</h2>
        
        <div style={{ marginTop: '20px' }}>
          {shortcuts.map(s => (
            <div key={s.key} style={{ display: 'flex', marginBottom: '15px', borderBottom: '1px solid #222', paddingBottom: '8px' }}>
              <div style={{ width: '80px', color: varGold, fontWeight: 'bold', fontSize: '1.2rem' }}>[ {s.key} ]</div>
              <div style={{ flex: 1, color: '#eee' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          style={{
            marginTop: '20px', width: '100%', padding: '10px',
            background: 'none', border: `1px solid ${varGold}`, color: varGold,
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          承知いたした
        </button>
      </div>
      <style>{`
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};
