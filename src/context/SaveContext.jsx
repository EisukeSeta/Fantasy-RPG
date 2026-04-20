import React, { createContext, useContext, useCallback } from 'react';
import { Logger } from '../utils/logger';
import { validateSaveData, hydrateSaveData } from '../logic/save';

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
      
      // 記憶の検断
      if (!validateSaveData(data)) {
        // 具体的な欠損理由を目視可能にする
        const missing = [];
        if (!data.party) missing.push('party');
        if (!data.playerState) missing.push('playerState');
        if (data.saveVersion && data.saveVersion !== 'V1') missing.push(`version_mismatch(${data.saveVersion})`);

        Logger.impurity('SaveSystem', `記憶の形が崩れています（欠落: ${missing.join(', ')}）。読み取りを中止しました。`, { data });
        return null;
      }

      Logger.info('SaveSystem', '過去の記憶を呼び戻しました。この記録は都に刻まれています。');
      
      // 記憶の補正（古いプロパティの補完等）
      return hydrateSaveData(data);
    } catch (e) {
      Logger.warn('SaveSystem', '記憶の想起に失敗しました', { error: e.message });
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
