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
import balanceData from '../data/Balance.json';

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
export const BOSS_POS = balanceData.map.bossPos;

export const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true';

export const DIALOG_SPEAKERS = {
  "tsuna": { name: "渡辺 綱", image: tsunaImg },
  "seimei": { name: "安倍 晴明", image: abeImg },
  "yaobikuni": { name: "八百比丘尼", image: yaobikuniImg },
  "narrator": { name: null, image: null }
};
