# 記記録の理 (Logging Contract)

都の安寧を守り、不純物（不整合）を永続的に検知・排除するための記録の規律をここに定める。

## 1. 記録の基本原則
- **永続的保守**: デバッグログは一時的なゴミではなく、都の「理」が正常に機能していることを証明する証左でなければならない。
- **構造化**: `[Category] Action -> State (Context)` の形式を徹底し、事象の連鎖を可視化せよ。
- **ドキュメント連動**: 正常な状態で出力されるべき一連の記録（シーケンス）は、ソースコード内のコメント（JSDoc）に明記される。

## 2. 記録レベルと起動パラメータ (URL Parameters)
環境や目的に応じ、以下のパラメータで記録の詳細を制御せよ。

| パラメータ | レベル | 用途 |
| :--- | :--- | :--- |
| `debug=true` | **INFO** | 合戦の開始、手番の遷移、重要なイベントの発生。 |
| `verbose=true` | **TRACE** | 内部 Ref の更新、Effect の発火、各ターンの詳細な判定。 |
| `log_filter=XXX` | **FILTER** | 特定のモジュール（例：`combat`, `nav`）の記録のみを抽出。 |

## 3. 正常系シーケンスの定義 (Expectation)
各モジュールが正常に動作している際、以下の記録が順次出力されることを「正常の理」と定義する。

### 3.1 合戦開始 (Combat Start) シーケンス
1. `[Context] startEncounter: enemy=NAME`
2. `[Combat] Session Reset: refs initialized to -1`
3. `[Combat] Turn Start: turn=0, actor=NAME`
4. (AI時) `[AI] Thinking: turn=0, strategy=AUTO`

**これを逸脱する、あるいは途中で途切れる記録はすべて「停滞」または「不整合」として捕捉せよ。**

## 4. 実装の掟
- `console.log` の直接使用を禁ず。すべて `src/utils/logger.js` を介すること。
- 記録には、常に「現在のターン」や「状態」など、デバッグ時に不可欠なコンテキストを付与せよ。
