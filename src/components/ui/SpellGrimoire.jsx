import React, { useState } from 'react';
import Spells from '../../data/Spells.json';
import { varGold, CHAR_IMAGES } from '../../constants/gameData';
import YugenModal from '../common/YugenModal';

export const SpellGrimoire = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('SAMURAI');
  
  if (!isOpen) return null;

  const jobDetails = {
    SAMURAI: { name: '武者', member: '渡辺 綱', imgKey: 'watanabe_tsuna.png', color: '#3d0a0a', icon: '⚔️' },
    ONMYOJI: { name: '陰陽師', member: '安倍 晴明', imgKey: 'abe_seimei.png', color: '#001a33', icon: '☯️' },
    NISOU:   { name: '尼僧',   member: '八百比丘尼', imgKey: 'yaobikuni.png',    color: '#1a221a', icon: '祈' }
  };

  const activeJob = jobDetails[activeTab];

  return (
    <YugenModal 
      title="🏮 魔導教典 - 術式の理" 
      onClose={onClose}
    >
      <div className="grimoire-container">
        {/* 指導者の肖像 */}
        <div className="grimoire-job-header" style={{ borderLeftColor: varGold }}>
           <div className="grimoire-job-portrait">
              <img src={CHAR_IMAGES[activeJob.imgKey]} alt={activeJob.member} />
           </div>
           <div className="grimoire-job-info">
             <h2 className="job-name">{activeJob.icon} {activeJob.name}</h2>
             <span className="job-master">伝承者：{activeJob.member}</span>
           </div>
        </div>

        {/* 職業切り替えタブ */}
        <div className="grimoire-tabs">
          {Object.keys(jobDetails).map(job => (
            <button 
              key={job}
              className={`grimoire-tab-btn ${activeTab === job ? 'active' : ''}`}
              onClick={() => setActiveTab(job)}
              style={{ '--job-color': jobDetails[job].color }}
            >
              <img src={CHAR_IMAGES[jobDetails[job].imgKey]} className="mini-img" alt="" />
              <span className="label">{jobDetails[job].name}</span>
            </button>
          ))}
        </div>

        {/* 術式一覧 */}
        <div className="grimoire-body" style={{ background: `linear-gradient(135deg, ${activeJob.color}AA, #050505)` }}>
          <div className="spell-list-wrapper">
            {Spells[activeTab].map(spell => (
              <div key={spell.id} className="spell-card">
                <div className="spell-header">
                  <div className="spell-main-info">
                    <span className="spell-lv">習得階 Lv{spell.lv}</span>
                    <h3 className="spell-name">{spell.name}</h3>
                  </div>
                  <div className="spell-cost">
                    <span className="label">霊力</span>
                    <span className="value">{spell.mp}</span>
                  </div>
                </div>
                <div className="spell-description">
                  <p>{spell.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="grimoire-footer">
          ※ 術は習得階（レベル）に達することで、心身の練度と共に自動的に開眼します。
        </div>
      </div>
    </YugenModal>
  );
};
