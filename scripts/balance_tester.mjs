/**
 * 平安魔道伝 - バランステスター (Node.js用シミュレーター)
 * ゲームロジックを期待値ベースで高速実行し、バランスKPIを算出します。
 */

import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from '../src/data/enemyData.js';
import { SPELLS } from '../src/data/magicData.js';
import balanceData from '../src/data/Balance.json' with { type: 'json' };
import charactersData from '../src/data/Characters.json' with { type: 'json' };
import enemiesData from '../src/data/Enemies.json' with { type: 'json' };

// --- Emulator Settings ---
const SIM_RUNS = 1000; // 試行回数
const STEPS_TO_BOSS = 100; // ボスに到達するまでのおよその探索歩数
const ENCOUNTER_CHANCE = balanceData.rates.encounter;

// --- EXP Table (Sync with App.jsx) ---
const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv <= balanceData.experience.baseTable.length) return balanceData.experience.baseTable[lv - 1];
  const { sigmoidScale, sigmoidCenter, sigmoidSlope } = balanceData.experience;
  const x = (lv - 1) / 49;
  const sigmoid = 1 / (1 + Math.exp(-sigmoidSlope * (x - sigmoidCenter)));
  return Math.floor(sigmoidScale * sigmoid);
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
    // 攻撃力の伸び（App.jsxに準拠または期待値）
    if (m.name.includes('綱')) { m.minDmg += 2; m.maxDmg += 3; m.ac -= 0.5; }
    else if (m.name.includes('晴明')) { m.minDmg += 1; m.maxDmg += 2; m.ac -= 0.2; }
    else { m.minDmg += 1; m.maxDmg += 1; m.ac -= 0.3; }
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
      if (p[i].name.includes('比丘尼') && p[i].mp >= 2) {
        const injured = p.find(m => m.hp > 0 && m.hp < m.maxHp * 0.6);
        if (injured) { action = 'HEAL'; spellToUse = SPELLS.NISOU.find(s => s.name === '甘露の雨'); }
      }
      
      if (action === 'HEAL' && spellToUse) {
        const heal = Math.floor((spellToUse.minHeal + spellToUse.maxHeal) / 2);
        const target = p.filter(m => m.hp > 0).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
        target.hp = Math.min(target.maxHp, target.hp + heal);
        p[i].mp -= spellToUse.mp;
      } else {
        const result = calculateHitAndDamage(p[i].ac, p[i].minDmg, p[i].maxDmg, e.ac);
        if (result.hit) e.hp -= result.damage;
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
  let totalHumanTime = 0; // 分換算

  while (!bossDefeated && totalWipeouts < 20) { // 最大20回まで転生
    // 探索フェーズ
    for (let s = 0; s < STEPS_TO_BOSS; s++) {
      totalHumanTime += 0.05; // 1歩 3秒換算 (分)
      if (Math.random() < ENCOUNTER_CHANCE) {
        totalBattles++;
        totalHumanTime += 0.3; // 戦闘思考時間 20秒換算
        const lvSum = party.reduce((sum, m) => sum + m.lv, 0);
        const enemy = getRandomEnemy(lvSum);
        const res = simulateBattle(party, enemy);
        
        if (!res.won) {
          totalWipeouts++;
          totalHumanTime += 2.0; // 全滅から復帰して歩き直す時間
          // 転生の理: HP/MP 1 で井戸に戻り、社で全快(1,1に歩くのを想定)
          party = party.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp })); 
          break; // 探索やり直し
        }
        
        // 勝利: 経験値獲得
        party = res.party.map(m => {
          const gain = Math.floor(enemy.exp * balanceData.rates.expShare);
          return handleLevelUp({ ...m, exp: m.exp + gain });
        });
      }
    }

    // ボス戦フェーズ
    const nueBase = enemiesData.find(e => e.id === 10);
    const nue = { ...nueBase, hp: (nueBase.minHp + nueBase.maxHp)/2 };
    totalHumanTime += 1.0; // ボス演出時間
    const bossRes = simulateBattle(party, nue);
    if (bossRes.won) {
      bossDefeated = true;
    } else {
      totalWipeouts++;
      totalHumanTime += 2.0;
      party = party.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp }));
    }
  }

  return { won: bossDefeated, wipeouts: totalWipeouts, lv: party[0].lv, battles: totalBattles, time: totalHumanTime };
}

// --- Run Simulation Loop ---
console.log(`\n--- 平安魔道伝 真・自動バランステスト (${SIM_RUNS} 試行) ---`);
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
