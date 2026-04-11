// src/components/navigation/MessageLog.jsx
import React, { useEffect, useRef } from 'react';

/**
 * 過去メッセージの言行録を表示するコンポーネント (PC/モバイル両対応)
 */
export const MessageLog = ({ 
  messages, 
  isForceMobile
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
    <div 
      className={containerClass} 
      style={{ 
        flex: 1, 
        height: '100%',
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
  );
};
