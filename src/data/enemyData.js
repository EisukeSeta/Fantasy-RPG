// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\enemyData.js

export const ENEMY_LIST = [
  { id: 1, name: 'SLIME', minHp: 4, maxHp: 8, ac: 10, minDmg: 1, maxDmg: 3, exp: 5, status: 'NORMAL' },
  { id: 2, name: 'GOBLIN', minHp: 8, maxHp: 15, ac: 8, minDmg: 2, maxDmg: 5, exp: 12, status: 'NORMAL' },
  { id: 3, name: 'SKELETON', minHp: 10, maxHp: 18, ac: 6, minDmg: 3, maxDmg: 7, exp: 20, status: 'NORMAL' },
  { id: 4, name: 'ORC', minHp: 15, maxHp: 25, ac: 5, minDmg: 4, maxDmg: 10, exp: 35, status: 'NORMAL' }
];

export const getRandomEnemy = () => {
  const index = Math.floor(Math.random() * ENEMY_LIST.length);
  const base = ENEMY_LIST[index];
  
  // HPをランダム決定
  const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
  
  return { ...base, hp, maxHp: hp };
};

// Wizardry風ダメージ計算と命中判定のモック
export const calculateHitAndDamage = (attackerAc, attackerMinDmg, attackerMaxDmg, defenderAc) => {
  // 命中判定 (ACが低いほど回避しやすい。1d20によるTRPG的計算)
  const roll = Math.floor(Math.random() * 20) + 1;
  const thac0 = 15; // To Hit Armor Class 0 (基準値)
  // 当たる条件: Roll >= THAC0 - DefenderAC
  // 例: THAC0=15, 敵AC=10 なら 5以上で命中。敵AC=5 なら 10以上で命中。
  const hitTarget = thac0 - defenderAc;
  const isHit = roll >= hitTarget || roll === 20; // 20はクリティカル(必中)
  
  if (!isHit && roll !== 20) {
    return { hit: false, damage: 0 };
  }
  
  // ダメージ計算
  const damage = Math.floor(Math.random() * (attackerMaxDmg - attackerMinDmg + 1)) + attackerMinDmg;
  return { hit: true, damage };
};
