// src/utils/debugData.js
// 開発検証用の疑似セーブデータ

export const DEBUG_SEEDS = {
  // 図録がほぼ埋まっている状態
  archives: {
    playerState: { x: 0, y: 0, dir: 2 }, 
    party: [
      { id: 1, name: "渡辺 綱", lv: 15, hp: 160, maxHp: 160, mp: 0, maxMp: 0, items: [100, 101, 102], jobKey: 'SAMURAI', image: 'watanabe_tsuna.png' },
      { id: 2, name: "安倍 晴明", lv: 15, hp: 120, maxHp: 120, mp: 80, maxMp: 80, items: [], jobKey: 'ONMYOJI', image: 'abe_seimei.png' },
      { id: 3, name: "八百比丘尼", lv: 15, hp: 140, maxHp: 140, mp: 60, maxMp: 60, items: [], jobKey: 'NISOU', image: 'yaobikuni.png' }
    ],
    bossDefeated: false,
    encounteredEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    defeatedEnemies: [1, 2, 3, 4, 5],
    saveVersion: 2
  },
  // ボス（鵺）戦の目の前
  boss_rush: {
    playerState: { x: 9, y: 14, dir: 1 }, 
    party: [
       { id: 1, name: "渡辺 綱", lv: 20, hp: 200, maxHp: 200, mp: 0, maxMp: 0, items: [100, 101, 102], jobKey: 'SAMURAI', image: 'watanabe_tsuna.png' },
       { id: 2, name: "安倍 晴明", lv: 20, hp: 150, maxHp: 150, mp: 100, maxMp: 100, items: [], jobKey: 'ONMYOJI', image: 'abe_seimei.png' },
       { id: 3, name: "八百比丘尼", lv: 20, hp: 180, maxHp: 180, mp: 80, maxMp: 80, items: [], jobKey: 'NISOU', image: 'yaobikuni.png' }
    ],
    bossDefeated: false,
    encounteredEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    defeatedEnemies: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    saveVersion: 2
  },
  // 合戦の直接検証用。最初から BATTLE 状態で開始。
  combat_test: {
    gameState: 'BATTLE',
    playerState: { x: 1, y: 1, dir: 2 },
    party: [
      { id: 1, name: "渡辺 綱", lv: 5, hp: 80, maxHp: 80, mp: 0, maxMp: 0, jobKey: 'SAMURAI', image: 'watanabe_tsuna.png' },
      { id: 2, name: "安倍 晴明", lv: 5, hp: 50, maxHp: 50, mp: 30, maxMp: 30, jobKey: 'ONMYOJI', image: 'abe_seimei.png' },
      { id: 3, name: "八百比丘尼", lv: 5, hp: 60, maxHp: 60, mp: 20, maxMp: 20, jobKey: 'NISOU', image: 'yaobikuni.png' }
    ],
    enemy: { id: 1, name: "鼠僧正", hp: 30, maxHp: 30, ac: 5, minDmg: 2, maxDmg: 5, exp: 20, drops: [] },
    saveVersion: 2
  }
};
