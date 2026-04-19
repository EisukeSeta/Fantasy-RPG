import { describe, it, expect } from 'vitest';
import { getNextTurnState } from '../logic/turn';

describe('手番の遷移ロジック (Turn Logic)', () => {
  const party = [
    { name: '渡辺', hp: 50 },
    { name: '安倍', hp: 0 }, // 討死
    { name: '八百', hp: 40 }
  ];

  it('味方の次の行動者（生存者）へ遷移すること', () => {
    // 0(渡辺) -> 2(八百) に飛ぶ（安倍が 0 なので）
    const res = getNextTurnState(party, 0, 10);
    expect(res.type).toBe('PARTY');
    expect(res.nextActiveIndex).toBe(2);
    expect(res.nextTurn).toBe(11);
  });

  it('味方の行動が終了したら、敵の手番へ遷移すること', () => {
    // 2(八百) -> 全員終了 -> ENEMY
    const res = getNextTurnState(party, 2, 11);
    expect(res.type).toBe('ENEMY');
    expect(res.nextTurn).toBe(12);
    expect(res.nextActiveIndex).toBe(0); // 敵ターンの次はまた最初の生存者から
  });

  it('全滅時には DEAD 状態を返すこと', () => {
    const deadParty = party.map(m => ({ ...m, hp: 0 }));
    const res = getNextTurnState(deadParty, 0, 10);
    expect(res.type).toBe('DEAD');
  });
});
