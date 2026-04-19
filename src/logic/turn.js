/**
 * src/logic/turn.js
 * 戦闘における「手番（ターン）の遷移」を司る純粋関数モジュール。
 * 
 * 機能概要:
 * - 次の行動バトラーの決定
 * - 敵ターンの開始判定
 */

/**
 * 次に行動すべき味方のインデックスを計算する。
 * @param {Array} party パーティメンバーの配列
 * @param {number} currentIndex 現在の行動者のインデックス
 * @returns {number} 次の行動者のインデックス。全員行動済みまたは不在の場合は -1。
 */
export const getNextBattlerIndex = (party, currentIndex) => {
  if (!party || party.length === 0) return -1;
  
  // 現在のインデックスより後ろにいる、生存しているメンバーを探す
  return party.findIndex((m, i) => i > currentIndex && m.hp > 0);
};

/**
 * ターン開始時に有効な最初の味方のインデックスを取得する。
 * @param {Array} party パーティメンバーの配列
 * @returns {number} 最初の生存者のインデックス。全員討死の場合は -1。
 */
export const getFirstAliveIndex = (party) => {
  if (!party) return -1;
  return party.findIndex(m => m.hp > 0);
};

/**
 * 次のターンに進むべきか、あるいは全滅したかを判定する。
 * @param {Array} party パーティメンバーの配列
 * @returns {boolean} 少なくとも一人が生存していれば true
 */
export const isPartyAlive = (party) => {
  return party.some(m => m.hp > 0);
};

/**
 * 合戦の次なる手番の状態（パッチ）を計算する純粋関数。
 * フックの外部で演算を行うことで、テスト可能性と記記録（ログ）の整合性を保証する。
 * 
 * @expects 正常な遷移:
 * 1. 次の生存者がいる場合: { type: 'PARTY', nextActiveIndex, nextTurn: current + 1 }
 * 2. 全員行動済みの場合: { type: 'ENEMY', nextActiveIndex: 第一生存者, nextTurn: current + 1 }
 * 3. 全滅時の場合: { type: 'DEAD' }
 * 
 * @param {Array} party パーティメンバー
 * @param {number} currentIndex 現在の行動インデックス
 * @param {number} currentTurn 現在のターン数
 * @returns {Object} 遷移先の状態パッチ
 */
export const getNextTurnState = (party, currentIndex, currentTurn) => {
  if (!isPartyAlive(party)) return { type: 'DEAD' };

  const nextIdx = getNextBattlerIndex(party, currentIndex);
  if (nextIdx !== -1) {
    return {
      nextActiveIndex: nextIdx,
      nextTurn: currentTurn + 1,
      type: 'PARTY'
    };
  } else {
    return {
      nextActiveIndex: getFirstAliveIndex(party),
      nextTurn: currentTurn + 1,
      type: 'ENEMY'
    };
  }
};
