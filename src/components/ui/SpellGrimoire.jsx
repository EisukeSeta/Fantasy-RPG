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
    <div className="yugen-modal-overlay spell-grimoire">
      <div className="yugen-modal-header">
        <h2 className="yugen-modal-title">🏮 魔導教典 - 術式の理</h2>
        <button className="yugen-modal-close" onClick={onClose}>閉じる</button>
      </div>
      
      <div className="yugen-modal-content" style={{ display: 'flex', flexDirection: 'column' }}>
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

        <div className="grimoire-content-body" style={{ flex: 1, marginTop: '15px', backgroundColor: activeJob.color + '66', border: '1px solid rgba(184, 154, 66, 0.3)', overflowY: 'auto' }}>
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
        
        <div className="grimoire-footer" style={{ padding: '15px 0', fontSize: '0.85rem', color: '#888', textAlign: 'right' }}>
          ※ 術は習得階（レベル）に達することで自動的に開眼します。
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .job-head {
          display: flex; align-items: center; gap: 20px; padding: 15px 0;
          background: linear-gradient(to right, rgba(255,215,0,0.1), transparent);
          border-left: 4px solid var(--primary-gold); padding-left: 20px; margin-bottom: 10px;
        }
        .job-portrait {
          width: 70px; height: 70px; border: 1px solid var(--primary-gold);
          overflow: hidden; background: #000;
        }
        .job-portrait img { width: 100%; height: 100%; object-fit: cover; }

        .grimoire-tabs { display: flex; gap: 8px; margin-top: 5px; }
        .tab-button {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #111; color: #777; border: 1px solid #333;
          border-bottom: 4px solid #333;
          padding: 10px; cursor: pointer; font-family: inherit; transition: all 0.2s;
        }
        .tab-button.active { background: #000; color: var(--primary-gold); font-weight: bold; border-bottom-color: var(--primary-gold); }
        .tab-button:hover:not(.active) { background: #222; }
        .mini-icon { width: 24px; height: 24px; border: 1px solid #444; filter: grayscale(1); transition: 0.2s; }
        .tab-button.active .mini-icon { filter: grayscale(0); border-color: var(--primary-gold); }

        .table-wrapper { width: 100%; overflow-x: auto; }
        .spell-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .spell-table th {
          position: sticky; top: 0; background: #000; z-index: 5;
          text-align: left; border-bottom: 2px solid var(--primary-gold);
          padding: 12px; color: var(--primary-gold); font-size: 0.9rem; font-weight: normal;
        }
        .spell-table td { padding: 15px 12px; border-bottom: 1px solid rgba(184, 154, 64, 0.15); vertical-align: middle; }
        .spell-name { color: #fff; font-size: 1.1rem; font-weight: bold; }
        .highlight-gold { color: var(--primary-gold); font-weight: bold; }
        .center { text-align: center; }
        .spell-desc { font-size: 1rem; color: #eee; line-height: 1.6; }

        @media (max-width: 600px) {
          .job-head { gap: 12px; padding-left: 10px; }
          .job-portrait { width: 50px; height: 50px; }
          .tab-button span { display: none; }
          .spell-table { min-width: 500px; }
          .spell-name { font-size: 1rem; }
          .spell-desc { font-size: 0.9rem; }
        }
      `}} />
    </div>
  );
};
