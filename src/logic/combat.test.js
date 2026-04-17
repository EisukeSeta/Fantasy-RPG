import { describe, it, expect, vi } from 'vitest';
import { calculateHitAndDamage, getRandomEnemy, getEffectiveStats, isValidAction } from './combat';

/**
 * 【合戦の理】自動検証（Unit Test）
 */
describe('combat.js: 合戦の理の検証', () => {

  describe('calculateHitAndDamage: 命中と打撃の検分', () => {
    
    it('攻撃側が圧倒的に有利な場合、高い確率で命中すること', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
      const res = calculateHitAndDamage(20, 10, 10, 0);
      expect(res.hit).toBe(true);
      expect(res.damage).toBeGreaterThan(0);
      spy.mockRestore();
    });

    it('攻撃側が圧倒的に不利な場合でも、最低命中率(10%)が担保されること', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.05);
      const res = calculateHitAndDamage(5, 10, 10, 20);
      expect(res.hit).toBe(true);
      spy.mockRestore();
    });

    it('ダメージがACによって軽減されること', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const resHigh = calculateHitAndDamage(10, 100, 100, 20);
      const resLow = calculateHitAndDamage(10, 100, 100, 10);
      expect(resHigh.damage).toBeLessThan(resLow.damage);
      vi.restoreAllMocks();
    });

    it('痛打（Critical）が発生した際、ダメージが増大すること', () => {
      const spy = vi.spyOn(Math, 'random');
      spy.mockReturnValueOnce(0);
      spy.mockReturnValueOnce(0.01);
      spy.mockReturnValueOnce(0.5);
      const res = calculateHitAndDamage(10, 100, 100, 20);
      expect(res.critical).toBe(true);
      expect(res.damage).toBe(120);
      spy.mockRestore();
    });
  });

  describe('getRandomEnemy: 遭遇の検分', () => {
    it('プレイヤーのレベルに応じた敵が選定されること', () => {
      const enemyLow = getRandomEnemy(3);
      expect(enemyLow.id).toBeLessThanOrEqual(4);
      const enemyHigh = getRandomEnemy(30);
      expect(enemyHigh.id).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getEffectiveStats: 実効能力値の検分', () => {
    const itemsData = [
      { id: 'medal_nue', name: '鵺の鋭爪', effect: { atk: 5, ac: 2 } }
    ];

    it('アイテムや武勲がない場合、素のステータスを返すこと', () => {
      const char = { name: '晴明', minDmg: 10, maxDmg: 20, ac: 5 };
      const res = getEffectiveStats(char, itemsData);
      expect(res.minDmg).toBe(10);
      expect(res.ac).toBe(5);
    });

    it('アイテム所持による固定補正が適用されること', () => {
      const char = { name: '晴明', items: ['medal_nue'], minDmg: 10, maxDmg: 20, ac: 5 };
      const res = getEffectiveStats(char, itemsData);
      expect(res.minDmg).toBe(15);
      expect(res.ac).toBe(7);
    });

    it('武勲（Rank）による累積補正（霊力）が適用されること', () => {
      const char = { 
        name: '晴明', 
        items: ['medal_nue'], 
        medals: { 'medal_nue': 3 },
        minDmg: 10, maxDmg: 20, ac: 5 
      };
      const res = getEffectiveStats(char, itemsData);
      expect(res.minDmg).toBe(17);
      expect(res.ac).toBe(9);
    });
  });

  describe('isValidAction: 行動正当性の検分', () => {
    it('初期状態(-1)では行動が許可されること', () => {
      expect(isValidAction(-1, 0)).toBe(true);
    });

    it('ターンが進めば行動が許可されること', () => {
      expect(isValidAction(0, 1)).toBe(true);
    });

    it('同一ターンの重複行動は弾かれること', () => {
      expect(isValidAction(5, 5)).toBe(false);
    });
  });
});
