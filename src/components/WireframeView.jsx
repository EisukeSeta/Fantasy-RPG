// C:\Win_tools\Antigravity\Fantasy-RPG\src\components\WireframeView.jsx
import React from 'react';
import { DIRECTIONS, DIR_DELTAS, MAP_WIDTH, MAP_HEIGHT } from '../data/mapData';

// 遠近法の座標定義（0〜100の viewBox 内）
// d=0: 現在のマス（手前側）
// d=1: 1マス先（このマスの手前側が、現在のマスの奥側）
// d=2: 2マス先
// d=3: 3マス先
// 遠近法の座標定義（300 x 100 の viewBox 内）
// 横幅を 3倍に広げ、アスペクト比を 3:1 にする
const getDepthBox = (d) => {
  const boxes = [
    { x1: 0,   y1: 0,  x2: 300, y2: 100 }, // d=0 (画面端 300px)
    { x1: 45,  y1: 15, x2: 255, y2: 85 },  // d=1
    { x1: 90,  y1: 30, x2: 210, y2: 70 },  // d=2
    { x1: 126, y1: 42, x2: 174, y2: 58 },  // d=3
    { x1: 144, y1: 48, x2: 156, y2: 52 }   // d=4 (奥)
  ];
  return boxes[Math.min(d, boxes.length - 1)];
};

export const WireframeView = ({ mapData, playerPos, playerDir }) => {
  const lines = [];
  let blocked = false; // 前方が壁で塞がれたらそれ以上奥は描画しない

  // 遠い方(d=3)から近い方(d=0)へ重なるように（SVGは後から描画したものが上になるが、基本は線画なので順不同でもOK。ただし奥の壁の後ろは描画しない等の制御が必要）
  // 実際には手前から走査してblocked判定をする
  const depthsToDraw = [];
  for (let d = 0; d < 4; d++) {
    const rx = playerPos.x + DIR_DELTAS[playerDir].dx * d;
    const ry = playerPos.y + DIR_DELTAS[playerDir].dy * d;

    let hasFront = true, hasLeft = true, hasRight = true;

    // マップ外ならすべて壁とみなす
    if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
      const cell = mapData[ry][rx];
      const leftDir = (playerDir + 3) % 4;
      const rightDir = (playerDir + 1) % 4;

      hasFront = (playerDir === DIRECTIONS.N && cell.n) ||
                 (playerDir === DIRECTIONS.E && cell.e) ||
                 (playerDir === DIRECTIONS.S && cell.s) ||
                 (playerDir === DIRECTIONS.W && cell.w);

      hasLeft = (leftDir === DIRECTIONS.N && cell.n) ||
                (leftDir === DIRECTIONS.E && cell.e) ||
                (leftDir === DIRECTIONS.S && cell.s) ||
                (leftDir === DIRECTIONS.W && cell.w);

      hasRight = (rightDir === DIRECTIONS.N && cell.n) ||
                 (rightDir === DIRECTIONS.E && cell.e) ||
                 (rightDir === DIRECTIONS.S && cell.s) ||
                 (rightDir === DIRECTIONS.W && cell.w);
    }

    depthsToDraw.push({ d, hasFront, hasLeft, hasRight });
    if (hasFront) break; // このマスの前方に壁があるなら、これ以上奥は見えない
  }

  // 奥から順番に線画を生成する（上書きするため）
  for (let i = depthsToDraw.length - 1; i >= 0; i--) {
    const { d, hasFront, hasLeft, hasRight } = depthsToDraw[i];
    const b1 = getDepthBox(d);
    const b2 = getDepthBox(d + 1);

    // --- 左の壁 ---
    if (hasLeft) {
      // 左の壁パネルの上下の斜め線
      lines.push(<line key={`l-ceil-${d}`} x1={b1.x1} y1={b1.y1} x2={b2.x1} y2={b2.y1} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`l-floor-${d}`} x1={b1.x1} y1={b1.y2} x2={b2.x1} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
      // 壁の奥側の縦線（枠）
      lines.push(<line key={`l-vert-${d}`} x1={b2.x1} y1={b2.y1} x2={b2.x1} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
    } else {
      // 左が通路の場合の奥の角を示す横線（通路の入り口）
      lines.push(<line key={`l-path-ceil-${d}`} x1={getDepthBox(d+2).x1} y1={b2.y1} x2={b2.x1} y2={b2.y1} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`l-path-floor-${d}`} x1={getDepthBox(d+2).x1} y1={b2.y2} x2={b2.x1} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
      // 前方が壁でない限り、横通路の縦線も描画する等ありますが、シンプルな表現として省略または調整
      lines.push(<line key={`l-path-vert-${d}`} x1={b2.x1} y1={b2.y1} x2={b2.x1} y2={b2.y2} stroke="#333" strokeDasharray="2,2" strokeWidth="1" />);
    }

    // --- 右の壁 ---
    if (hasRight) {
      lines.push(<line key={`r-ceil-${d}`} x1={b1.x2} y1={b1.y1} x2={b2.x2} y2={b2.y1} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`r-floor-${d}`} x1={b1.x2} y1={b1.y2} x2={b2.x2} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`r-vert-${d}`} x1={b2.x2} y1={b2.y1} x2={b2.x2} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
    } else {
      // 右が通路
      lines.push(<line key={`r-path-ceil-${d}`} x1={b2.x2} y1={b2.y1} x2={getDepthBox(d+2).x2} y2={b2.y1} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`r-path-floor-${d}`} x1={b2.x2} y1={b2.y2} x2={getDepthBox(d+2).x2} y2={b2.y2} stroke="#fff" strokeWidth="1" />);
      lines.push(<line key={`r-path-vert-${d}`} x1={b2.x2} y1={b2.y1} x2={b2.x2} y2={b2.y2} stroke="#333" strokeDasharray="2,2" strokeWidth="1" />);
    }

    // --- 正面の壁 ---
    if (hasFront) {
      // そのマスの奥 (b2) に長方形の壁を描画する
      lines.push(<rect key={`f-rect-${d}`} x={b2.x1} y={b2.y1} width={b2.x2 - b2.x1} height={b2.y2 - b2.y1} fill="#000" stroke="#fff" strokeWidth="1.5" />);
    }
  }

  // 常に描画する基本の縦横の枠線などが必要なら追加可能
  // (今回は薄い壁なので、線が繋がることで表現される)

  return (
    <svg 
      viewBox="0 0 300 100" 
      preserveAspectRatio="none" 
      style={{ width: '100%', height: '100%', backgroundColor: '#000', display: 'block' }}
    >
      {/* 画面枠 */}
      <rect x="1" y="1" width="298" height="98" fill="none" stroke="#fff" strokeWidth="2" />
      {lines}
    </svg>
  );
};
