/**
 * 平安魔道伝 - バランステスター (Node.js用シミュレーター)
 * v3.4 抽出済みロジック完全同期版
 */

import { getRandomEnemy, calculateHitAndDamage, SPELLS } from '../src/logic/combat.js';
import { getRequiredExp } from '../src/logic/growth.js';

// JSON loading for Node.js
import { readFile } from 'node:fs/promises';
const loadJSON = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url)));

const balanceData = await loadJSON('../src/data/Balance.json');
const charactersData = await loadJSON('../src/data/Characters.json');
const enemiesData = await loadJSON('../src/data/Enemies.json');

// --- Emulator Settings ---
const SIM_RUNS = 1000; 
const STEPS_TO_BOSS = 100; 
const ENCOUNTER_CHANCE = balanceData.rates.encounter;
const MOBILE_MODE = process.argv.includes('--mobile');
const MOBILE_FACTOR = 1.35; 

// --- Audit Thresholds ---
const THRESHOLD = {
  MIN_WIN_RATE: 20.0,    // ボス討伐成功率 20%以上
  MAX_WIPEOUTS: 25.0,    // 平均全滅回数 25回以下
  MAX_PLAY_TIME: 120.0   // 推定平均プレイ時間 120分以下
};

// --- Player Stats & Job Logic ---
const createInitialParty = () => JSON.parse(JSON.stringify(charactersData));

function handleLevelUp(member) {
  let m = { ...member };
  while (m.lv < balanceData.experience.maxLevel && m.exp >= getRequiredExp(m.lv + 1)) {
    m.lv += 1;
    m.maxHp += balanceData.partyBase.hpPerLevel;
    m.maxMp += balanceData.partyBase.mpPerLevel;
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    
    // 職種別成長 (期待値)
    if (m.jobKey === 'BUSHI') { m.minDmg += 2; m.maxDmg += 3; m.ac -= 0.5; }
    else if (m.jobKey === 'ONMYOJI') { m.minDmg += 1; m.maxDmg += 2; m.ac -= 0.2; }
    else if (m.jobKey === 'NISOU') { m.minDmg += 1; m.maxDmg += 1; m.ac -= 0.3; }
  }
  return m;
}

// --- Combat Logic ---
function simulateBattle(party, enemy) {
  let p = party.map(m => ({ ...m }));
  let e = { ...enemy };
  let rounds = 0;

  while (e.hp > 0 && p.some(m => m.hp > 0)) {
    rounds++;
    if (rounds > 100) break; 

    // Player Turn
    for (let i = 0; i < p.length; i++) {
      if (p[i].hp <= 0) continue;
      
      let action = 'ATTACK';
      let spellToUse = null;

      // 比丘尼の回復優先 (簡易AI)
      if (p[i].jobKey === 'NISOU' && p[i].mp >= 2) {
        const injured = p.find(m => m.hp > 0 && m.hp < m.maxHp * 0.5);
        if (injured) { 
          action = 'HEAL'; 
          spellToUse = SPELLS.NISOU.find(s => s.type === 'HEAL'); 
        }
      }
      
      if (action === 'HEAL' && spellToUse) {
        const heal = Math.floor((spellToUse.minHeal + spellToUse.maxHeal) / 2);
        const target = p.filter(m => m.hp > 0).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
        target.hp = Math.min(target.maxHp, target.hp + heal);
        p[i].mp -= spellToUse.mp;
      } else {
        const res = calculateHitAndDamage(p[i].ac, p[i].minDmg, p[i].maxDmg, e.ac);
        if (res.hit) e.hp -= res.damage;
      }
      if (e.hp <= 0) break;
    }
    if (e.hp <= 0) break;

    // Enemy Turn
    const aliveTargets = p.filter(m => m.hp > 0);
    const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    const res = calculateHitAndDamage(e.ac, e.minDmg, e.maxDmg, target.ac);
    if (res.hit) target.hp = Math.max(0, target.hp - res.damage);
  }

  return { won: e.hp <= 0, party: p, rounds };
}

