# ⛩️ 平安魔道伝 羅生門編：開発TODO帳 (TASK_LIST)

この文書は、都の復興における「現在地」と「次なる一歩」を記す公文書である。

---

## 🏗️ 現在のフェーズ：[都の骨組みの再編 - UIリファクタリング]
**目的**: `App.jsx` の軽量化、UI状態の Hook 化、および共通部品化による意匠の統一。

### 📜 TODO リスト

#### [フェーズ 1.1: 共通基盤の構築]
- [x] `src/hooks/useUIState.js` の新設（UIトグル・連動ロジックの集約）
- [x] `src/components/common/YugenModal.jsx` の創設（意匠ガイドライン準拠の共通枠）
- [x] `App.jsx` から `useUIState` への状態移譲と、Props 伝播の整理

#### [フェーズ 1.2: コンポーネントの順次移行]
- [x] `ArchivesView.jsx` の `YugenModal` への差し替え
- [ ] `SpellGrimoire.jsx` の `YugenModal` への差し替え
- [ ] `ShortcutHelp.jsx` の `YugenModal` への差し替え

#### [フェーズ 1.3: 最終調整]
- [ ] `App.jsx` のキーハンドラの再洗練（`useUIState` との連携）
- [ ] モバイル・PC双方での大規模視覚監査（Regression Test）

---

## 🔱 完了済みの聖業
- [x] 怪異図録のズーム機能実装 (v4.17.3)
- [x] 捷径（ショートカット）体系の確立 (v4.17.4)
- [x] 統一意匠ガイドラインの策定 (v4.18.0)
