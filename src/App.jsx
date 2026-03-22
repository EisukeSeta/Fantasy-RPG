import { useState, useEffect, useRef } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';

// S字カーブの累積必要経験値テーブル（Lv50飽和）
const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv >= 50) return 9999999;
  const x = (lv - 1) / 49;
  // シグモイド関数的なS字カーブ
  const sigmoid = 1 / (1 + Math.exp(-6 * (x - 0.5)));
  return Math.floor(10000 * sigmoid);
};

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
    { id: 'Tsu', name: '渡辺 綱', job: '武将', jobKey: 'SAMURAI', expName: '武者の魂', lv: 1, exp: 0, icon: '⚔️', hp: 30, maxHp: 30, mp: 0, maxMp: 0, ac: 4, minDmg: 8, maxDmg: 15, status: '平安' },
    { id: 'Sei', name: '安倍 晴明', job: '陰陽師', jobKey: 'ONMYOJI', expName: '式神の守', lv: 1, exp: 0, icon: '☯️', hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4, status: '平安' },
    { id: 'Bik', name: '八百比丘尼', job: '尼僧', jobKey: 'NISOU', expName: '法力', lv: 1, exp: 0, icon: '📿', hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6, status: '平安' }
  ]);

  const [activeBattler, setActiveBattler] = useState(0); 
  const [enemy, setEnemy] = useState(null);
  const [messages, setMessages] = useState(['【御神木の社】から冒険が始まった...']);
  const [showSpells, setShowSpells] = useState(null); 

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

  // ボス（ぬえ）の場所検知 (仮のボス座標: 8,6)
  const BOSS_POS = { x: 8, y: 6 };
  const checkOminousPresence = (x, y) => {
    const dist = Math.abs(x - BOSS_POS.x) + Math.abs(y - BOSS_POS.y);
    if (dist <= 5) {
      addMessage('妖気が強まっている。強力な魔物が近いようだ。');
    }
  };

  // 回復地点のチェック (計3箇所: 1,1 / 8,1 / 1,6)
  const HEAL_SPOTS = [{x:1, y:1}, {x:8, y:1}, {x:1, y:6}];
  const checkHealSpot = (x, y) => {
    const isHeal = HEAL_SPOTS.some(s => s.x === x && s.y === y);
    if (isHeal) {
      setParty(prev => prev.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })));
      addMessage('神社の結界にて加護を得、生命の力が満たされた！');
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
        checkOminousPresence(newX, newY);
        if (!mapDataRef.current[newY][newX].visited) {
          setMapData(prevMap => {
             const newMap = [...prevMap];
             newMap[newY] = [...newMap[newY]]; newMap[newY][newX] = { ...newMap[newY][newX], visited: true };
             return newMap;
          });
        }
      }

      if (hasMoved) {
          // ボス位置に到達
          if (newX === BOSS_POS.x && newY === BOSS_POS.y) {
              const boss = ENEMY_LIST.find(e => e.id === 4); // ぬえ
              setEnemy({ ...boss, hp: boss.maxHp });
              setGameState('BATTLE');
              addMessage(`【宿敵】${boss.name} が咆哮を上げる！決戦だ！`);
              return;
          }

        const encounterChance = Math.random();
        if (encounterChance < 0.15) {
          const totalLv = party.reduce((sum, m) => sum + m.lv, 0);
          const newEnemy = getRandomEnemy(totalLv);
          setEnemy(newEnemy);
          setGameState('BATTLE');
          setActiveBattler(0);
          addMessage(`闇から ${newEnemy.name} (Lv${newEnemy.lv}) があらわれた！`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, party]);

  // レベルアップ処理
  const handleLevelUp = (member) => {
    let m = { ...member };
    while (m.exp >= getRequiredExp(m.lv + 1) && m.lv < 50) {
      m.lv += 1;
      const hpGain = (m.jobKey === 'SAMURAI' ? 8 : m.jobKey === 'NISOU' ? 5 : 3) + Math.floor(Math.random() * 5 - 2);
      const mpGain = (m.jobKey === 'ONMYOJI' ? 6 : m.jobKey === 'NISOU' ? 4 : 0) + Math.floor(Math.random() * 3 - 1);
      m.maxHp += Math.max(1, hpGain);
      m.maxMp += Math.max(0, mpGain);
      // AC成長
      if (m.jobKey === 'SAMURAI') m.ac -= 1;
      else if (m.jobKey === 'ONMYOJI' && m.lv % 2 === 0) m.ac -= 1;
      else if (m.jobKey === 'NISOU' && m.lv % 3 === 0) m.ac -= 1;
      
      addMessage(`${m.name} はLv${m.lv}に上がった！`);
    }
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    return m;
  };

  const endBattle = (won) => {
    if (won) {
        addMessage(`${enemy.name} を撃破した！`);
        // 経験値分配
        setParty(prev => prev.map(m => {
            const gain = Math.floor(enemy.exp * (enemy.expShare[m.jobKey.toLowerCase()] || 0.3));
            addMessage(`${m.name} は ${gain} の${m.expName}を得た。`);
            let newM = { ...m, exp: m.exp + gain };
            if (newM.exp >= getRequiredExp(newM.lv + 1)) {
                return handleLevelUp(newM);
            }
            return newM;
        }));
        setEnemy(null);
        setGameState('EXPLORING');
    } else {
        addMessage('魔物討伐隊は、闇に飲まれてしまった...');
        setGameState('DEAD');
    }
    setActiveBattler(0);
    setShowSpells(null);
  };

  const processEnemyTurn = (currentParty, currentEnemy) => {
      const aliveMembers = currentParty.map((m, i) => ({ ...m, originalIndex: i })).filter(m => m.hp > 0);
      if (aliveMembers.length === 0) {
          endBattle(false);
          return;
      }
      const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
      const eAttack = calculateHitAndDamage(currentEnemy.ac, currentEnemy.minDmg, currentEnemy.maxDmg, target.ac);
      
      let newParty = [...currentParty];
      if (eAttack.hit) {
        addMessage(`${currentEnemy.name} の攻撃! ${target.name} に ${eAttack.damage} の痛手!`);
        const newHp = Math.max(0, target.hp - eAttack.damage);
        newParty[target.originalIndex] = { ...target, hp: newHp, status: newHp === 0 ? '討死' : target.status };
      } else {
        addMessage(`${currentEnemy.name} の攻撃を華麗に受け流した!`);
      }

      if (newParty.every(m => m.hp === 0)) {
          setParty(newParty);
          endBattle(false);
      } else {
          setParty(newParty);
          setActiveBattler(0);
      }
  };

  const handleFight = () => {
    if (gameState !== 'BATTLE') return;
    const attacker = party[activeBattler];
    if (attacker.hp === 0) {
        const next = activeBattler + 1;
        if (next < party.length) setActiveBattler(next);
        else processEnemyTurn(party, enemy);
        return;
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
  };

  const castSpell = (spell) => {
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) {
      addMessage(`${attacker.name} は魔力が足りない！`);
      return;
    }

    let newParty = [...party];
    newParty[activeBattler] = { ...attacker, mp: attacker.mp - spell.mp };
    let newEnemy = { ...enemy };

    if (spell.type === 'ATTACK') {
      const dmg = Math.floor(Math.random() * (spell.maxDmg - spell.minDmg + 1)) + spell.minDmg;
      addMessage(`${attacker.name} の【${spell.name}】！ ${enemy.name} に ${dmg} の属性ダメージ！`);
      newEnemy.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const heal = Math.floor(Math.random() * (spell.maxHeal - spell.minHeal + 1)) + spell.minHeal;
      const targets = newParty.filter(m => m.hp > 0).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
      if (targets.length > 0) {
          const targetIndex = newParty.findIndex(m => m.id === targets[0].id);
          newParty[targetIndex].hp = Math.min(newParty[targetIndex].maxHp, newParty[targetIndex].hp + heal);
          addMessage(`${attacker.name} の【${spell.name}】！ ${newParty[targetIndex].name} の傷が ${heal} 癒えた。`);
      }
    } else if (spell.type === 'BUFF') {
        if (spell.acBonus) {
            newParty = newParty.map(m => m.hp > 0 ? { ...m, ac: Math.max(0, m.ac - spell.acBonus) } : m);
            addMessage(`${attacker.name} の【${spell.name}】！ 全員の守りが固まった！`);
        }
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
    const isHealSpot = HEAL_SPOTS.some(s => s.x === x && s.y === y);
    if (!cell.visited) return <div key={`${x}-${y}`} style={{ width: 35, height: 35, backgroundColor: '#000' }}></div>;
    return (
      <div key={`${x}-${y}`} style={{
        width: 35, height: 35, backgroundColor: isHealSpot ? '#113' : '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333',
        borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333',
        borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333', boxSizing: 'border-box'
      }}>
        {isHealSpot && <div style={{ position: 'absolute', top: 3, left: 8, color: '#66f', fontWeight: 'bold', fontSize: '1.4rem' }}>⛩</div>}
        {isPlayerPos && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${playerState.dir * 90}deg)`, color: '#3f3', fontSize: '20px', lineHeight: 1 }}>▲</div>
        )}
      </div>
    );
  };

  return (
    <div className="game-container">
      <div className="window pane-main">
        <span className="window-title">【壱人称視点】平安の闇</span>
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy">
            <span className="window-title">魔物 (Lv{enemy.lv})</span>
            <div className="status-grid">
              <div><div className="status-header">妖名</div><div>{enemy.name}</div></div>
              <div><div className="status-header">体力</div><div>{enemy.hp} / {enemy.maxHp}</div></div>
              <div><div className="status-header">状態</div><div>平安</div></div>
            </div>
          </div>
        )}
        <div className="wireframe-container" style={{ position: 'relative' }}>
          <WireframeView mapData={mapDataRef.current} playerPos={playerState} playerDir={playerState.dir} />
          {gameState === 'DEAD' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(80,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ color: '#F22', fontSize: '3rem' }}>討死</div></div>}
        </div>
      </div>

      <div className="window pane-status" style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}>
        <span className="window-title">隊員之証 (Party Status)</span>
        <div className="status-grid" style={{ borderBottom: '1px solid #555', paddingBottom: '5px', marginBottom: '5px', gridTemplateColumns: '80px 100px 50px 100px 80px 80px 50px 80px' }}>
          <div className="status-header">職種</div>
          <div className="status-header">氏名</div>
          <div className="status-header">階級</div>
          <div className="status-header">経験（功徳）</div>
          <div className="status-header">体力</div>
          <div className="status-header">万力</div>
          <div className="status-header">防御</div>
          <div className="status-header">状態</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {party.map((m, idx) => (
            <div key={m.id} className="status-grid" style={{ 
              backgroundColor: (gameState === 'BATTLE' && activeBattler === idx) ? '#153315' : 'transparent', 
              color: (gameState === 'BATTLE' && activeBattler === idx) ? '#3f3' : '#fff',
              padding: '8px 0', fontSize: '1.1rem', alignItems: 'center', borderBottom: '1px solid #222',
              gridTemplateColumns: '80px 100px 50px 100px 80px 80px 50px 80px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{m.icon} {m.job}</div>
              <div style={{ textAlign: 'left' }}>{m.name}</div>
              <div>Lv{m.lv}</div>
              <div style={{ fontSize: '0.8rem' }}>{m.exp} / {getRequiredExp(m.lv+1)}</div>
              <div style={{ color: m.hp < (m.maxHp * 0.3) ? '#f33' : 'inherit' }}>{m.hp}/{m.maxHp}</div>
              <div>{m.mp}/{m.maxMp}</div>
              <div>{m.ac}</div>
              <div style={{ color: m.status === '討死' ? '#f33' : 'inherit' }}>{m.status}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="window pane-map" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="window-title">絵図と絵巻 (Map & Log)</span>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: '15px', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 35px)`, gridTemplateRows: `repeat(${MAP_HEIGHT}, 35px)`, border: '2px solid #555' }}>
            {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
          </div>
          <div style={{ fontSize: '1.2rem', color: '#aaa', border: '1px solid #444', padding: '12px', backgroundColor: '#080808', flexShrink: 0 }}>
            <div style={{ color: '#fff', borderBottom: '1px solid #333', marginBottom: '10px', textAlign: 'center' }}>凡例</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ color: '#66f', fontSize: '1.8rem' }}>⛩</span>結界</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#3f3', fontSize: '1.4rem' }}>▲</span>現在地</div>
          </div>
        </div>

        <div style={{ flex: 1, borderTop: '2px solid #666', paddingTop: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {gameState === 'BATTLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px' }}>
               <div style={{ fontSize: '1.1rem', color: '#3f3' }}>【覚悟せよ、{party[activeBattler].name}！】</div>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button onClick={handleFight} className="battle-btn" style={{ fontSize: '1.4rem', padding: '12px' }}>打ちかかる</button>
                 <button onClick={() => setShowSpells(showSpells === party[activeBattler].id ? null : party[activeBattler].id)} className="battle-btn" style={{ fontSize: '1.4rem', padding: '12px' }}>術・祈祷</button>
               </div>
               {showSpells && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', backgroundColor: '#111', padding: '8px' }}>
                    {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map(s => (
                      <button key={s.id} onClick={() => castSpell(s)} className="spell-btn" style={{ fontSize: '1.1rem', padding: '8px' }}>{s.name} ({s.mp})</button>
                    ))}
                 </div>
               )}
            </div>
          )}
          <div style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#000', color: '#eee', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {messages.map((m, i) => {
               const isDamage = m.includes('ダメージ') || m.includes('痛手') || m.includes('飲まれて');
               const isHeal = m.includes('癒えた') || m.includes('加護') || m.includes('満たされた') || m.includes('回復');
               const color = isDamage ? '#ff4444' : isHeal ? '#44ff44' : '#eee';
               return <div key={i} style={{ color }}>{'>'} {m}</div>;
            })}
          </div>
        </div>
      </div>

      <style>{`
        .battle-btn { flex: 1; cursor: pointer; font-family: 'DotGothic16'; background: #333; color: #fff; border: 1px solid #aaa; }
        .battle-btn:hover { background: #444; }
        .spell-btn { cursor: pointer; font-family: 'DotGothic16'; background: #222; color: #3f3; border: 1px solid #444; }
        .spell-btn:hover { background: #333; }
        .pane-status .status-grid { display: grid; text-align: center; }
      `}</style>
    </div>
  );
}

export default App;
