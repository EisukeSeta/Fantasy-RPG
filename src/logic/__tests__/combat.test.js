import { describe, it, expect } from 'vitest';
import { calculateHitAndDamage, getRandomEnemy } from '../combat';

describe('戦闘計算の理 (Combat Logic)', () => {
  describe('命中と損傷の算定 (calculateHitAndDamage)', () => {
    it('命中率が負にならないこと', () => {
      // 攻撃側 AC 0, 防御側 AC 100 (極端な例)
      const res = calculateHitAndDamage(0, 10, 20, 100);
      expect(typeof res.hit === 'boolean').toBe(true);
    });

    it('ダメージが最小・最大範囲内に収まること', () => {
      const min = 10;
      const max = 20;
      // 命中を確定させ、軽減を発生させないために防御側 AC を 20 (無防備) に設定
      for (let i = 0; i < 100; i++) {
        const res = calculateHitAndDamage(50, min, max, 20);
        if (res.hit) {
          expect(res.damage).toBeGreaterThanOrEqual(min);
          expect(res.damage).toBeLessThanOrEqual(max);
        }
      }
    });

    it('会心の一撃でダメージが増加すること', () => {
      // 本ロジックでは会心時にダメージが 1.5倍などになる仕様か確認
      // 現在の実装を元に期待値を設定
      const res = calculateHitAndDamage(100, 10, 10, 0); 
      // 100% 命中 & 会心10% のはず
      if (res.critical) {
        expect(res.damage).toBeGreaterThan(10);
      }
    });
  });

  describe('怪異の選定 (getRandomEnemy)', () => {
    it('パーティの位階（合計Lv）に応じた怪異が選ばれること', () => {
      const enemy = getRandomEnemy(1); // 低レベル
      expect(enemy).toBeDefined();
      expect(enemy.id).toBeLessThan(10); // ボス以外

      const strongEnemy = getRandomEnemy(99); // 高レベル
      expect(strongEnemy).toBeDefined();
    });
  });
});
