# 都（システム）の近代化：アーキテクチャ刷新計画 (v2.0)

## ⛩️ 目的
今後予想される「物語の大幅な拡充」「怪異（敵）の多様化」「戦術（ロジック）の深化」を、都の秩序を保ったまま迅速に達成するため、近代的なアーキテクチャ（MVPパターン / データ駆動設計）への刷新を行う。

## ⛩️ 基本方針：三位一体の分離

1.  **Model (データと魂)**:
    *   **静的データ**: 呪文、怪異、物語（シナリオ）を JSON に分離。`src/data/` フォルダへ安置。
    *   **動的状態**: `gameState` などの変遷は、`useGameContext` (Context API / Custom Hooks) で一元管理し、View へのProps渡しを減らす。
2.  **Presenter (理・ロジック層)**:
    *   `useCombat`, `useExploration`, `useParty` といった **Custom Hooks** へロジックを抽出。
    *   `App.jsx` の約 500 行の巨大なロジックを解体し、「仕組み」を各専門家（Hooks）へ委任。
3.  **View (観・表示層)**:
    *   `src/components/` 以下に純粋な UI 部品を創設。
    *   Props を受け取り、イベントを発火するだけの「純粋な舞台装置」に徹する。

## ⛩️ 具体的なデータ構成（聖典）
*   `src/data/balance.json`: レベル成長曲線、HP計算式、遭遇確率。
*   `src/data/enemies.json`: 怪異の目録（アイコン、名、HP、攻撃力）。
*   `src/data/spells.json`: 術の目録（効果量、MP消費、習得レベル）。
*   `src/data/scenario.json`: 物語の導入、物語の結末、場所の説明。

## ⛩️ 再建の段階（フェーズ）

### 第1段階：[魂の外部化]
*   `App.jsx` 内にある定数（`SPELLS`, `ENEMIES`, 初期メッセージ等）を JSON ファイルに抽出。
*   ファイル読み込みからの初期化を実装。

### 第2段階：[理の抽出]
*   戦闘に関連するステートと関数を `useCombat.js` へ抽出。
*   移動と探索を `useExploration.js` へ抽出。

### 第3段階：[観の解体]
*   巨大な `render` 関数内の各ウィンドウをコンポーネント化（`CombatOverlay`, `StatusPane`, `LogPane` 等）。

## ⛩️ 期待される成果
*   **分業の確立**: プログラムを触らずに「バランス調整（JSON）」や「シナリオ追加（JSON）」が可能。
*   **保守性の向上**: 戦闘の不具合は `useCombat.js` を、表示のズレは `CombatOverlay.jsx` を見ればよくなる。
*   **無限の拡張**: 新たな術や敵を JSON に一行書き換えるだけで追加できる。
