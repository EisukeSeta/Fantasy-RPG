/**
 * 平安魔道伝 - バランステスター (Node.js用シミュレーター)
 * ゲームロジックを期待値ベースで実行し、バランスKPIを算出します。
 */

import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from '../src/data/enemyData.js';
import { SPELLS } from '../src/data/magicData.js';

// --- Emulator Settings ---
const SIM_RUNS = 1000; // 試行回数
const STEPS_TO_BOSS = 120; // ボスに到達するまでのおよその歩数（探索含む）
const ENCOUNTER_CHANCE = 0.15;

// --- EXP Table (Copied from App.jsx) ---
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

// --- Player Initial Stats ---
const createInitialParty = () => [
  { id: 'Tsu', name: '渡辺 綱', jobKey: 'SAMURAI', lv: 1, exp: 0, hp: 30, maxHp: 30, mp: 0, maxMp: 0, ac: 4, minDmg: 8, maxDmg: 15 },
  { id: 'Sei', name: '安倍 晴明', jobKey: 'ONMYOJI', lv: 1, exp: 0, hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4 },
  { id: 'Bik', name: '八百比丘尼', jobKey: 'NISOU', lv: 1, exp: 0, hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6 }
];

// --- Simulation Logic ---

function handleLevelUp(member) {
  let m = { ...member };
  while (m.exp >= getRequiredExp(m.lv + 1) && m.lv < 50) {
    m.lv += 1;
    const hpGain = (m.jobKey === 'SAMURAI' ? 8 : m.jobKey === 'NISOU' ? 5 : 3) + 2; // 平均値
    const mpGain = (m.jobKey === 'ONMYOJI' ? 6 : m.jobKey === 'NISOU' ? 4 : 2) + 1;
    m.maxHp += hpGain;
    m.maxMp += mpGain;
    if (m.jobKey === 'SAMURAI') {
        m.minDmg += 2; m.maxDmg += 4;
        m.ac -= 1;
    } else if (m.jobKey === 'ONMYOJI') {
        m.minDmg += 1; m.maxDmg += 2;
        if (m.lv % 2 === 0) m.ac -= 1;
    } else if (m.jobKey === 'NISOU') {
        m.minDmg += 1; m.maxDmg += 1;
        if (m.lv % 3 === 0) m.ac -= 1;
    }
  }
  m.hp = m.maxHp;
  m.mp = m.maxMp;
  return m;
}

function simulateBattle(party, enemy) {
  let p = party.map(m => ({ ...m }));
  let e = { ...enemy };
  let rounds = 0;

  while (e.hp > 0 && p.some(m => m.hp > 0)) {
    rounds++;
    if (rounds > 50) break; // 無限ループ防止

    // Player Turn
    for (let i = 0; i < p.length; i++) {
      if (p[i].hp <= 0) continue;
      
      // Simple AI
      let action = 'ATTACK';
      let spellToUse = null;

      // 比丘尼の回復優先
      if (p[i].jobKey === 'NISOU' && p[i].mp >= 1) {
        const injured = p.find(m => m.hp > 0 && m.hp < m.maxHp * 0.5);
        if (injured) {
            action = 'HEAL';
            spellToUse = SPELLS.NISOU[0]; // 甘露の雨
        }
      }
      
      if (action === 'HEAL' && spellToUse) {
        const heal = Math.floor((spellToUse.minHeal + spellToUse.maxHeal) / 2);
        const targetIndices = p.map((m, idx) => ({hpRatio: m.hp/m.maxHp, idx})).filter(o => p[o.idx].hp > 0).sort((a,b) => a.hpRatio - b.hpRatio);
        if (targetIndices.length > 0) {
            const target = p[targetIndices[0].idx];
            target.hp = Math.min(target.maxHp, target.hp + heal);
            p[i].mp -= spellToUse.mp;
        }
      } else {
        const result = calculateHitAndDamage(p[i].ac, p[i].minDmg, p[i].maxDmg, e.ac);
        if (result.hit) e.hp -= result.damage;
      }
      if (e.hp <= 0) break;
    }

    if (e.hp <= 0) break;

    // Enemy Turn
    const aliveMembers = p.filter(m => m.hp > 0);
    const target = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
    const result = calculateHitAndDamage(e.ac, e.minDmg, e.maxDmg, target.ac);
    if (result.hit) {
      target.hp = Math.max(0, target.hp - result.damage);
    }
  }

  const won = e.hp <= 0;
  return { won, party: p, rounds };
}

