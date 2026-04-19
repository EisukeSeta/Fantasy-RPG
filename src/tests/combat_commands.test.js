import { describe, it, expect } from 'vitest';
import { generatePhysicalAttackCommands } from '../logic/combatResult';

describe('戦闘演出コマンドの生成 (Combat Command Generation)', () => {
  const attacker = { name: '頼光', ac: 10, minDmg: 10, maxDmg: 10 };
  const target = { name: '餓鬼', ac: 5 };

  it('物理攻撃命中時に正しいコマンドセットを生成すること', () => {
    // 命中(hit: true, damage: 10)を固定値で与えるシミュレーション
    const calculation = { hit: true, damage: 10, critical: false };
    const commands = generatePhysicalAttackCommands(attacker, target, calculation);
    
    expect(commands).toContainEqual({ type: 'MESSAGE', text: '頼光 の鋭き打ちかかり。 10 の痛打を与えた。', msgType: 'normal' });
    expect(commands).toContainEqual({ type: 'VFX', target: 'enemy', value: '-10', vfxType: 'damage', variation: 'normal' });
  });

  it('回避時に正しいコマンドセットを生成すること', () => {
    const calculation = { hit: false, damage: 0, critical: false };
    const commands = generatePhysicalAttackCommands(attacker, target, calculation);
    
    expect(commands).toContainEqual({ type: 'MESSAGE', text: '餓鬼 は身を翻し、攻撃を受け流した。', msgType: 'normal' });
    expect(commands).not.toContainEqual(expect.objectContaining({ type: 'VFX' }));
  });
});
