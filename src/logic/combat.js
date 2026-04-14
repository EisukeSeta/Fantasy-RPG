import Enemies from '../data/Enemies.json' with { type: 'json' };
export { SPELLS } from '../data/magicData.js';

/**
 * 【合戦の理】戦闘計算モジュール
 * 
 * 機能: 
 *   - 敵のランダム選定と能力初期化
 *   - 物理攻撃の判定とダメージ算出
 * 
 * 入力変数の理:
 *   - lv: レベル。敵の基礎能力の指標。
 *   - ac: 防御値。高いほど攻撃を回避しやすく、被ダメージも軽減する。
 *   - minDmg / maxDmg: 攻撃時の基礎ダメージ範囲。
 * 
 * 出力（戻り値）の理:
 *   - getRandomEnemy -> 初期化済みの敵オブジェクト
 *   - calculateHitAndDamage -> { hit: 命中成否, damage: 与ダメージ, critical: 痛打成否 }
 */

/**
 * 敵をランダムに抽選する（レベル調整含む）
 * @param {number} playerLvSum - プレイヤー全員の合計レベル（1〜40程度を想定）
 */
export const getRandomEnemy = (playerLvSum) => {
  const ENEMY_LIST = Enemies;
  
  // プレイヤー合計レベルに応じて出現する敵をフィルタリング
  const availableEnemies = ENEMY_LIST.filter(enemy => {
    if (enemy.isBoss) return false;
    if (playerLvSum <= 6) return enemy.id <= 4;
    if (playerLvSum <= 15) return enemy.id >= 3 && enemy.id <= 7;
    return enemy.id >= 5 && enemy.id <= 9;
  });
  
  const finalAvailable = availableEnemies.length > 0 ? availableEnemies : [ENEMY_LIST[0]];
  const base = finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
  
  // 個体差(HP)とレベルの決定
  const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
  const lv = Math.max(1, Math.floor(playerLvSum / 3) + Math.floor(Math.random() * 3) - 1);
  
  return { ...base, hp, maxHp: hp, lv, status: '平安' };
};

/**
 * 物理攻撃の命中とダメージを計算する
 * @param {number} atkAc - 攻撃側の命中・熟練度 (AC相関)
 * @param {number} minDmg - 最小ダメージ
 * @param {number} maxDmg - 最大ダメージ
 * @param {number} defAc - 防御側の回避・守備力 (AC相関)
 */
export const calculateHitAndDamage = (atkAc, minDmg, maxDmg, defAc) => {
  // 命中判定: AC 差による基本命中率 (10%～95%)
  // 基準値 70% ± AC差×5%
  const hitChance = Math.min(0.95, Math.max(0.1, 0.7 + (atkAc - defAc) * 0.05));
  const isHit = Math.random() < hitChance;
  
  if (!isHit) return { hit: false, damage: 0, critical: false };
  
  // クリティカル（痛打）判定: 5% の確率で発生
  const critical = Math.random() < 0.05;
  
  // ダメージ算出: 防御側のACによる軽減
  let baseDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  if (critical) baseDmg = Math.floor(baseDmg * 1.5); // 痛打時は1.5倍
  
  // AC 1につき 1% 軽減に変更（最大 20% 程度のマイルドな軽減）
  const reduction = Math.min(0.5, defAc * 0.01); 
  const damage = Math.max(1, Math.floor(baseDmg * (1 - reduction)));
  
  return { hit: true, damage, critical };
};
