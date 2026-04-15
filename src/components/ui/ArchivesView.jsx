// src/components/ui/ArchivesView.jsx
import React, { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import enemiesData from '../../data/Enemies.json';
import itemsData from '../../data/Items.json';
import { ENEMY_IMAGES, varGold } from '../../constants/gameData';

export const ArchivesView = ({ onClose }) => {
  const { encounteredEnemies, defeatedEnemies, party } = useGame();
  const [selectedEnemy, setSelectedEnemy] = useState(enemiesData[0]);
  const [isZoomed, setIsZoomed] = useState(false);

  // 武勲（勲章）の合算ボーナス計算
  const totalBonuses = (party || []).reduce((acc, m) => {
    (m.items || []).forEach(itemId => {
      const item = itemsData.find(it => it.id === itemId);
      if (item && item.effect) {
        acc.atk += item.effect.atk || 0;
        acc.ac += item.effect.ac || 0;
        acc.mgk += item.effect.mgk || 0;
      }
    });
    return acc;
  }, { atk: 0, ac: 0, mgk: 0 });

  return (
    <div className="yugen-modal-overlay archives-view">
      {/* 拡大表示オーバーレイ (これだけはさらに上位のレイヤー) */}
      {isZoomed && selectedEnemy && (
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', animation: 'yugenFadeIn 0.3s ease-out'
          }}
        >
          <img 
            src={ENEMY_IMAGES[selectedEnemy.image]} 
            alt={selectedEnemy.name} 
            style={{ maxHeight: '85%', maxWidth: '85%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(184,154,66,0.3))' }} 
          />
          <div style={{ position: 'absolute', bottom: '40px', color: varGold, fontSize: '2rem', letterSpacing: '10px' }}>{selectedEnemy.name}</div>
        </div>
      )}

      {/* 標題 (統一構造) */}
      <div className="yugen-modal-header">
        <h2 className="yugen-modal-title">📜 都の図録と武勲</h2>
        <button className="yugen-modal-close" onClick={onClose}>閉じる</button>
      </div>

      <div className="yugen-modal-content" style={{ display: 'flex', gap: '20px' }}>
        
        {/* 左側：怪異一覧 */}
        <div style={{ flex: 1, border: '1px solid #333', padding: '10px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)' }}>
          <h3 style={{ color: varGold, borderBottom: '1px solid #444', paddingBottom: '5px' }}>【怪異図録】</h3>
          {enemiesData.map(en => {
            const isEncountered = (encounteredEnemies || []).includes(en.id);
            const isDefeated = (defeatedEnemies || []).includes(en.id);
            return (
              <div 
                key={en.id} 
                onClick={() => { setSelectedEnemy(en); setIsZoomed(false); }}
                style={{ 
                  padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #222',
                  backgroundColor: selectedEnemy?.id === en.id ? 'rgba(184, 154, 66, 0.15)' : 'transparent',
                  color: isDefeated ? '#fff' : (isEncountered ? '#aaa' : '#444'),
                  display: 'flex', justifyContent: 'space-between'
                }}
              >
                <span>{isEncountered ? en.name : '？？？？'}</span>
                <span style={{ fontSize: '0.8rem' }}>{isDefeated ? '討伐済' : (isEncountered ? '遭遇済' : '未遭遇')}</span>
              </div>
            );
          })}
        </div>

        {/* 右側：詳細表示 */}
        <div style={{ flex: 2, border: '1px solid #333', padding: '20px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', position: 'relative' }}>
          {selectedEnemy && (
            <>
              {(encounteredEnemies || []).includes(selectedEnemy.id) ? (
                <>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div 
                      onClick={() => setIsZoomed(true)}
                      style={{ 
                        width: '150px', height: '150px', border: `1px solid ${varGold}`, 
                        padding: '10px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', background: '#050505', cursor: 'zoom-in' 
                      }}
                    >
                      <img src={ENEMY_IMAGES[selectedEnemy.image]} alt={selectedEnemy.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '2rem', margin: '0 0 10px 0', color: varGold }}>{selectedEnemy.name}</h3>
                      {(defeatedEnemies || []).includes(selectedEnemy.id) ? (
                        <div style={{ fontSize: '0.9rem', color: '#ccc', gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '5px 20px' }}>
                          <span>生命：{selectedEnemy.minHp}-{selectedEnemy.maxHp}</span>
                          <span>回避：{selectedEnemy.ac}</span>
                          <span>打撃：{selectedEnemy.minDmg}-{selectedEnemy.maxDmg}</span>
                          <span>位階徳：{selectedEnemy.exp}</span>
                        </div>
                      ) : (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>……能力の詳細は討伐後に開示される……</p>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <h4 style={{ color: varGold, margin: '0 0 10px 0' }}>《由来》</h4>
                    <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#ddd' }}>
                      {(defeatedEnemies || []).includes(selectedEnemy.id) ? selectedEnemy.flavor : '（……この怪異の正体は未だ不明である……）'}
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.3 }}>
                   <div style={{ fontSize: '5rem' }}>🌑</div>
                   <p style={{ letterSpacing: '8px' }}>……未だ見ぬ怪異也……</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 下部：武勲録（合算ボーナス表示） */}
      <div style={{ marginTop: '20px', padding: '15px', border: `1px solid ${varGold}`, background: 'rgba(184, 154, 66, 0.05)', flexShrink: 0 }}>
         <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: varGold }}>【武勲録：勲章の総力】</h3>
         <div style={{ display: 'flex', gap: '40px' }}>
            <div><span style={{ opacity: 0.7 }}>総攻撃力補正：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.atk}</span></div>
            <div><span style={{ opacity: 0.7 }}>総回避率補正：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.ac}</span></div>
            <div><span style={{ opacity: 0.7 }}>総霊力補正：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.mgk}</span></div>
         </div>
      </div>
    </div>
  );
};
