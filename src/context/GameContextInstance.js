import { createContext } from 'react';

/**
 * GameContext インスタンス。
 * Fast Refresh 警告を回避するため、Provider とは別に export する。
 */
export const GameContext = createContext();
