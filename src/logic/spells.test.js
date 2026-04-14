import { describe, it, expect } from 'vitest';
import { calculateSpellEffect } from './spells';

/**
 * 【魔道の理】自動検証（Unit Test）
 */
describe('spells.js: 魔道の理の検証', () => {

  it('攻撃魔法(ATTACK)の効果量が、minDmg〜maxDmg の範囲に収まること', () => {
    const fireSpell = { type: 'ATTACK', minDmg: 20, maxDmg: 40 };
    const caster = { mp: 10, int: 10 }; // 将来的に知力(int)なども考慮可能
    
    const res = calculateSpellEffect(fireSpell, caster);
    expect(res.value).toBeGreaterThanOrEqual(20);
    expect(res.value).toBeLessThanOrEqual(40);
  });

  it('回復魔法(HEAL)の効果量が、minHeal〜maxHeal の範囲に収まること', () => {
    const healSpell = { type: 'HEAL', minHeal: 50, maxHeal: 100 };
    const res = calculateSpellEffect(healSpell, { mp: 10 });
    
    expect(res.value).toBeGreaterThanOrEqual(50);
    expect(res.value).toBeLessThanOrEqual(100);
  });

  it('特殊状態(STATUS)を付与する術が、正しく状態を返すこと', () => {
    const slowSpell = { type: 'STATUS', statusEffect: '麻痺' };
    const res = calculateSpellEffect(slowSpell, { mp: 10 });
    
    expect(res.statusEffect).toBe('麻痺');
  });

  it('バフ魔法(BUFF)が、ACボーナス等の値を正しく返すこと', () => {
    const armorSpell = { type: 'BUFF', acBonus: 5 };
    const res = calculateSpellEffect(armorSpell, { mp: 10 });
    
    expect(res.value).toBe(5);
  });

});
