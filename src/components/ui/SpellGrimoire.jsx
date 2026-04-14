import React, { useState } from 'react';
import Spells from '../../data/Spells.json';
import { varGold } from '../../constants/gameData';

/**
 * 魔導聖典 (Spell Grimoire)
 * パーティ全員の術式と効能を一覧表示するUI
 */
export const SpellGrimoire = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('SAMURAI');
  
  if (!isOpen) return null;

  const jobNames = {
    SAMURAI: '武者 (渡辺 綱)',
    ONMYOJI: '陰陽師 (安倍 晴明)',
    NISOU: '尼僧 (八百比丘尼)'
  };

  const jobColors = {
    SAMURAI: '#500e0e', // 深紅
    ONMYOJI: '#001a33', // 紺青
    NISOU: '#222d22'    // 苔緑
  };

  return (
    <div className="grimoire-overlay" onClick={onClose}>
      <div className="grimoire-window window" onClick={e => e.stopPropagation()}>
        <div className="window-title">魔導聖典 - 術式の理</div>
        <button className="back-button" onClick={onClose}>戻る</button>
        
        {/* 職業切り替えタブ */}
        <div className="grimoire-tabs">
          {Object.keys(jobNames).map(job => (
            <button 
              key={job}
              className={`tab-button ${activeTab === job ? 'active' : ''}`}
              style={{ borderBottomColor: activeTab === job ? jobColors[job] : 'var(--primary-gold)' }}
              onClick={() => setActiveTab(job)}
            >
              {jobNames[job].split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="grimoire-content" style={{ backgroundColor: jobColors[activeTab] + 'cc' }}>
          <h3 style={{ color: varGold, marginBottom: '15px', borderBottom: `1px solid ${varGold}` }}>
            {jobNames[activeTab]}
          </h3>
          
          <div className="table-wrapper">
            <table className="spell-table">
              <thead>
                <tr>
                  <th>習得Lv</th>
                  <th>銘 (名称)</th>
                  <th>消費MP</th>
                  <th>効能・由来</th>
                </tr>
              </thead>
              <tbody>
                {Spells[activeTab].map(spell => (
                  <tr key={spell.id}>
                    <td className="center">Lv{spell.lv}</td>
                    <td className="spell-name">{spell.name}</td>
                    <td className="center">{spell.mp}</td>
                    <td className="spell-desc">{spell.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grimoire-footer">
          ※ 術は習得レベルに達することで自動的に開眼します。
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .grimoire-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.85);
          display: flex; justify-content: center; align-items: center;
          z-index: 11000;
          backdrop-filter: blur(5px);
        }
        .grimoire-window {
          width: 90%; max-width: 800px;
          height: 80%; max-height: 600px;
          display: flex; flex-direction: column;
          animation: grimoire-in 0.4s ease-out;
        }
        @keyframes grimoire-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .grimoire-tabs {
          display: flex; gap: 5px; padding: 0 10px; margin-top: 10px;
        }
        .tab-button {
          background: #1a1a1a; color: #888; border: 1px solid var(--primary-gold);
          border-bottom: 4px solid var(--primary-gold);
          padding: 8px 20px; cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .tab-button.active {
          background: #000; color: var(--primary-gold);
          transform: translateY(-2px);
        }
        .grimoire-content {
          flex: 1; margin: 10px; padding: 20px;
          border: 1px solid rgba(184, 154, 66, 0.3);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--primary-gold) #000;
        }
        .table-wrapper {
          width: 100%; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .spell-table {
          width: 100%; border-collapse: collapse; min-width: 500px;
          font-size: 0.9rem;
        }
        .spell-table th {
          text-align: left; border-bottom: 2px solid var(--primary-gold);
          padding: 10px; color: #aaa; font-weight: normal;
        }
        .spell-table td {
          padding: 12px 10px; border-bottom: 1px solid rgba(184, 154, 64, 0.2);
        }
        .spell-name { color: var(--primary-gold); font-weight: bold; white-space: nowrap; }
        .center { text-align: center; }
        .spell-desc { font-size: 0.85rem; opacity: 0.9; line-height: 1.4; }
        .back-button {
          position: absolute; top: -14px; right: 20px;
          background: #300; color: #eee; border: 1px solid var(--primary-gold);
          padding: 2px 15px; cursor: pointer; font-size: 0.8rem;
          font-family: inherit; z-index: 101;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
          transition: all 0.2s;
        }
        .back-button:hover {
          background: var(--dark-red); color: #fff;
          transform: translateY(-2px);
          box-shadow: 2px 4px 8px rgba(0,0,0,0.8);
        }
        .grimoire-footer {
          padding: 10px 20px; font-size: 0.75rem; color: #888; text-align: right;
        }
        @media (max-width: 600px) {
          .grimoire-window { width: 95%; height: 90%; }
          .grimoire-content { padding: 10px; }
          .tab-button { padding: 6px 10px; font-size: 0.8rem; }
        }
      `}} />
    </div>
  );
};
