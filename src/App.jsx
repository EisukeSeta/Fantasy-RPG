import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMap, DIRECTIONS, DIR_DELTAS, MAP_WIDTH, MAP_HEIGHT } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

// Images (Allies/Enemies)
import abeImg from './assets/allies/abe_seimei.png';
import tsunaImg from './assets/allies/watanabe_tsuna.png';
import yaobikuniImg from './assets/allies/yaobikuni.png';
import gakiImg from './assets/enemies/gaki.png';
import gaikotsuImg from './assets/enemies/gaikotsu.png';
import tessatsuImg from './assets/enemies/tessatsu.png';
import hitodamaImg from './assets/enemies/hitodama.png';
import wanyudoImg from './assets/enemies/wanyudo.png';
import nureonnaImg from './assets/enemies/nureonna.png';
import aobozuImg from './assets/enemies/aobozu.png';
import tsuchigumoImg from './assets/enemies/tsuchigumo.png';
import ushioniImg from './assets/enemies/ushioni.png';
import nueImg from './assets/enemies/nue.png';

const CHAR_IMAGES = { "abe_seimei.png": abeImg, "watanabe_tsuna.png": tsunaImg, "yaobikuni.png": yaobikuniImg };
const ENEMY_IMAGES = { "gaki.png": gakiImg, "gaikotsu.png": gaikotsuImg, "tessatsu.png": tessatsuImg, "hitodama.png": hitodamaImg, "wanyudo.png": wanyudoImg, "nureonna.png": nureonnaImg, "aobozu.png": aobozuImg, "tsuchigumo.png": tsuchigumoImg, "ushioni.png": ushioniImg, "nue.png": nueImg };

import balanceData from './data/Balance.json';
import scenarioData from './data/Scenario.json';
import charactersData from './data/Characters.json';
import mapEventsData from './data/MapEvents.json';

const varGold = '#f0e68c';
const ICON_MAPPING = { "shrine": "⛩️", "well": "井", "scroll": "📜" };

const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv <= balanceData.experience.baseTable.length) return balanceData.experience.baseTable[lv - 1];
  const { sigmoidScale, sigmoidCenter, sigmoidSlope } = balanceData.experience;
  const x = (lv - 1) / 49;
  const sigmoid = 1 / (1 + Math.exp(-sigmoidSlope * (x - sigmoidCenter)));
  return Math.floor(sigmoidScale * sigmoid);
};

