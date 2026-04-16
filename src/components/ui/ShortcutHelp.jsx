// src/components/ui/ShortcutHelp.jsx
import React from 'react';
import { varGold } from '../../constants/gameData';
import YugenModal from '../common/YugenModal';

/**
 * 捷径（ショートカット）の一覧表示
 */
export const ShortcutHelp = ({ onClose }) => {
  const shortcutGroups = [
    {
      title: '《都の知恵と記録》',
      items: [
        { key: 'V', icon: '📔', desc: '都の図録・武勲録', sub: '怪異の記録と獲得した称号、由緒ある勲章の一覧' },
        { key: 'K', icon: '📜', desc: '魔導術経典', sub: '各職能が習得可能な術式とその理（ＭＰ）' },
        { key: 'M', icon: '🗺️', desc: '迷宮図（地図）', sub: '現在地の俯瞰と踏破した都の地図' },
        { key: 'C', icon: '👥', desc: '隊員之証', sub: '個々の秘められた能力と詳細なる身分' }
      ]
    },
    {
      title: '《迷宮の歩法と合戦》',
      items: [
        { key: 'Space', icon: '⚔️', desc: '決定 / 打ちかかり', sub: '選択の確定、あるいは合戦の火蓋を切る' },
        { key: 'Arrows', icon: '👣', desc: '歩法（移動）', sub: '東西南北、都の闇を歩む進路の指示' },
        { key: 'H / ?', icon: '❓', desc: '捷径（一覧）', sub: '現在開いているこの助け、理の再認' }
      ]
    }
  ];

  return (
    <YugenModal 
      title="⛩️ 都の捷径（ショートカット）" 
      onClose={onClose}
    >
      <div className="shortcut-container">
        <p className="shortcut-intro">
          都の理（画面）は、それぞれの捷径（キー）を重ねて押すことで、滑らかに切り替えることが可能です。
        </p>

        <div className="shortcut-grid">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="shortcut-group">
              <h3 className="group-title">{group.title}</h3>
              <div className="group-list">
                {group.items.map(s => (
                  <div key={s.key} className="shortcut-item">
                    <div className="key-cap">
                      <span className="key-label">{s.key}</span>
                    </div>
                    <div className="item-info">
                      <div className="item-main">
                        <span className="item-icon">{s.icon}</span>
                        <span className="item-name">{s.desc}</span>
                      </div>
                      <span className="item-sub">{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcut-footer">
          ※ 各画面の右上「閉じる」または同じ捷径の再打法により、迷宮へと戻ります。
        </div>
      </div>
    </YugenModal>
  );
};
