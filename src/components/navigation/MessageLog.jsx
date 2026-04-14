// src/components/navigation/MessageLog.jsx
import React, { useEffect, useRef } from 'react';
import { varGold } from '../../constants/gameData';

/**
 * 過去メッセージの言行録を表示するコンポーネント (PC/モバイル両対応)
 * タイトル横に魔導聖典を開くボタンを備える。
 */
export const MessageLog = ({ 
  messages, 
  isForceMobile,
  setShowGrimoire
}) => {
  const logRef = useRef(null);

  // 自動スクロール
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const containerClass = isForceMobile ? 'mobile-log-scroll-area' : 'pc-log-area';

  return (
    <div className="message-log-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="log-header" style={{ 
        padding: '5px 12px', 
        background: '#111', 
        borderBottom: `1px solid ${varGold}66`, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <span style={{ color: varGold, fontSize: '0.75rem', letterSpacing: '2px' }}>救済の言行録</span>
        {setShowGrimoire && (
           <button 
             onClick={() => setShowGrimoire(true)}
             style={{
               background: 'transparent',
               border: `1px solid ${varGold}`,
               color: varGold,
               fontSize: '0.7rem',
               padding: '2px 8px',
               cursor: 'pointer',
               borderRadius: '2px',
               transition: 'all 0.2s'
             }}
             title="魔道術の一覧を表示 (Key: K)"
             onMouseOver={(e) => { e.target.style.background = varGold; e.target.style.color = '#000'; }}
             onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = varGold; }}
           >
             🏮 術聖典
           </button>
        )}
      </div>
      <div 
        className={containerClass} 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '12px', 
          background: 'rgba(0,0,0,0.6)', 
          scrollBehavior: 'smooth' 
        }} 
        ref={logRef}
      >
        {messages.slice(-40).map((m, i) => (
          <div key={i} className={`log-msg msg-${m.type}`} style={{ padding: '6px 0', borderBottom: '1px solid #222', fontSize: isForceMobile ? '1.05rem' : '0.9rem', lineHeight: '1.6' }}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
};
