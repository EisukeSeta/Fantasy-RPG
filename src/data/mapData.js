// src/data/mapData.js
import balanceData from './Balance.json';

// 10x10 ダンジョンのアスキーアート表現 (ベース)
const asciiMap = [
  "+-+-+-+-+-+-+-+-+-+-+",
  "| |       |         |",
  "+ + +-+-+ + +-+-+-+ +",
  "|   |   |   |       |",
  "+-+-+ + + +-+ +-+-+ +",
  "|     | |   | |     |",
  "+ + +-+ +-+-+ + +-+ +",
  "| |   |       | |   |",
  "+ +-+-+-+-+-+-+ + + +",
  "| |             | | |",
  "+ + +-+-+-+-+-+-+ + +",
  "|   |     |       | |",
  "+-+-+ +-+ + +-+-+-+ +",
  "| |   | |   |     | |",
  "+ + +-+ +-+-+ +-+ + +",
  "| | |         |     |",
  "+-+-+-+-+-+-+-+-+-+-+"
];

export const MAP_WIDTH = balanceData.map.width;  // 25
export const MAP_HEIGHT = balanceData.map.height; // 21

/**
 * 迷宮の地図を生成する。
 * AAの範囲外は「広間」として生成し、外周は必ず壁で囲む。
 */
export function generateMap() {
  const map = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      let n = false, s = false, e = false, w = false;

      // AAの範囲内であればAAから取得
      const asciiY = y * 2 + 1;
      const asciiX = x * 2 + 1;
      
      if (asciiY < asciiMap.length && asciiX < asciiMap[0].length) {
        n = asciiMap[asciiY - 1][asciiX] === '-';
        s = asciiMap[asciiY + 1] ? (asciiMap[asciiY + 1][asciiX] === '-') : true;
        w = asciiMap[asciiY][asciiX - 1] === '|';
        e = asciiMap[asciiY][asciiX + 1] === '|';
      }

      // 外周の壁を保証 (鵺が外へ逃げぬよう、プレイヤーが落ちぬよう)
      if (y === 0) n = true;
      if (y === MAP_HEIGHT - 1) s = true;
      if (x === 0) w = true;
      if (x === MAP_WIDTH - 1) e = true;
      
      row.push({
        x, y,
        n, s, e, w,
        visited: false
      });
    }
    map.push(row);
  }
  
  return map;
}

export const DIRECTIONS = { N: 0, E: 1, S: 2, W: 3 };
export const DIR_DELTAS = {
  [DIRECTIONS.N]: { dx: 0, dy: -1 },
  [DIRECTIONS.E]: { dx: 1, dy: 0 },
  [DIRECTIONS.S]: { dx: 0, dy: 1 },
  [DIRECTIONS.W]: { dx: -1, dy: 0 }
};
