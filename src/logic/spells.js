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

export const calculateSpellEffect = (spell, _caster) => { // eslint-disable-line no-unused-vars
  const { type } = spell;
  let value = 0;
  let statusEffect = spell.statusEffect || null;

  switch (type) {
    case 'ATTACK':
      // 攻撃魔法: 指定範囲内でのダメージ算出
      value = Math.floor(Math.random() * (spell.maxDmg - spell.minDmg + 1)) + spell.minDmg;
      break;

    case 'HEAL':
      // 回復魔法: 指定範囲内での回復量算出
      value = Math.floor(Math.random() * (spell.maxHeal - spell.minHeal + 1)) + spell.minHeal;
      break;

    case 'BUFF':
      // 強化魔法: ACボーナス等の固定値
      value = spell.acBonus || 0;
      break;

    case 'STATUS':
      // 状態魔法: ダメージはないが、状態変化を伴う
      value = 0;
      break;

    default:
      value = 0;
  }

  // 術者の知力(int)等による将来的な補正の余地をここに残す
  // if (caster.int) value = Math.floor(value * (1 + caster.int * 0.05));

  return {
    value,
    type,
    statusEffect
  };
};
