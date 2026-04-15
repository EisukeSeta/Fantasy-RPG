/**
 * YugenModal.jsx
 * 都の統一意匠ガイドライン（docs/UI_DESIGN_GUIDELINE.md）準拠の共通枠コンポーネント。
 * 
 * 入力：
 * - title: 標題
 * - onClose: 閉じる際のコールバック
 * - children: 内部に配置するコンテンツ
 * - className: 追加のクラス名
 */

import React from 'react';

const YugenModal = ({ title, onClose, children, className = "" }) => {
  return (
    <div className={`yugen-modal-overlay ${className}`}>
      {/* 標題 (統一意匠ヘッダー) */}
      <div className="yugen-modal-header">
        <h2 className="yugen-modal-title">{title}</h2>
        <button 
          className="yugen-modal-close" 
          onClick={onClose}
          aria-label="閉じる"
        >
          閉じる
        </button>
      </div>

      {/* コンテンツ領域 */}
      <div className="yugen-modal-content">
        {children}
      </div>
    </div>
  );
};

export default YugenModal;
