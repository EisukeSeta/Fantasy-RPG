import { describe, it, expect } from 'vitest';
import enemiesData from '../data/Enemies.json';
import spellsData from '../data/Spells.json';
import itemsData from '../data/Items.json';
import charactersData from '../data/Characters.json';

/**
 * ⛩️ データの守護（Data Integrity Test）
 * 
 * 都の設定ファイル（JSON）が、アプリの理（ロジック）を壊さないか全件チェックする。
 */
describe('Data Integrity: 都の聖典（データ）の整合性チェック', () => {

  describe('Enemies.json: 怪異の検分', () => {
    it('全ての怪異に必須プロパティ（id, name, minHp, maxHp, ac, minDmg, maxDmg, exp）が存在すること', () => {
      enemiesData.forEach(enemy => {
        expect(enemy.id, `ID missing for enemy: ${enemy.name}`).toBeDefined();
        expect(enemy.name).toBeDefined();
        expect(typeof enemy.minHp).toBe('number');
        expect(typeof enemy.maxHp).toBe('number');
        expect(enemy.minHp).toBeLessThanOrEqual(enemy.maxHp);
        expect(typeof enemy.ac).toBe('number');
        expect(typeof enemy.minDmg).toBe('number');
        expect(typeof enemy.maxDmg).toBe('number');
        expect(typeof enemy.exp).toBe('number');
      });
    });

    it('怪異の ID が重複していないこと', () => {
      const ids = enemiesData.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('Spells.json: 術の検分', () => {
    it('全ての職業の術リストが正しく構成されていること', () => {
      Object.keys(spellsData).forEach(jobKey => {
        const spells = spellsData[jobKey];
        expect(Array.isArray(spells), `Spells for ${jobKey} is not an array`).toBe(true);
        spells.forEach(spell => {
          expect(spell.id, `Spell ID missing in ${jobKey}`).toBeDefined();
          expect(spell.name).toBeDefined();
          expect(typeof spell.mp).toBe('number');
          expect(['ATTACK', 'HEAL', 'CURE', 'STATUS', 'BUFF', 'FIELD']).toContain(spell.type);
        });
      });
    });
  });

  describe('Items.json: 宝物の検分', () => {
    it('全てのアイテムに必須プロパティが存在すること', () => {
      itemsData.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        // ID が文字列かつ 'medal_' で始まる場合の武勲補正チェック
        if (typeof item.id === 'string' && item.id.startsWith('medal_')) {
          expect(item.effect).toBeDefined();
          expect(typeof item.effect.atk).toBe('number');
          expect(typeof item.effect.ac).toBe('number');
        }
      });
    });
  });

  describe('Characters.json: 英傑の検分', () => {
    it('初期パーティメンバーのデータが正しいこと', () => {
      charactersData.forEach(char => {
        expect(char.name).toBeDefined();
        expect(char.jobKey || char.job).toBeDefined(); // jobKey への移行期を考慮
        expect(char.maxHp || char.hp).toBeGreaterThan(0);
        expect(char.mp).toBeDefined();
      });
    });
  });
});
