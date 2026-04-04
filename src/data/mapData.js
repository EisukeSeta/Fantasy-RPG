// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\mapData.js
import balanceData from './Balance.json';

// 10x10 ダンジョンのアスキーアート表現
// +: 柱/角
// -: 水平な壁
// |: 垂直な壁
// 半角スペース: 壁なし (通路)
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

export const MAP_WIDTH = balanceData.map.width;
export const MAP_HEIGHT = balanceData.map.height; // 上のAAは高さ8マス

// マップデータを解析してオブジェクトの2次元配列に変換する関数
export function generateMap() {
  const map = [];
  
  // asciiMapは 2*H + 1 行、 2*W + 1 桁
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // セルの中心点はテキスト上で y*2+1 行目、 x*2+1 文字目
      const asciiY = y * 2 + 1;
      const asciiX = x * 2 + 1;
      
      const n = asciiMap[asciiY - 1][asciiX] === '-';
      const s = asciiMap[asciiY + 1][asciiX] === '-';
      const w = asciiMap[asciiY][asciiX - 1] === '|';
      const e = asciiMap[asciiY][asciiX + 1] === '|';
      
      row.push({
        x, y,
        n, s, e, w,
        visited: false // 初期状態は未踏破
      });
    }
    map.push(row);
  }
  
  // 開始位置 (1,1) をVisitedにするなどの処理は初期化時に行う
  return map;
}

// 向きの定義
export const DIRECTIONS = {
  N: 0,
  E: 1,
  S: 2,
  W: 3
};

// 向きごとの増分
export const DIR_DELTAS = {
  [DIRECTIONS.N]: { dx: 0, dy: -1 },
  [DIRECTIONS.E]: { dx: 1, dy: 0 },
  [DIRECTIONS.S]: { dx: 0, dy: 1 },
  [DIRECTIONS.W]: { dx: -1, dy: 0 }
};
