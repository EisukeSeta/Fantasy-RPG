import Enemies from '../data/Enemies.json' with { type: 'json' };
export { SPELLS } from '../data/magicData.js';

/**
 * 【合戦の理】戦闘計算モジュール
 */

/**
 * 敵をランダムに抽選する
 */
export const getRandomEnemy = (playerLvSum) => {
  const ENEMY_LIST = Enemies;
  const availableEnemies = ENEMY_LIST.filter(enemy => {
    if (enemy.isBoss) return false;
    if (playerLvSum <= 6) return enemy.id <= 4;
    return enemy.id >= 3;
  });
  
  const finalAvailable = availableEnemies.length > 0 ? availableEnemies : [ENEMY_LIST[0]];
  const base = finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
  const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
  const lv = Math.max(1, Math.floor(playerLvSum / 3) + Math.floor(Math.random() * 3) - 1);
  return { ...base, hp, maxHp: hp, lv, status: '平安' };
};

/**
 * アイテムと武勲による実効能力値を計算する
 */
export const getEffectiveStats = (member, itemsData = []) => {
  let stats = { ...member };

  // 1. アイテム（勲章）所持による基礎補正
  if (member.items) {
    member.items.forEach(itemId => {
      const item = itemsData.find(it => it.id === itemId);
      if (item && item.effect) {
        if (item.effect.atk) { stats.minDmg += item.effect.atk; stats.maxDmg += item.effect.atk; }
        if (item.effect.ac) stats.ac += item.effect.ac;
      }
    });
  }

  // 2. 武勲（Rank）による累積補正（霊力）
  if (member.medals) {
    Object.keys(member.medals).forEach(itemId => {
      const rank = member.medals[itemId];
      const item = itemsData.find(it => it.id === itemId);
      if (item && item.effect && rank > 1) {
        const bonus = rank - 1;
        if (item.effect.atk) { stats.minDmg += bonus; stats.maxDmg += bonus; }
        if (item.effect.ac) stats.ac += bonus;
      }
    });
  }

  return stats;
};

/**
 * 物理攻撃の命中とダメージを計算する
 */
export const calculateHitAndDamage = (atkAc, minDmg, maxDmg, defAc) => {
  const hitChance = Math.min(0.95, Math.max(0.1, 0.7 + (atkAc - defAc) * 0.05));
  const isHit = Math.random() < hitChance;
  if (!isHit) return { hit: false, damage: 0, critical: false };
  
  const critical = Math.random() < 0.05;
  let baseDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  if (critical) baseDmg = Math.floor(baseDmg * 1.5);
  
  const reduction = Math.min(0.5, defAc * 0.01); 
  const damage = Math.max(1, Math.floor(baseDmg * (1 - reduction)));
  return { hit: true, damage, critical };
};

/**
 * ターンベースの行動バリデーション（絶縁版）
 */
export const isValidAction = (lastActionTurn, currentTurn) => {
  // 初回行動、またはターンが正しく進んでいる場合のみ許可
  if (lastActionTurn === -1 || lastActionTurn === undefined || lastActionTurn === null) return true;
  return lastActionTurn < currentTurn;
};
