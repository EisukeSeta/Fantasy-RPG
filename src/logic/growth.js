// src/logic/growth.js
import balanceData from '../data/Balance.json';

/**
 * 次のレベルに必要な累積経験値を計算する
 * @param {number} lv - 現在のレベル
 * @returns {number} 累積経験値
 */
export const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  
  // 基本テーブル（序盤）の参照
  if (lv <= balanceData.experience.baseTable.length) {
    return balanceData.experience.baseTable[lv - 1];
  }
  
  // 中盤以降の SIGMOID 曲線による計算
  const { sigmoidScale, sigmoidCenter, sigmoidSlope } = balanceData.experience;
  const x = (lv - 1) / 49; // 50レベルを基準に正規化
  const sigmoid = 1 / (1 + Math.exp(-sigmoidSlope * (x - sigmoidCenter)));
  
  return Math.floor(sigmoidScale * sigmoid);
};
