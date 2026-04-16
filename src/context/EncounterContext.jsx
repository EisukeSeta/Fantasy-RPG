/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';

const EncounterContext = createContext();

/**
 * 都の「遭遇と調伏（図録データ）」を司る Provider。
 * 足跡（encounteredEnemies）と戦果（defeatedEnemies）を記録する。
 */
export const EncounterProvider = ({ children }) => {
  const [encounteredEnemies, setEncounteredEnemies] = useState([]);
  const [defeatedEnemies, setDefeatedEnemies] = useState([]);

  const value = {
    encounteredEnemies,
    setEncounteredEnemies,
    defeatedEnemies,
    setDefeatedEnemies
  };

  return <EncounterContext.Provider value={value}>{children}</EncounterContext.Provider>;
};

/**
 * 図録データのフック
 */
export const useEncounter = () => {
  const context = useContext(EncounterContext);
  if (!context) {
    throw new Error('useEncounter must be used within an EncounterProvider');
  }
  return context;
};
