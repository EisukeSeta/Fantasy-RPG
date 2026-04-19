import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 平安幻想RPG 契約仕様（法典）検証
 * 開発文書（CONTRACT_SPEC.json）と実装（GameContext.jsx / 各ファイル）が一致しているかを自動監査する。
 */
describe('平安都・契約仕様検証 (Interface Contract Test)', () => {
  const contractPath = resolve(__dirname, '../../docs/CONTRACT_SPEC.json');
  const contextPath = resolve(__dirname, '../context/GameContext.jsx');

  test('法典 (CONTRACT_SPEC.json) が存在し、読み込み可能であること', () => {
    const spec = JSON.parse(readFileSync(contractPath, 'utf-8'));
    expect(spec.version).toBeDefined();
    expect(spec.contexts.GameContext).toBeDefined();
  });

  test('GameContext.jsx の公開バリューが法典と一致していること', () => {
    const spec = JSON.parse(readFileSync(contractPath, 'utf-8'));
    const contextContent = readFileSync(contextPath, 'utf-8');
    
    // 法典に定義された全てのプロパティが GameContext.jsx 内で提供されているかを確認
    const requiredProps = [
        ...spec.contexts.GameContext.state_properties,
        ...spec.contexts.GameContext.setter_actions,
        ...spec.contexts.GameContext.complex_actions
    ];

    requiredProps.forEach(prop => {
        expect(contextContent).toContain(prop);
    });
  });

  test('都の全域で「activeBattler」という略称（不純物）が使用されていないこと', () => {
    // ソースディレクトリ内の全 js/jsx ファイルを再帰的にスキャン
    const scanDir = (dir) => {
        const files = readdirSync(dir, { withFileTypes: true });
        let results = [];
        files.forEach(file => {
            const res = join(dir, file.name);
            if (file.isDirectory()) {
                if (!res.includes('node_modules') && !res.includes('dist')) {
                    results = results.concat(scanDir(res));
                }
            } else if (res.match(/\.(js|jsx)$/)) {
                results.push(res);
            }
        });
        return results;
    };

    const srcPath = resolve(__dirname, '../../src');
    const allFiles = scanDir(srcPath);

    allFiles.forEach(file => {
        // interface.test.js 自身は除外
        if (file.includes('interface.test.js')) return;

        const content = readFileSync(file, 'utf-8');
        // 変数としての activeBattler を検出 (正規表現で単語境界をチェック)
        const usageMatch = content.match(/\bactiveBattler\b/);
        if (usageMatch) {
            throw new Error(`【不純物検出】：ファイル ${file} にて禁止された略称「activeBattler」が検出されました。正称「activeBattlerIndex」に直してください。`);
        }
        expect(usageMatch).toBeNull();
    });
  });
});
