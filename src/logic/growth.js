import balanceData from '../data/Balance.json' with { type: 'json' };

/**
 * 【成長の理】レベルアップ計算モジュール
 * 
 * 機能:
 *   - 目標レベル到達に必要な累積経験値の算出
 * 
 * 入力変数の理:
 *   - lv: 到達したい目標レベル (1〜50以上)
 * 
 * 出力（戻り値）の理:
 *   - cumulativeExp: そのレベルに達するために必要な【累積】経験値
 * 
 * 仕様の理:
 *   - Lv1: 必要な累積経験値は 0
 *   - 序盤: balanceData.experience.baseTable を参照（手動調整領域）
 *   - 中盤以降: シグモイド曲線 (1/(1+e^-x)) を用いて計算
 *     - sigmoidScale: 最終的な経験値の目標値(Cap)
 *     - sigmoidCenter: 成長曲線が最も急になる地点 (0.5 = 中間地点)
 *     - sigmoidSlope: 成長の急峻さ
 */

/**
 * 次のレベルに必要な累積経験値を計算する
 * @param {number} lv - 現在のレベル、または到達目標レベル
 */
export const getRequiredExp = (lv) => {
  // Lv1 は基礎。徳を積む必要はない。
  if (lv <= 1) return 0;
  
  // 序盤の理: 手動調整された基礎テーブルを参照
  if (lv <= balanceData.experience.baseTable.length) {
    return balanceData.experience.baseTable[lv - 1];
  }
  
  // 中盤以降の理: SIGMOID 曲線による指数的成長
  const { sigmoidScale, sigmoidCenter, sigmoidSlope, maxLevel } = balanceData.experience;
  
  // 成長度の正規化 (50レベルを 1.0 とする)
  const normLv = Math.min(lv, maxLevel);
  const x = (normLv - 1) / (maxLevel - 1); 
  
  // シグモイド関数の適用
  const sigmoid = 1 / (1 + Math.exp(-sigmoidSlope * (x - sigmoidCenter)));
  
  // スケールを乗じて最終的な期待経験値を算出
  return Math.floor(sigmoidScale * sigmoid);
};
