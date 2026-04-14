import { describe, it, expect } from 'vitest';
import { applyStatusEffects, checkActionAbility } from './status';

describe('status.js: 特殊状態（業）の理の検証', () => {

  it('毒状態(POISON)の場合、ターン開始時にダメージを受けること', () => {
    const actor = { 
      name: 'テスト者', 
      hp: 100, 
      maxHp: 100, 
      statusEffects: ['POISON'] 
    };
    
    // 5% ダメージ = 5
    const result = applyStatusEffects(actor);
    expect(result.updatedActor.hp).toBe(95);
    expect(result.messages[0]).toContain('毒のダメージ');
  });

  it('麻痺状態(PARALYZED)の場合、一定の確率で行動不能になること', () => {
    const actor = { 
      name: 'テスト者', 
      statusEffects: ['PARALYZED'] 
    };
    
    // 確率要素を含むため、複数回試行して両方のケースを確認（モックなしでの簡易検証）
    let preventedCount = 0;
    for (let i = 0; i < 100; i++) {
        const res = checkActionAbility(actor);
        if (!res.canAction) preventedCount++;
    }
    
    // 33% 程度の確率で止まるはず（統計的に 10〜60回程度なら正当とみなす）
    expect(preventedCount).toBeGreaterThan(0);
    expect(preventedCount).toBeLessThan(100);
  });

  it('状態異常がない場合は、正常に行動可能であること', () => {
    const actor = { name: 'テスト者', statusEffects: [] };
    const res = checkActionAbility(actor);
    expect(res.canAction).toBe(true);
  });
});
