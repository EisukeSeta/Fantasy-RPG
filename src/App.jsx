import { useState, useEffect, useRef } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); // EXPLORING, BATTLE, DEAD, CLEAR
  
  // マップと位置データ
  const [mapData, setMapData] = useState(() => {
    const m = generateMap();
    m[1][1].visited = true;
    return m;
  });
  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  
  // 3人のパーティメンバー
  const [party, setParty] = useState([
    { id: 'Tsu', name: '渡辺 綱', job: 'SAMURAI', hp: 30, maxHp: 30, mp: 0, maxMp: 0, ac: 4, minDmg: 6, maxDmg: 15, status: 'NORMAL' },
    { id: 'Sei', name: '安倍 晴明', job: 'ONMYOJI', hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4, status: 'NORMAL' },
    { id: 'Bik', name: '八百比丘尼', job: 'BHIKKHUNI', hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6, status: 'NORMAL' }
  ]);

  const [activeBattler, setActiveBattler] = useState(0); // ターン中のパーティメンバー index
  const [enemy, setEnemy] = useState(null);
  const [messages, setMessages] = useState(['【御神木の社】から冒険が始まった...']);
  const [showSpells, setShowSpells] = useState(null); // null or memberId

  const addMessage = (msg) => {
    setMessages(prev => {
      const newMsgs = [...prev, msg];
      return newMsgs.slice(Math.max(newMsgs.length - 30, 0));
    });
  };

  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);

  // 回復地点のチェック (座標 1,1)
  const checkHealSpot = (x, y) => {
    if (x === 1 && y === 1) {
      setParty(prev => prev.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: m.status === 'DEAD' ? 'NORMAL' : m.status })));
      addMessage('御神木の社にて加護を得、生命の力が満たされた！');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
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
        newDir = (current.dir + 3) % 4;
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
        checkHealSpot(newX, newY);
        if (!mapDataRef.current[newY][newX].visited) {
          setMapData(prevMap => {
             const newMap = [...prevMap];
             newMap[newY] = [...newMap[newY]]; newMap[newY][newX] = { ...newMap[newY][newX], visited: true };
             return newMap;
          });
        }
      }

      if (hasMoved) {
        const encounterChance = Math.random();
        if (encounterChance < 0.15) {
          const newEnemy = getRandomEnemy();
          setEnemy(newEnemy);
          setGameState('BATTLE');
          setActiveBattler(0); // 綱から
          addMessage(`闇から ${newEnemy.name} があらわれた！`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // バトル終了処理
  const endBattle = (won) => {
    if (won) {
        addMessage(`${enemy.name} を調伏し、平安の世に平穏が戻った！`);
        setEnemy(null);
        setGameState('EXPLORING');
    } else {
        addMessage('魔物討伐隊は、闇に飲まれてしまった...');
        setGameState('DEAD');
    }
    setActiveBattler(0);
    setShowSpells(null);
  };

  // 敵のターン処理
  const processEnemyTurn = (currentParty, currentEnemy) => {
      // 生きているメンバーを狙う
      const aliveMembers = currentParty.map((m, i) => ({ ...m, originalIndex: i })).filter(m => m.hp > 0);
      if (aliveMembers.length === 0) {
          endBattle(false);
          return;
      }
      const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      const eAttack = calculateHitAndDamage(currentEnemy.ac, currentEnemy.minDmg, currentEnemy.maxDmg, target.ac);
      
      let newParty = [...currentParty];
      if (eAttack.hit) {
        addMessage(`${currentEnemy.name} のこうげき! ${target.name} は ${eAttack.damage} の痛手を負った!`);
        const newHp = Math.max(0, target.hp - eAttack.damage);
        newParty[target.originalIndex] = { ...target, hp: newHp, status: newHp === 0 ? 'DEAD' : target.status };
      } else {
        addMessage(`${currentEnemy.name} のこうげき! 華麗に身をかわした!`);
      }

      if (newParty.every(m => m.hp === 0)) {
          setParty(newParty);
          endBattle(false);
      } else {
          setParty(newParty);
          setActiveBattler(0); // 次のプレイヤーターンへ（簡略化：全員行動ではなく渡辺綱から再び）
      }
  };

  // 「たたかう」アクション
  const handleFight = () => {
    if (gameState !== 'BATTLE') return;
    const attacker = party[activeBattler];
    if (attacker.hp === 0) {
        if (activeBattler < party.length - 1) { setActiveBattler(activeBattler + 1); return; }
        else { processEnemyTurn(party, enemy); return; }
    }

    const pAttack = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let newEnemyHp = enemy.hp;
    if (pAttack.hit) {
      addMessage(`${attacker.name} の打ちかかり！ ${enemy.name} に ${pAttack.damage} のダメージ!`);
      newEnemyHp -= pAttack.damage;
    } else {
      addMessage(`${attacker.name} は空を切った！`);
    }

    if (newEnemyHp <= 0) {
      endBattle(true); return;
    }

    const nextBattler = activeBattler + 1;
    if (nextBattler < party.length) {
      setActiveBattler(nextBattler);
      setEnemy({ ...enemy, hp: newEnemyHp });
    } else {
      processEnemyTurn(party, { ...enemy, hp: newEnemyHp });
      setEnemy({ ...enemy, hp: newEnemyHp });
    }
    setShowSpells(null);
  };

  // 「術・祈祷」の実行
  const castSpell = (spell) => {
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) {
      addMessage(`${attacker.name} は念じようとしたが、魔力が足りない！`);
      return;
    }

    // MP消費
    let newParty = [...party];
    newParty[activeBattler] = { ...attacker, mp: attacker.mp - spell.mp };
    let newEnemy = { ...enemy };

    if (spell.type === 'ATTACK') {
      const dmg = Math.floor(Math.random() * (spell.maxDmg - spell.minDmg + 1)) + spell.minDmg;
      addMessage(`${attacker.name} が【${spell.name}】の術を放つ！ ${enemy.name} に ${dmg} のダメージ！`);
      newEnemy.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const heal = Math.floor(Math.random() * (spell.maxHeal - spell.minHeal + 1)) + spell.minHeal;
      // 負傷している最もHP比率が低い者を癒やす（簡易AI）
      const sortedParty = [...newParty].sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
      const target = sortedParty[0];
      const targetIndex = newParty.findIndex(m => m.id === target.id);
      newParty[targetIndex] = { ...target, hp: Math.min(target.maxHp, target.hp + heal) };
      addMessage(`${attacker.name} は慈悲深き【${spell.name}】を唱えた。 ${target.name} の傷が ${heal} 癒えた。`);
    } else if (spell.type === 'STATUS') {
      addMessage(`${attacker.name} が【${spell.name}】を仕掛けた！ ${enemy.name} は動きを封じられた！`);
      // 簡易的に敵をミスさせやすくする等のフラグ追加は将来
    }

    setParty(newParty);
    setEnemy(newEnemy);
    setShowSpells(null);

    if (newEnemy.hp <= 0) {
      endBattle(true);
    } else {
      const nextBattler = activeBattler + 1;
      if (nextBattler < party.length) setActiveBattler(nextBattler);
      else processEnemyTurn(newParty, newEnemy);
    }
  };

  const renderMapCell = (cell, x, y) => {
    const isPlayerPos = playerState.x === x && playerState.y === y;
    const isHealSpot = x === 1 && y === 1;
    if (!cell.visited) return <div key={`${x}-${y}`} style={{ width: 20, height: 20, backgroundColor: '#000' }}></div>;
    return (
      <div key={`${x}-${y}`} style={{
        width: 20, height: 20, backgroundColor: isHealSpot ? '#113' : '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333',
        borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333',
        borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333', boxSizing: 'border-box'
      }}>
        {isHealSpot && <div style={{ position: 'absolute', top: 2, left: 6, color: '#66f', fontWeight: 'bold' }}>⛩</div>}
        {isPlayerPos && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${playerState.dir * 90}deg)`, color: '#3f3', fontSize: '14px', lineHeight: 1 }}>▲</div>
        )}
      </div>
    );
  };

  return (
    <div className="game-container">
      {/* メインビューエリア */}
      <div className="window pane-main">
        <span className="window-title">【壱人称視点】平安の闇</span>
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy">
            <span className="window-title">魔物</span>
            <div className="status-grid">
              <div><div className="status-header">妖名</div><div>{enemy.name}</div></div>
              <div><div className="status-header">体力</div><div>{enemy.hp} / {enemy.maxHp}</div></div>
              <div><div className="status-header">状態</div><div>{enemy.status}</div></div>
            </div>
          </div>
        )}
        <div className="wireframe-container" style={{ position: 'relative' }}>
          <WireframeView mapData={mapDataRef.current} playerPos={playerState} playerDir={playerState.dir} />
          {gameState === 'DEAD' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(80,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ color: '#F22', fontSize: '3rem' }}>討死</div></div>}
        </div>
      </div>

      {/* キャラクターステータスエリア */}
      <div className="window pane-status" style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
        <span className="window-title">隊員之証 (Party Status)</span>
        
        {/* ヘッダー行 */}
        <div className="status-grid" style={{ borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px' }}>
          <div className="status-header">氏名</div>
          <div className="status-header">体力</div>
          <div className="status-header">万力</div>
          <div className="status-header">防御</div>
          <div className="status-header">状態</div>
        </div>

        {/* メンバー行 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {party.map((m, idx) => (
            <div key={m.id} className="status-grid" style={{ 
              backgroundColor: (gameState === 'BATTLE' && activeBattler === idx) ? '#222' : 'transparent', 
              color: (gameState === 'BATTLE' && activeBattler === idx) ? '#3f3' : '#fff',
              padding: '4px 0',
              fontSize: '1rem',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div style={{ color: m.hp < 10 ? '#f33' : 'inherit' }}>{m.hp}/{m.maxHp}</div>
              <div>{m.mp}/{m.maxMp}</div>
              <div>{m.ac}</div>
              <div style={{ color: m.status === 'DEAD' ? '#f33' : 'inherit', fontSize: '0.9rem' }}>{m.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右側：マップとメッセージ */}
      <div className="window pane-map" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="window-title">絵図と絵巻 (Map & Log)</span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: '10px', gap: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 20px)`, gridTemplateRows: `repeat(${MAP_HEIGHT}, 20px)`, border: '2px solid #555' }}>
            {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
          </div>
          {/* マップ凡例 */}
          <div style={{ fontSize: '0.8rem', color: '#aaa', border: '1px solid #444', padding: '5px', backgroundColor: '#080808' }}>
            <div style={{ color: '#fff', borderBottom: '1px solid #333', marginBottom: '4px', textAlign: 'center' }}>凡例</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#66f' }}>⛩</span>御神木</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ color: '#3f3' }}>▲</span>現在地</div>
          </div>
        </div>

        <div style={{ flex: 1, borderTop: '2px solid #666', paddingTop: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {gameState === 'BATTLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingBottom: '10px' }}>
               <div style={{ fontSize: '0.9rem', color: '#3f3' }}>【覚悟せよ、{party[activeBattler].name}！】</div>
               <div style={{ display: 'flex', gap: '5px' }}>
                 <button onClick={handleFight} className="battle-btn">打ちかかる</button>
                 <button onClick={() => setShowSpells(showSpells ? null : party[activeBattler].id)} className="battle-btn">術・祈祷</button>
               </div>
               {showSpells && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', backgroundColor: '#111', padding: '5px' }}>
                    {(party[activeBattler].job === 'ONMYOJI' ? SPELLS.SEIMEI : party[activeBattler].job === 'BHIKKHUNI' ? SPELLS.BIKUNI : []).map(s => (
                      <button key={s.id} onClick={() => castSpell(s)} className="spell-btn">{s.name} ({s.mp})</button>
                    ))}
                 </div>
               )}
            </div>
          )}
          <div style={{ flex: 1, padding: '5px', overflowY: 'auto', backgroundColor: '#000', color: '#eee', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {messages.map((m, i) => <div key={i}>{'>'} {m}</div>)}
          </div>
        </div>
      </div>

      <style>{`
        .battle-btn { flex: 1; padding: 6px; cursor: pointer; font-family: 'DotGothic16'; font-size: 1rem; background: #333; color: #fff; border: 1px solid #aaa; }
        .battle-btn:hover { background: #444; }
        .spell-btn { padding: 4px; font-size: 0.8rem; background: #222; color: #3f3; border: 1px solid #444; cursor: pointer; font-family: 'DotGothic16'; }
        .spell-btn:hover { background: #333; }
      `}</style>
    </div>
  );
}

export default App;
