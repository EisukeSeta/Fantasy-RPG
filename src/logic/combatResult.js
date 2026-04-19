/**
 * src/logic/combatResult.js
 * 戦闘リザルト（演出コマンド）を生成する純粋関数モジュール。
 */
import scenarioData from '../data/Scenario.json' with { type: 'json' };

/**
 * 物理攻撃の結果に応じた演出コマンド配列を生成する。
 * @param {Object} attacker 攻撃者データ
 * @param {Object} target 防御者データ
 * @param {Object} calculation calculateHitAndDamage の結果
 * @param {string} targetId 演出の対象（'enemy' や 'party_0' など）
 * @returns {Array} 演出コマンドの配列
 */
export const generatePhysicalAttackCommands = (attacker, target, calculation, targetId = 'enemy') => {
  const commands = [];

  if (calculation.hit) {
    commands.push({
      type: 'MESSAGE',
      value: `${attacker.name}${scenarioData.battle.attack} ${calculation.damage}${scenarioData.battle.damage}`,
      messageType: 'normal'
    });

    commands.push({
      type: 'VFX',
      target: targetId, 
      value: `-${calculation.damage}`,
      vfxType: 'damage',
      variation: calculation.critical ? 'heavy' : 'normal'
    });

    commands.push({ type: 'SOUND', value: calculation.critical ? 'crit_hit' : 'hit' });
  } else {
    commands.push({
      type: 'MESSAGE',
      value: `${target.name}${scenarioData.battle.evade}`,
      messageType: 'normal'
    });
    commands.push({ type: 'SOUND', value: 'miss' });
  }

  return commands;
};

/**
 * 敵の反撃結果に応じた演出コマンド配列を生成する。
 */
export const generateEnemyAttackCommands = (enemy, target, calculation, targetIdx) => {
  const commands = [];

  if (calculation.hit) {
    commands.push({
      type: 'MESSAGE',
      value: `${enemy.name}${scenarioData.battle.counter} ${target.name}${scenarioData.battle.wound.replace('%DMG%', calculation.damage)}`,
      messageType: 'damage_party'
    });

    commands.push({
      type: 'VFX',
      target: `party_${targetIdx}`,
      value: `-${calculation.damage}`,
      vfxType: 'damage'
    });
  } else {
    commands.push({
      type: 'MESSAGE',
      value: `${target.name}${scenarioData.battle.evade}`,
      messageType: 'normal'
    });
  }

  return commands;
};

/**
 * 状態異常効果（毒ダメージ等）の結果に応じた演出コマンド配列を生成する。
 */
export const generateStatusEffectCommands = (actor, actorId, statusRes) => {
  const commands = [];
  statusRes.messages.forEach(msg => {
    commands.push({ type: 'MESSAGE', value: msg, messageType: 'damage_party' });
  });

  if (statusRes.messages.length > 0) {
    const dmg = Math.abs(actor.hp - statusRes.updatedActor.hp);
    if (dmg > 0) {
      commands.push({
        type: 'VFX',
        target: actorId,
        value: `-${dmg}`,
        vfxType: 'damage'
      });
    }
  }

  return commands;
};

/**
 * 術式攻撃の演出コマンド配列を生成する。
 */
export const generateSpellAttackCommands = (caster, target, spell, damage) => {
  const commands = [];
  commands.push({ type: 'VFX', target: 'enemy', value: spell.name, vfxType: 'action' });
  commands.push({
    type: 'MESSAGE',
    value: `${spell.name}${scenarioData.battle.spellAttack.replace('%ENEMY%', target.name).replace('%DMG%', damage)}`,
    messageType: 'normal'
  });
  commands.push({ type: 'VFX', target: 'enemy', value: `-${damage}`, vfxType: 'damage' });
  commands.push({ type: 'SOUND', value: 'fire' });
  return commands;
};

/**
 * 術式治癒の演出コマンド配列を生成する。
 */
export const generateSpellHealCommands = (caster, target, targetIdx, spell, healAmount) => {
  const commands = [];
  commands.push({ type: 'VFX', target: `party_${targetIdx}`, value: spell.name, vfxType: 'action' });
  commands.push({
    type: 'MESSAGE',
    value: `${spell.name}${scenarioData.battle.spellHeal.replace('%TARGET%', target.name).replace('%HEAL%', healAmount)}`,
    messageType: 'heal',
    targetName: target.name // 状態更新用
  });
  commands.push({ type: 'VFX', target: `party_${targetIdx}`, value: `+${healAmount}`, vfxType: 'heal' });
  commands.push({ type: 'SOUND', value: 'heal' });
  return commands;
};

/**
 * 術式浄化の演出コマンド配列を生成する。
 */
export const generateSpellCureCommands = (caster, spell) => {
  const commands = [];
  commands.push({ type: 'VFX', target: 'party_all', value: spell.name, vfxType: 'action' });
  commands.push({
    type: 'MESSAGE',
    value: `${spell.name}：真言の光がパーティ全員の穢れを浄化した！`,
    messageType: 'level_up'
  });
  commands.push({ type: 'VFX', target: 'party_all', value: '浄化', vfxType: 'heal' });
  commands.push({ type: 'SOUND', value: 'cure' });
  return commands;
};

/**
 * 術式業付与（状態異常）の演出コマンド配列を生成する。
 */
export const generateSpellStatusCommands = (caster, target, spell, effect) => {
  const commands = [];
  commands.push({ type: 'VFX', target: 'enemy', value: spell.name, vfxType: 'action' });
  if (effect) {
    commands.push({
      type: 'MESSAGE',
      value: `${target.name}を${effect === 'PARALYZED' ? '麻痺' : '毒'}に陥れた！`,
      messageType: 'level_up'
    });
    commands.push({ type: 'VFX', target: 'enemy', value: effect === 'PARALYZED' ? '麻痺' : '毒', vfxType: 'damage' });
  }
  commands.push({ type: 'SOUND', value: 'status' });
  return commands;
};
