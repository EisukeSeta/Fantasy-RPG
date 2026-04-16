/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

const EffectContext = createContext();

/**
 * 都の「彩りと揺れ（視覚演出）」を司る Provider。
 * ダメージ演出や画面の揺れを一元管理する。
 */
export const EffectProvider = ({ children }) => {
  const [visualEffects, setVisualEffects] = useState([]); 
  const [flashColor, setFlashColor] = useState(null); 
  const [displayShake, setDisplayShake] = useState(null); 

  /**
   * 術式・打撃による視覚的影響を発生させる。
   */
  const triggerVisualEffect = useCallback((target, value, type, effectStyle = 'normal') => {
    const id = Date.now() + Math.random();
    setVisualEffects(prev => [...prev, { id, target, value, type }]);
    
    // 一定時間で効果を消滅させる (浄化)
    setTimeout(() => {
      setVisualEffects(prev => prev.filter(e => e.id !== id));
    }, 800);

    // ダメージ時の画面演出
    if (type === 'damage' && target.startsWith('party')) {
      setFlashColor('red');
      setTimeout(() => setFlashColor(null), 400);
      setDisplayShake(effectStyle === 'heavy' ? 'heavy' : 'normal');
      setTimeout(() => setDisplayShake(null), 400);
    } else if (type === 'damage' && target === 'enemy') {
      setDisplayShake('normal');
      setTimeout(() => setDisplayShake(null), 300);
    }
  }, []);

  const value = {
    visualEffects,
    flashColor,
    displayShake,
    triggerVisualEffect,
    setVisualEffects,
    setFlashColor,
    setDisplayShake
  };

  return <EffectContext.Provider value={value}>{children}</EffectContext.Provider>;
};

/**
 * 視覚演出のフック
 */
export const useEffects = () => {
  const context = useContext(EffectContext);
  if (!context) {
    throw new Error('useEffects must be used within an EffectProvider');
  }
  return context;
};
