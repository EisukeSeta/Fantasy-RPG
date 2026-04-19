/**
 * 【魔道の理】魔法効果算出モジュール
 * 
 * 機能:
 *   - 魔法の種類に応じた効果量（ダメージ、回復、バフ値）の算出
 *   - 特殊状態の付与判定
 * 
 * 入力変数の理:
 *   - spell: 術の定義オブジェクト (minDmg, maxHeal, mp, type 等)
 *   - caster: 術者の情報 (将来的な能力補正用)
 * 
 * 出力（戻り値）の理:
 *   - { value: 効果数値, type: 術の種類, statusEffect: 付与される状態 }
 */

/**
 * 術（呪文）の効果量を算出し、特殊効果の判定を行う。
 * 
 * @param {Object} spell 発動する術データの定義 (minDmg, maxHeal, mp, type 等)
 * @param {Object} caster 術者のキャラクターデータ（能力補正に使用）
 * @returns {Object} { value: 効果数値, type: 術の種別, statusEffect: 付与される状態(あれば) }
 */
export const calculateSpellEffect = (spell, caster) => {
  const { type } = spell;
  let value = 0;
  let statusEffect = spell.statusEffect || null;

  // 術者レベルによる理の増幅：Lv 1 ごとに威力が 10% 上昇
  const lvBonus = 1 + ((caster?.lv || 1) * 0.1);

  switch (type) {
    case 'ATTACK':
      // 攻撃魔法：指定された威力範囲でダメージを算出
      value = Math.floor((Math.floor(Math.random() * (spell.maxDmg - spell.minDmg + 1)) + spell.minDmg) * lvBonus);
      break;

    case 'HEAL':
      // 回復魔法：指定された回復範囲で治癒量を算出
      value = Math.floor((Math.floor(Math.random() * (spell.maxHeal - spell.minHeal + 1)) + spell.minHeal) * lvBonus);
      break;

    case 'BUFF':
      // 強化魔法：AC ボーナス等の固定値を適用（将来的な拡張用）
      value = spell.acBonus || 0;
      break;

    case 'STATUS':
      // 状態魔法：直接ダメージはないが、怪異に業を負わせる
      value = 0;
      statusEffect = spell.statusEffect || null; 
      break;

    case 'CURE':
      // 浄化魔法：味方全員の穢れ（状態異常）を霧散させる
      value = 0;
      break;

    default:
      value = 0;
  }

  // 術者の【知力】等によるさらなる補正の余白
  // if (caster.int) value = Math.floor(value * (1 + caster.int * 0.05));

  return {
    value,
    type,
    statusEffect
  };
};
