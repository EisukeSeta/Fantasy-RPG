/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';
import SoundEngine from '../utils/SoundEngine';
import { isDebug } from '../constants/gameData';

const AudioContext = createContext();

/**
 * 都の「魂の調べ（音響システム）」を司る Provider。
 */
export const AudioProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(isDebug);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    SoundEngine.setMuted(nextMuted);
  }, [isMuted]);

  const value = {
    isMuted,
    setIsMuted,
    toggleMute
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

/**
 * 音響状態のフック
 */
export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
