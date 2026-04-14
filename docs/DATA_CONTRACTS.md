# 📜 羅生門：データ契約の書 (DATA_CONTRACTS.md)

この文書は、モジュール間で受け渡される主要なデータ構造（Interface）を定義した「聖域」である。リファクタリングや機能追加において、ここに記されたプロパティを主殿の許可なく削除・改変することは、都の理を乱す「叛逆」と見なす。

---

## 👤 隊員データ（Player / Member Object）
**用途**: `party` 状態、戦闘計算、成長計算
| プロパティ | 型 | 説明 | 削除 |
| :--- | :--- | :--- | :---: |
| `name` | string | 隊員の名称 | 厳禁 |
| `jobKey` | string | 職種 (BUSHI, ONMYOJI, NISOU) | 厳禁 |
| `lv` | number | 現在の階級（レベル） | 厳禁 |
| `hp` / `maxHp` | number | 生命力 | 厳禁 |
| `mp` / `maxMp` | number | 霊力 | 厳禁 |
| `minDmg` / `maxDmg` | number | 基礎打撃力 | 厳禁 |
| `ac` | number | 防御定数 | 厳禁 |
| `exp` | number | 累積徳（経験値） | 厳禁 |
| `status` | string | 状態（平安, 討死, 麻痺 等） | 厳禁 |
| `items` | string[] | 所持している勲章（Item IDの配列） | 厳禁 |
| `image` | string | 隊員の姿（画像パス） | 厳禁 |

---

## 👹 怪異データ（Enemy Object）
**用途**: `enemy` 状態、戦闘計算、ドロップ判定
| プロパティ | 型 | 説明 | 削除 |
| :--- | :--- | :--- | :---: |
| `id` | number | 怪異識別番号 | 厳禁 |
| `name` | string | 怪異の名称 | 厳禁 |
| `hp` / `maxHp` | number | 生命力（maxは初期値用） | 厳禁 |
| `minDmg` / `maxDmg` | number | 基礎打撃力 | 厳禁 |
| `ac` | number | 防御定数 | 厳禁 |
| `exp` | number | 与える徳（経験値） | 厳禁 |
| `drops` | object[] | 落とす品物リスト（itemId, rate） | 厳禁 |
| `isBoss` | boolean | 首魁フラグ | 厳禁 |
| `image` | string | 怪異の姿（画像パス） | 厳禁 |

---

## 📿 術・品物データ（Spell / Item Object）
### 術 (Spell)
- `id`, `name`, `type`, `mp`, `target`, `desc`
- `minDmg`/`maxDmg` (ATTACKの場合)
- `minHeal`/`maxHeal` (HEALの場合)
- `acBonus`, `statusEffect` (BUFF/STATUSの場合)

### 品物 (Item/Loot)
- `id`, `name`, `flavor`, `effect` (atk, ac, mgk)

---

## ⚖️ 変更の掟
1. **追加**: 新たな能力（例: `agility`, `luck`）の追加は「設計者」による提案を経て許可される。
2. **削除**: この文書に記載されているプロパティの削除は、いかなる理由があっても原則禁止。
3. **改名**: 互換性を破壊するため、原則禁止。
