/**
 * src/logic/save.js
 * 都の記憶（セーブ・ロード）に関わる論理を司る。
 * 聖典 DATA_CONTRACTS.md に基づき、データの整合性を保証する。
 */

/**
 * 読み込んだデータが都の正史（正しい形式）であるかを検断する
 * @param {Object} data 読み込まれたデータ
 * @returns {boolean} 正当であれば true
 */
export const validateSaveData = (data) => {
  if (!data || typeof data !== 'object') return false;

  // 1. 最小限の必須プロパティ（これがないと復旧不能なもの）
  if (!data.party || !Array.isArray(data.party) || data.party.length === 0) return false;
  if (!data.playerState || typeof data.playerState !== 'object') return false;

  // 2. バージョン整合性の検証 (未知の未来バージョンは弾くが、過去分は後の補完に任せる)
  if (data.saveVersion && data.saveVersion !== 'V1') return false;

  return true;
};

/**
 * 読み込んだデータに、必要最低限の補完（Hydration）を行う
 * @param {Object} data 正当性が確認されたデータ
 * @returns {Object} 補完されたデータ
 */
export const hydrateSaveData = (data) => {
  const safeData = { ...data };
  
  // 図録データの補完（存在しない場合は空配列）
  safeData.encounteredEnemies = safeData.encounteredEnemies || [];
  safeData.defeatedEnemies = safeData.defeatedEnemies || [];
  
  // ボスフラグの補完
  if (safeData.bossDefeated === undefined) safeData.bossDefeated = false;

  return safeData;
};
