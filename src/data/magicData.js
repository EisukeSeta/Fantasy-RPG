// C:\Win_tools\Antigravity\Fantasy-RPG\src\data\magicData.js

export const SPELLS = {
  SEIMEI: [ // 陰陽師・安倍晴明（攻撃・式神の術）
    { id: 'S1', name: '火鼠', type: 'ATTACK', mp: 1, minDmg: 2, maxDmg: 8, target: 'SINGLE', desc: '敵1体に火球ダメージ' },
    { id: 'S2', name: '白虎', type: 'ATTACK', mp: 2, minDmg: 5, maxDmg: 18, target: 'SINGLE', desc: '白虎の爪による斬撃' },
    { id: 'S3', name: '千里眼', type: 'FIELD', mp: 1, target: 'NONE', desc: '現在地を表示' },
    { id: 'S4', name: '呪縛', type: 'STATUS', mp: 2, status: 'SLEEP', target: 'SINGLE', desc: '敵を睡眠状態にする' },
    { id: 'S5', name: '五芒星', type: 'ATTACK', mp: 4, minDmg: 10, maxDmg: 30, target: 'ALL', desc: '敵全体に大ダメージ' }
  ],
  BIKUNI: [ // 尼僧・八百比丘尼（回復・慈悲の祈り）
    { id: 'B1', name: '甘露', type: 'HEAL', mp: 1, minHeal: 4, maxHeal: 12, target: 'SINGLE', desc: '味方1人のHPを回復' },
    { id: 'B2', name: '金剛', type: 'BUFF', mp: 1, acBonus: 2, target: 'SINGLE', desc: '味方1人のACを下げる' },
    { id: 'B3', name: '灯明', type: 'FIELD', mp: 1, target: 'NONE', desc: '周囲を明るく照らす' },
    { id: 'B4', name: '薬師', type: 'HEAL', mp: 4, minHeal: 20, maxHeal: 50, target: 'SINGLE', desc: '味方のHPを大幅に回復' },
    { id: 'B5', name: '不動', type: 'ATTACK', mp: 2, minDmg: 4, maxDmg: 15, target: 'SINGLE', desc: '聖なる炎で敵打倒' }
  ]
};