const BOSS_POS = balanceData.map.bossPos;
const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true';

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(isDebug);
  const [isShake, setIsShake] = useState(false);
  const [isBossIntro, setIsBossIntro] = useState(false);
  const [party, setParty] = useState(charactersData.map(c => ({ ...c })));
  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  const [bossDefeated, setBossDefeated] = useState(false);
  const [isAutoBattle, setIsAutoBattle] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showDebug, setShowDebug] = useState(isDebug);
  const [enemy, setEnemy] = useState(null);
  const [activeBattler, setActiveBattler] = useState(0);
  const [showSpells, setShowSpells] = useState(null);
  const [activeDialog, setActiveDialog] = useState({ ...scenarioData.opening, currentPage: 0 });

  const [mapData, setMapData] = useState(() => {
    const m = generateMap(); 
    // 初期地点周辺を視認
    for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
      const tx=1+dx, ty=1+dy; if(tx>=0&&tx<MAP_WIDTH&&ty>=0&&ty<MAP_HEIGHT) m[ty][tx].visited=true;
    }
    return m;
  });

  const isForceMobile = (typeof window !== 'undefined' && (window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) || new URLSearchParams(window.location.search).get('mobile') === '1';

  const addMessage = useCallback((msg, providedType = null) => {
    let type = providedType || 'normal';
    if (!providedType) {
      if (msg.includes('ダメージ') || msg.includes('傷') || msg.includes('痛打')) type = 'damage_party';
      if (msg.includes('回復') || msg.includes('全快') || msg.includes('癒えた')) type = 'heal';
      if (msg.includes('昇格') || msg.includes('レベルアップ') || msg.includes('初期化') || msg.includes('功徳')) type = 'level_up';
      if (msg.includes('這い出た') || msg.includes('震撼') || msg.includes('気配') || msg.includes('立ちはだかった')) type = 'event'; 
    }
    setMessages(prev => [...prev, { text: msg, type }].slice(-30));
  }, []);

  const initAudio = useCallback(() => {
    SoundEngine.init(); SoundEngine.setVolume(isMuted ? 0 : volume); SoundEngine.transitionTo(gameState);
    if (!isAudioInitialized) { setAudioInitialized(true); addMessage('⛩️ 奏曲が初期化されました。', 'level_up'); }
  }, [gameState, volume, isMuted, isAudioInitialized, addMessage]);

  useEffect(() => {
    const unlock = () => { initAudio(); window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
    window.addEventListener('click', unlock); window.addEventListener('touchstart', unlock);
    return () => { window.removeEventListener('click', unlock); window.removeEventListener('touchstart', unlock); };
  }, [initAudio]);

  const handleLevelUp = useCallback((member) => {
    let m = { ...member };
    while (m.lv < balanceData.experience.maxLevel && m.exp >= getRequiredExp(m.lv + 1)) {
      m.lv += 1; m.maxHp += balanceData.partyBase.hpPerLevel; m.maxMp += balanceData.partyBase.mpPerLevel;
      m.hp = m.maxHp; m.mp = m.maxMp;
      addMessage(`${m.name}${scenarioData.ui.levelUp.replace('%LV%', m.lv)}`, 'level_up');
    }
    return m;
  }, [addMessage]);

  const endBattle = useCallback((won) => {
    if (won) {
        addMessage(`${enemy.name}${scenarioData.battle.defeat}`, 'level_up');
        if (enemy.isBoss) { 
          setBossDefeated(true); 
          setTimeout(() => setActiveDialog({ title: '怪異調伏', pages: [scenarioData.events.bossDefeated], currentPage: 0 }), 500);
        }
        setParty(p => p.map(m => handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * balanceData.rates.expShare) })));
        setGameState('EXPLORING'); setEnemy(null);
    } else {
        setGameState('DEAD'); SoundEngine.transitionTo('GAMEOVER');
        setActiveDialog({ 
          title: "全滅", pages: [scenarioData.events.gameOver], currentPage: 0, showChoices: true,
          onConfirm: () => {
            setActiveDialog({
              title: "「転生」", pages: ["黄泉の理を書き換え、肉体を再構築する……。生命と記憶の代償は極大なり。"], currentPage: 0,
              onConfirm: () => {
                setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.S });
                setParty(p => p.map(m => ({ ...m, hp: 1, mp: 1, exp: getRequiredExp(m.lv), status: 'alive' })));
                setMapData(() => {
                    const m = generateMap(); 
                    for(let dy=-1; dy<=1; dy++) for(let dx=-1; dx<=1; dx++){
                      const tx=0+dx, ty=0+dy; if(tx>=0&&tx<MAP_WIDTH&&ty>=0&&ty<MAP_HEIGHT) m[ty][tx].visited=true;
                    }
                    return m;
                });
                setActiveDialog(null);
                addMessage(scenarioData.ui.resurrection, 'heal'); setGameState('EXPLORING');
              }
            });
          },
          onCancel: () => {
            setActiveDialog({
              title: "「終焉」", pages: ["都は漆黒の闇に飲まれ、記憶も魂も、全ては虚無へと消えた……。"], currentPage: 0,
              onConfirm: () => { setActiveDialog(null); setGameState('GAMEOVER'); SoundEngine.stop(); }
            });
          }
        });
    }
    setActiveBattler(0); setShowSpells(null);
  }, [enemy, addMessage, handleLevelUp]);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let nEh = enemy.hp;
    if (res.hit) { addMessage(`${attacker.name}${scenarioData.battle.attack} ${res.damage}${scenarioData.battle.damage}`); nEh -= res.damage; }
    else addMessage(`${attacker.name}${scenarioData.battle.miss}`);
    
    if (nEh <= 0) { endBattle(true); return; }
    setEnemy({...enemy, hp: nEh});
    
    const nextIdx = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextIdx !== -1) setActiveBattler(nextIdx);
    else {
      setTimeout(() => {
        const alive = party.filter(m => m.hp > 0);
        if (alive.length === 0) return;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const eRes = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, target.ac);
        if (eRes.hit) {
          addMessage(`${enemy.name}${scenarioData.battle.counter} ${scenarioData.battle.wound.replace('%DMG%', eRes.damage)}`, 'damage_party');
          const nextHP = Math.max(0, target.hp - eRes.damage);
          setParty(p => p.map(m => m.name === target.name ? { ...m, hp: nextHP, status: nextHP === 0 ? '討死' : '平安' } : m));
          if (party.every(m => (m.name === target.name ? nextHP : m.hp) <= 0)) endBattle(false);
        } else addMessage(`${target.name}${scenarioData.battle.evade}`);
        setActiveBattler(party.findIndex(m => m.hp > 0));
      }, 500);
    }
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle]);

  const castSpell = useCallback((spell) => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) { addMessage(scenarioData.battle.noMana); return; }
    let nextP = [...party]; nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...enemy };
    if (spell.type === 'ATTACK') {
      const dmg = spell.minDmg + Math.floor(Math.random()*(spell.maxDmg-spell.minDmg));
      addMessage(`${spell.name}${scenarioData.battle.spellAttack.replace('%ENEMY%', enemy.name).replace('%DMG%', dmg)}`); nextE.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const heal = spell.minHeal + Math.floor(Math.random()*(spell.maxHeal-spell.minHeal));
      target.hp = Math.min(target.maxHp, target.hp + heal);
      addMessage(`${spell.name}${scenarioData.battle.spellHeal.replace('%TARGET%', target.name).replace('%HEAL%', heal)}`, 'heal');
    }
    setParty(nextP); setEnemy(nextE); setShowSpells(null);
    if (nextE.hp <= 0) endBattle(true);
    else { const nextIdx = nextP.findIndex((m, i) => i > activeBattler && m.hp > 0); if (nextIdx !== -1) setActiveBattler(nextIdx); else handleFight(); }
  }, [party, activeBattler, enemy, addMessage, endBattle, gameState, handleFight]);

  const processMove = useCallback((type) => {
    if (activeDialog || gameState !== 'EXPLORING') return;
    const dx = playerState.dir === 1 ? 1 : playerState.dir === 3 ? -1 : 0;
    const dy = playerState.dir === 0 ? -1 : playerState.dir === 2 ? 1 : 0;
    let nX = playerState.x, nY = playerState.y, nD = playerState.dir;
    if (type === 'FORWARD') {
      const tx = nX + dx, ty = nY + dy;
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT && mapData[ty][tx].type !== 'wall') { nX = tx; nY = ty; }
    } else if (type === 'BACKWARD') {
      const tx = nX - dx, ty = nY - dy;
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT && mapData[ty][tx].type !== 'wall') { nX = tx; nY = ty; }
    } else if (type === 'TURN_LEFT') nD = (nD + 3) % 4;
    else if (type === 'TURN_RIGHT') nD = (nD + 1) % 4;

    if (nX !== playerState.x || nY !== playerState.y || nD !== playerState.dir) {
      setPlayerState({ x: nX, y: nY, dir: nD });
      if (nX !== playerState.x || nY !== playerState.y) {
        if (!bossDefeated && nX === BOSS_POS.x && nY === BOSS_POS.y) {
          setIsShake(true); setIsBossIntro(true); addMessage(scenarioData.events.nueAura, 'event');
          setTimeout(() => { setIsShake(false); setIsBossIntro(false); const b = ENEMY_LIST.find(e => e.id === 10); setEnemy({...b, hp: b.maxHp}); setGameState('BATTLE'); addMessage(scenarioData.events.nueAppear, 'event'); }, 2000);
          return;
        }
        if (Math.random() < 0.15) {
          const lSum = party.reduce((s, m) => s + m.lv, 0); const e = getRandomEnemy(lSum);
          setEnemy({ ...e, hp: e.maxHp }); setGameState('BATTLE'); addMessage(scenarioData.events.encounter.replace('%ENEMY%', e.name), 'event');
        }
        
        // 周辺8マスを視認化
        setMapData(p => {
          const n=[...p.map(row => [...row])];
          for(let dy2=-1; dy2<=1; dy2++) for(let dx2=-1; dx2<=1; dx2++) {
            const tx = nX + dx2, ty = nY + dy2;
            if(tx>=0 && tx<MAP_WIDTH && ty>=0 && ty<MAP_HEIGHT) n[ty][tx].visited = true;
          }
          return n;
        });

        const event = mapEventsData.events.find(e => e.x === nX && e.y === nY);
        if (event) {
          setActiveDialog({ title: event.name, pages: [event.description], currentPage: 0 });
          if (event.isHeal) { setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' }))); addMessage(`【${event.name}】にて心身が癒やされ、生命と霊力が満ちた。`, 'heal'); }
        }
      }
    }
  }, [playerState, mapData, gameState, activeDialog, bossDefeated, party, addMessage]);

  useEffect(() => {
    const hk = (e) => {
      if (gameState !== 'EXPLORING' || activeDialog) return;
      if (e.key === 'w' || e.key === 'ArrowUp') processMove('FORWARD');
      else if (e.key === 's' || e.key === 'ArrowDown') processMove('BACKWARD');
      else if (e.key === 'a' || e.key === 'ArrowLeft') processMove('TURN_LEFT');
      else if (e.key === 'd' || e.key === 'ArrowRight') processMove('TURN_RIGHT');
    };
    window.addEventListener('keydown', hk); return () => window.removeEventListener('keydown', hk);
  }, [gameState, activeDialog, processMove]);

  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemy) {
      const a = party[activeBattler];
      if (!a || a.hp <= 0) {
        const nextIdx = party.findIndex(m => m.hp > 0);
        if (nextIdx !== -1) setActiveBattler(nextIdx);
        return;
      }
      const t = setTimeout(() => {
        const isStrong = enemy.isBoss || enemy.hp > 50;
        const spells = (SPELLS[a.jobKey] || []).filter(s => s.lv <= a.lv && a.mp >= s.mp);
        if (isStrong && spells.length > 0) castSpell(spells[spells.length - 1]);
        else handleFight();
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isAutoBattle, gameState, enemy, party, activeBattler, handleFight, castSpell]);

  const partyInDanger = party.some(m => m.hp > 0 && (m.hp <= m.maxHp * 0.2 || m.hp === 1));

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''} ${isShake ? 'shake-anim' : ''} ${partyInDanger ? 'danger-state' : ''}`}>
      {isBossIntro && (
        <div className="gameover-overlay" style={{ background: 'rgba(0,0,0,0.85)', animation: 'none' }}>
          <div className="gameover-splash" style={{ fontSize: '3rem', letterSpacing: '10px' }}>強大な怪異の気配……</div>
        </div>
      )}
      {gameState === 'GAMEOVER' && (
        <div className="gameover-overlay">
          <div className="gameover-splash">討死</div>
          <button className="dialog-btn" onClick={() => window.location.reload()}>{scenarioData.ui.returnToCity}</button>
        </div>
      )}

      {/* Pane: Status */}
      <div className={`pane-status window ${showStatus ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">隊員之証</span>
        {isForceMobile && (
          <div className="mobile-nav-tabs">
            <button className="nav-tab-btn" onClick={() => { setShowStatus(false); setShowMap(false); }}>🏰 迷宮</button>
            <button className="nav-tab-btn" onClick={() => { setShowStatus(false); setShowMap(true); }}>🗺️ 迷宮図</button>
            <button className="nav-tab-btn active">👥 隊員証</button>
          </div>
        )}
        <div className="status-grid">
          {party.map((m, i) => (
            <div key={i} className={`status-item ${gameState === 'BATTLE' && activeBattler === i ? 'active-battler' : ''}`} style={{ opacity: m.hp <= 0 ? 0.4 : 1 }}>
              <div className="status-portrait"><img src={CHAR_IMAGES[m.image]} alt={m.name} /></div>
              <div className="status-info">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="status-name" style={{ color: m.hp === 1 ? '#f66' : '#fff' }}>{m.name}</span><span style={{ color: varGold, fontSize: '0.8rem' }}>Lv {m.lv}</span></div>
                <div className={`hp-bar-container ${m.hp === 1 ? 'danger-blink' : ''}`}><div className="hp-bar" style={{ width: `${(m.hp/m.maxHp)*100}%` }} /></div>
                <div className="mp-bar-container"><div className="mp-bar" style={{ width: `${(m.mp/m.maxMp)*100}%` }} /></div>
                <div className="xp-bar-container"><div className="xp-bar" style={{ width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
        {isForceMobile && <button className="dialog-btn" onClick={() => setShowStatus(false)} style={{ margin: '20px' }}>閉じる</button>}
      </div>

      <div className="pane-main">
        <div className="view-window window" style={{ flex: 1, position: 'relative', overflow: 'visible', margin: 0 }}>
          <span className="window-title">都の景色</span>
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
          </div>
          {isForceMobile && (
            <div 
              style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'pointer' }} 
              onClick={() => processMove('FORWARD')} 
              title="前進"
            />
          )}
          {gameState === 'BATTLE' && enemy && (
            <div className={`pane-enemy ${enemy.isBoss ? 'boss-aura' : ''}`}>
              <div className={enemy.isBoss ? 'boss-name' : 'enemy-name'}>
                {enemy.isBoss ? `＊＊＊ ${enemy.name} ＊＊＊` : enemy.name}
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', width: '100%' }}>
                <img src={ENEMY_IMAGES[enemy.image]} alt={enemy.name} style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', filter: enemy.isBoss ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : 'drop-shadow(0 0 15px rgba(184, 154, 66, 0.4))' }} />
              </div>
              <div className="hp-bar-container" style={{ width: '70%', margin: '15px 0' }}><div className="hp-bar" style={{ width: `${(enemy.hp/enemy.maxHp)*100}%` }} /></div>
            </div>
          )}
          
            {isForceMobile && (
              <div className="mobile-status-dashboard">
                {party.map((m, i) => (
                  <div key={i} className="mini-member-card">
                    <div className="card-top">
                      <span className="card-name">{m.name.slice(0,2)}</span>
                      <span className="card-lv">L{m.lv}</span>
                    </div>
                    <div className="card-bars">
                      <div className="mini-bar hp-mini"><div className="fill" style={{ width: `${(m.hp/m.maxHp)*100}%` }} /></div>
                      <div className="mini-bar mp-mini"><div className="fill" style={{ width: `${(m.mp/m.maxMp)*100}%` }} /></div>
                      <div className="mini-bar xp-mini"><div className="fill" style={{ width: `${Math.min(100, ((m.exp - getRequiredExp(m.lv)) / (getRequiredExp(m.lv + 1) - getRequiredExp(m.lv))) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {isForceMobile && (
              <div className="mobile-btn-container overlay-dpad">
               {gameState==='BATTLE' ? (
                 <>
                   <button className="move-btn" style={{ gridColumn: 'span 2' }} onClick={handleFight}>🗡️ 打ちかかる</button>
                   <button className="move-btn" onClick={() => setShowStatus(true)}>👥 隊員</button>
                   <div />
                   <button className="move-btn" onClick={() => setShowSpells(!showSpells)}>📜 術式</button>
                   <div />
                 </>
               ) : (
                 <>
                   <div />
                   <button className="move-btn dpad-btn" onClick={() => processMove('FORWARD')}>⬆️</button>
                   <div />
                   <button className="move-btn dpad-btn" onClick={() => processMove('TURN_LEFT')}>⬅️</button>
                   <button className="move-btn dpad-btn" onClick={() => processMove('BACKWARD')}>⬇️</button>
                   <button className="move-btn dpad-btn" onClick={() => processMove('TURN_RIGHT')}>➡️</button>
                 </>
               )}
            </div>
          )}
        </div>

        {isForceMobile ? (
          <div className="mobile-ui-container">
            <div className="mobile-utility-btns" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', padding: '10px', background: '#111', borderBottom: '1px solid #333' }}>
              <button className="dialog-btn" style={{ fontSize: '0.8rem', padding: '8px 4px' }} onClick={()=>setShowMap(true)}>🗺️ 迷宮図</button>
              <button className="dialog-btn" style={{ fontSize: '0.8rem', padding: '8px 4px' }} onClick={()=>setShowStatus(true)}>👥 隊員証</button>
              <button className="dialog-btn" style={{ fontSize: '0.8rem', padding: '8px 4px' }} onClick={()=>addMessage(scenarioData.ui.saveComplete, 'level_up')}>💾 記録</button>
              <button className="dialog-btn" style={{ fontSize: '0.8rem', padding: '8px 4px' }} onClick={()=>setIsMuted(!isMuted)}>{isMuted?'🔇':'🔊'}</button>
            </div>
            
            <div className="mobile-log-display">
              {messages.map((m, i) => <div key={i} className={`log-msg msg-${m.type}`}>{m.text}</div>)}
            </div>

            <div className="mini-status-panel mobile-overlay" style={{ height: '4px', gap: '2px', position: 'relative', bottom: 0, left: 0, right: 0 }}>
               {party.map((m, i) => <div key={i} style={{ flex: 1, height: '100%', background: '#300', position: 'relative', overflow: 'hidden' }}>
                 <div style={{ width: `${(m.hp/m.maxHp)*100}%`, height: '100%', background: m.hp === 1 ? '#f11' : '#d22' }} />
               </div>)}
            </div>
          </div>
        ) : (
          <div className="controls-window window" style={{ height: '180px', marginTop: '15px' }}>
            <div style={{ display: 'flex', height: '100%', padding: '15px' }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {gameState === 'BATTLE' ? (
                  <><button className="dialog-btn" style={{ gridColumn: 'span 2' }} onClick={handleFight}>{scenarioData.ui.fight}</button><button className="dialog-btn" onClick={() => setIsAutoBattle(!isAutoBattle)}>{isAutoBattle ? scenarioData.ui.shuraAuto : scenarioData.ui.manual}</button><button className="dialog-btn" onClick={() => setShowSpells(!showSpells)}>{scenarioData.ui.spells}</button><button className="dialog-btn" onClick={() => { if(Math.random()<0.5){ addMessage(scenarioData.battle.fleeSuccess); setEnemy(null); setGameState('EXPLORING'); } else addMessage(scenarioData.battle.fleeFail); }}>{scenarioData.ui.flee}</button></>
                ) : (
                  <><div /><button className="dialog-btn" onClick={() => processMove('FORWARD')}>⬆️ 前進</button><div /><button className="dialog-btn" onClick={() => processMove('TURN_LEFT')}>↩️ 左向</button><button className="dialog-btn" onClick={() => processMove('BACKWARD')}>⬇️ 後退</button><button className="dialog-btn" onClick={() => processMove('TURN_RIGHT')}>↪️ 右向</button></>
                )}
              </div>
              <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '5px', marginLeft: '10px' }}>
                 <button className="save-btn" style={{flex:1}} onClick={() => addMessage(scenarioData.ui.saveComplete, 'level_up')}>{scenarioData.ui.save}</button>
                 <button className="save-btn" style={{flex:1}} onClick={() => setIsMuted(!isMuted)}>{isMuted ? scenarioData.ui.bgmOff : scenarioData.ui.bgmOn}</button>
              </div>
              {showSpells && gameState === 'BATTLE' && (
                <div style={{ flex: 1, marginLeft: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', overflowY: 'auto' }}>
                  {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map((s, idx) => (
                    <button key={idx} className="spell-btn" onClick={() => castSpell(s)}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Log & Map Pane */}
      <div className={`pane-log window ${showMap ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">{scenarioData.ui.labyrinthMap} <span style={{ color: 'var(--soft-gold)', marginLeft: '15px', textShadow: '0 0 10px rgba(184, 154, 66, 0.8)' }}>〔 {playerState.x}, {playerState.y} 〕</span></span>
        {isForceMobile && (
          <div className="mobile-nav-tabs">
            <button className="nav-tab-btn" onClick={() => { setShowStatus(false); setShowMap(false); }}>🏰 迷宮</button>
            <button className="nav-tab-btn active">🗺️ 迷宮図</button>
            <button className="nav-tab-btn" onClick={() => { setShowStatus(true); setShowMap(false); }}>👥 隊員証</button>
          </div>
        )}
        
        {/* Map view (Unified focus) */}
        <div style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#000', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 22px)`, gap: 0, border: '1px solid #111' }}>
            {mapData.map((row, y) => row.map((cell, x) => {
              const ev = mapEventsData.events.find(e => e.x === x && e.y === y);
              const isPlayer = playerState.x === x && playerState.y === y;
              return (
                <div key={`${x}-${y}`} className={`map-cell ${cell.visited ? (cell.type + ' visited') : ''} ${isPlayer ? 'player' : ''}`}>
                  {cell.visited && !isPlayer && ev && (ICON_MAPPING[ev.type] || '')}
                  {isPlayer && <span className="player-icon" style={{ transform: `rotate(${playerState.dir * 90}deg)` }}>▲</span>}
                </div>
              );
            }))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '15px', fontSize: '0.75rem', color: '#aaa' }}>
            {mapEventsData.legend.map((l, idx) => <span key={idx} style={{ textAlign: 'center' }}>{l.icon}:{l.name}</span>)}
          </div>
          {isForceMobile && <button className="dialog-btn" onClick={() => setShowMap(false)} style={{ marginTop: '30px', width: '80%' }}>閉じる</button>}
        </div>
      </div>

      {activeDialog && (
        <div className="dialog-overlay">
          <div className="dialog-title">{activeDialog.title}</div>
          <div className="dialog-content">{activeDialog.pages[activeDialog.currentPage]}</div>
          <div className="dialog-footer">
            {activeDialog.showChoices ? (
              <><button className="dialog-btn" onClick={() => { initAudio(); if(activeDialog.onConfirm) activeDialog.onConfirm(); else setActiveDialog(null); }}>はい</button>
                <button className="dialog-btn" onClick={() => { if(activeDialog.onCancel) activeDialog.onCancel(); else setActiveDialog(null); }}>否</button></>
            ) : (
              <button className="dialog-btn" onClick={() => { 
                if(activeDialog.onConfirm) activeDialog.onConfirm();
                if (activeDialog.pages && activeDialog.currentPage < activeDialog.pages.length - 1) setActiveDialog({...activeDialog, currentPage: activeDialog.currentPage + 1}); 
                else setActiveDialog(null); 
              }}>次へ</button>
            )}
          </div>
        </div>
      )}

      {isDebug && (
        <>
          <button 
            className="debug-btn" 
            onClick={() => setShowDebug(!showDebug)} 
            style={{ position: 'fixed', bottom: '5px', left: '5px', zIndex: 10001, padding: '5px 8px', fontSize: '1rem', background: '#222', border: '1px solid var(--primary-gold)' }}
          >
            {showDebug ? '✖' : '🛠️'}
          </button>
          
          {showDebug && (
            <div className="debug-panel" style={{ bottom: '40px', left: '5px' }}>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })))}>全員全快</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, hp: 1, status: '平安' })))} style={{ color: '#f55' }}>瀕死状態</button>
              <button className="debug-btn" onClick={() => setEnemy(e => e ? { ...e, hp: 1 } : null)}>敵一撃</button>
              <button className="debug-btn" onClick={() => { setEnemy(null); setGameState('EXPLORING'); }}>敵消滅</button>
              <button className="debug-btn" onClick={() => setParty(p => p.map(m => ({ ...m, exp: m.exp + 2000 })))}>大量功徳</button>
              <button className="debug-btn" onClick={() => {
                const input = prompt("跳躍先の座標(x,y)を入力せよ (例: 9,1)", `${playerState.x},${playerState.y}`);
                if (input) {
                  const [nx, ny] = input.split(',').map(Number);
                  if (!isNaN(nx) && !isNaN(ny)) {
                    setPlayerState({ x: nx, y: ny, dir: DIRECTIONS.S });
                    addMessage(`(x:${nx}, y:${ny}) への神速の跳躍。`, 'event');
                  }
                }
              }} style={{ color: '#f1c40f' }}>神速跳躍</button>
              <button className="debug-btn" onClick={() => { setPlayerState({ x: 1, y: 1, dir: DIRECTIONS.S }); addMessage('社へ帰還。', 'event'); }}>社へ帰還</button>
              <button className="debug-btn" onClick={() => { setMapData(p => p.map(r => r.map(c => ({...c, visited: true})))); addMessage('霧が晴れた。', 'event'); }}>全地図開</button>
              <button className="debug-btn" onClick={() => {
                const eid = prompt("怪異の番付(0-10)を入力せよ (10:鵺)", "10");
                const e = ENEMY_LIST[Number(eid)] || getRandomEnemy(1);
                setEnemy({ ...e, hp: e.maxHp }); setGameState('BATTLE'); addMessage(`【${e.name}】を召喚。`, 'event');
              }}>怪異召喚</button>
              <button className="debug-btn" onClick={() => { setBossDefeated(!bossDefeated); addMessage(`因縁の変転：ボス討伐状態を ${!bossDefeated} へ。`, 'event'); }}>ボスフラグ</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
