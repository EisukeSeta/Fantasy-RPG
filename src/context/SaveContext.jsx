/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback } from 'react';

const SaveContext = createContext();
const SAVE_KEY = 'RASHOMON_SAVE_V1';

/**
 * 都の「記憶の術式（セーブシステム）」を司る Provider。
 */
export const SaveProvider = ({ children }) => {
  
  /**
   * 記録の術式 (Save)
   */
  const saveGame = useCallback((gameData) => {
    try {
      const saveData = {
        ...gameData,
        timestamp: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log("💾 都の記録を完了しました。");
      return true;
    } catch (e) {
      console.error("❌ 記録に失敗しました：", e);
      return false;
    }
  }, []);

  /**
   * 相起の術式 (Load)
   */
  const loadGame = useCallback(() => {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (!stored) return null;
      const data = JSON.parse(stored);
      
      console.log("⛩️ 過去の記憶を呼び戻しました。この記録は都に刻まれています。");
      return data;
    } catch (e) {
      console.error("❌ 想起に失敗しました：", e);
      return null;
    }
  }, []);

  const value = {
    saveGame,
    loadGame,
    hasSaveData: !!localStorage.getItem(SAVE_KEY)
  };

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
};

/**
 * 記憶の術式のフック
 */
export const useSaveSystem = () => {
  const context = useContext(SaveContext);
  if (!context) {
    throw new Error('useSaveSystem must be used within a SaveProvider');
  }
  return context;
};
