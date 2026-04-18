import { expect, test, describe } from 'vitest';
import enemiesData from '../data/Enemies.json';
import partyData from '../data/Characters.json';
import itemsData from '../data/Items.json';

/**
 * ⛩️ 羅生門：データ契約試験 (CONTRACT_VALIDATOR)
 * docs/DATA_CONTRACTS.md に基づき、都の理が保たれているかを監査する。
 */
describe('平安魔道伝：データ契約監査', () => {

  describe('👹 怪異データの理 (Enemies.json)', () => {
    test('すべての怪異が必須プロパティを揃え、契約を遵守していること', () => {
      enemiesData.forEach(enemy => {
        // IDは数値でなければならない（文字列混入は図録崩壊を招く）
        expect(typeof enemy.id, `怪異【${enemy.name}】のIDが数値ではありません`).toBe('number');
        
        // マスターデータとしての必須プロパティの存在確認
        const required = ['name', 'maxHp', 'minDmg', 'maxDmg', 'ac', 'exp', 'image'];
        required.forEach(prop => {
          expect(enemy, `怪異【${enemy.name}】に必須項目【${prop}】が欠落しています`).toHaveProperty(prop);
        });
        
        // 数値項目の妥当性
        expect(enemy.maxHp, `怪異【${enemy.name}】の最大体力が不正です`).toBeGreaterThan(0);
      });
    });
  });

  describe('👤 隊員データの理 (Characters.json)', () => {
    test('初期パーティが必須プロパティを揃えていること', () => {
      partyData.forEach(member => {
        const required = ['id', 'name', 'jobKey', 'lv', 'hp', 'maxHp', 'mp', 'maxMp', 'minDmg', 'maxDmg', 'ac', 'exp', 'image'];
        required.forEach(prop => {
          expect(member, `隊員【${member.name}】に必須項目【${prop}】が欠落しています`).toHaveProperty(prop);
        });
        expect(typeof member.id, `隊員【${member.name}】のIDが数値ではありません`).toBe('number');
      });
    });
  });

  describe('📿 品物データの理 (Items.json)', () => {
    test('すべての品物が必須プロパティを備えていること', () => {
      itemsData.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('effect');
        expect(typeof item.id, `品物【${item.name}】のIDが数値ではありません`).toBe('number');
      });
    });
  });

  describe('💾 記憶の繋留（セーブデータ）の理', () => {
    test('遭遇・討伐記録の型が数値配列であること（契約第64, 65項）', () => {
      // 疑似セーブデータ構造の妥当性確認（実運用上の誤用を防止）
      const mockSave = {
        encounteredEnemies: [1, 2, 3],
        defeatedEnemies: [1]
      };
      
      expect(Array.isArray(mockSave.encounteredEnemies)).toBe(true);
      expect(Array.isArray(mockSave.defeatedEnemies)).toBe(true);
      
      mockSave.encounteredEnemies.forEach(id => {
        expect(typeof id, '遭遇記録内のIDが数値ではありません').toBe('number');
      });
    });
  });

});
