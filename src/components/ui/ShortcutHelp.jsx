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
    <div className="yugen-modal-overlay shortcut-help">
      <div className="yugen-modal-header">
        <h2 className="yugen-modal-title">⛩️ 都の捷径（ショートカット）</h2>
        <button className="yugen-modal-close" onClick={onClose}>閉じる</button>
      </div>
      
      <div className="yugen-modal-content">
        <div style={{ marginTop: '20px', maxWidth: '600px' }}>
          {shortcuts.map(s => (
            <div key={s.key} style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid rgba(184, 154, 66, 0.2)', paddingBottom: '12px' }}>
              <div style={{ width: '120px', color: varGold, fontWeight: 'bold', fontSize: '1.4rem' }}>[ {s.key} ]</div>
              <div style={{ flex: 1, color: '#eee', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px', color: '#666', fontStyle: 'italic' }}>
          ※ 捷径を重ねて押すことで、即座に別の理（画面）へと切り替えることが可能です。
        </div>
      </div>
    </div>
  );
};