// --- Full Game Simulation ---
function runOneGame() {
  let party = createInitialParty();
  let totalBattles = 0;
  let totalWipeouts = 0;
  let bossDefeated = false;
  let totalHumanTime = 0; 

  while (!bossDefeated && totalWipeouts < 30) { 
    // 探索フェーズ
    for (let s = 0; s < STEPS_TO_BOSS; s++) {
      totalHumanTime += 0.05 * (MOBILE_MODE ? MOBILE_FACTOR : 1);
      if (Math.random() < ENCOUNTER_CHANCE) {
        totalBattles++;
        totalHumanTime += 0.3 * (MOBILE_MODE ? MOBILE_FACTOR : 1);
        const lvSum = party.reduce((sum, m) => sum + m.lv, 0);
        const enemy = getRandomEnemy(lvSum);
        const res = simulateBattle(party, enemy);
        
        if (!res.won) {
          totalWipeouts++;
          totalHumanTime += 2.0;
          party = party.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp })); 
          break; 
        }
        
        party = res.party.map(m => {
          const gain = Math.floor(enemy.exp * balanceData.rates.expShare);
          return handleLevelUp({ ...m, exp: m.exp + gain });
        });
      }
    }

    if (bossDefeated) break;

    // ボス戦フェーズ
    const nueBase = enemiesData.find(e => e.id === 10);
    const nue = { ...nueBase, hp: (nueBase.minHp + nueBase.maxHp)/2 };
    totalHumanTime += 1.0;
    const bossRes = simulateBattle(party, nue);
    if (bossRes.won) {
      bossDefeated = true;
    } else {
      totalWipeouts++;
      totalHumanTime += 2.0;
      party = party.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, exp: getRequiredExp(m.lv) }));
    }
  }

  return { won: bossDefeated, wipeouts: totalWipeouts, lv: party[0].lv, battles: totalBattles, time: totalHumanTime };
}

// --- Run Simulation Loop ---
console.log(`\n--- 平安魔道伝 真・自動バランステスト v3.4 (${SIM_RUNS} 試行 ${MOBILE_MODE ? '[モバイル]' : '[PC]'}) ---`);
let stats = { won: 0, totalWipeouts: 0, totalLv: 0, totalBattles: 0, totalTime: 0 };

for (let i = 0; i < SIM_RUNS; i++) {
  const r = runOneGame();
  if (r.won) stats.won++;
  stats.totalWipeouts += r.wipeouts;
  stats.totalLv += r.lv;
  stats.totalBattles += r.battles;
  stats.totalTime += r.time;
}

const winRate = (stats.won / SIM_RUNS * 100).toFixed(1);
const avgWipeouts = (stats.totalWipeouts / SIM_RUNS).toFixed(1);
const avgLv = (stats.totalLv / SIM_RUNS).toFixed(1);
const avgBattles = (stats.totalBattles / SIM_RUNS).toFixed(1);
const avgTime = (stats.totalTime / SIM_RUNS).toFixed(1);

let verdict = '雅 (Normal)';
if (winRate < 50) verdict = '修羅 (Hard)';
if (winRate < 10) verdict = '奈落 (Brutal)';
if (winRate > 90 && avgWipeouts < 1) verdict = '緩 (Easy)';

console.log(`\n[バランスKPI結果報告]`);
console.log(`● ボス討伐成功率: ${winRate}%`);
console.log(`● 平均転生(全滅)回数: ${avgWipeouts}回`);
console.log(`● ボス到達平均Lv: ${avgLv}`);
console.log(`● 総遭遇戦闘数: ${avgBattles}回`);
console.log(`● 推定平均プレイ時間: ${avgTime}分`);
console.log(`● 均衡判決: 【${verdict}】`);
console.log(`\n--------------------------------------------`);

// --- Audit Final Judgment ---
let errors = [];
if (winRate < THRESHOLD.MIN_WIN_RATE) errors.push(`[不均衡] ボス討伐成功率が低すぎます (${winRate}% < ${THRESHOLD.MIN_WIN_RATE}%)`);
if (avgWipeouts > THRESHOLD.MAX_WIPEOUTS) errors.push(`[不均衡] 平均全滅回数が多すぎます (${avgWipeouts} > ${THRESHOLD.MAX_WIPEOUTS})`);
if (avgTime > THRESHOLD.MAX_PLAY_TIME) errors.push(`[不均衡] 推定プレイ時間が長すぎます (${avgTime}分 > ${THRESHOLD.MAX_PLAY_TIME}分)`);

if (errors.length > 0) {
  console.error(`\n❌ 都の自動検番により、不均衡が検地されました:`);
  errors.forEach(err => console.error(`  ${err}`));
  console.error(`\nデータ(JSON)の数値を調整し、平安の調和を保ってください。\n`);
  process.exit(1); 
} else {
  console.log(`\n✅ 都の自動検番: 均衡は保たれています。安泰なり。\n`);
}
