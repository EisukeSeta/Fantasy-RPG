import React, { useState } from 'react';
import { useGame } from '../../hooks/useGame';
import enemiesData from '../../data/Enemies.json';
import itemsData from '../../data/Items.json';
import { ENEMY_IMAGES, varGold } from '../../constants/gameData';
import YugenModal from '../common/YugenModal';

export const ArchivesView = ({ onClose, defaultTab = 'ENEMIES' }) => {
  const { encounteredEnemies, defeatedEnemies, party } = useGame();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'ENEMIES' or 'ACHIEVEMENTS'
  const [selectedEnemy, setSelectedEnemy] = useState(enemiesData[0]);
  const [isZoomed, setIsZoomed] = useState(false);

  // 全パーティの所持勲章を合算
  const allAcquiredItems = (party || []).reduce((acc, m) => {
    (m.items || []).forEach(itemId => {
      if (!acc.find(i => i.id === itemId)) {
        const item = itemsData.find(it => it.id === itemId);
        if (item) acc.push(item);
      }
    });
    return acc;
  }, []);

  // 武勲（勲章）の合算ボーナス計算
  const totalBonuses = allAcquiredItems.reduce((acc, item) => {
    if (item.effect) {
      acc.atk += item.effect.atk || 0;
      acc.ac += item.effect.ac || 0;
      acc.mgk += item.effect.mgk || 0;
    }
    return acc;
  }, { atk: 0, ac: 0, mgk: 0 });

  return (
    <YugenModal title="📜 都の図録と武勲" onClose={onClose} className="archives-view">
      {/* 拡大表示オーバーレイ */}
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

      {/* タブ切り替え */}
      <div className="archives-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('ENEMIES')}
          className={`tab-btn ${activeTab === 'ENEMIES' ? 'active' : ''}`}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'ENEMIES' ? varGold : '#666', 
            fontSize: '1.2rem', cursor: 'pointer', padding: '5px 20px', 
            borderBottom: activeTab === 'ENEMIES' ? `2px solid ${varGold}` : 'none',
            fontFamily: 'inherit'
          }}
        >
          🌑 怪異図録
        </button>
        <button 
          onClick={() => setActiveTab('ACHIEVEMENTS')}
          className={`tab-btn ${activeTab === 'ACHIEVEMENTS' ? 'active' : ''}`}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'ACHIEVEMENTS' ? varGold : '#666', 
            fontSize: '1.2rem', cursor: 'pointer', padding: '5px 20px', 
            borderBottom: activeTab === 'ACHIEVEMENTS' ? `2px solid ${varGold}` : 'none',
            fontFamily: 'inherit'
          }}
        >
          🏆 武勲之記録
        </button>
      </div>

      <div style={{ height: '500px' }}>
        {activeTab === 'ENEMIES' ? (
          <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
            {/* 左側：怪異一覧 */}
            <div style={{ flex: 1, border: '1px solid #333', padding: '10px', overflowY: 'auto', background: 'rgba(255,255,255,0.03)' }}>
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
              {selectedEnemy && (encounteredEnemies || []).includes(selectedEnemy.id) ? (
                <>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div onClick={() => setIsZoomed(true)} style={{ width: '150px', height: '150px', border: `1px solid ${varGold}`, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', cursor: 'zoom-in' }}>
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
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            {/* 武勲の総力 */}
            <div style={{ padding: '20px', border: `1px solid ${varGold}`, background: 'rgba(184, 154, 66, 0.1)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: varGold, letterSpacing: '2px' }}>【武勲之加護：合算の理】</h3>
              <div style={{ display: 'flex', gap: '60px', fontSize: '1.2rem' }}>
                <div><span style={{ opacity: 0.7 }}>総攻撃力：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.atk}</span></div>
                <div><span style={{ opacity: 0.7 }}>総回避率：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.ac}</span></div>
                <div><span style={{ opacity: 0.7 }}>総霊力：</span><span style={{ color: varGold, fontWeight: 'bold' }}>+{totalBonuses.mgk}</span></div>
              </div>
            </div>

            {/* 獲得した勲章の詳細リスト */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #333', padding: '15px', background: 'rgba(0,0,0,0.3)' }}>
              <h4 style={{ color: varGold, borderBottom: '1px solid #444', paddingBottom: '10px' }}>《獲得せし勲章の詳細》</h4>
              {allAcquiredItems.length > 0 ? (
                allAcquiredItems.map(item => (
                  <div key={item.id} style={{ marginBottom: '20px', padding: '15px', borderLeft: `4px solid ${varGold}`, background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px rgba(184, 154, 66, 0.4))' }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: varGold, fontWeight: 'bold', fontSize: '1.3rem', letterSpacing: '1px' }}>{item.name}</span>
                          <span style={{ fontSize: '0.9rem', color: '#888', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px' }}>
                            ATK:{(item.effect?.atk || 0) > 0 ? `+${item.effect.atk}` : (item.effect?.atk || 0)} / 
                            AC:{(item.effect?.ac || 0) > 0 ? `+${item.effect.ac}` : (item.effect?.ac || 0)} / 
                            MGK:{(item.effect?.mgk || 0) > 0 ? `+${item.effect.mgk}` : (item.effect?.mgk || 0)}
                          </span>
                        </div>
                        <p style={{ margin: '5px 0 10px 0', color: '#eee', fontSize: '1.1rem', lineHeight: '1.6' }}>{item.flavor || item.desc}</p>
                        
                        {/* 隊員ごとの霊格（Rank）表示 */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                          {party.map(m => {
                            const rank = (m.medals && m.medals[item.id]) || 0;
                            if (rank === 0) return null;
                            return (
                              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: `1px solid ${rank >= 10 ? varGold : '#444'}` }}>
                                <span style={{ fontSize: '0.8rem' }}>{m.name.slice(0, 2)}:</span>
                                <span style={{ color: rank >= 10 ? varGold : '#fff', fontWeight: 'bold' }}>Rank {rank}</span>
                                {rank >= 10 && <span style={{ fontSize: '0.7rem' }}>✨</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                  <p>……未だ武勲を立てておらず……</p>
                  <p style={{ fontSize: '0.8rem' }}>（特定の怪異を討伐することで、勲章を得られることがあります）</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </YugenModal>
  );
};
