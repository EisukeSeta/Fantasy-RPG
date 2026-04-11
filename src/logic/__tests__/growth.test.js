import { describe, it, expect } from 'vitest';
import { getRequiredExp } from '../growth';

describe('成長の理 (Growth Logic)', () => {
  it('位階が上がるにつれて必要な功徳が増加すること', () => {
    const expLv1 = getRequiredExp(1);
    const expLv2 = getRequiredExp(2);
    const expLv3 = getRequiredExp(3);

    expect(expLv2).toBeGreaterThan(expLv1);
    expect(expLv3).toBeGreaterThan(expLv2);
  });

  it('特定の位階で期待される功徳の値を返すこと', () => {
    // レベル1の必要経験値は基本 0 であるはず（または初期値）
    // 実装に合わせて調整
    expect(getRequiredExp(1)).toBe(0);
    expect(getRequiredExp(2)).toBeGreaterThan(0);
  });
});
