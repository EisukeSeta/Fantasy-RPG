import { describe, it, expect } from 'vitest';
import { handleLevelUp, simulateBattle, createInitialParty } from '../../scripts/balance_tester.mjs';

describe('兵站監査の理 (Balance Tester Logic)', () => {
  it('レベルアップによるステータス上昇が職種別に正しいこと', () => {
    const samurai = { 
      id: 1, 
      name: '渡辺 綱', 
      jobKey: 'SAMURAI', 
      lv: 1, 
      hp: 30, maxHp: 30, mp: 0, maxMp: 0, 
      minDmg: 8, maxDmg: 15, ac: 4, 
      exp: 1000 // 十分な経験値
    };
    
    const leveled = handleLevelUp(samurai);
    expect(leveled.lv).toBeGreaterThan(1);
    // SAMURAI は 1レベルにつき minDmg+2, maxDmg+3 される期待値
    expect(leveled.minDmg).toBeGreaterThan(8);
  });

  it('初期パーティが正しく生成されること', () => {
    const party = createInitialParty();
    expect(party.length).toBe(3);
    expect(party[0].name).toBe('渡辺 綱');
    expect(party[0].id).toBe(1); // 数値化されていること
  });

  it('全滅時に勝利判定が false になること', () => {
    const party = [{ name: '弱者', hp: 0, maxHp: 10, lv: 1, ac: 10, minDmg: 1, maxDmg: 1 }];
    const enemy = { name: '強者', hp: 100, ac: 0, minDmg: 50, maxDmg: 50 };
    
    const res = simulateBattle(party, enemy);
    expect(res.won).toBe(false);
  });
});
