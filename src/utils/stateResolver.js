import { getEncounterPatch } from '../logic/combat';

export const resolveInitialState = ({ search, savedData, defaultState, forceGameState }) => {
  const params = new URLSearchParams(search || "");
  const startBattle = params.get('start_battle') === 'true';
  const skipIntro = params.get('skip_intro') === 'true';
  
  if (startBattle) {
    const testEnemy = { id: 1, name: "鼠僧正", hp: 30, maxHp: 30, ac: 5, minDmg: 2, maxDmg: 5, exp: 20, drops: [] };
    const encounterPatch = getEncounterPatch(testEnemy, defaultState.party);
    
    return { ...defaultState, ...encounterPatch, gameState: 'BATTLE', activeBattlerIndex: 0, injectedFromDebug: true };
  }

  if (skipIntro) {
    return { ...defaultState, gameState: 'EXPLORING', playerState: { x: 0, y: 0, dir: 2 }, injectedFromDebug: true };
  }

  if (savedData) {
    return {
      ...defaultState,
      ...savedData,
      gameState: forceGameState || 'TITLE', // ここがカオスの原因となった力業の理
      status: '平安',
      activeBattlerIndex: null,
      injectedFromDebug: false
    };
  }

  return {
    ...defaultState,
    gameState: 'TITLE',
    activeBattlerIndex: null,
    injectedFromDebug: false
  };
};
