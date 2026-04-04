# 羅生門：歩みの記録 (PLANNING_LOG.md)

## ⛩️ 現在の版（Version）: v1.3.3 (Stable UI)

## ⛩️ 意思決定の歴史

### 2026-04-04: アーキテクチャ刷新の決断 (v2.0 への布石)
*   **背景**: シナリオ拡張、敵のバリエーション、ゲームバランス調整の複雑化が予想される。
*   **決定**:
    1.  **MVP パターンの導入**: View (Component) / Presenter (Logic Hook) / Model (State/Data) の厳密な分離。
    2.  **データ駆動設計**: シナリオテキスト、敵情報の外部 JSON 化。
    3.  **バランス調整の独立**: ゲームバランス（経験値、成長率等）を単独ファイルで管理し、非エンジニア（或いはAIのみ）での調整を容易にする。
*   **詳細計画**: [ARCHITECTURE_REFACTOR_PLAN.md](./ARCHITECTURE_REFACTOR_PLAN.md) を参照。
*   **次の一手**: `src/data/Enemies.json` および `src/data/Scenario.json` の創設。

---
*これ以前の記録は開発史・初期段階として省略*
