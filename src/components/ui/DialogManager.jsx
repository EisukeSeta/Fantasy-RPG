import React from 'react';
import { DIALOG_SPEAKERS, CHAR_IMAGES } from '../../constants/gameData';

/**
 * 都の「語り」を統括する器。
 * 4/18 安定版構造：単一 return 構造による整合性の確保。
 */
const DialogManager = ({ 
  gameState, 
  activeDialog, 
  setActiveDialog, 
  combatInterjection, 
  setCombatInterjection 
}) => {
  if (!activeDialog && !combatInterjection) return null;

  /**
   * 和歌・詠唱の描画
   */
  const renderTanzaku = (waka, isStory) => {
    if (!waka) return null;
    const signature = waka.author || waka.source || "読み人知らず";
    return (
      <div className="tanzaku-floating-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '95%', animation: 'fadeInUp 1s ease-out' }}>
        <div className="tanzaku-box" style={{ transform: isStory ? 'scale(1.1)' : 'scale(1)' }}>
          <div className="tanzaku-text">{waka.text}</div>
          <div className="tanzaku-author">― {signature}</div>
          {waka.translation && <div className="tanzaku-translation">（訳：{waka.translation}）</div>}
        </div>
      </div>
    );
  };

  // 合戦独白の優先描画
  if (combatInterjection) {
    return (
      <div className="combat-interjection-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
        <div className="combat-interjection-window window" style={{ width: '90%', maxWidth: '600px', backgroundColor: 'rgba(10, 10, 15, 0.95)', border: '2px solid var(--primary-gold)', padding: '20px' }}>
          <div className="interjection-speaker" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <img src={CHAR_IMAGES[combatInterjection.member.image]} alt="speaker" style={{ width: '60px', height: '60px', border: '1px solid var(--primary-gold)' }} />
            <div className="interjection-name" style={{ color: 'var(--primary-gold)', fontSize: '1.2rem' }}>{combatInterjection.member.name}</div>
          </div>
          <p style={{ color: '#fff', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '20px' }}>{combatInterjection.quotes[combatInterjection.currentPage].text}</p>
          <div style={{ textAlign: 'right' }}>
            <button className="dialog-btn" onClick={() => {
              if (combatInterjection.currentPage < combatInterjection.quotes.length - 1) {
                setCombatInterjection({ ...combatInterjection, currentPage: combatInterjection.currentPage + 1 });
              } else {
                const callback = combatInterjection.onClose;
                setCombatInterjection(null);
                if (callback) callback();
              }
            }}>
              {combatInterjection.currentPage < combatInterjection.quotes.length - 1 ? "続く" : "承知"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 通常・幽玄ダイアログの描画
  const currentPageData = activeDialog.pages && activeDialog.pages[activeDialog.currentPage];
  const isWakaPage = currentPageData && currentPageData.type === 'waka';
  const isLastPage = activeDialog.pages && activeDialog.currentPage === activeDialog.pages.length - 1;
  const bgUrl = isWakaPage ? 'https://images.unsplash.com/photo-1542124103-62580572e90e?auto=format&fit=crop&q=80&w=2000' : activeDialog.bgImage;

  return (
    <div 
      className={`dialog-overlay ${activeDialog.isStory ? 'story-mode' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: bgUrl ? 'transparent' : 'rgba(0,0,0,0.85)',
        backgroundImage: bgUrl ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${bgUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backdropFilter: isWakaPage ? 'blur(5px) brightness(60%)' : 'none',
        zIndex: 50000,
        display: 'flex',
        flexDirection: activeDialog.isStory ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: activeDialog.isStory ? '40px 20px' : '0'
      }}
      onClick={() => {
        if (!(activeDialog.showChoices && isLastPage)) {
          if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
            setActiveDialog({ ...activeDialog, currentPage: activeDialog.currentPage + 1 });
          } else if (activeDialog.onConfirm) {
            activeDialog.onConfirm();
            setActiveDialog(null);
          } else {
            setActiveDialog(null);
          }
        }
      }}
    >
      {activeDialog.isStory ? (
        <div style={{ width: '85%', maxWidth: '1200px', textAlign: 'center', animation: 'fadeInText 2s ease-out', color: '#fff' }}>
          <div style={{ fontSize: isWakaPage ? '2rem' : '1.8rem', lineHeight: '2.2', letterSpacing: '8px', fontFamily: 'Sawarabi Mincho, serif', marginBottom: '40px' }}>
            {isWakaPage ? renderTanzaku(currentPageData, true) : (typeof currentPageData === 'object' ? currentPageData.text : currentPageData)}
          </div>
          {!isLastPage && <div style={{ opacity: 0.5, letterSpacing: '5px', animation: 'blink 2s infinite' }}>‥ 次第を追う ‥</div>}
          {isLastPage && activeDialog.showChoices && (
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
              <button className="dialog-btn" onClick={(e) => { e.stopPropagation(); if (activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}>{activeDialog.labelConfirm || "進む"}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="dialog-window" onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', backgroundColor: 'rgba(10, 10, 15, 0.95)', border: '2px solid var(--primary-gold)', padding: '25px' }}>
          {activeDialog.title && <div className="dialog-title" style={{ color: 'var(--primary-gold)', fontSize: '1.2rem', marginBottom: '15px' }}>{activeDialog.title}</div>}
          <div className="dialog-body" style={{ color: '#fff', fontSize: '1.1rem', lineHeight: '1.8' }}>
             {isWakaPage ? renderTanzaku(currentPageData, false) : (typeof currentPageData === 'object' ? currentPageData.text : currentPageData)}
          </div>
          {isLastPage && activeDialog.showChoices && (
            <div className="dialog-choices" style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
              {activeDialog.choices.map((c, i) => (
                <button key={i} className="dialog-btn" onClick={() => { if (c.onSelect) c.onSelect(); setActiveDialog(null); }}>{c.text}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DialogManager;
