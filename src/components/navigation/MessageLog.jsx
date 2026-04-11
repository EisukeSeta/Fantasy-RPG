// src/components/navigation/MessageLog.jsx
import React, { useEffect, useRef } from 'react';

/**
 * 過去メッセージの言行録を表示するコンポーネント (PC/モバイル両対応)
 */
export const MessageLog = ({ 
  messages, 
  isForceMobile, 
  showMap,
  scenarioData
}) => {
  const logRef = useRef(null);

  // PC版での自動スクロール
  useEffect(() => {
    if (!isForceMobile && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, isForceMobile]);

  // モバイル版の簡易表示
  if (isForceMobile) {
    return (
      <div className="mobile-log-display">
        {messages.slice(-5).map((m, i) => (
          <div key={i} className={`log-msg msg-${m.type} ${i === messages.length - 1 ? 'active-msg' : ''}`}>
            {m.text}
          </div>
        ))}
      </div>
    );
  }

  // PC版のフルログ表示
  return (
    <div className={`pc-log-area`} style={{ flex: 1, borderTop: '2px solid #333', overflowY: 'scroll', padding: '10px', background: 'rgba(0,0,0,0.4)', scrollBehavior: 'smooth' }} ref={logRef}>
      {messages.slice(-30).map((m, i) => (
        <div key={i} className={`log-msg msg-${m.type}`} style={{ padding: '4px 0', borderBottom: '1px solid #222', fontSize: '0.9rem' }}>
          {m.text}
        </div>
      ))}
    </div>
  );
};
