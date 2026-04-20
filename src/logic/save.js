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

  // 1. 必須プロパティの存在確認
  const requiredKeys = ['party', 'playerState', 'mapData', 'saveVersion'];
  for (const key of requiredKeys) {
    if (!(key in data)) return false;
  }

  // 2. 基本的な型の検証
  if (!Array.isArray(data.party)) return false;
  if (data.party.length === 0) return false;
  if (typeof data.playerState !== 'object') return false;
  if (!Array.isArray(data.mapData)) return false;

  // 3. バージョン整合性の検証 (現在は V1 のみを期待)
  if (data.saveVersion !== 'V1') return false;

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
