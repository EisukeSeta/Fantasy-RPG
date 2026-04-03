import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

// S字カーブの累積必要経験値テーブル
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
const HEAL_SPOTS = [{x:1, y:1}, {x:8, y:1}, {x:1, y:6}];

function App() {
  // --- 1. 基本状態（全機能の基礎） ---
  const [gameState, setGameState] = useState('EXPLORING'); // EXPLORING, BATTLE, DEAD, CLEAR
  const [messages, setMessages] = useState(['【御神木の社】から冒険が始まった...']);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  // --- 2. 基本コールバック（依存関係の解決のため先頭へ） ---
  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const newMsgs = [...prev, msg];
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

  // --- 3. ゲーム固有の状態 ---
  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  const [bossDefeated, setBossDefeated] = useState(false);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [enemy, setEnemy] = useState(null);
  const [activeBattler, setActiveBattler] = useState(0);
  const [showSpells, setShowSpells] = useState(null);

  // ダイアログ状態の初期化（序章）
  const [activeDialog, setActiveDialog] = useState({
    title: '平安魔道伝 羅生門編 ― 序章',
    pages: [
      `ようこそ、平安の闇へ。\n冒険を始める前に、端末の音量を上げてください。`,
      `雨が降っていた。\n京の南端にそびえる羅生門は、かつての威容を喪失し、巨大な獣の死骸のように横たわっている。`,
      `その下、一人の下人が嘲笑を浮かべた。「……また、阿呆が来よったわ」`,
      `茨木童子の腕を背負いし武者、渡辺綱。狐の影を纏いし陰陽師、安倍晴明。空虚な微笑を浮かべる比丘尼。`,
      `羅生門の奥には、空間そのものがひび割れたような『穴』が開いていた。`,
      `三人は振り返ることなく、黒煙の渦巻く奈落へと足を踏み入れた……。`
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
    { id: 'Sei', name: '安倍 晴明', job: '陰陽師', jobKey: 'ONMYOJI', expName: '式神의 護', lv: 1, exp: 0, icon: '☯️', hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4, status: '平安' },
    { id: 'Bik', name: '八百比丘尼', job: '尼僧', jobKey: 'NISOU', expName: '法力', lv: 1, exp: 0, icon: '📿', hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6, status: '平安' }
  ]);

  // モバイル・デバッグ判定
  const searchParams = new URLSearchParams(window.location.search);
  const isDebug = searchParams.get('debug') === '1';
  const isForceMobile = searchParams.get('mobile') === '1' || (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)));
  const [debugEncounter, setDebugEncounter] = useState(true);

  // --- 4. Refs ---
  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // --- 5. 機能クラス・メソッド（依存関係を集約） ---
  const showDialog = useCallback((title, contents, onConfirm = null, showChoices = false) => {
    const pages = Array.isArray(contents) ? contents : [contents];
    setActiveDialog({ title, pages, currentPage: 0, onConfirm, showChoices });
  }, []);

  const debugHeal = useCallback(() => {
    setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })));
    addMessage('【神託】全員が全快した。');
  }, [addMessage]);

  const debugKill = useCallback(() => {
    setParty(p => p.map(m => ({ ...m, hp: 0, status: '討死' })));
    addMessage('【神託】全員を討死させた。');
  }, [addMessage]);

  const debugEnemyKill = useCallback(() => {
    if (enemy) { setEnemy(prev => ({ ...prev, hp: 1 })); addMessage('【神託】敵の命脈を断った。'); }
  }, [enemy, addMessage]);

  const debugWarp = useCallback((tx, ty) => {
    setPlayerState({ x: tx, y: ty, dir: DIRECTIONS.N });
    addMessage(`【神託】(${tx}, ${ty}) へ跳躍した。`);
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

  const handleResurrect = useCallback(() => {
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.E });
    setMapData(prev => prev.map(row => row.map(cell => ({ ...cell, visited: false }))));
    setParty(p => p.map(m => ({ ...m, hp: 5, mp: 2, exp: getRequiredExp(m.lv), status: '平安' })));
    setGameState('EXPLORING'); setEnemy(null);
    addMessage('【黄泉還り】すべてを失い、井戸から這い上がった。');
  }, [addMessage]);

  const endBattle = useCallback((won) => {
    if (won) {
        SoundEngine.playMonsterDeath();
        addMessage(`${enemy.name} を調伏した！`);
        if (enemy.isBoss) { setBossDefeated(true); showDialog('都の安寧', ['鵺を倒し、都に光が戻った。']); }
        setParty(p => p.map(m => {
            const exp = Math.floor(enemy.exp * 0.3);
            return handleLevelUp({ ...m, exp: m.exp + exp });
        }));
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

  // --- 6. Effects ---
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

  // --- 7. JSX (構造の正常化) ---
  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''}`}>
      
      {/* 隊員之証 (PC: 左) */}
      <div className={`window pane-status ${showStatus ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">隊員之証</span>
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
           {party.map((m, idx) => (
             <div key={idx} style={{ borderBottom: '1px solid #444', padding: '10px 0', backgroundColor: (activeBattler === idx && gameState === 'BATTLE') ? '#121' : 'transparent' }}>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <span>{m.icon}</span>
                 <div style={{ flex: 1 }}>{m.name}<br/><small>{m.job} Lv.{m.lv}</small></div>
                 <div style={{ color: m.status === '討死' ? '#f55' : '#5f5' }}>{m.status}</div>
               </div>
               <div style={{ height: '4px', background: '#333', marginTop: '5px' }}><div style={{ width: `${(m.hp/m.maxHp)*100}%`, height: '100%', background: '#f55' }} /></div>
             </div>
           ))}
           {showStatus && <button className="dialog-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowStatus(false)}>探索に戻る</button>}
        </div>
      </div>

      {/* メイン視点窗 (PC: 中央) */}
      <div className="window pane-main">
        <span className="window-title">羅生門 闇視</span>
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy">
             <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>{enemy.name} Lv.{enemy.lv}</span>
               <div style={{ width: '100px', height: '8px', background: '#333' }}><div style={{ width: `${(enemy.hp/enemy.maxHp)*100}%`, height: '100%', background: '#f33' }} /></div>
             </div>
          </div>
        )}
        <div className="wireframe-container" style={{ position: 'relative' }}>
          <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
          {/* ミニステータス・透過タッチ */}
          {(gameState === 'EXPLORING' || gameState === 'BATTLE') && (
            <div className="mini-status-panel" style={{ pointerEvents: 'none', zIndex: 1100 }}>
               {party.map((m, i) => (
                 <div key={i} className="mini-status-unit">
                   {m.icon} {m.name.substring(0,1)}
                   <div style={{ flex: 1, height: '4px', background: '#333', marginLeft: '5px' }}><div style={{ width: `${(m.hp/m.maxHp)*100}%`, height: '100%', background: '#f55' }} /></div>
                 </div>
               ))}
            </div>
          )}
          <div className="dungeon-tap-overlay" onTouchStart={e => touchStartPos.current={x:e.touches[0].clientX, y:e.touches[0].clientY}} onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - touchStartPos.current.x; if (Math.abs(dx)>50) processMove(dx>0?'TURN_RIGHT':'TURN_LEFT');
          }}>
            {gameState === 'EXPLORING' && <div className="tap-area tap-forward" onClick={() => processMove('FORWARD')} style={{ height: '100%' }}></div>}
          </div>
        </div>

        {/* モバイル操作 */}
        {isForceMobile && !activeDialog && (
          <div className="mobile-btn-container" style={{ padding: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {gameState === 'BATTLE' ? (
              <>
                <button onClick={handleFight} className="battle-btn" style={{ flex: 2, padding: '12px' }}>打ちかかる</button>
                <button onClick={() => setShowSpells(showSpells ? null : '1')} className="battle-btn" style={{ flex: 1 }}>術</button>
                <button onClick={handleRun} className="battle-btn" style={{ flex: 1, background: '#422' }}>逃走</button>
                {showSpells && (
                  <div style={{ width: '100%', display: 'flex', gap: '5px', marginTop: '5px' }}>
                    {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map((s,i) => (
                      <button key={i} onClick={() => castSpell(s)} className="spell-btn" style={{ flex: 1, padding: '10px' }}>{s.name}</button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => { initAudio(); setShowMap(true); }} className="map-toggle-btn" style={{ flex: 1, padding: '12px' }}>📜 地図</button>
                <button onClick={() => { initAudio(); setShowStatus(true); }} className="map-toggle-btn" style={{ flex: 1, padding: '12px' }}>🪪 隊員</button>
                <button onClick={handleSave} className="save-btn" style={{ flex: 1 }}>💾 記録</button>
              </>
            )}
          </div>
        )}
        {isForceMobile && !showMap && !showStatus && (
          <div className="mobile-log-display" id="mobile-log-display" style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#000', fontSize: '0.9rem' }}>
            {messages.map((m, i) => <div key={i} style={{ marginBottom: '4px' }}>{'>'} {m}</div>)}
          </div>
        )}
      </div>

      {/* 絵図と絵巻 (PC: 右) */}
      <div className={`window pane-map ${showMap ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">絵図と絵巻</span>
        <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 30px)`, gap: '1px', justifyContent: 'center' }}>
             {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
           </div>
           <div className="pc-log-display" style={{ marginTop: '20px', flex: 1, overflowY: 'auto', borderTop: '1px solid #444', paddingTop: '10px' }}>
             {messages.map((m, i) => <div key={i} style={{ marginBottom: '5px' }}>{'>'} {m}</div>)}
           </div>
           {showMap && <button className="dialog-btn" onClick={() => setShowMap(false)} style={{ marginTop: '10px' }}>戻る</button>}
        </div>
      </div>

      {/* ダイアログ */}
      {activeDialog && (
        <div className="dialog-overlay">
          <div className="dialog-title">{activeDialog.title}</div>
          <div className="dialog-content" style={{ whiteSpace: 'pre-wrap' }}>{activeDialog.pages[activeDialog.currentPage]}</div>
          <div className="dialog-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            <button onClick={() => setIsAutoBattle(!isAutoBattle)} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
              AI戦闘: {isAutoBattle ? '自動' : '手動'}
            </button>
          </div>
        </div>
      )}

      {/* デバッグ */}
      {isDebug && (
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', background: 'rgba(0,40,0,0.8)', border: '1px solid #3f3', padding: '5px', zIndex: 9999, fontSize: '0.7rem' }}>
          ({playerState.x},{playerState.y}) 
          <button onClick={debugHeal}>命</button>
          <button onClick={debugKill}>滅</button>
          <button onClick={debugEnemyKill}>弱</button>
          <button onClick={() => debugWarp(1,1)}>還</button>
          <input type="checkbox" checked={debugEncounter} onChange={e => setDebugEncounter(e.target.checked)} />
        </div>
      )}

      {/* 音量 */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 9999, display: 'flex', gap: '5px', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '5px' }}>
        <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'none', border: 'none', color: '#c93', cursor: 'pointer' }}>{isMuted ? 'MUTE' : 'VOL'}</button>
        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: '40px' }} />
      </div>

      <style>{`
        .game-container { display: flex; width: 100vw; height: 100vh; background: #000; color: #eee; font-family: 'DotGothic16', sans-serif; overflow: hidden; }
        .window { border: 2px solid #555; display: flex; flex-direction: column; background: #080808; position: relative; }
        .window-title { display: block; background: #222; padding: 2px 8px; font-size: 0.75rem; color: #888; border-bottom: 2px solid #555; }
        .pane-status { width: 220px; }
        .pane-main { flex: 1; border-left: none; border-right: none; }
        .pane-map { width: 320px; }
        .wireframe-container { width: 100%; aspect-ratio: 1/1; background: #000; border-bottom: 1px solid #333; }
        .battle-btn, .dialog-btn, .map-toggle-btn, .save-btn, .spell-btn { background: #111; color: #eee; border: 1px solid #666; cursor: pointer; }
        .mini-status-panel { position: absolute; bottom: 8px; left: 8px; right: 8px; display: flex; gap: 4px; }
        .mini-status-unit { flex: 1; background: rgba(0,0,0,0.7); border: 1px solid #444; border-radius: 3px; padding: 3px; display: flex; align-items: center; font-size: 0.65rem; }
        .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 5000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; }
        .dialog-title { font-size: 1.1rem; color: #f0e68c; margin-bottom: 15px; }
        .dialog-content { font-size: 1rem; line-height: 1.5; text-align: center; max-width: 500px; }
        .dialog-btn { padding: 8px 30px; font-size: 1rem; background: #210; border: 1px solid #c93; color: #f0e68c; margin-top: 20px; }
        @media (max-width: 768px) {
          .pane-status, .pane-map { display: none; position: fixed; inset: 0; z-index: 2000; background: #000; }
          .layout-mobile .mobile-active-pane { display: flex !important; }
        }
        .layout-mobile { flex-direction: column; }
      `}</style>
    </div>
  );
}

export default App;