function runOneSimulation() {
  let party = createInitialParty();
  let totalBattles = 0;
  let dead = false;

  for (let s = 0; s < STEPS_TO_BOSS; s++) {
    if (Math.random() < ENCOUNTER_CHANCE) {
      totalBattles++;
      const playerLvSum = party.reduce((sum, m) => sum + m.lv, 0);
      const enemy = getRandomEnemy(playerLvSum);
      const result = simulateBattle(party, enemy);
      
      if (!result.won) {
        dead = true;
        break;
      }
      
      // Gain EXP
      party = result.party.map(m => {
        const gain = Math.floor(enemy.exp * (enemy.expShare[m.jobKey.toLowerCase()] || 0.33));
        let nextM = { ...m, exp: m.exp + gain };
        return handleLevelUp(nextM);
      });
    }
  }

  if (dead) return { result: 'DEAD_IN_EXPLORATION', lv: party[0].lv, battles: totalBattles, partyStatus: party.map(m => `${m.name}(Lv${m.lv})`).join(', ') };

  // Boss Fight
  const nue = ENEMY_LIST.find(e => e.id === 10);
  const bossResult = simulateBattle(party, { ...nue, hp: (nue.minHp + nue.maxHp)/2 });

  if (bossResult.won) {
    return { result: 'WIN', lv: party[0].lv, battles: totalBattles, partyStatus: party.map(m => `${m.name}(Lv${m.lv})`).join(', ') };
  } else {
    return { result: 'DEAD_AT_BOSS', lv: party[0].lv, battles: totalBattles, partyStatus: party.map(m => `${m.name}(Lv${m.lv})`).join(', ') };
  }
}

// --- Run Main Loop ---
console.log(`\n--- 平安魔道伝 バランステスト実行中 (${SIM_RUNS} 試行) ---`);
let stats = { WIN: 0, DEAD_IN_EXPLORATION: 0, DEAD_AT_BOSS: 0, totalLv: 0, totalBattles: 0 };

for (let i = 0; i < SIM_RUNS; i++) {
  const r = runOneSimulation();
  stats[r.result]++;
  stats.totalLv += r.lv;
  stats.totalBattles += r.battles;
}

const winRate = (stats.WIN / SIM_RUNS * 100).toFixed(1);
const explorationDeathRate = (stats.DEAD_IN_EXPLORATION / SIM_RUNS * 100).toFixed(1);
const bossDeathRate = (stats.DEAD_AT_BOSS / SIM_RUNS * 100).toFixed(1);
const avgLv = (stats.totalLv / SIM_RUNS).toFixed(1);
const avgBattles = (stats.totalBattles / SIM_RUNS).toFixed(1);
const estTime = (avgBattles * 0.4 + STEPS_TO_BOSS * 0.03).toFixed(1); // 分単位。1戦25秒, 1歩2秒弱換算

console.log(`\n[バランスKPI結果]`);
console.log(`● クリア成功率: ${winRate}%`);
console.log(`● 道中死亡率:   ${explorationDeathRate}%`);
console.log(`● ボス敗北率:   ${bossDeathRate}%`);
console.log(`● 到達平均Lv:   ${avgLv}`);
console.log(`● 平均エンカウント数: ${avgBattles}回`);
console.log(`● 推定プレイ時間: ${estTime}分`);
console.log(`\n--------------------------------------------`);
