/**
 * src/logic/status.js
 * 特殊状態（業：ごう）の計算ロジックを司るモジュール。
 * 
 * 機能概要:
 * - 毒ダメージ、麻痺による行動制限などの判定を行う。
 * 
 * 入力: actor (Player または Enemy オブジェクト)
 * 出力: 状態適用後のオブジェクト、および発生した事象の告知（メッセージ）
 */

/**
 * ターン開始時に適用される継続効果（毒など）を処理する。
 * @param {object} actor - 術の対象者
 * @returns {object} { updatedActor, messages }
 */
export const applyStatusEffects = (actor) => {
  const updatedActor = { ...actor };
  const messages = [];

  if (!updatedActor.statusEffects) return { updatedActor, messages };

  // 1. 毒 (POISON) の理
  if (updatedActor.statusEffects.includes('POISON')) {
    const dmg = Math.max(1, Math.floor(updatedActor.maxHp * 0.05));
    updatedActor.hp = Math.max(0, updatedActor.hp - dmg);
    messages.push(`${updatedActor.name}は毒のダメージを ${dmg} 受けた！`);
  }

  return { updatedActor, messages };
};

/**
 * 行動可能かどうかを判定する（麻痺など）。
 * @param {object} actor - 行動者
 * @returns {object} { canAction, message }
 */
export const checkActionAbility = (actor) => {
  if (!actor.statusEffects) return { canAction: true };

  // 1. 麻痺 (PARALYZED) の理
  if (actor.statusEffects.includes('PARALYZED')) {
    if (Math.random() < 0.33) {
      return { 
        canAction: false, 
        message: `${actor.name}は体が痺れて動けない！` 
      };
    }
  }

  return { canAction: true };
};

/**
 * 隊員の最終的な能力値を計算する。
 * 基本能力値 + 武勲アイテムの基礎効果 + (Rankによる成長補正)
 * @param {object} actor - 隊員
 * @param {array} itemsData - 武勲アイテムのマスタデータ
 * @returns {object} { minDmg, maxDmg, ac }
 */
export const calculateFinalStatus = (actor, itemsData) => {
  let minDmg = actor.minDmg;
  let maxDmg = actor.maxDmg;
  let ac = actor.ac;

  if (actor.items && actor.medals) {
    actor.items.forEach(itemId => {
      const item = itemsData.find(it => it.id === itemId);
      if (item && item.effect) {
        const rank = actor.medals[itemId] || 1;
        
        // 1. 基底補正 (Rank 1 の効果)
        if (item.effect.atk) { minDmg += item.effect.atk; maxDmg += item.effect.atk; }
        if (item.effect.ac) { ac += item.effect.ac; }

        // 2. 霊格補正 (Rank 2 以降、1レベルにつき 打撃+1, 回避+1)
        if (rank > 1) {
          const rankBonus = rank - 1;
          if (item.effect.atk) { minDmg += rankBonus; maxDmg += rankBonus; }
          if (item.effect.ac) { ac += rankBonus; }
        }
      }
    });
  }

  return { minDmg, maxDmg, ac };
};
