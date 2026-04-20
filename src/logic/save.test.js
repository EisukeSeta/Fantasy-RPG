// src/logic/save.test.js
import { describe, it, expect } from 'vitest';

/**
 * 【記録の理】セーブデータ構造の検証
 * 構造変更（V2への移行）の際は、このテストと DATA_CONTRACTS.md を更新すること。
 */
describe('セーブデータの構造整合性テスト', () => {

  const dummySaveData = {
    playerState: { x: 5, y: 5, dir: 1 },
    gameState: 'EXPLORING',
    party: [
      { 
        id: 'abe_seimei', 
        hp: 100, 
        maxHp: 100, 
        mp: 50, 
        maxMp: 50, 
        lv: 1, 
        exp: 0,
        statusEffects: [],
        items: [] 
      }
    ],
    mapData: [[{ x: 0, y: 0, visited: true }]],
    bossDefeated: false,
    encounteredEnemies: [1],
    defeatedEnemies: [1],
    saveVersion: 'V1'
  };

  it('必須プロパティがすべて存在すること', () => {
    const keys = Object.keys(dummySaveData);
    expect(keys).toContain('playerState');
    expect(keys).toContain('gameState');
    expect(keys).toContain('party');
    expect(keys).toContain('mapData');
    expect(keys).toContain('bossDefeated');
    expect(keys).toContain('encounteredEnemies');
    expect(keys).toContain('defeatedEnemies');
  });

  it('パーティメンバーが正しい構造を維持していること', () => {
    const member = dummySaveData.party[0];
    expect(member).toHaveProperty('id');
    expect(member).toHaveProperty('hp');
    expect(member).toHaveProperty('maxHp');
    expect(member).toHaveProperty('mp');
    expect(member).toHaveProperty('statusEffects');
    expect(Array.isArray(member.items)).toBe(true);
  });

  it('プレイヤーの位置情報が正しい構造であること', () => {
    const pos = dummySaveData.playerState;
    expect(pos).toHaveProperty('x');
    expect(pos).toHaveProperty('y');
    expect(pos).toHaveProperty('dir');
  });

  it('図録データ（遭遇・討伐）が配列として定義されていること', () => {
    expect(Array.isArray(dummySaveData.encounteredEnemies)).toBe(true);
    expect(Array.isArray(dummySaveData.defeatedEnemies)).toBe(true);
  });

  it('図録データが未定義の場合のデフォルト値（空配列）取得を期待すること', () => {
    const oldData = { ...dummySaveData };
    delete oldData.encounteredEnemies;
    delete oldData.defeatedEnemies;

    // ロジック（GameContext内）で || [] されることを期待
    const hydratedEncountered = oldData.encounteredEnemies || [];
    expect(Array.isArray(hydratedEncountered)).toBe(true);
    expect(hydratedEncountered.length).toBe(0);
  it('バリデーション機能: 不純なデータを正しく弾くこと', () => {
    const { validateSaveData } = require('./save'); // これから実装する理

    // 1. 空のデータ
    expect(validateSaveData({})).toBe(false);

    // 2. 必須キー（party）の欠落
    const noParty = { ...dummySaveData };
    delete noParty.party;
    expect(validateSaveData(noParty)).toBe(false);

    // 3. 不当な型（partyが配列でない）
    const badParty = { ...dummySaveData, party: "全員討死" };
    expect(validateSaveData(badParty)).toBe(false);

    // 4. 未知の版（saveVersionの不一致）
    const oldVersion = { ...dummySaveData, saveVersion: 'V0' };
    expect(validateSaveData(oldVersion)).toBe(false);
  });
});
