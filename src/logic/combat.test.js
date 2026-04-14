import { describe, it, expect, vi } from 'vitest';
import { calculateHitAndDamage, getRandomEnemy } from './combat';

/**
 * 【合戦の理】自動検証（Unit Test）
 */
describe('combat.js: 合戦の理の検証', () => {

  describe('calculateHitAndDamage: 命中と打撃の検分', () => {
    
    it('攻撃側が圧倒的に有利な場合、高い確率で命中すること', () => {
      // Math.random を 0 (常に成功側) に固定してシミュレート
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
      
      const res = calculateHitAndDamage(20, 10, 10, 0); // AC差大
      expect(res.hit).toBe(true);
      expect(res.damage).toBeGreaterThan(0);
      
      spy.mockRestore();
    });

    it('攻撃側が圧倒的に不利な場合でも、最低命中率(10%)が担保されること', () => {
      // 命中率計算式の確認: 0.7 + (atkAc - defAc) * 0.05
      // 5-20 = -15 -> 0.7 - 0.75 = -0.05 -> clamp to 0.1
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.05); // 5%なら命中
      
      const res = calculateHitAndDamage(5, 10, 10, 20);
      expect(res.hit).toBe(true);
      
      spy.mockRestore();
    });

    it('ダメージがACによって軽減されること', () => {
      // 軽減式: baseDmg * (1 - (20 - defAc) * 0.02)
      // AC 20 の場合: 1 - 0 = 100% 通る
      // AC 10 の場合: 1 - 0.2 = 80% になる
      
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // 中央値固定
      const resHigh = calculateHitAndDamage(10, 100, 100, 20); // 20% 軽減 -> 80
      const resLow = calculateHitAndDamage(10, 100, 100, 10);  // 10% 軽減 -> 90
      
      expect(resHigh.damage).toBeLessThan(resLow.damage);
      vi.restoreAllMocks();
    });

    it('痛打（Critical）が発生した際、ダメージが増大すること', () => {
      // 痛打判定(5%)をパスさせる
      const spy = vi.spyOn(Math, 'random');
      spy.mockReturnValueOnce(0); // 命中判定パス
      spy.mockReturnValueOnce(0.01); // 痛打判定パス
      spy.mockReturnValueOnce(0.5); // ダメージ中央値
      
      const res = calculateHitAndDamage(10, 100, 100, 20); // 100 * 1.5 = 150, 150 * (1-0.2) = 120
      expect(res.critical).toBe(true);
      expect(res.damage).toBe(120); // 痛打(1.5倍)かつAC軽減(20%)
      
      spy.mockRestore();
    });
  });

  describe('getRandomEnemy: 遭遇の検分', () => {
    it('プレイヤーのレベルに応じた敵が選定されること', () => {
      // 低レベル時
      const enemyLow = getRandomEnemy(3);
      expect(enemyLow.id).toBeLessThanOrEqual(4);
      
      // 高レベル時
      const enemyHigh = getRandomEnemy(30);
      expect(enemyHigh.id).toBeGreaterThanOrEqual(5);
    });
  });

});
