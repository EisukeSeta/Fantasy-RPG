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
