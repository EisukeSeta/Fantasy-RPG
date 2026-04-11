// src/__tests__/combat.test.js
import { describe, it, expect } from 'vitest';
import { calculateHitAndDamage } from '../logic/combat';

describe('Combat Logic (戦闘演算)', () => {
  it('命中した場合、ダメージは最小値以上であるべき', () => {
    // 100回試行して不整合がないか確認
    for (let i = 0; i < 100; i++) {
      const result = calculateHitAndDamage(10, 5, 10, 10);
      if (result.hit) {
        expect(result.damage).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('極端に防御が高い場合でも、最低ダメージ 1 を保証すべき', () => {
    const result = calculateHitAndDamage(10, 5, 10, 99); // 鉄壁の防御
    if (result.hit) {
      expect(result.damage).toBeGreaterThanOrEqual(1);
    }
  });
});
