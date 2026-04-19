import { describe, it, expect } from 'vitest';
import { getNextBattlerIndex, getFirstAliveIndex, isPartyAlive } from '../logic/turn';

describe('手番遷移の理 (Turn Logic)', () => {
  const party = [
    { name: '源頼光', hp: 10 },
    { name: '渡辺綱', hp: 0 }, // 討死
    { name: '八百比丘尼', hp: 5 }
  ];

  it('最初の生存者を正しく特定できること', () => {
    expect(getFirstAliveIndex(party)).toBe(0);
    expect(getFirstAliveIndex([{ hp: 0 }, { hp: 5 }])).toBe(1);
    expect(getFirstAliveIndex([{ hp: 0 }, { hp: 0 }])).toBe(-1);
  });

  it('次の行動者を正しく特定できること', () => {
    // 0番(頼光)が行動した後は、1番が死んでいるので2番(比丘尼)になる
    expect(getNextBattlerIndex(party, 0)).toBe(2);
    // 2番(最後)が行動した後は、次がいないので -1 になる
    expect(getNextBattlerIndex(party, 2)).toBe(-1);
  });

  it('パーティの生存判定が正しいこと', () => {
    expect(isPartyAlive(party)).toBe(true);
    expect(isPartyAlive([{ hp: 0 }, { hp: 0 }])).toBe(false);
  });
});
