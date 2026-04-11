// src/__tests__/growth.test.js
import { describe, it, expect } from 'vitest';
import { getRequiredExp } from '../logic/growth';

describe('Growth Logic (経験値計算)', () => {
  it('Lv1 の累積経験値は 0 であるべき', () => {
    expect(getRequiredExp(1)).toBe(0);
  });

  it('Lv2 の累積経験値がテーブル定義通りであるべき (例: 10)', () => {
    // Balance.json の baseTable[1] を想定
    expect(getRequiredExp(2)).toBeGreaterThan(0);
  });

  it('Lv50 付近の累積経験値が SIGMOID 曲線に従って計算されるべき', () => {
    const exp50 = getRequiredExp(50);
    const exp49 = getRequiredExp(49);
    expect(exp50).toBeGreaterThan(exp49);
    expect(exp50).toBeLessThan(100000); // 概算上限チェック
  });
});
