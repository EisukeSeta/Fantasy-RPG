// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\enemyData.js

export const ENEMY_LIST = [
  { id: 1, name: '餓鬼', minHp: 4, maxHp: 8, ac: 9, minDmg: 2, maxDmg: 3, exp: 35, expShare: { samurai: 0.2, onmyoji: 0.3, nisou: 0.5 } }, 
  { id: 2, name: '骸骨', minHp: 10, maxHp: 18, ac: 7, minDmg: 4, maxDmg: 7, exp: 60, expShare: { samurai: 0.6, onmyoji: 0.2, nisou: 0.2 } },
  { id: 3, name: '鉄鼠', minHp: 8, maxHp: 15, ac: 8, minDmg: 3, maxDmg: 5, exp: 45, expShare: { samurai: 0.3, onmyoji: 0.5, nisou: 0.2 } },
  { id: 4, name: '人魂', minHp: 5, maxHp: 12, ac: 10, minDmg: 1, maxDmg: 6, exp: 40, expShare: { samurai: 0.1, onmyoji: 0.6, nisou: 0.3 } },
  { id: 5, name: '輪入道', minHp: 25, maxHp: 45, ac: 5, minDmg: 10, maxDmg: 20, exp: 180, expShare: { samurai: 0.5, onmyoji: 0.3, nisou: 0.2 } },
  { id: 6, name: '濡れ女', minHp: 20, maxHp: 35, ac: 6, minDmg: 8, maxDmg: 15, exp: 140, expShare: { samurai: 0.4, onmyoji: 0.2, nisou: 0.4 } },
  { id: 7, name: '青坊主', minHp: 30, maxHp: 50, ac: 4, minDmg: 12, maxDmg: 25, exp: 200, expShare: { samurai: 0.3, onmyoji: 0.5, nisou: 0.2 } },
  { id: 8, name: '土蜘蛛', minHp: 50, maxHp: 80, ac: 4, minDmg: 20, maxDmg: 40, exp: 450, expShare: { samurai: 0.6, onmyoji: 0.3, nisou: 0.1 } },
  { id: 9, name: '牛鬼', minHp: 100, maxHp: 180, ac: 2, minDmg: 40, maxDmg: 75, exp: 800, expShare: { samurai: 0.7, onmyoji: 0.2, nisou: 0.1 } },
  { id: 10, name: '鵺', minHp: 300, maxHp: 450, ac: 1, minDmg: 60, maxDmg: 120, exp: 3000, expShare: { samurai: 0.4, onmyoji: 0.4, nisou: 0.2 }, isBoss: true }
];

export const getRandomEnemy = (playerLvSum) => {
  // プレイヤーLvに応じて出現する敵の種類を絞る
  const availableEnemies = ENEMY_LIST.filter(enemy => {
    if (enemy.isBoss) return false;
    // Lv1-3: 餓鬼, 骸骨, 鉄鼠, 人魂
    if (playerLvSum <= 6) return enemy.id <= 4;
    // Lv4-10: 輪入道, 濡れ女, 青坊主
    if (playerLvSum <= 15) return enemy.id >= 3 && enemy.id <= 7;
    // それ以降
    return enemy.id >= 5 && enemy.id <= 9;
  });

  const base = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
  const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
  // レベルはプレイヤーに合わせて調整
  const lv = Math.max(1, Math.floor(playerLvSum / 3) + Math.floor(Math.random() * 3) - 1);
  
  return { ...base, hp, maxHp: hp, lv, status: '平安' };
};

export const calculateHitAndDamage = (atkAc, minDmg, maxDmg, defAc) => {
  // 古典的なRPG風: ACが低いほど当たりにくく、ダメージも減る
  const hitChance = Math.min(0.95, Math.max(0.1, 0.7 + (atkAc - defAc) * 0.05));
  const isHit = Math.random() < hitChance;
  
  if (!isHit) return { hit: false, damage: 0 };
  
  const baseDmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
  const damage = Math.max(1, Math.floor(baseDmg * (1 - (20 - defAc) * 0.02)));
  
  return { hit: true, damage };
};
