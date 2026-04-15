/**
 * useUIState.js
 * 都の表示状態（オーバーレイ）を司る Hook。
 * 
 * 機能：
 * - 各種ビュー（図録、経典、地図、ステータス、ヘルプ）の開閉管理
 * - 排他的なトグル制御（一つを開いたら他を閉じる）
 * - キーボードから呼び出し可能な連動ロジックの提供
 */

import { useState, useCallback } from 'react';

export const useUIState = () => {
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // 他の全ての画面を閉じる
  const closeAll = useCallback(() => {
    setShowGrimoire(false);
    setShowArchives(false);
    setShowShortcutHelp(false);
    setShowStatus(false);
    setShowMap(false);
  }, []);

  // 特定の画面を開く（他は閉じる）
  const openView = useCallback((viewKey) => {
    closeAll();
    if (viewKey === 'GRIMOIRE') setShowGrimoire(true);
    else if (viewKey === 'ARCHIVES') setShowArchives(true);
    else if (viewKey === 'SHORTCUTS') setShowShortcutHelp(true);
    else if (viewKey === 'STATUS') setShowStatus(true);
    else if (viewKey === 'MAP') setShowMap(true);
  }, [closeAll]);

  // 特定の画面をトグルする（開くなら他は閉じる、閉じるなら単に閉じる）
  const toggleView = useCallback((viewKey) => {
    const setters = {
      'GRIMOIRE': [showGrimoire, setShowGrimoire],
      'ARCHIVES': [showArchives, setShowArchives],
      'SHORTCUTS': [showShortcutHelp, setShowShortcutHelp],
      'STATUS': [showStatus, setShowStatus],
      'MAP': [showMap, setShowMap],
    };

    const [currentVal, setter] = setters[viewKey];
    if (currentVal) {
      setter(false);
    } else {
      openView(viewKey);
    }
  }, [showGrimoire, showArchives, showShortcutHelp, showStatus, showMap, openView]);

  return {
    showGrimoire, setShowGrimoire,
    showArchives, setShowArchives,
    showShortcutHelp, setShowShortcutHelp,
    showStatus, setShowStatus,
    showMap, setShowMap,
    closeAll,
    openView,
    toggleView
  };
};
