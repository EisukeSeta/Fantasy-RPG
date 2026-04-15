// src/utils/debugData.js
// 開発検証用の疑似セーブデータ

export const DEBUG_SEEDS = {
  // 図録がほぼ埋まっている状態
  archives: {
    playerState: { x: 0, y: 0, dir: 2 }, // 社
    party: [
      { id: "abe_seimei", name: "安部清明", lv: 15, hp: 120, maxHp: 120, mp: 80, maxMp: 80, items: [100, 101, 102] }, // 勲章持ち
      { id: "minamoto_hiromasa", name: "源博雅", lv: 15, hp: 150, maxHp: 150, mp: 30, maxMp: 30, items: [] }
    ],
    bossDefeated: false,
    encounteredEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // 全遭遇
    defeatedEnemies: [1, 2, 3, 4, 5], // 一部討伐済み
    saveVersion: 2
  },
  // ボス（鵺）戦の目の前
  boss_rush: {
    playerState: { x: 9, y: 14, dir: 1 }, // ボス部屋の前（仮定）
    party: [
       { id: "abe_seimei", lv: 20, hp: 200, maxHp: 200, mp: 100, maxMp: 100, items: [100, 101, 102] },
       { id: "minamoto_hiromasa", lv: 20, hp: 250, maxHp: 250, mp: 50, maxMp: 50, items: [] }
    ],
    bossDefeated: false,
    encounteredEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    defeatedEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    saveVersion: 2
  }
};
