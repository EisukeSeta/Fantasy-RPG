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
 * @param {Object} actor 状態適用の対象となるキャラクター（Player または Enemy）
 * @returns {Object} { updatedActor: 更新後のキャラクターデータ, messages: 発生事象の文字列配列 }
 */
export const applyStatusEffects = (actor) => {
  const updatedActor = { ...actor };
  const messages = [];

  if (!updatedActor.statusEffects) return { updatedActor, messages };

  // 1. 毒 (POISON) の理：最大HPの 5% のダメージ。討死まではさせない。
  if (updatedActor.statusEffects.includes('POISON')) {
    const dmg = Math.max(1, Math.floor(updatedActor.maxHp * 0.05));
    updatedActor.hp = Math.max(0, updatedActor.hp - dmg);
    messages.push(`${updatedActor.name}は毒のダメージを ${dmg} 受けた！`);
  }

  return { updatedActor, messages };
};

/**
 * キャラクターが行会（行動）可能かどうかを判定する（麻痺など）。
 * @param {Object} actor 行動者
 * @returns {Object} { canAction: boolean, message: string|undefined }
 */
export const checkActionAbility = (actor) => {
  if (!actor.statusEffects) return { canAction: true };

  // 1. 麻痺 (PARALYZED) の理：33% の確率で行動が封じられる。
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
 * 隊員の最終的な能力値を計算する（武勲・霊格補正込み）。
 * 基本能力値 + 武勲アイテムの基礎効果 + (Rankによる成長補正)
 * @param {Object} actor 隊員データ
 * @param {Array} itemsData 武勲アイテムのマスタデータ
 * @returns {Object} { minDmg, maxDmg, ac } 最終能力値
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
        
        // 1. 基底補正 (Rank 1 以上の効果)
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
