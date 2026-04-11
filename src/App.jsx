import { useState, useEffect, useCallback } from 'react';
import { generateMap, DIRECTIONS, DIR_DELTAS, MAP_WIDTH, MAP_HEIGHT } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST } from './data/enemyData';
import { getRandomEnemy, calculateHitAndDamage } from './logic/combat';
import { getRequiredExp } from './logic/growth';
import { StatusPane } from './components/status/StatusPane';
import { CombatArea } from './components/battle/CombatArea';
import { CharacterCard } from './components/status/CharacterCard';
import { LabyrinthMap } from './components/navigation/LabyrinthMap';
import { MessageLog } from './components/navigation/MessageLog';
import { ControlPanel } from './components/navigation/ControlPanel';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

import { 
  CHAR_IMAGES, 
  ENEMY_IMAGES, 
  ICON_MAPPING, 
  BOSS_POS, 
  isDebug 
} from './constants/gameData';

import balanceData from './data/Balance.json';
import scenarioData from './data/Scenario.json';
import charactersData from './data/Characters.json';
import mapEventsData from './data/MapEvents.json';





function App() {
  const [gameState, setGameState] = useState('EXPLORING'); 
  const [messages, setMessages] = useState([{ text: scenarioData.events.gameStart, type: 'event' }]);
  const [isAudioInitialized, setAudioInitialized] = useState(false);
  const [volume] = useState(0.5);
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
  const [visualEffects, setVisualEffects] = useState([]); // { id, target, value, type }
  const [flashColor, setFlashColor] = useState(null); // 'red', etc.
  const [displayShake, setDisplayShake] = useState(null); // 'normal', 'heavy'
  const [showVictory, setShowVictory] = useState(false);
  const [enemy, setEnemy] = useState(null);
  const [activeBattler, setActiveBattler] = useState(0);
  const [battleTurn, setBattleTurn] = useState(0);
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

  const triggerVisualEffect = useCallback((target, value, type, effectStyle = 'normal') => {
    const id = Date.now() + Math.random();
    setVisualEffects(prev => [...prev, { id, target, value, type }]);
    setTimeout(() => {
      setVisualEffects(prev => prev.filter(e => e.id !== id));
    }, 800);

    if (type === 'damage' && target.startsWith('party')) {
      setFlashColor('red');
      setTimeout(() => setFlashColor(null), 400);
      setDisplayShake(effectStyle === 'heavy' ? 'heavy' : 'normal');
      setTimeout(() => setDisplayShake(null), 400);
    } else if (type === 'damage' && target === 'enemy') {
      setDisplayShake('normal');
      setTimeout(() => setDisplayShake(null), 300);
    }
  }, []);

  const endBattle = useCallback((won) => {
    if (won) {
        setShowVictory(true);
        addMessage(`${enemy.name}${scenarioData.battle.defeat}`, 'level_up');
        if (enemy.isBoss) { 
          setBossDefeated(true); 
          setTimeout(() => setActiveDialog({ title: '怪異調伏', pages: [scenarioData.events.bossDefeated], currentPage: 0 }), 1500);
        }
        setParty(p => p.map(m => handleLevelUp({ ...m, exp: m.exp + Math.floor(enemy.exp * balanceData.rates.expShare) })));
        setTimeout(() => {
          setGameState('EXPLORING'); setEnemy(null); setShowVictory(false);
        }, 1200);
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
    setActiveBattler(0); setBattleTurn(0); setShowSpells(null);
  }, [enemy, addMessage, handleLevelUp]);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    const res = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let nEh = enemy.hp;
    if (res.hit) { 
      addMessage(`${attacker.name}${scenarioData.battle.attack} ${res.damage}${scenarioData.battle.damage}`); 
      nEh -= res.damage; 
      triggerVisualEffect('enemy', `-${res.damage}`, 'damage', res.critical ? 'heavy' : 'normal');
    }
    else addMessage(`${attacker.name}${scenarioData.battle.miss}`);
    
    if (nEh <= 0) { endBattle(true); return; }
    setEnemy({...enemy, hp: nEh});
    
    const nextIdx = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextIdx !== -1) {
      setActiveBattler(nextIdx);
      setBattleTurn(prev => prev + 1);
    } else {
      setTimeout(() => {
        const alive = party.filter(m => m.hp > 0);
        if (alive.length === 0) return;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const targetIdx = party.findIndex(m => m.name === target.name);
        const eRes = calculateHitAndDamage(enemy.ac, enemy.minDmg, enemy.maxDmg, target.ac);
        if (eRes.hit) {
          addMessage(`${enemy.name}${scenarioData.battle.counter} ${scenarioData.battle.wound.replace('%DMG%', eRes.damage)}`, 'damage_party');
          const nextHP = Math.max(0, target.hp - eRes.damage);
          setParty(p => p.map(m => m.name === target.name ? { ...m, hp: nextHP, status: nextHP === 0 ? '討死' : '平安' } : m));
          triggerVisualEffect(`party_${targetIdx}`, `-${eRes.damage}`, 'damage');
          if (party.every(m => (m.name === target.name ? nextHP : m.hp) <= 0)) endBattle(false);
        } else {
          addMessage(`${target.name}${scenarioData.battle.evade}`);
        }
        setActiveBattler(party.findIndex(m => m.hp > 0));
        setBattleTurn(prev => prev + 1);
      }, 500);
    }
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle, triggerVisualEffect]);

  const castSpell = useCallback((spell) => {
    if (gameState !== 'BATTLE' || !enemy) return;
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) { addMessage(scenarioData.battle.noMana); return; }
    let nextP = [...party]; nextP[activeBattler].mp -= spell.mp;
    let nextE = { ...enemy };
    if (spell.type === 'ATTACK') {
      const dmg = spell.minDmg + Math.floor(Math.random()*(spell.maxDmg-spell.minDmg));
      addMessage(`${spell.name}${scenarioData.battle.spellAttack.replace('%ENEMY%', enemy.name).replace('%DMG%', dmg)}`); 
      nextE.hp -= dmg;
      triggerVisualEffect('enemy', `-${dmg}`, 'damage');
    } else if (spell.type === 'HEAL') {
      const target = nextP.filter(m => m.hp > 0).sort((a,b) => a.hp - b.hp)[0];
      const heal = spell.minHeal + Math.floor(Math.random()*(spell.maxHeal-spell.minHeal));
      target.hp = Math.min(target.maxHp, target.hp + heal);
      addMessage(`${spell.name}${scenarioData.battle.spellHeal.replace('%TARGET%', target.name).replace('%HEAL%', heal)}`, 'heal');
      triggerVisualEffect(`party_${nextP.findIndex(m => m.name === target.name)}`, `+${heal}`, 'heal');
    }
    setParty(nextP); setEnemy(nextE); setShowSpells(null);
    if (nextE.hp <= 0) endBattle(true);
      else {
        const nextIdx = nextP.findIndex((m, i) => i > activeBattler && m.hp > 0);
        if (nextIdx !== -1) {
          setActiveBattler(nextIdx);
          setBattleTurn(prev => prev + 1);
        } else handleFight();
      }
  }, [party, activeBattler, enemy, addMessage, endBattle, gameState, handleFight, triggerVisualEffect]);

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
        
        // 周辺8マス(壁含む)を視認化
        setMapData(p => {
          const n=[...p.map(row => [...row])];
          for(let dy2=-1; dy2<=1; dy2++) for(let dx2=-1; dx2<=1; dx2++) {
            const tx = nX + dx2, ty = nY + dy2;
            if(tx>=0 && tx<MAP_WIDTH && ty>=0 && ty<MAP_HEIGHT) {
              n[ty][tx].visited = true;
            }
          }
          return n;
        });

        const event = mapEventsData.events.find(e => e.x === nX && e.y === nY);
        if (event) {
          setActiveDialog({ title: event.name, pages: [event.description], currentPage: 0 });
          if (event.isHeal) { setParty(p => p.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' }))); addMessage(`【${event.name}】の静寂にて隊員の心身が癒やされ、生命と霊力が再び漲った。`, 'heal'); }
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
        if (nextIdx !== -1) setTimeout(() => setActiveBattler(nextIdx), 0);
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
  }, [isAutoBattle, gameState, enemy, party, activeBattler, handleFight, castSpell, battleTurn]);

  const partyInDanger = party.some(m => m.hp > 0 && (m.hp <= m.maxHp * 0.2 || m.hp === 1));

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''} ${isShake || displayShake === 'normal' ? 'shake-anim' : ''} ${displayShake === 'heavy' ? 'shake-heavy' : ''} ${partyInDanger ? 'danger-state' : ''}`}>
      {/* 閃光エフェクト */}
      {flashColor === 'red' && <div className="flash-red"></div>}
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
      <StatusPane 
        party={party}
        visualEffects={visualEffects}
        gameState={gameState}
        activeBattler={activeBattler}
        isForceMobile={isForceMobile}
        showStatus={showStatus}
        setShowStatus={setShowStatus}
        setShowMap={setShowMap}
      />

      <div className="pane-main">
        <div className="view-window window" style={{ flex: 1, position: 'relative', overflow: 'visible', margin: 0 }}>
          {!isForceMobile && <span className="window-title">都の景色</span>}
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
          <CombatArea 
            enemy={enemy}
            visualEffects={visualEffects}
            showVictory={showVictory}
            gameState={gameState}
          />
          
          {isForceMobile && (
            <div className="mobile-status-dashboard">
              {party.map((m, i) => (
                <CharacterCard 
                  key={i}
                  member={m}
                  index={i}
                  variant="mini"
                  activeBattler={activeBattler}
                  gameState={gameState}
                  visualEffects={visualEffects}
                />
              ))}
            </div>
          )}
          
          {/* モバイル専用：探索画面上の没入型十字キー */}
          {isForceMobile && gameState !== 'BATTLE' && (
            <div className="mobile-btn-container overlay-dpad">
               <div />
               <button className="move-btn dpad-btn" onClick={() => processMove('FORWARD')}>⬆️</button>
               <div />
               <button className="move-btn dpad-btn" onClick={() => processMove('TURN_LEFT')}>⬅️</button>
               <button className="move-btn dpad-btn" onClick={() => processMove('BACKWARD')}>⬇️</button>
               <button className="move-btn dpad-btn" onClick={() => processMove('TURN_RIGHT')}>➡️</button>
            </div>
          )}
        </div>

        {/* --- 操作盤を中央下部へ復元 --- */}
        <ControlPanel 
          gameState={gameState}
          party={party}
          activeBattler={activeBattler}
          isAutoBattle={isAutoBattle}
          setIsAutoBattle={setIsAutoBattle}
          handleFight={handleFight}
          castSpell={castSpell}
          processMove={processMove}
          addMessage={addMessage}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isForceMobile={isForceMobile}
          showSpells={showSpells}
          setShowSpells={setShowSpells}
          setShowStatus={setShowStatus}
          setShowMap={setShowMap}
          scenarioData={scenarioData}
        />
      </div>

      <div className={!isForceMobile ? 'pane-right' : ''}>
        <div className={`pane-log-map-wrapper ${!isForceMobile ? 'pc-layout' : ''}`}>
          <LabyrinthMap 
            mapData={mapData}
            playerState={playerState}
            mapEventsData={mapEventsData}
            isForceMobile={isForceMobile}
            showMap={showMap}
            setShowMap={setShowMap}
            scenarioData={scenarioData}
          />

          <MessageLog 
            messages={messages}
            isForceMobile={isForceMobile}
            showMap={showMap}
            scenarioData={scenarioData}
          />
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
