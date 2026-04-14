// src/logic/status.test.js
import { applyStatusEffects, checkActionAbility } from './status';
import { describe, it, expect, vi } from 'vitest';

describe('状態異常の理（status.js）', () => {

  describe('applyStatusEffects (ターン開始時)', () => {
    it('毒 (POISON) のダメージが正しく適用されること', () => {
      const actor = {
        name: '渡辺綱',
        hp: 100,
        maxHp: 100,
        statusEffects: ['POISON']
      };
      
      const { updatedActor, messages } = applyStatusEffects(actor);
      
      // 100 * 0.05 = 5 ダメージ
      expect(updatedActor.hp).toBe(95);
      expect(messages[0]).toContain('毒のダメージを 5');
    });

    it('毒の最低ダメージが 1 であること', () => {
      const actor = {
        name: '安倍晴明',
        hp: 100,
        maxHp: 10,  // 10 * 0.05 = 0.5 -> 1 (min)
        statusEffects: ['POISON']
      };
      
      const { updatedActor, messages } = applyStatusEffects(actor);
      
      expect(updatedActor.hp).toBe(99);
      expect(messages[0]).toContain('1');
    });

    it('状態異常がない場合、何も変化しないこと', () => {
      const actor = {
        name: '八百比丘尼',
        hp: 100,
        maxHp: 100,
        statusEffects: []
      };
      const { updatedActor, messages } = applyStatusEffects(actor);
      expect(updatedActor.hp).toBe(100);
      expect(messages.length).toBe(0);
    });
  });

  describe('checkActionAbility (行動判定)', () => {
    it('麻痺 (PARALYZED) で行動不能になる可能性があること', () => {
      const actor = { name: '敵', statusEffects: ['PARALYZED'] };
      
      // Math.random を Mock して、確実に判定を操作する
      const spy = vi.spyOn(Math, 'random');
      
      // 確率 33% ( < 0.33 で失敗)
      spy.mockReturnValue(0.1); 
      expect(checkActionAbility(actor).canAction).toBe(false);
      expect(checkActionAbility(actor).message).toContain('痺れて動けない');

      // 確率外 ( >= 0.33 で成功)
      spy.mockReturnValue(0.4); 
      expect(checkActionAbility(actor).canAction).toBe(true);

      spy.mockRestore();
    });

    it('状態異常なしなら、常に動けること', () => {
      const actor = { name: '渡辺綱', statusEffects: [] };
      expect(checkActionAbility(actor).canAction).toBe(true);
    });
  });

});
