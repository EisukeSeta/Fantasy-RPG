import { describe, it, expect } from 'vitest';
import { getRequiredExp } from './growth';
import balanceData from '../data/Balance.json' with { type: 'json' };

/**
 * 【成長の理】自動検証（Unit Test）
 */
describe('growth.js: 成長の理の検証', () => {

  it('Lv1 では必要な累積経験値が 0 であること', () => {
    expect(getRequiredExp(1)).toBe(0);
    expect(getRequiredExp(0)).toBe(0); // 異常値入力時も安全に倒れること
  });

  it('序盤(Lv2〜5)において、Balance.json の基礎テーブルと一致すること', () => {
    const table = balanceData.experience.baseTable;
    expect(getRequiredExp(2)).toBe(table[1]);
    expect(getRequiredExp(5)).toBe(table[4]);
  });

  it('レベルが上がるにつれて、必要な累積経験値が単調増加すること', () => {
    const expLv10 = getRequiredExp(10);
    const expLv20 = getRequiredExp(20);
    const expLv30 = getRequiredExp(30);
    
    expect(expLv10).toBeLessThan(expLv20);
    expect(expLv20).toBeLessThan(expLv30);
  });

  it('最大レベル近辺で、経験値が sigmoidScale 付近で正しく計算されること', () => {
    const { sigmoidScale, maxLevel } = balanceData.experience;
    const expMax = getRequiredExp(maxLevel);
    const expOver = getRequiredExp(maxLevel + 10);
    
    // シグモイド曲線の終端なので、sigmoidScale (Cap値) に肉薄しているはず
    expect(expMax).toBeLessThanOrEqual(sigmoidScale);
    expect(expMax).toBeGreaterThan(sigmoidScale * 0.9); // 終盤なら90%以上には達している想定
    
    // キャップがかかっているため、最大レベル超過後も値が跳ね上がらないこと
    expect(expOver).toBe(expMax);
  });

  it('中盤以降、レベルごとの増加量（必要差分）が変化し、シグモイドの特性を示すこと', () => {
    // 差分（次のレベルまでに必要な経験値）を計算
    const diffEarly = getRequiredExp(11) - getRequiredExp(10);
    const diffMid = getRequiredExp(26) - getRequiredExp(25); // シグモイドセンター(0.5)付近
    const diffLate = getRequiredExp(46) - getRequiredExp(45);
    
    // シグモイド曲線なので、中央付近(diffMid)が最も増加量が大きくなるのが一般的
    expect(diffMid).toBeGreaterThan(diffEarly);
    expect(diffLate).toBeLessThan(diffMid); // 後半は再び増加が鈍化する（収束へ向かう）
  });

});
