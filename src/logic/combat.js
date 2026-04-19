import { ENEMY_LIST } from '../data/enemyData';
export { SPELLS } from '../data/magicData.js';

/**
 * 【合戦の理】戦闘計算モジュール
 */

/**
 * 敵をランダムに抽選し、個体値を生成する。
 * @param {number} playerLvSum パーティの合計レベル（出現モンスターのランク判定に使用）
 * @returns {Object} 生成された敵データ（HP, Lv 等を含む）
 */
export const getRandomEnemy = (playerLvSum) => {
  const availableEnemies = ENEMY_LIST.filter(enemy => {
    if (enemy.isBoss) return false;
    // 低レベル時は ID 4 までのザコ、高レベル時は ID 3 以上の強敵が出現
    if (playerLvSum <= 6) return enemy.id <= 4;
    return enemy.id >= 3;
  });
  
  const finalAvailable = availableEnemies.length > 0 ? availableEnemies : [ENEMY_LIST[0]];
  const base = finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
  // HP の個体値揺らぎ (minHp 〜 maxHp)
  const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
  // 敵レベルの動的算出
  const lv = Math.max(1, Math.floor(playerLvSum / 3) + Math.floor(Math.random() * 3) - 1);
  return { ...base, hp, maxHp: hp, lv, status: '平安' };
};

/**
 * アイテム（勲章）と武勲（メダルRank）による実効能力値を計算する。
 * @param {Object} member キャラクターデータ
 * @param {Array} itemsData アイテムのマスタデータ
 * @returns {Object} 補正適用後のキャラクターデータ
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
  // Rank 2 以降、1レベルにつき 攻撃/回避 に +1 のボーナス
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
 * 物理攻撃の命中とダメージを計算する。
 * @param {number} atkAc 攻撃側の命中値 (AC)
 * @param {number} minDmg 最小攻撃力
 * @param {number} maxDmg 最大攻撃力
 * @param {number} defAc 防御側の回避値 (AC)
 * @returns {Object} { hit: boolean, damage: number, critical: boolean }
 */
export const calculateHitAndDamage = (atkAc, minDmg, maxDmg, defAc) => {
  // 命中率：AC 差分に基づき 10% 〜 95% の範囲で変動
  const hitChance = Math.min(0.95, Math.max(0.1, 0.7 + (atkAc - defAc) * 0.05));
  const isHit = Math.random() < hitChance;
  if (!isHit) return { hit: false, damage: 0, critical: false };
  
  // 痛打（クリティカル）判定：5% の確率で 1.5倍ダメージ
  const critical = Math.random() < 0.05;
  let baseDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  if (critical) baseDmg = Math.floor(baseDmg * 1.5);
  
  // 防御減衰：AC 1 ごとに 1% (最大50%) ダメージカット
  const reduction = Math.min(0.5, defAc * 0.01); 
  const damage = Math.max(1, Math.floor(baseDmg * (1 - reduction)));
  return { hit: true, damage, critical };
};

/**
 * 合戦開始時の状態変更パッチを生成する（アトミック契約準拠）。
 * 敵の具現化、合戦状態への移行、および最初の行動者の選定を一挙に行う。
 * @param {Object} enemy 遭遇した敵データ
 * @param {Array} party 現在のパーティデータ
 * @returns {Object} 状態更新用オブジェクト { enemy, gameState, activeBattlerIndex }
 */
export const getEncounterPatch = (enemy, party) => {
  // 生存している最初のパーティメンバーの索引を特定
  let firstAlive = -1;
  for (let i = 0; i < party.length; i++) {
    if (party[i].hp > 0) {
      firstAlive = i;
      break;
    }
  }

  return {
    enemy: { ...enemy, hp: enemy.hp || enemy.maxHp },
    gameState: 'BATTLE',
    activeBattlerIndex: firstAlive === -1 ? 0 : firstAlive
  };
};
