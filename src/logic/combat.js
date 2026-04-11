import Enemies from '../data/Enemies.json' with { type: 'json' };
export { SPELLS } from '../data/magicData.js';

/**
 * 敵をランダムに抽選する（レベル調整含む）
 * @param {number} playerLvSum - プレイヤー全員の合計レベル
 * @returns {object} 初期化された敵オブジェクト
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
 * @param {number} atkAc - 攻撃側の命中値 (AC相当)
 * @param {number} minDmg - 最小ダメージ
 * @param {number} maxDmg - 最大ダメージ
 * @param {number} defAc - 防御側の回避値 (AC相当)
 * @returns {object} { hit: boolean, damage: number }
 */
export const calculateHitAndDamage = (atkAc, minDmg, maxDmg, defAc) => {
  // 命中判定: AC 差による基本命中率 (10%～95%)
  const hitChance = Math.min(0.95, Math.max(0.1, 0.7 + (atkAc - defAc) * 0.05));
  const isHit = Math.random() < hitChance;
  
  if (!isHit) return { hit: false, damage: 0 };
  
  // ダメージ算出: 防御側のACによる軽減
  const baseDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  const damage = Math.max(1, Math.floor(baseDmg * (1 - (20 - defAc) * 0.02)));
  
  return { hit: true, damage };
};
