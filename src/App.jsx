import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMap, DIRECTIONS, DIR_DELTAS, MAP_WIDTH } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

// JSON データのインポート（魂の外部化）
import balanceData from './data/Balance.json';
import scenarioData from './data/Scenario.json';
import charactersData from './data/Characters.json';
import mapEventsData from './data/MapEvents.json';

const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv <= balanceData.experience.baseTable.length) {
    return balanceData.experience.baseTable[lv - 1];
  }
  const { sigmoidScale, sigmoidCenter, sigmoidSlope } = balanceData.experience;
  const x = (lv - 1) / 49;
  const sigmoid = 1 / (1 + Math.exp(-sigmoidSlope * (x - sigmoidCenter)));
  return Math.floor(sigmoidScale * sigmoid);
};

const BOSS_POS = balanceData.map.bossPos;

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  const addMessage = useCallback((msg, providedType = null) => {
    let type = providedType;
    if (!type) {
      type = 'normal';
      if (msg.includes('ダメージ') || msg.includes('傷') || msg.includes('討死')) type = 'damage_party';
      if (msg.includes('癒えた') || msg.includes('全快')) type = 'heal';
      if (msg.includes('昇格') || msg.includes('レベルアップ')) type = 'level_up';
      if (msg.includes('出現') || msg.includes('！')) type = 'event';
    }

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
    addMessage(scenarioData.ui.saveComplete);
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
    ...scenarioData.opening,
    currentPage: 0
  });

  const [mapData, setMapData] = useState(() => {
    const m = generateMap();
    m[1][1].visited = true;
    return m;
  });

  const [party, setParty] = useState(charactersData);

  const isForceMobile = (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) || new URLSearchParams(window.location.search).get('mobile') === '1';
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  const [debugEncounter, setDebugEncounter] = useState(true);

  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);
  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);

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
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
    setMapData(prev => prev.map(row => row.map(cell => ({ ...cell, visited: false }))));
    setParty(p => p.map(m => ({ ...m, hp: balanceData.partyBase.resurrectHp, mp: balanceData.partyBase.resurrectMp, exp: getRequiredExp(m.lv), status: '平安' })));
    setMessages(prev => [{ text: '……虚無の淵から、黄泉の風が吹く。', type: 'info' }, ...prev.slice(-5)]);
    setGameState('EXPLORING'); setEnemy(null);
    setTimeout(() => addMessage(scenarioData.ui.resurrection, 'resurrect'), 500);
  }, [addMessage]);

  const handleLevelUp = useCallback((member) => {
    let m = { ...member };
    while (m.lv < balanceData.experience.maxLevel && m.exp >= getRequiredExp(m.lv + 1)) {
      m.lv += 1;
      m.maxHp += balanceData.partyBase.hpPerLevel;
      m.maxMp += balanceData.partyBase.mpPerLevel;
      m.hp = m.maxHp; m.mp = m.maxMp;
      addMessage(`${m.name}${scenarioData.ui.levelUp.replace('%LV%', m.lv)}`);
    }
    return m;
  }, [addMessage]);

  const endBattle = useCallback((won) => {
    if (won) {
        SoundEngine.playMonsterDeath();
        addMessage(`${enemy.name} を調伏した！`, 'event');
        if (enemy.isBoss) { setBossDefeated(true); showDialog(scenarioData.opening.title, [scenarioData.events.bossDefeated]); }
        setParty(p => p.map(m => handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * balanceData.rates.expShare) })));
        setGameState('EXPLORING'); setEnemy(null);
    } else {
        setGameState('DEAD');
        showDialog(scenarioData.opening.title, [scenarioData.events.gameOver], () => handleResurrect(), true);
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
        addMessage(`${currentEnemy.name} の攻撃！ ${target.name} は ${res.damage} の手傷！`, 'damage_party');
        const hp = Math.max(0, target.hp - res.damage);
        nextP[target.i] = { ...target, hp, status: hp === 0 ? '討死' : '平安' };
      } else { addMessage(`${target.name} は攻撃をかわした！`, 'info'); }
      setParty(nextP);
      if (nextP.every(m => m.hp === 0)) endBattle(false);
      else setActiveBattler(nextP.findIndex(m => m.hp > 0));
  }, [endBattle, addMessage]);

  // --- Helpers ---
  const getMessageColor = (m) => {
    const type = m.type || '';
    if (type === 'damage_party' || type === 'death') return '#ff4444'; // 鮮血
    if (type === 'damage_enemy') return '#ff8844'; // 橙赤
    if (type === 'heal' || type === 'resurrect') return '#44ff44';   // 碧
    if (type === 'level_up') return varGold;  // 黄金
    if (type === 'event') return '#ffff88';  // 黄
    if (type === 'info') return '#88ccff'; // 蒼
    return '#ccc'; // 白
  };

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let nEh = enemy.hp;
    if (res.hit) { addMessage(`${attacker.name} の打ちかかり！ ${res.damage} の痛打！`, 'damage_enemy'); nEh -= res.damage; }
    else addMessage('攻撃が空を切った！', 'info');
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
      addMessage(`${spell.name}！ ${enemy.name} に ${dmg} のダメージ！`, 'damage_enemy'); nextE.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const heal = spell.minHeal + Math.floor(Math.random()*(spell.maxHeal-spell.minHeal));
      target.hp = Math.min(target.maxHp, target.hp + heal);
      addMessage(`${spell.name}！ ${target.name} の傷が ${heal} 癒えた。`, 'heal');
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
      } else if (debugEncounter && Math.random() < balanceData.rates.encounter) {
        const e = getRandomEnemy(party.reduce((s,m) => s+m.lv, 0));
        setEnemy(e); setGameState('BATTLE'); setActiveBattler(0); addMessage(`${e.name} が出現！`, 'event');
      }
      
      // 物語の検知（イベント地点）
      const event = mapEventsData.events.find(e => e.x === nX && e.y === nY);
      if (event) {
        showDialog(event.name, [event.description]);
        if (event.isHeal) {
          setParty(p => p.map(m => m.status === '討死' ? m : { ...m, hp: m.maxHp, mp: m.maxMp }));
          addMessage('【社】にて傷が癒やされた。', 'heal');
        }
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
        // AI戦闘強化: ボス戦では惜しみなく術を使用
        const isBoss = enemy.isBoss;
        const availableSpells = (SPELLS[a.jobKey] || []).filter(s => s.lv <= a.lv && a.mp >= s.mp);
        
        if (isBoss && availableSpells.length > 0) {
          const bestSpell = availableSpells.sort((a,b) => b.mp - a.mp)[0]; // 最大消費（最強）を優先
          castSpell(bestSpell);
          return;
        }
        
        // 通常のAI（既存）
        if (a.jobKey === 'NISOU' && party.some(m => m.hp > 0 && m.hp < m.maxHp*0.7)) {
            const s = availableSpells.find(sp => sp.type === 'HEAL');
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
    if (!cell.visited) return <div key={`${x}-${y}`} style={{ width: 22, height: 22, backgroundColor: '#000' }}></div>;
    
    // アイコンの検知
    const event = mapEventsData.events.find(e => e.x === x && e.y === y);
    let icon = null;
    if (event) {
      if (event.type === 'shrine') icon = '⛩️';
      else if (event.type === 'well') icon = '井';
      else if (event.type === 'scroll') icon = '📜';
    }

    return (
      <div key={`${x}-${y}`} style={{
        width: 22, height: 22, backgroundColor: '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333', borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333', borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333',
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
      }}>
        {icon && <span style={{ opacity: 0.6 }}>{icon}</span>}
        {isP && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${playerState.dir*90}deg)`, color: '#3f3', fontSize: '0.8rem', zIndex: 2 }}>▲</div>}
      </div>
    );
  };

  const varGold = '#f0e68c';

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''}`}>
      {/* PC: Side Status, Mobile: Hidden/Modal */}
      <div className={`window pane-status ${showStatus ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">隊員之証</span>
        {showStatus && isForceMobile && (
          <button className="close-btn" style={{ position:'absolute', right:10, top:10 }} onClick={()=>setShowStatus(false)}>閉じる</button>
        )}
        <div className="status-grid" style={{ padding: '20px 15px' }}>
          {party.map((m, i) => (
            <div key={i} className={`status-item ${gameState === 'BATTLE' && activeBattler === i ? 'active-battler' : ''}`} style={{ opacity: m.hp <= 0 ? 0.5 : 1 }}>
              <div className="status-portrait">
                {m.image ? (
                  <img src={new URL(`./assets/allies/${m.image}`, import.meta.url).href} alt={m.name} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{m.icon}</div>
                )}
              </div>
              <div className="status-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'baseline' }}>
                  <span className="status-name">{m.name}</span>
                  <span style={{ fontSize: '0.75rem', color: varGold }}>Lv {m.lv}</span>
                </div>
                <div className="hp-bar-container" style={{ height: '12px', background: '#300', border: '1px solid #622', marginBottom: '4px', position: 'relative' }}>
                  <div style={{ width: `${(m.hp / m.maxHp) * 100}%`, height: '100%', background: 'linear-gradient(to bottom, #d22, #800)', transition: 'width 0.3s' }} />
                  <span style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', fontWeight: 'bold' }}>HP {Math.max(0, m.hp)}</span>
                </div>
                <div className="mp-bar-container" style={{ height: '10px', background: '#003', border: '1px solid #226', marginBottom: '4px', position: 'relative' }}>
                  <div style={{ width: `${(m.mp / m.maxMp) * 100}%`, height: '100%', background: 'linear-gradient(to bottom, #22d, #007)', transition: 'width 0.3s' }} />
                  <span style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', fontWeight: 'bold' }}>MP {Math.max(0, m.mp)}</span>
                </div>
                <div className="xp-bar-container">
                  <div className="xp-bar" style={{ width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="window pane-main" style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="window-title">羅生門 闇視</span>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="wireframe-container">
            <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
            
            {gameState === 'BATTLE' && enemy && (
              <div className="enemy-overlay" style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                background: 'rgba(0,0,0,0.1)', zIndex: 10
              }}>
                <div style={{
                  width: '85%', background: 'rgba(10, 10, 10, 0.9)',
                  border: '2px solid var(--primary-gold)', padding: '15px',
                  boxShadow: '0 0 30px rgba(0,0,0,0.8)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', color: 'var(--primary-gold)', marginBottom: '10px', textShadow: '0 0 10px rgba(184, 154, 66, 0.5)' }}>怪異 遭遇</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ width: enemy.image ? '180px' : 'auto', height: enemy.image ? '180px' : 'auto', overflow: 'hidden', border: enemy.image ? '2px solid #555' : 'none', borderRadius: '8px' }}>
                      {enemy.image ? (
                        <img src={new URL(`./assets/enemies/${enemy.image}`, import.meta.url).href} alt={enemy.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.2)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ fontSize: '3.5rem' }}>{enemy.icon}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>{enemy.name}</div>
                      <div style={{ fontSize: '1rem', color: '#aaa' }}>羅生門の怪異</div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: '#300', position: 'relative', border: '1px solid #500' }}>
                    <div style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`, height: '100%', background: 'linear-gradient(to right, #900, #f22)' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>HP {Math.max(0, enemy.hp)} / {enemy.maxHp}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mobile Overlay (Only on Mobile) */}
            {isForceMobile && !showMap && !showStatus && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {party.map((m, i) => (
                    <div key={i} style={{ flex: 1, background: 'rgba(20,20,20,0.8)', padding: '5px', borderRadius: '4px', border: m.hp <= 0 ? '1px solid #333' : '1px solid #555' }}>
                      <div className="status-name" style={{ fontSize: '0.65rem', textAlign: 'center' }}>{m.name}</div>
                      <div style={{ height: '10px', background: '#300', marginTop: '2px' }}>
                        <div style={{ width: `${(m.hp / m.maxHp) * 100}%`, height: '100%', background: '#d22' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PC Controls Area (Fixed Height) */}
          {!isForceMobile && (
            <div style={{ padding: '15px', background: '#080808', borderTop: '1px solid #333', minHeight: '180px' }}>
              {gameState === 'BATTLE' ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ width: '100%', display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <button onClick={handleFight} className="battle-btn" style={{ flex: 3, padding: '15px', background: 'linear-gradient(#822, #500)', border: '2px solid #f55' }}>打ちかかる</button>
                    <button onClick={() => setIsAutoBattle(!isAutoBattle)} className="battle-btn" style={{ flex: 1, background: isAutoBattle ? '#600' : '#222', borderColor: isAutoBattle ? '#f55' : '#444' }}>
                      {isAutoBattle ? '修羅(自)' : '正攻(手)'}
                    </button>
                  </div>
                  <button onClick={() => setShowSpells(showSpells ? null : '1')} className="battle-btn" style={{ flex: 1, background: 'linear-gradient(#228, #114)', border: '1px solid #44f' }}>術</button>
                  <button onClick={handleRun} className="battle-btn" style={{ flex: 1, background: 'linear-gradient(#431, #210)', border: '1px solid #c93' }}>逃走</button>
                  {showSpells && (
                    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginTop: '10px' }}>
                      {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map((s, idx) => (
                        <button key={idx} onClick={() => castSpell(s)} className="spell-btn" style={{ padding: '10px' }}>{s.name} ({s.mp})</button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <button className="move-btn" onClick={() => processMove('TURN_LEFT')}>左向 [A]</button>
                    <button className="move-btn" style={{ background: 'linear-gradient(#242, #121)', border: '1px solid #484' }} onClick={() => processMove('FORWARD')}>前進 [W]</button>
                    <button className="move-btn" onClick={() => processMove('TURN_RIGHT')}>右向 [D]</button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="dialog-btn" style={{ flex: 1 }} onClick={handleSave}>💾 記録（セーブ）</button>
                    <button className="dialog-btn" style={{ flex: 1 }} onClick={() => setIsMuted(prev => !prev)}>
                      {isMuted ? '🔇 静寂を切る' : '🔊 律を奏でる'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PC: Log on Right, Map also on Right (Toggle or Stack) */}
      <div className={`window pane-log ${!isForceMobile ? '' : 'mobile-active-pane'}`}>
        <span className="window-title">言霊の記録 & 絵図</span>
        
        {/* Toggle-able content for Right Pane on PC */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #333', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 22px)`, gridTemplateRows: `repeat(${MAP_WIDTH}, 22px)`, gap: '0px', border: '1px solid #444' }}>
                {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
              </div>
              <div className="map-legend">
                {mapEventsData.legend.map((l, idx) => (
                  <div key={idx} className="legend-item"><span>{l.icon}</span> {l.name}</div>
                ))}
              </div>
            </div>

          {/* Unified Message Content rendering for PC */}
          <div className="log-content" style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ color: getMessageColor(m), marginBottom: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}>
                {m.text || m}
              </div>
            ))}
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
                <button onClick={() => setShowSpells(showSpells ? null : '1')} className="battle-btn" style={{ flex: 1, background: 'linear-gradient(#228, #114)', border: '1px solid #44f' }}>術</button>
                <button onClick={handleRun} className="battle-btn" style={{ flex: 1, background: 'linear-gradient(#431, #210)', border: '1px solid #c93' }}>逃走</button>
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
            {messages.map((m, i) => (
              <div key={i} style={{ color: getMessageColor(m), marginBottom: '4px' }}>
                {'>'} {m.text || m}
              </div>
            ))}
          </div>

          <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
             <button onClick={() => setIsMuted(prev => !prev)} style={{ background: 'none', border: 'none', color: '#c93', fontSize: '0.85rem', fontWeight: 'bold' }}>
               {isMuted ? '静音' : '音・律'}
             </button>
             <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} style={{ width: '80px', height: '20px' }} />
          </div>
        </div>
      )}

      {/* Dialog Overlay */}
      {activeDialog && (
        <div className="dialog-overlay">
          <div className="dialog-title">{activeDialog.title}</div>
          <div className="dialog-content" style={{ whiteSpace: 'pre-wrap' }}>{activeDialog.pages[activeDialog.currentPage]}</div>
          <div className="dialog-footer">
            {activeDialog.showChoices ? (
              <div style={{ display: 'flex', gap: '20px' }}>
                <button className="dialog-btn" onClick={() => { initAudio(); if(activeDialog.onConfirm) activeDialog.onConfirm(); setActiveDialog(null); }}>はい</button>
                <button className="dialog-btn" onClick={() => { 
                  if(gameState === 'DEAD') {
                    // 討死として終わる（タイトルへ）
                    setGameState('EXPLORING');
                    setPlayerState({ x: 1, y: 1, dir: DIRECTIONS.S });
                    setActiveDialog({ ...scenarioData.opening, currentPage: 0 });
                    setMessages([{ text: '都は闇に包まれた……', type: 'damage_party' }]);
                  } else {
                    setActiveDialog(null);
                  }
                }}>否</button>
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
