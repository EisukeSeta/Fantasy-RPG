import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv === 2) return 100;
  if (lv === 3) return 250;
  if (lv === 4) return 500;
  if (lv === 5) return 900;
  if (lv >= 50) return 9999999;
  const x = (lv - 1) / 49;
  const sigmoid = 1 / (1 + Math.exp(-6 * (x - 0.5)));
  return Math.floor(20000 * sigmoid);
};

const BOSS_POS = { x: 8, y: 6 };

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); 
  const [messages, setMessages] = useState([{ text: '【御神木の社】から冒険が始まった...', type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  const addMessage = useCallback((msg) => {
    let type = 'normal';
    if (msg.includes('ダメージ') || msg.includes('傷') || msg.includes('討死')) type = 'damage';
    if (msg.includes('癒えた') || msg.includes('全快') || msg.includes('昇格')) type = 'heal';
    if (msg.includes('出現') || msg.includes('！')) type = 'event';

    setMessages(prev => {
      const newMsgs = [...prev, { text: msg, type }];
      return newMsgs.slice(Math.max(newMsgs.length - 30, 0));
    });
  }, []);

  const initAudio = useCallback(() => {
    SoundEngine.init();
    SoundEngine.setVolume(isMuted ? 0 : volume);
    SoundEngine.transitionTo(gameState);
    if (!isAudioInitialized) {
      addMessage('⛩️ 奏曲（サウンド）が初期化されました。');
      setAudioInitialized(true);
    }
  }, [gameState, volume, isMuted, addMessage, isAudioInitialized]);

  const handleSave = useCallback(() => {
    addMessage('⛩️ 冒険の記録（セーブ）は完了しました。');
  }, [addMessage]);

  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  const [bossDefeated, setBossDefeated] = useState(false);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [enemy, setEnemy] = useState(null);
  const [activeBattler, setActiveBattler] = useState(0);
  const [showSpells, setShowSpells] = useState(null);

  const [activeDialog, setActiveDialog] = useState({
    title: '平安魔道伝 羅生門編 ― 序章',
    pages: [
      `ようこそ、平安の闇へ。\n冒険を始める前に、端末の音量を上げてください。`,
      `雨が降っていた。\n京の南端にそびえる羅生門は、巨大な獣の死骸のように横たわっている。`,
      `茨木童子の腕を背負いし武者、渡辺綱。狐の影を纏いし陰陽師、安倍晴明。空虚な微笑を浮かべる比丘尼。`,
      `羅生門の奥には、黒煙の渦巻く奈落へと続く『穴』が開いていた……。`
    ],
    currentPage: 0
  });

  const [mapData, setMapData] = useState(() => {
    const m = generateMap();
    m[1][1].visited = true;
    return m;
  });

  const [party, setParty] = useState([
    { id: 'Tsu', name: '渡辺 綱', job: '武者', jobKey: 'SAMURAI', expName: '武者の魂', lv: 1, exp: 0, icon: '⚔️', hp: 30, maxHp: 30, mp: 0, maxMp: 0, ac: 4, minDmg: 8, maxDmg: 15, status: '平安' },
    { id: 'Sei', name: '安倍 晴明', job: '陰陽師', jobKey: 'ONMYOJI', expName: '式神', lv: 1, exp: 0, icon: '☯️', hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4, status: '平安' },
    { id: 'Bik', name: '八百比丘尼', job: '尼僧', jobKey: 'NISOU', expName: '法力', lv: 1, exp: 0, icon: '📿', hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6, status: '平安' }
  ]);

  const isForceMobile = (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) || new URLSearchParams(window.location.search).get('mobile') === '1';
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  const [debugEncounter, setDebugEncounter] = useState(true);

  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const showDialog = useCallback((title, contents, onConfirm = null, showChoices = false) => {
    const pages = Array.isArray(contents) ? contents : [contents];
    setActiveDialog({ title, pages, currentPage: 0, onConfirm, showChoices });
  }, []);

  const debugHeal = useCallback(() => {
    setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })));
    addMessage('【神託】全員が全快した。');
  }, [addMessage]);

  const _debugKill = useCallback(() => {
    setParty(p => p.map(m => ({ ...m, hp: 0, status: '討死' })));
    addMessage('【神託】全員を討死させた。');
  }, [addMessage]);

  const _debugEnemyKill = useCallback(() => {
    if (enemy) { setEnemy(prev => ({ ...prev, hp: 1 })); addMessage('【神託】敵の命脈を断った。'); }
  }, [enemy, addMessage]);

  const _debugWarp = useCallback((tx, ty) => {
    setPlayerState({ x: tx, y: ty, dir: DIRECTIONS.N });
    addMessage(`【神託】(${tx}, ${ty}) へ跳躍した。`);
  }, [addMessage]);

  const handleResurrect = useCallback(() => {
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.E });
    setMapData(prev => prev.map(row => row.map(cell => ({ ...cell, visited: false }))));
    setParty(p => p.map(m => ({ ...m, hp: 5, mp: 2, exp: getRequiredExp(m.lv), status: '平安' })));
    setGameState('EXPLORING'); setEnemy(null);
    addMessage('【黄泉還り】井戸から這い上がった。');
  }, [addMessage]);

  const handleLevelUp = useCallback((member) => {
    let m = { ...member };
    while (m.lv < 50 && m.exp >= getRequiredExp(m.lv + 1)) {
      m.lv += 1;
      m.maxHp += 5; m.maxMp += 3; m.hp = m.maxHp; m.mp = m.maxMp;
      addMessage(`${m.name} は Lv.${m.lv} に昇格した！`);
    }
    return m;
  }, [addMessage]);

  const endBattle = useCallback((won) => {
    if (won) {
        SoundEngine.playMonsterDeath();
        addMessage(`${enemy.name} を調伏した！`);
        if (enemy.isBoss) { setBossDefeated(true); showDialog('都の安寧', ['鵺を倒し、都に光が戻った。']); }
        setParty(p => p.map(m => handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * 0.3) })));
        setGameState('EXPLORING'); setEnemy(null);
    } else {
        setGameState('DEAD');
        showDialog('黄泉への誘い', ['「もう一度挑むか？」'], () => handleResurrect(), true);
    }
    setActiveBattler(0); setShowSpells(null);
  }, [enemy, addMessage, showDialog, handleLevelUp, handleResurrect]);

  const processEnemyTurn = useCallback((currentParty, currentEnemy) => {
      const alive = currentParty.map((m, i) => ({...m, i})).filter(m => m.hp > 0);
      if (alive.length === 0) { endBattle(false); return; }
      const target = alive[Math.floor(Math.random() * alive.length)];
      const res = calculateHitAndDamage(currentEnemy.ac, currentEnemy.minDmg, currentEnemy.maxDmg, target.ac);
      let nextP = [...currentParty];
      if (res.hit) {
        addMessage(`${currentEnemy.name} の攻撃！ ${target.name} は ${res.damage} の手傷！`);
        const hp = Math.max(0, target.hp - res.damage);
        nextP[target.i] = { ...target, hp, status: hp === 0 ? '討死' : '平安' };
      } else { addMessage(`${target.name} は攻撃をかわした！`); }
      setParty(nextP);
      if (nextP.every(m => m.hp === 0)) endBattle(false);
      else setActiveBattler(nextP.findIndex(m => m.hp > 0));
  }, [endBattle, addMessage]);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let nEh = enemy.hp;
    if (res.hit) { addMessage(`${attacker.name} の打ちかかり！ ${res.damage} の痛打！`); nEh -= res.damage; }
    else addMessage('攻撃が空を切った！');
    if (nEh <= 0) { endBattle(true); return; }
    setEnemy({...enemy, hp: nEh});
    const nextIdx = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextIdx !== -1) setActiveBattler(nextIdx);
    else processEnemyTurn(party, { ...enemy, hp: nEh });
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle, processEnemyTurn]);

  const handleRun = useCallback(() => {
    if (Math.random() < 0.5) { addMessage('逃走に成功した！'); setEnemy(null); setGameState('EXPLORING'); }
    else { addMessage('退路を断たれた！'); processEnemyTurn(party, enemy); }
  }, [party, enemy, addMessage, processEnemyTurn]);

  const castSpell = useCallback((spell) => {
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) { addMessage('霊力が足りぬ！'); return; }
    let nextP = [...party]; nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...enemy };
    if (spell.type === 'ATTACK') {
      const dmg = spell.minDmg + Math.floor(Math.random()*(spell.maxDmg-spell.minDmg));
      addMessage(`${spell.name}！ ${enemy.name} に ${dmg} のダメージ！`); nextE.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const heal = spell.minHeal + Math.floor(Math.random()*(spell.maxHeal-spell.minHeal));
      target.hp = Math.min(target.maxHp, target.hp + heal);
      addMessage(`${spell.name}！ ${target.name} の傷が ${heal} 癒えた。`);
    }
    setParty(nextP); setEnemy(nextE); setShowSpells(null);
    if (nextE.hp <= 0) endBattle(true);
    else {
      const nextIdx = nextP.findIndex((m, i) => i > activeBattler && m.hp > 0);
      if (nextIdx !== -1) setActiveBattler(nextIdx);
      else processEnemyTurn(nextP, nextE);
    }
  }, [party, activeBattler, enemy, addMessage, endBattle, processEnemyTurn]);

  const processMove = useCallback((type) => {
    if (activeDialog || gameState !== 'EXPLORING') return;
    const cur = playerStateRef.current;
    let nD = cur.dir, nX = cur.x, nY = cur.y, moved = false;
    if (type === 'TURN_LEFT') nD = (cur.dir + 3) % 4;
    else if (type === 'TURN_RIGHT') nD = (cur.dir + 1) % 4;
    else {
      const cell = mapDataRef.current[cur.y][cur.x];
      const mD = type === 'FORWARD' ? cur.dir : (cur.dir + 2) % 4;
      const can = (mD===0 && !cell.n) || (mD===1 && !cell.e) || (mD===2 && !cell.s) || (mD===3 && !cell.w);
      if (can) { nX += DIR_DELTAS[mD].dx; nY += DIR_DELTAS[mD].dy; moved = true; }
    }
    if (nX!==cur.x || nY!==cur.y || nD!==cur.dir) setPlayerState({ x: nX, y: nY, dir: nD });
    if (moved) {
      if (!bossDefeated && nX===BOSS_POS.x && nY===BOSS_POS.y) {
        const b = ENEMY_LIST.find(e => e.id === 10); setEnemy({...b, hp: b.maxHp}); setGameState('BATTLE');
      } else if (debugEncounter && Math.random() < 0.15) {
        const e = getRandomEnemy(party.reduce((s,m) => s+m.lv, 0));
        setEnemy(e); setGameState('BATTLE'); setActiveBattler(0); addMessage(`${e.name} が出現！`);
      }
      if (!mapDataRef.current[nY][nX].visited) {
        setMapData(p => { const n = [...p]; n[nY] = [...n[nY]]; n[nY][nX] = {...n[nY][nX], visited: true}; return n; });
      }
    }
  }, [activeDialog, gameState, bossDefeated, party, addMessage, debugEncounter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      let m = null;
      if (e.key === 'w' || e.key === 'ArrowUp') m = 'FORWARD';
      else if (e.key === 's' || e.key === 'ArrowDown') m = 'BACKWARD';
      else if (e.key === 'a' || e.key === 'ArrowLeft') m = 'TURN_LEFT';
      else if (e.key === 'd' || e.key === 'ArrowRight') m = 'TURN_RIGHT';
      if (m) processMove(m);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processMove]);

  useEffect(() => {
    SoundEngine.transitionTo(gameState);
    SoundEngine.setVolume(isMuted ? 0 : volume);
  }, [gameState, isMuted, volume]);

  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemy) {
      const t = setTimeout(() => {
        const a = party[activeBattler]; if (!a || a.hp <= 0) return;
        if (a.jobKey === 'NISOU' && party.some(m => m.hp > 0 && m.hp < m.maxHp*0.7)) {
            const s = (SPELLS.NISOU || []).find(sp => sp.type === 'HEAL' && a.mp >= sp.mp);
            if (s) { castSpell(s); return; }
        }
        handleFight();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [isAutoBattle, gameState, enemy, party, activeBattler, handleFight, castSpell]);

  useEffect(() => {
    const unlock = () => { initAudio(); window.removeEventListener('touchstart', unlock); window.removeEventListener('click', unlock); };
    window.addEventListener('touchstart', unlock); window.addEventListener('click', unlock);
    return () => { window.removeEventListener('touchstart', unlock); window.removeEventListener('click', unlock); };
  }, [initAudio]);

  const renderMapCell = (cell, x, y) => {
    const isP = playerState.x === x && playerState.y === y;
    if (!cell.visited) return <div key={`${x}-${y}`} style={{ width: 35, height: 35, backgroundColor: '#000' }}></div>;
    return (
      <div key={`${x}-${y}`} style={{
        width: 35, height: 35, backgroundColor: '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333', borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333', borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333'
      }}>
        {isP && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${playerState.dir*90}deg)`, color: '#3f3' }}>▲</div>}
      </div>
    );
  };

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''}`}>
      
      {/* PC: Side Status, Mobile: Hidden/Modal */}
      <div className={`window pane-status ${showStatus ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">隊員之証</span>
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
           {(isForceMobile || showStatus) && (
             <button className="dialog-btn" style={{ position: 'sticky', top: 0, zIndex: 10, width: '100%', marginBottom: '15px' }} onClick={() => setShowStatus(false)}>探索に戻る</button>
           )}
           {party.map((m, idx) => (
             <div key={idx} style={{ borderBottom: '1px solid #444', padding: '10px 0' }}>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <span>{m.icon}</span>
                 <div style={{ flex: 1 }}>{m.name} Lv.{m.lv}<br/><small>{m.job}</small></div>
               </div>
               <div style={{ height: '6px', background: '#333', marginTop: '5px' }}>
                 <div style={{ width: `${(m.hp/m.maxHp)*100}%`, height: '100%', background: '#f55' }} />
               </div>
             </div>
           ))}
        </div>
      </div>

      <div className="window pane-main">
        <span className="window-title">羅生門 闇視</span>
        
        {/* Enemy Overlay (Battle) */}
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy" style={{ position: 'absolute', top: '25px', left: '8px', right: '8px', zIndex: 100, background: 'rgba(0,0,0,0.85)', border: '1px solid #c44', padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', color: '#fdd' }}>
              <span>{enemy.name} Lv.{enemy.lv}</span>
              <span>HP {Math.ceil(enemy.hp)} / {enemy.maxHp}</span>
            </div>
            <div style={{ height: '22px', background: '#200', marginTop: '6px', border: '1px solid #622', boxShadow: '0 0 10px rgba(255,0,0,0.3)' }}>
              <div style={{ width: `${(enemy.hp/enemy.maxHp)*100}%`, height: '100%', background: 'linear-gradient(90deg, #600, #f22)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Mobile Party Status Overlay */}
        {isForceMobile && !showMap && !showStatus && (
          <div className="mini-status-panel mobile-overlay">
            {party.map((m, i) => (
              <div key={i} style={{ flex: 1, background: 'rgba(5, 5, 5, 0.7)', backdropFilter: 'blur(4px)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(184, 154, 66, 0.5)', minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f0e68c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                  {m.icon}{m.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span style={{ color: m.hp <= m.maxHp * 0.2 ? '#f55' : '#eee' }}>H:{m.hp}</span>
                  <span style={{ color: '#88f' }}>M:{m.mp}</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(0,0,0,0.5)', width: '100%', marginBottom: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, (m.hp/m.maxHp)*100))}%`, height: '100%', background: 'linear-gradient(90deg, #800, #f33)' }} />
                </div>
                {m.maxMp > 0 && (
                  <div style={{ height: '3px', background: 'rgba(0,0,0,0.5)', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, (m.mp/m.maxMp)*100))}%`, height: '100%', background: 'linear-gradient(90deg, #008, #33f)' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dungeon Display */}
        <div className="wireframe-container" style={{ flexShrink: 0, position: 'relative' }}>
          <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
          <div className="dungeon-tap-overlay" onTouchStart={e => touchStartPos.current={x:e.touches[0].clientX, y:e.touches[0].clientY}} onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartPos.current.x;
            if (Math.abs(dx) > 50) processMove(dx > 0 ? 'TURN_RIGHT' : 'TURN_LEFT');
          }}>
            {gameState === 'EXPLORING' && <div className="tap-area tap-forward" onClick={() => processMove('FORWARD')} style={{ height: '100%' }}></div>}
          </div>
        </div>
      </div>

      {/* UI Area (Mobile Only) */}
      {isForceMobile && !showMap && !showStatus && (
        <div className="mobile-ui-container">
          <div className="mobile-btn-container">
            {gameState === 'BATTLE' ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '100%', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <button onClick={handleFight} className="battle-btn" style={{ flex: 3, padding: '15px', background: 'linear-gradient(#822, #500)', border: '2px solid #f55' }}>打ちかかる</button>
                  <button onClick={() => setIsAutoBattle(!isAutoBattle)} className="battle-btn" style={{ flex: 1, background: isAutoBattle ? '#600' : '#222', borderColor: isAutoBattle ? '#f55' : '#444' }}>
                    {isAutoBattle ? '修羅(自)' : '正攻(手)'}
                  </button>
                </div>
                <button onClick={() => setShowSpells(showSpells ? null : '1')} className="battle-btn" style={{ flex: 1 }}>術</button>
                <button onClick={handleRun} className="battle-btn" style={{ flex: 1, background: '#333' }}>逃走</button>
                {showSpells && (
                  <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '5px' }}>
                    {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map((s, idx) => (
                      <button key={idx} onClick={() => castSpell(s)} className="spell-btn" style={{ padding: '12px' }}>{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
                  <button className="move-btn" onClick={() => processMove('TURN_LEFT')}>左向</button>
                  <button className="move-btn" onClick={() => processMove('FORWARD')} style={{ background: 'linear-gradient(#242, #121)', border: '1px solid #484' }}>前進</button>
                  <button className="move-btn" onClick={() => processMove('TURN_RIGHT')}>右向</button>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="map-toggle-btn" style={{ flex: 1, padding: '12px' }} onClick={() => { initAudio(); setShowMap(true); }}>📜 絵図</button>
                  <button className="map-toggle-btn" style={{ flex: 1, padding: '12px' }} onClick={() => { initAudio(); setShowStatus(true); }}>🪪 隊員</button>
                  <button className="save-btn" style={{ flex: 1, padding: '12px' }} onClick={handleSave}>💾 記録</button>
                </div>
              </div>
            )}
          </div>

          <div className="mobile-log-display" id="mobile-log-display">
            {messages.map((m, i) => {
              const color = m.type === 'damage' ? '#ff6666' : m.type === 'heal' ? '#66ff66' : m.type === 'event' ? '#ffff88' : '#ccc';
              return <div key={i} style={{ color, marginBottom: '4px', textShadow: m.type!=='normal' ? '0 0 5px rgba(0,0,0,0.5)' : 'none' }}>
                {'>'} {m.text || m}
              </div>
            })}
          </div>

          <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
             <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: '#c93', fontSize: '0.85rem', fontWeight: 'bold' }}>{isMuted ? '静音' : '音・律'}</button>
             <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: '80px', height: '20px' }} />
          </div>
        </div>
      )}

      {/* PC Log Display (Visible only on PC) */}
      {!isForceMobile && (
        <div className="window pane-log">
          <span className="window-title">言霊の記録</span>
          <div className="log-content">
            {messages.map((m, i) => (
              <div key={i} style={{ color: m.type === 'damage' ? '#ff6666' : m.type === 'heal' ? '#66ff66' : m.type === 'event' ? '#ffff88' : '#ccc' }}>
                {'>'} {m.text || m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Overlay (Mobile) */}
      <div className={`window pane-map ${showMap ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">絵図と絵巻き</span>
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
           {(isForceMobile || showMap) && (
             <button className="dialog-btn" style={{ position: 'sticky', top: 0, zIndex: 10, width: '100%', marginBottom: '15px' }} onClick={() => setShowMap(false)}>探索に戻る</button>
           )}
           <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 30px)`, gap: '1px', justifyContent: 'center' }}>
             {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
           </div>
        </div>
      </div>

      {/* Dialog Overlay */}
      {activeDialog && (
        <div className="dialog-overlay">
          <div className="dialog-title">{activeDialog.title}</div>
          <div className="dialog-content" style={{ whiteSpace: 'pre-wrap' }}>{activeDialog.pages[activeDialog.currentPage]}</div>
          <div className="dialog-footer">
            {activeDialog.showChoices ? (
              <div style={{ display: 'flex', gap: '20px' }}>
                <button className="dialog-btn" onClick={() => { initAudio(); activeDialog.onConfirm(); setActiveDialog(null); }}>はい</button>
                <button className="dialog-btn" onClick={() => setActiveDialog(null)}>否</button>
              </div>
            ) : (
              <button className="dialog-btn" onClick={() => {
                initAudio();
                if (activeDialog.currentPage < activeDialog.pages.length - 1) setActiveDialog(p => ({ ...p, currentPage: p.currentPage + 1 }));
                else { if (activeDialog.onConfirm) activeDialog.onConfirm(); setActiveDialog(null); }
              }}>次へ</button>
            )}
          </div>
        </div>
      )}

      {/* Debug UI */}
      {isDebug && (
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', background: 'rgba(0,50,0,0.8)', border: '1px solid #3f3', padding: '5px', zIndex: 9999, fontSize: '0.7rem' }}>
          ({playerState.x},{playerState.y}) <button onClick={debugHeal}>命</button> <input type="checkbox" checked={debugEncounter} onChange={e => setDebugEncounter(e.target.checked)} />
        </div>
      )}
    </div>
  );
}

export default App;
