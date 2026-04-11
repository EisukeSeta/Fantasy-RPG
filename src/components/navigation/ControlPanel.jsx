// src/components/navigation/ControlPanel.jsx
import React from 'react';
import { SPELLS } from '../../data/magicData';

/**
 * ゲームの操作ボタン群を表示するコンポーネント (PC/モバイル共用)
 */
export const ControlPanel = ({ 
  gameState, 
  party, 
  activeBattler,
  isAutoBattle, 
  setIsAutoBattle, 
  handleFight, 
  castSpell, 
  processMove, 
  addMessage,
  isMuted, 
  setIsMuted,
  isForceMobile,
  showSpells,
  setShowSpells,
  setShowStatus,
  setShowMap,
  scenarioData
}) => {
  const currentHero = party[activeBattler];

  if (isForceMobile) {
    return (
      <div className="mobile-ui-container">
        {/* モバイル共通・上部ユーティリティ */}
        <div className="mobile-utility-btns" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', padding: '6px 5px', background: '#111', borderBottom: '1px solid #333' }}>
          <button className="dialog-btn" onClick={() => setShowMap(true)}>🗺️ 迷宮図</button>
          <button className="dialog-btn" onClick={() => setShowStatus(true)}>👥 隊員証</button>
          <button className="dialog-btn" onClick={() => addMessage(scenarioData.ui.saveComplete, 'level_up')}>💾 記録</button>
          <button className="dialog-btn" onClick={() => setIsMuted(!isMuted)}>{isMuted ? '🔇' : '🔊'}</button>
        </div>

        {/* 戦闘時のコマンド */}
        {gameState === 'BATTLE' && (
          <div className="mobile-battle-commands">
            <button className="battle-cmd-btn primary" onClick={handleFight}>🗡️ 打ちかかる</button>
            <button className="battle-cmd-btn" onClick={() => setShowSpells(!showSpells)} style={{ background: showSpells ? 'var(--primary-gold)' : '', color: showSpells ? '#000' : '' }}>📜 術式</button>
            <button className="battle-cmd-btn" onClick={() => setShowStatus(true)}>👥 隊員</button>
            <button className="battle-cmd-btn" onClick={() => setIsAutoBattle(!isAutoBattle)}>{isAutoBattle ? scenarioData.ui.shuraAuto : scenarioData.ui.manual}</button>
          </div>
        )}

        {/* 術式選択オーバーレイ */}
        {showSpells && gameState === 'BATTLE' && (
          <div className="mobile-spells-overlay">
            {(SPELLS[currentHero.jobKey] || []).filter(s => s.lv <= currentHero.lv).map((s, idx) => (
              <button key={idx} className="spell-btn-mobile" onClick={() => { castSpell(s); setShowSpells(false); }}>{s.name}({s.mp})</button>
            ))}
            <button className="spell-btn-mobile cancel" onClick={() => setShowSpells(false)}>✖ キャンセル</button>
          </div>
        )}
      </div>
    );
  }

  // PC版
  return (
    <div className="pane-info window" style={{ marginTop: '10px' }}>
      <span className="window-title">作戦指示</span>
      <div className="combat-actions-pc" style={{ display: 'flex', padding: '15px', gap: '15px', alignItems: 'flex-start' }}>
        
        {/* 移動・戦闘コマンド (3x3 グリッド) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '50px', gap: '5px', width: '200px' }}>
          {gameState === 'BATTLE' ? (
            <div style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              <button className="dialog-btn" onClick={handleFight}>⚔️ 打ちかかる</button>
              <button className={`dialog-btn ${isAutoBattle ? 'pulse-gold' : ''}`} onClick={() => setIsAutoBattle(!isAutoBattle)}>
                {isAutoBattle ? scenarioData.ui.shuraAuto : scenarioData.ui.manual}
              </button>
            </div>
          ) : (
            <>
              <div />
              <button className="dialog-btn" style={{ padding: '0', fontSize: '0.85rem' }} onClick={() => processMove('FORWARD')}>⬆️ 前進</button>
              <div />
              <button className="dialog-btn" style={{ padding: '0', fontSize: '0.85rem' }} onClick={() => processMove('TURN_LEFT')}>↩️ 左向</button>
              <button className="dialog-btn" style={{ padding: '0', fontSize: '0.85rem' }} onClick={() => processMove('BACKWARD')}>⬇️ 後退</button>
              <button className="dialog-btn" style={{ padding: '0', fontSize: '0.85rem' }} onClick={() => processMove('TURN_RIGHT')}>↪️ 右向</button>
            </>
          )}
        </div>
        
        {/* システム系ボタン */}
        <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button className="save-btn" style={{ height: '50px' }} onClick={() => addMessage(scenarioData.ui.saveComplete, 'level_up')}>{scenarioData.ui.save}</button>
          <button className="save-btn" style={{ height: '50px' }} onClick={() => setIsMuted(!isMuted)}>{isMuted ? scenarioData.ui.bgmOff : scenarioData.ui.bgmOn}</button>
        </div>

        {/* 術式リスト (戦闘時のみ表示) */}
        {gameState === 'BATTLE' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '5px', maxHeight: '110px', overflowY: 'auto' }}>
            {(SPELLS[currentHero.jobKey] || []).filter(s => s.lv <= currentHero.lv).map((s, idx) => (
              <button key={idx} className="spell-btn" style={{ fontSize: '0.75rem', padding: '8px 4px' }} onClick={() => castSpell(s)}>{s.name}({s.mp})</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
