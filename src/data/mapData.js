// src/data/mapData.js
import balanceData from './Balance.json';

// 10x8 ダンジョンのアスキーアート表現
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

export const MAP_WIDTH = balanceData.map.width;  // 10
export const MAP_HEIGHT = balanceData.map.height; // 8

/**
 * 迷宮の地図を生成する。
 * 正確にアスキーアートから 10x8 の情報を抽出する。
 */
export function generateMap() {
  const map = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // セルの中心点は y*2+1, x*2+1
      const asciiY = y * 2 + 1;
      const asciiX = x * 2 + 1;
      
      const n = asciiMap[asciiY - 1][asciiX] === '-';
      const s = asciiMap[asciiY + 1][asciiX] === '-';
      const w = asciiMap[asciiY][asciiX - 1] === '|';
      const e = asciiMap[asciiY][asciiX + 1] === '|';
      
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
