export const ENEMY_LIST = [
  { id: 1, name: '餓鬼 (Gaki)', lv: 1, minHp: 8, maxHp: 12, ac: 8, minDmg: 1, maxDmg: 3, exp: 6, expShare: { samurai: 0.2, onmyoji: 0.2, nisou: 0.6 } },
  { id: 2, name: '骸骨武者 (Skeleton)', lv: 2, minHp: 15, maxHp: 22, ac: 6, minDmg: 3, maxDmg: 6, exp: 12, expShare: { samurai: 0.7, onmyoji: 0.2, nisou: 0.1 } },
  { id: 3, name: '土蜘蛛 (Tsuchigumo)', lv: 4, minHp: 30, maxHp: 45, ac: 7, minDmg: 4, maxDmg: 9, exp: 30, expShare: { samurai: 0.2, onmyoji: 0.7, nisou: 0.1 } },
  { id: 4, name: 'ぬえ (Nue)', lv: 7, minHp: 60, maxHp: 80, ac: 4, minDmg: 8, maxDmg: 15, exp: 100, expShare: { samurai: 0.4, onmyoji: 0.4, nisou: 0.2 }, isBoss: true },
  { id: 5, name: '酒呑童子 (Shuten-dōji)', lv: 15, minHp: 200, maxHp: 300, ac: 1, minDmg: 15, maxDmg: 35, exp: 600, expShare: { samurai: 0.3, onmyoji: 0.4, nisou: 0.3 }, isBoss: true }
];

export const getRandomEnemy = (playerLvSum = 3) => {
    // レベルに応じたエンカウント（ボスは除外）
    const normalEnemies = ENEMY_LIST.filter(e => !e.isBoss && e.lv <= (playerLvSum / 2));
    const list = normalEnemies.length > 0 ? normalEnemies : [ENEMY_LIST[0]];
    const base = list[Math.floor(Math.random() * list.length)];
    const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
    return { ...base, hp, maxHp: hp };
};

export const calculateHitAndDamage = (attackerAc, attackerMinDmg, attackerMaxDmg, defenderAc) => {
    // 物理命中判定：20面ダイス (Wizardry/AD&D風)
    const roll = Math.floor(Math.random() * 20) + 1;
    // ACが低いほど当たりにくい。クリティカルは20
    const hitTarget = 12 - defenderAc; 
    const isHit = roll >= hitTarget || roll === 20;
    
    if (!isHit && roll !== 20) {
        return { hit: false, damage: 0 };
    }
    
    const damage = Math.floor(Math.random() * (attackerMaxDmg - attackerMinDmg + 1)) + attackerMinDmg;
    return { hit: true, damage };
};
