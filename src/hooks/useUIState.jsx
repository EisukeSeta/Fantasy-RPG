import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext();

/**
 * 都の「見え方（UI状態）」を一元管理する器。
 * 複数のコンポーネント間で表示状態を完全に同期する。
 */
export const UIProvider = ({ children }) => {
  const [showGrimoire, setShowGrimoire] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [archivesTab, setArchivesTab] = useState('ENEMIES');
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

  // 特定の画面を開く（排他的制御）
  const openView = useCallback((viewKey, options = {}) => {
    closeAll();
    if (viewKey === 'GRIMOIRE') setShowGrimoire(true);
    else if (viewKey === 'ARCHIVES') {
      setShowArchives(true);
      if (options.tab) setArchivesTab(options.tab);
    }
    else if (viewKey === 'SHORTCUTS') setShowShortcutHelp(true);
    else if (viewKey === 'STATUS') setShowStatus(true);
    else if (viewKey === 'MAP') setShowMap(true);
  }, [closeAll]);

  // トグル切り替え（開いていれば閉じ、閉じていれば開く。他は閉じる）
  const toggleView = useCallback((viewKey) => {
    const isCurrentlyOpen = 
      (viewKey === 'GRIMOIRE' && showGrimoire) ||
      (viewKey === 'ARCHIVES' && showArchives) ||
      (viewKey === 'SHORTCUTS' && showShortcutHelp) ||
      (viewKey === 'STATUS' && showStatus) ||
      (viewKey === 'MAP' && showMap);

    if (isCurrentlyOpen) {
      closeAll();
    } else {
      openView(viewKey);
    }
  }, [showGrimoire, showArchives, showShortcutHelp, showStatus, showMap, closeAll, openView]);

  const value = {
    showGrimoire, setShowGrimoire,
    showArchives, setShowArchives,
    archivesTab, setArchivesTab,
    showShortcutHelp, setShowShortcutHelp,
    showStatus, setShowStatus,
    showMap, setShowMap,
    closeAll,
    openView,
    toggleView
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

/**
 * 都の UI 状態を参照するためのフック
 */
export const useUIState = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIProvider');
  }
  return context;
};
