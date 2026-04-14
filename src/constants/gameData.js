// src/constants/gameData.js

// Allies Images
import abeImg from '../assets/allies/abe_seimei.png';
import tsunaImg from '../assets/allies/watanabe_tsuna.png';
import yaobikuniImg from '../assets/allies/yaobikuni.png';

// Enemy Images
import gakiImg from '../assets/enemies/gaki.png';
import gaikotsuImg from '../assets/enemies/gaikotsu.png';
import tessatsuImg from '../assets/enemies/tessatsu.png';
import hitodamaImg from '../assets/enemies/hitodama.png';
import wanyudoImg from '../assets/enemies/wanyudo.png';
import nureonnaImg from '../assets/enemies/nureonna.png';
import aobozuImg from '../assets/enemies/aobozu.png';
import tsuchigumoImg from '../assets/enemies/tsuchigumo.png';
import ushioniImg from '../assets/enemies/ushioni.png';
import nueImg from '../assets/enemies/nue.png';

// Data Imports (JSON)

export const CHAR_IMAGES = { 
  "abe_seimei.png": abeImg, 
  "watanabe_tsuna.png": tsunaImg, 
  "yaobikuni.png": yaobikuniImg 
};

export const ENEMY_IMAGES = { 
  "gaki.png": gakiImg, 
  "gaikotsu.png": gaikotsuImg, 
  "tessatsu.png": tessatsuImg, 
  "hitodama.png": hitodamaImg, 
  "wanyudo.png": wanyudoImg, 
  "nureonna.png": nureonnaImg, 
  "aobozu.png": aobozuImg, 
  "tsuchigumo.png": tsuchigumoImg, 
  "ushioni.png": ushioniImg, 
  "nue.png": nueImg 
};

export const varGold = '#f0e68c';
export const ICON_MAPPING = { "shrine": "⛩️", "well": "井", "scroll": "📜" };

// 迷宮の理（定数定義）
export const MAP_WIDTH = 25;
export const MAP_HEIGHT = 21;
export const BOSS_POS = { x: 23, y: 19 };

/**
 * 【平安の理】ゲームバランス定数
 */
export const GAME_SETTINGS = {
  ENCOUNTER_RATE: 0.15,      // 遭遇率 (15%)
  LOG_CAPACITY: 30,          // 消息（ログ）の最大保持数
  
  // 演出の速度（ミリ秒）
  DELAYS: {
    VICTORY_BOSS: 1500,     // ボス調伏後の余韻
    VICTORY_NORMAL: 1200,   // 通常戦勝利後の余韻
    ENEMY_TURN: 500,        // 敵の反撃開始
    AUTO_BATTLE: 800,       // オートバトルの間隔
    SHAKE_DURATION: 300     // 震動の継続時間
  }
};

export const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true';

export const DIALOG_SPEAKERS = {
  "watanabe_tsuna": { name: "渡辺 綱", image: tsunaImg },
  "abe_seimei": { name: "安倍 晴明", image: abeImg },
  "yaobikuni": { name: "八百比丘尼", image: yaobikuniImg },
  "narrator": { name: null, image: null }
};
