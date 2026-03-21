import { useState, useEffect, useRef } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { getRandomEnemy, calculateHitAndDamage } from './data/enemyData';

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); // EXPLORING, BATTLE, DEAD, CLEAR
  
  // マップと位置データ
  const [mapData, setMapData] = useState(() => {
    const m = generateMap();
    m[1][1].visited = true;
    return m;
  });
  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  
  // プレイヤーの動的ステータス
  const [player, setPlayer] = useState({
    name: 'HERO', hp: 20, maxHp: 20, mp: 0, maxMp: 0,
    ac: 10, minDmg: 2, maxDmg: 6, status: 'NORMAL'
  });
  
  // モンスターの状態
  const [enemy, setEnemy] = useState(null);
  
  // バトルメッセージログ
  const [messages, setMessages] = useState(['ダンジョンへ足を踏み入れた！']);

  const addMessage = (msg) => {
    setMessages(prev => {
      const newMsgs = [...prev, msg];
      return newMsgs.slice(Math.max(newMsgs.length - 30, 0)); // 最新30通を保持
    });
  };

  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);

  // 移動処理のアクション
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 探索・バトル以外なら何もしない
      if (gameState !== 'EXPLORING') return;

      let moveType = null;
      switch (e.key) {
        case 'w': case 'W': case 'ArrowUp':    moveType = 'FORWARD'; break;
        case 's': case 'S': case 'ArrowDown':  moveType = 'BACKWARD'; break;
        case 'a': case 'A': case 'ArrowLeft':  moveType = 'TURN_LEFT'; break;
        case 'd': case 'D': case 'ArrowRight': moveType = 'TURN_RIGHT'; break;
        default: return;
      }

      const current = playerStateRef.current;
      let newDir = current.dir;
      let newX = current.x;
      let newY = current.y;
      let hasMoved = false;

      if (moveType === 'TURN_LEFT') {
        newDir = (current.dir + 3) % 4; // -1
      } else if (moveType === 'TURN_RIGHT') {
        newDir = (current.dir + 1) % 4;
      } else {
        const cell = mapDataRef.current[current.y][current.x];
        const moveDir = moveType === 'FORWARD' ? current.dir : (current.dir + 2) % 4;
        
        const canMove = 
          (moveDir === DIRECTIONS.N && !cell.n) ||
          (moveDir === DIRECTIONS.E && !cell.e) ||
          (moveDir === DIRECTIONS.S && !cell.s) ||
          (moveDir === DIRECTIONS.W && !cell.w);
          
        if (canMove) {
          newX += DIR_DELTAS[moveDir].dx;
          newY += DIR_DELTAS[moveDir].dy;
          hasMoved = true;
        }
      }

      if (newX !== current.x || newY !== current.y || newDir !== current.dir) {
        setPlayerState({ x: newX, y: newY, dir: newDir });
        if (!mapDataRef.current[newY][newX].visited) {
          setMapData(prevMap => {
             const newMap = [...prevMap];
             newMap[newY] = [...newMap[newY]];
             newMap[newY][newX] = { ...newMap[newY][newX], visited: true };
             return newMap;
          });
        }
      }

      // ランダムエンカウント処理 (移動歩行時のみ判定)
      if (hasMoved) {
        const encounterChance = Math.random();
        if (encounterChance < 0.15) { // 15% の確率で遭遇
          const newEnemy = getRandomEnemy();
          setEnemy(newEnemy);
          setGameState('BATTLE');
          setMessages([`${newEnemy.name} があらわれた！`]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // バトルのアクションハンドラ
  const handleFight = () => {
    if (gameState !== 'BATTLE') return;

    // プレイヤーターン
    const pAttack = calculateHitAndDamage(player.ac, player.minDmg, player.maxDmg, enemy.ac);
    let newEnemyHp = enemy.hp;
    
    if (pAttack.hit) {
      addMessage(`${player.name} のこうげき! ${enemy.name} に ${pAttack.damage} のダメージ!`);
      newEnemyHp -= pAttack.damage;
    } else {
      addMessage(`${player.name} のこうげき! しかし なにもおきなかった! (ミス)`);
    }

    if (newEnemyHp <= 0) {
      addMessage(`${enemy.name} を たおした！`);
      addMessage(`${enemy.exp} EXP を かくとく`);
      setEnemy(null);
      setGameState('EXPLORING');
      return;
    }

    // エネミーターン
    const eAttack = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, player.ac);
    let newPlayerHp = player.hp;
    if (eAttack.hit) {
      addMessage(`${enemy.name} のこうげき! ${player.name} は ${eAttack.damage} のダメージをうけた!`);
      newPlayerHp -= eAttack.damage;
    } else {
      addMessage(`${enemy.name} のこうげき! しかし はずれた!`);
    }

    if (newPlayerHp <= 0) {
      setPlayer({ ...player, hp: 0, status: 'DEAD' });
      addMessage(`${player.name} は しんでしまった...`);
      setGameState('DEAD');
    } else {
      setPlayer({ ...player, hp: newPlayerHp });
      setEnemy({ ...enemy, hp: newEnemyHp });
    }
  };

  const handleRun = () => {
    // 逃走成功判定 (60% で成功)
    const runSuccess = Math.random() < 0.6;
    if (runSuccess) {
      addMessage(`${player.name} は にげだした！`);
      setEnemy(null);
      setGameState('EXPLORING');
    } else {
      addMessage(`${player.name} は にげられない！`);
      // 失敗すると敵のターン
      const eAttack = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, player.ac);
      let newPlayerHp = player.hp;
      if (eAttack.hit) {
        addMessage(`${enemy.name} のこうげき! ${player.name} は ${eAttack.damage} のダメージ!`);
        newPlayerHp -= eAttack.damage;
      } else {
        addMessage(`${enemy.name} のこうげき! はずれた!`);
      }

      if (newPlayerHp <= 0) {
        setPlayer({ ...player, hp: 0, status: 'DEAD' });
        addMessage(`${player.name} は しんでしまった...`);
        setGameState('DEAD');
      } else {
        setPlayer({ ...player, hp: newPlayerHp });
      }
    }
  };

  // マップ描画用のヘルパー
  const renderMapCell = (cell, x, y) => {
    const isPlayerPos = playerState.x === x && playerState.y === y;
    if (!cell.visited) {
      return <div key={`${x}-${y}`} style={{ width: 20, height: 20, backgroundColor: '#000' }}></div>;
    }
    return (
      <div key={`${x}-${y}`} style={{
        width: 20, height: 20, backgroundColor: '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333',
        borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333',
        borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333', boxSizing: 'border-box'
      }}>
        {isPlayerPos && (
          <div style={{ position: 'absolute', top: '50%', left: '50%',
             transform: `translate(-50%, -50%) rotate(${
               playerState.dir === DIRECTIONS.N ? 0 : 
               playerState.dir === DIRECTIONS.E ? 90 : 
               playerState.dir === DIRECTIONS.S ? 180 : 270
             }deg)`, color: '#3f3', fontSize: '14px', lineHeight: 1
          }}>▲</div>
        )}
      </div>
    );
  };

  return (
    <div className="game-container">
      {/* メインビューエリア */}
      <div className="window pane-main">
        <span className="window-title">1st Person View</span>
        
        {/* バトル時：敵のステータスウィンドウ */}
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy" style={{ backgroundColor: '#000', border: '2px solid #fff' }}>
            <span className="window-title">Enemy</span>
            <div className="status-grid">
              <div><div className="status-header">NAME</div><div>{enemy.name}</div></div>
              <div><div className="status-header">HP</div><div>{enemy.hp} / {enemy.maxHp}</div></div>
              <div><div className="status-header">STATUS</div><div>{enemy.status}</div></div>
            </div>
          </div>
        )}

        {/* 3Dワイヤーフレーム描画 */}
        <div className="wireframe-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
          <WireframeView mapData={mapDataRef.current} playerPos={playerState} playerDir={playerState.dir} />
          
          {/* DEAD時のオーバーレイ */}
          {gameState === 'DEAD' && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(100,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ color: '#F33', fontSize: '2rem', fontWeight: 'bold' }}>GAME OVER</div>
            </div>
          )}
        </div>
      </div>

      {/* キャラクターステータスエリア */}
      <div className="window pane-status">
        <span className="window-title">Character Status</span>
        <div className="status-grid">
          <div><div className="status-header">NAME</div><div>{player.name}</div></div>
          <div><div className="status-header">HP</div><div style={{ color: player.hp <= 5 ? 'red' : 'white' }}>{player.hp}/{player.maxHp}</div></div>
          <div><div className="status-header">MP</div><div>{player.mp}</div></div>
          <div><div className="status-header">AC</div><div>{player.ac}</div></div>
          <div><div className="status-header">STATUS</div><div style={{ color: player.status === 'DEAD' ? 'red' : 'white' }}>{player.status}</div></div>
        </div>
      </div>

      {/* 右側：マップとメッセージ（バトル中はコマンド） */}
      <div className="window pane-map" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="window-title">Map & Log</span>
        
        {/* マップ領域を上部に配置し、余白をつける */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: '15px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 20px)`,
            gridTemplateRows: `repeat(${MAP_HEIGHT}, 20px)`, border: '2px solid #555'
          }}>
            {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
          </div>
        </div>

        {/* コマンドとログ領域を flex: 1 で残りの空間すべてに展開 */}
        <div style={{ flex: 1, borderTop: '2px solid #666', paddingTop: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* バトルコマンド */}
          {gameState === 'BATTLE' && (
            <div style={{ display: 'flex', gap: '10px', paddingBottom: '10px', backgroundColor: '#000' }}>
               <button onClick={handleFight} style={{ flex: 1, padding: '10px', cursor: 'pointer', fontFamily: "'DotGothic16', monospace", fontSize: '1.2rem', backgroundColor: '#333', color: '#fff', border: '1px solid #aaa' }}>たたかう (Fight)</button>
               <button onClick={handleRun} style={{ flex: 1, padding: '10px', cursor: 'pointer', fontFamily: "'DotGothic16', monospace", fontSize: '1.2rem', backgroundColor: '#333', color: '#fff', border: '1px solid #aaa' }}>にげる (Run)</button>
            </div>
          )}

          {/* メッセージログ */}
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#000', color: '#eee', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {messages.map((m, i) => <div key={i}>{'>'} {m}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
