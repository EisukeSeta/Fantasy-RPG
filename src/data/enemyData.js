// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\enemyData.js

export const ENEMY_LIST = [
  { id: 1, name: '餓鬼 (Gaki)', minHp: 5, maxHp: 10, ac: 9, minDmg: 1, maxDmg: 3, exp: 5, status: 'NORMAL' },
  { id: 2, name: '土蜘蛛 (Tsuchigumo)', minHp: 10, maxHp: 18, ac: 8, minDmg: 2, maxDmg: 5, exp: 12, status: 'NORMAL' },
  { id: 3, name: '骸骨武者 (Skeleton)', minHp: 15, maxHp: 25, ac: 6, minDmg: 4, maxDmg: 8, exp: 20, status: 'NORMAL' },
  { id: 4, name: 'ぬえ (Nue)', minHp: 24, maxHp: 40, ac: 5, minDmg: 6, maxDmg: 12, exp: 45, status: 'NORMAL' },
  { id: 5, name: '酒呑童子 (Shuten-dōji)', minHp: 60, maxHp: 100, ac: 3, minDmg: 10, maxDmg: 20, exp: 150, status: 'NORMAL' }
];

export const getRandomEnemy = () => {
    // 最初のうちは弱い魔物を出すロジック（後でレベル等に対応）
    const index = Math.floor(Math.random() * (ENEMY_LIST.length - 1)); // 酒呑童子以外
    const base = ENEMY_LIST[index];
    const hp = Math.floor(Math.random() * (base.maxHp - base.minHp + 1)) + base.minHp;
    return { ...base, hp, maxHp: hp };
};

export const calculateHitAndDamage = (attackerAc, attackerMinDmg, attackerMaxDmg, defenderAc) => {
    // 命中判定（ACが低いほど命中率ダウン）
    const roll = Math.floor(Math.random() * 20) + 1;
    const thac0 = 15; // To Hit Armor Class 0
    const hitTarget = thac0 - defenderAc;
    const isHit = roll >= hitTarget || roll === 20;
    
    if (!isHit && roll !== 20) {
        return { hit: false, damage: 0 };
    }
    
    const damage = Math.floor(Math.random() * (attackerMaxDmg - attackerMinDmg + 1)) + attackerMinDmg;
    return { hit: true, damage };
};
