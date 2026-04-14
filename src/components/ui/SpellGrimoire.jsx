import React, { useState } from 'react';
import Spells from '../../data/Spells.json';
import { varGold, CHAR_IMAGES } from '../../constants/gameData';

/**
 * 最小可読の理 (UI Design Guideline)
 * - 本文/説明: 16px (1rem)
 * - 銘/項目: 14px (0.875rem) [太字/文字間広]
 * - 注釈: 12px (0.75rem)
 */

export const SpellGrimoire = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('SAMURAI');
  
  if (!isOpen) return null;

  const jobDetails = {
    SAMURAI: { name: '武者', member: '渡辺 綱', imgKey: 'watanabe_tsuna.png', color: '#3d0a0a' },
    ONMYOJI: { name: '陰陽師', member: '安倍 晴明', imgKey: 'abe_seimei.png', color: '#001a33' },
    NISOU:   { name: '尼僧',   member: '八百比丘尼', imgKey: 'yaobikuni.png',    color: '#1a221a' }
  };

  const activeJob = jobDetails[activeTab];

  return (
    <div className="grimoire-overlay" onClick={onClose}>
      <div className="grimoire-window window" onClick={e => e.stopPropagation()}>
        <div className="window-title grimoire-title">魔導教典 - 術式の理</div>
        <button className="back-button" onClick={onClose}>閉じる</button>
        
        {/* 指導者の肖像 */}
        <div className="job-head">
           <div className="job-portrait">
              <img src={CHAR_IMAGES[activeJob.imgKey]} alt={activeJob.member} />
           </div>
           <div className="job-title-info">
             <h2 style={{ color: varGold, margin: 0, fontSize: '1.4rem' }}>{activeJob.name}</h2>
             <span style={{ fontSize: '1rem', color: '#ccc' }}>伝承者：{activeJob.member}</span>
           </div>
        </div>

        {/* 職業切り替えタブ (アイコン付き) */}
        <div className="grimoire-tabs">
          {Object.keys(jobDetails).map(job => (
            <button 
              key={job}
              className={`tab-button ${activeTab === job ? 'active' : ''}`}
              style={{ borderBottomColor: activeTab === job ? jobDetails[job].color : 'var(--primary-gold)' }}
              onClick={() => setActiveTab(job)}
            >
              <img src={CHAR_IMAGES[jobDetails[job].imgKey]} className="mini-icon" alt="" />
              <span>{jobDetails[job].name}</span>
            </button>
          ))}
        </div>

        <div className="grimoire-content" style={{ backgroundColor: activeJob.color + 'ee' }}>
          <div className="table-wrapper">
            <table className="spell-table">
              <thead>
                <tr>
                  <th>習得</th>
                  <th>銘 (術式名)</th>
                  <th>霊力</th>
                  <th>効能・由来</th>
                </tr>
              </thead>
              <tbody>
                {Spells[activeTab].map(spell => (
                  <tr key={spell.id}>
                    <td className="center" style={{ fontSize: '0.9rem' }}>Lv{spell.lv}</td>
                    <td className="spell-name">{spell.name}</td>
                    <td className="center highlight-gold">{spell.mp}</td>
                    <td className="spell-desc">{spell.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="grimoire-footer">
          ※ 術は習得階（レベル）に達することで自動的に開眼します。
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .grimoire-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.92); display: flex; justify-content: center; align-items: center;
          z-index: 11000; backdrop-filter: blur(8px);
        }
        .grimoire-window {
          width: 95%; max-width: 850px; height: 90%; max-height: 700px;
          display: flex; flex-direction: column; overflow: visible !important;
          animation: grimoire-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes grimoire-in {
          from { opacity: 0; transform: scale(0.95) translateY(30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .grimoire-title { font-size: 1rem !important; padding: 4px 20px !important; top: -18px !important; }
        .back-button {
          position: absolute; top: -14px; right: 20px;
          background: #400; color: #fff; border: 1px solid var(--primary-gold);
          padding: 4px 20px; cursor: pointer; font-size: 0.9rem; font-weight: bold;
          font-family: inherit; z-index: 101; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          transition: all 0.2s; letter-spacing: 2px;
        }
        .back-button:hover { background: #600; transform: translateY(-2px); }

        .job-head {
          display: flex; align-items: center; gap: 20px; padding: 25px 20px 10px;
          background: linear-gradient(to right, rgba(0,0,0,0.5), transparent);
        }
        .job-portrait {
          width: 80px; height: 80px; border: 2px solid var(--primary-gold);
          overflow: hidden; background: #000;
        }
        .job-portrait img { width: 100%; height: 100%; object-fit: cover; }

        .grimoire-tabs { display: flex; gap: 8px; padding: 0 15px; margin-top: 5px; }
        .tab-button {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #111; color: #777; border: 1px solid var(--primary-gold);
          border-bottom: 5px solid var(--primary-gold);
          padding: 10px; cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .tab-button.active { background: #000; color: var(--primary-gold); font-weight: bold; transform: translateY(-2px); }
        .tab-button.active .mini-icon { filter: grayscale(0); border-color: var(--primary-gold); }
        .mini-icon { width: 24px; height: 24px; border: 1px solid #444; filter: grayscale(1); transition: 0.2s; }

        .grimoire-content {
          flex: 1; margin: 15px; padding: 0;
          border: 1px solid rgba(184, 154, 66, 0.4); overflow-y: auto;
          scrollbar-width: thin; scrollbar-color: var(--primary-gold) #000;
        }
        .table-wrapper { width: 100%; overflow-x: auto; }
        .spell-table { width: 100%; border-collapse: collapse; min-width: 650px; }
        .spell-table th {
          position: sticky; top: 0; background: #000; z-index: 5;
          text-align: left; border-bottom: 2px solid var(--primary-gold);
          padding: 15px 12px; color: var(--primary-gold); font-size: 1rem; font-weight: normal; letter-spacing: 1px;
        }
        .spell-table td { padding: 18px 12px; border-bottom: 1px solid rgba(184, 154, 64, 0.15); vertical-align: middle; }
        .spell-name { color: #fff; font-size: 1.1rem; font-weight: bold; white-space: nowrap; text-shadow: 1px 1px 2px #000; }
        .highlight-gold { color: var(--primary-gold); font-weight: bold; font-size: 1.1rem; }
        .center { text-align: center; }
        .spell-desc { font-size: 1rem; color: #eee; line-height: 1.7; opacity: 0.95; }
        
        .grimoire-footer { padding: 15px 20px; font-size: 0.85rem; color: #888; text-align: right; letter-spacing: 1px; }

        @media (max-width: 600px) {
          .grimoire-window { width: 98%; height: 98%; }
          .job-head { padding: 20px 15px 5px; gap: 15px; }
          .job-portrait { width: 60px; height: 60px; }
          .job-title-info h2 { font-size: 1.2rem; }
          .tab-button span { display: none; } /* スマホはアイコンのみにするか、さらに検討 */
          .tab-button { padding: 8px; }
          .mini-icon { width: 32px; height: 32px; }
          .spell-table { min-width: 550px; }
          .spell-table th { padding: 12px 8px; font-size: 0.9rem; }
          .spell-table td { padding: 15px 8px; }
          .spell-name { font-size: 1rem; }
          .spell-desc { font-size: 0.95rem; line-height: 1.6; }
          .back-button { top: -12px; right: 10px; font-size: 0.85rem; }
        }
      `}} />
    </div>
  );
};
