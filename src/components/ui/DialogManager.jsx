import React from 'react';
import { DIALOG_SPEAKERS, CHAR_IMAGES } from '../../constants/gameData';

/**
 * 都の「語り」を統括する器。
 * 幽玄モード (Story Mode)、通常対話 (Standard Dialog)、合戦中の独白 (Combat Interjection) の描画を担当。
 */
const DialogManager = ({ 
  gameState, 
  activeDialog, 
  setActiveDialog, 
  combatInterjection, 
  setCombatInterjection 
}) => {
  
  /**
   * 和歌・詠唱：幽玄に浮遊する短冊 (Floating Tanzaku)
   */
  const renderTanzaku = (waka, isStory) => {
    if (!waka) return null;
    
    const sourceInfo = [
      waka.id ? `小倉百人一首 ${waka.id}番` : null,
      waka.collection ? `『${waka.collection}』` : null
    ].filter(Boolean).join(' / ');

    const signature = waka.author ? `${waka.author}${sourceInfo ? `（${sourceInfo}）` : ''}` : (waka.source || "読み人知らず");

    return (
      <div className="tanzaku-floating-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        maxWidth: '90%',
        animation: 'fadeInUp 1s ease-out'
      }}>
        {/* メインの短冊：縦書き */}
        <div className="tanzaku-box" style={{ 
          margin: '0 auto',
          padding: isStory ? '50px 40px' : '30px 25px',
          minHeight: isStory ? '400px' : 'auto',
          maxHeight: '65vh',
          transform: isStory ? 'scale(1.05)' : 'scale(1)',
          display: 'flex',
          flexDirection: 'row-reverse', // 縦書き時の右寄せ
          alignItems: 'flex-start',
          gap: '30px'
        }}>
          {/* 和歌本体：縦書き */}
          <div className="tanzaku-text" style={{ 
            writingMode: 'vertical-rl',
            flexShrink: 0
          }}>
            {waka.text}
          </div>
          
          {/* 作者名：縦書きで控えめに添える */}
          <div className="tanzaku-author" style={{ 
            writingMode: 'vertical-rl',
            fontSize: isStory ? '1rem' : '0.8rem',
            marginTop: 'auto',
            paddingBottom: '20px',
            opacity: 0.8
          }}>
            ― {signature}
          </div>
        </div>

        {/* 現代語訳：横書きで短冊の下に「余韻」として配置（趣を邪魔しない） */}
        {waka.translation && (
          <div className="tanzaku-translation" style={{ 
            writingMode: 'horizontal-tb',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.3)',
            padding: '10px 20px',
            borderRadius: '20px',
            backdropFilter: 'blur(4px)',
            maxWidth: '350px',
            border: '1px solid rgba(184, 154, 66, 0.2)'
          }}>
            （訳：{waka.translation}）
          </div>
        )}
      </div>
    );
  };

  // 物語の対話処理：幽玄モードと通常対話
  const renderStandardDialog = () => {
    if (!activeDialog) return null;

    const isWakaPage = activeDialog.pages && activeDialog.pages[activeDialog.currentPage] && activeDialog.pages[activeDialog.currentPage].type === 'waka';

    return (
      <div className={`dialog-overlay ${gameState === 'BATTLE' ? 'battle-interjection' : ''} ${activeDialog.isStory ? 'story-mode-overlay' : ''}`} 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: activeDialog.bgImage ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), radial-gradient(circle, transparent 20%, rgba(0,0,0,0.8) 100%), url(${activeDialog.bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: isWakaPage ? 'blur(12px) brightness(40%)' : 'none', // 和歌の時は背景を幽玄にぼかす
          backgroundColor: isWakaPage ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
          transition: 'all 1s ease',
          zIndex: 50000,
          display: 'flex',
          flexDirection: activeDialog.isStory ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: activeDialog.isStory ? '40px 20px' : '0'
        }}
        onClick={(e) => {
          if (activeDialog.showChoices) return;
          if (activeDialog.isStory || e.target.className.includes('dialog-overlay')) {
            if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
              setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1});
            } else {
              if (activeDialog.onConfirm) activeDialog.onConfirm();
              setActiveDialog(null);
            }
          }
        }}
      >
        {activeDialog.isStory ? (
          /* 幽玄モード：枠無し・中央特大文字 */
          <div style={{ 
            width: '85%', 
            maxWidth: '1200px', 
            textAlign: 'center', 
            animation: 'fadeInText 2.5s ease-out',
            color: '#fff',
            textShadow: '0 0 30px rgba(0,0,0,1), 0 0 15px rgba(184, 154, 66, 0.4)'
          }}>
            {(() => {
              const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : null;
              if (currentPage && typeof currentPage === 'object' && currentPage.type === 'waka') return null; // 和歌の時は肖像を出さない（美学）

              let speakerKey = null;
              if (currentPage && typeof currentPage === 'object' && currentPage.speaker) {
                speakerKey = currentPage.speaker;
              } else if (activeDialog.speakers && activeDialog.speakers[activeDialog.currentPage]) {
                speakerKey = activeDialog.speakers[activeDialog.currentPage].split('.')[0];
              }
              const speakerInfo = DIALOG_SPEAKERS[speakerKey];
              if (speakerInfo && speakerInfo.image) {
                return (
                  <div className="story-speaker-spirit" style={{ marginBottom: '40px', animation: 'fadeIn 2s ease-out' }}>
                    <div className="spirit-portrait">
                      <img src={speakerInfo.image} alt={speakerInfo.name} />
                    </div>
                    <div className="spirit-name" style={{ color: 'var(--primary-gold)', fontSize: '1.4rem', marginTop: '10px', letterSpacing: '8px', textShadow: '0 0 10px rgba(184, 154, 66, 0.6)' }}>
                      {speakerInfo.name}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <div className="story-mode-text-wrapper" style={{ 
              fontFamily: 'Sawarabi Mincho, serif', 
              fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
              lineHeight: 2.0,
              letterSpacing: '0.4em',
              marginBottom: '10vh',
              maxWidth: '96%',
              whiteSpace: 'pre-wrap',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {(() => {
                const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : '';
                if (typeof currentPage === 'object' && currentPage.type === 'waka') {
                  return renderTanzaku(currentPage, true);
                }
                return typeof currentPage === 'object' ? currentPage.text : currentPage;
              })()}
            </div>
            {activeDialog.showChoices ? (
              <div className="dialog-footer" style={{ border: 'none', background: 'transparent', justifyContent: 'center', gap: '40px' }}>
                <button className="dialog-btn" style={{ padding: '15px 40px', fontSize: '1.2rem' }} onClick={() => { if (activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}> {activeDialog.labelConfirm || "御意"} </button>
                <button className="dialog-btn" style={{ padding: '15px 40px', fontSize: '1.2rem' }} onClick={() => { if (activeDialog.onCancel) activeDialog.onCancel(); else setActiveDialog(null); }}> {activeDialog.labelCancel || "撤退"} </button>
              </div>
            ) : (
              <div style={{ fontSize: '1.2rem', opacity: 0.5, letterSpacing: '0.6em', animation: 'pulse-story 3s infinite', fontFamily: 'Sawarabi Mincho, serif' }}>
                {isWakaPage ? '‥ 一首を味わう ‥' : '‥ 次第を追う ‥'}
              </div>
            )}
          </div>
        ) : (
          /* 通常モード：肖像画あり・ウィンドウ枠あり */
          <div className="dialog-window" style={{ background: activeDialog.bgImage ? 'rgba(10, 10, 10, 0.4)' : 'rgba(10, 10, 10, 0.95)', border: activeDialog.bgImage ? '1px solid rgba(184, 154, 66, 0.4)' : '2px solid var(--primary-gold)' }}>
            <div className="dialog-title">{activeDialog.title}</div>
            <div className="dialog-content">
              {(() => {
                const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : null;
                let speakerKey = null;
                if (currentPage && typeof currentPage === 'object' && currentPage.speaker) {
                  speakerKey = currentPage.speaker;
                } else if (activeDialog.speakers && activeDialog.speakers[activeDialog.currentPage]) {
                  speakerKey = activeDialog.speakers[activeDialog.currentPage].split('.')[0];
                }
                const speakerInfo = DIALOG_SPEAKERS[speakerKey];
                if (speakerInfo && speakerInfo.image) {
                  return (
                    <>
                      <div className="dialog-speaker">
                        <img src={speakerInfo.image} alt={speakerInfo.name || "speaker"} />
                      </div>
                      {speakerInfo.name && <div className="dialog-speaker-name">{speakerInfo.name}</div>}
                    </>
                  );
                }
                return null;
              })()}
              <div style={{ minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const currentPage = activeDialog.pages ? activeDialog.pages[activeDialog.currentPage] : '';
                  if (typeof currentPage === 'object' && currentPage.type === 'waka') {
                    return renderTanzaku(currentPage, false);
                  }
                  return <p>{typeof currentPage === 'object' ? currentPage.text : currentPage}</p>;
                })()}
              </div>
              {activeDialog.showChoices ? (
                <div className="dialog-footer">
                  <button className="btn-shura" onClick={() => { if (activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}> {activeDialog.labelConfirm || "御意"} </button>
                  <button className="btn-kegare" onClick={() => { if (activeDialog.onCancel) activeDialog.onCancel(); else setActiveDialog(null); }}> {activeDialog.labelCancel || "撤退"} </button>
                </div>
              ) : (
                <div className="dialog-footer">
                  <button className="dialog-btn" onClick={() => {
                    if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) {
                      setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1});
                    } else {
                      if (activeDialog.onConfirm) activeDialog.onConfirm();
                      setActiveDialog(null);
                    }
                  }}>
                    {activeDialog.pages && activeDialog.pages[activeDialog.currentPage] && activeDialog.pages[activeDialog.currentPage].type === 'waka' ? '一首を味わう' : (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1 ? '続く' : '承知')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 合戦差し込み処理：独白
  const renderCombatInterjection = () => {
    if (!combatInterjection) return null;

    return (
      <div className="combat-interjection-overlay">
        <div className="combat-interjection-window window">
          <div className="interjection-speaker">
            <img src={CHAR_IMAGES[combatInterjection.member.image]} alt="interjection-speaker" />
          </div>
          <div className="interjection-content">
            <div className="interjection-name">{combatInterjection.member.name}</div>
            <p>{combatInterjection.quotes[combatInterjection.currentPage].text}</p>
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
      </div>
    );
  };

  return (
    <>
      {renderStandardDialog()}
      {renderCombatInterjection()}
    </>
  );
};

export default DialogManager;
