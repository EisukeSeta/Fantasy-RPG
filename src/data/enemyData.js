// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\enemyData.js
import Enemies from './Enemies.json';

export const ENEMY_LIST = Enemies;

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
