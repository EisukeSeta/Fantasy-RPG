import { describe, it, expect } from 'vitest';
import { resolveInitialState } from '../utils/stateResolver';

describe('都の起動：状態解決の理 (State Resolver Logic) - Flag Based', () => {
  
  const mockDefault = {
    gameState: 'TITLE',
    party: [
      { name: '渡辺 綱', hp: 100 },
      { name: '安倍 晴明', hp: 80 }
    ],
    messages: [{ text: 'Default Message' }],
    playerState: { x: 0, y: 0 },
    activeBattlerIndex: null
  };

  const mockSaved = {
    gameState: 'EXPLORING',
    playerState: { x: 5, y: 5 },
    party: [{ name: 'Saved Hero', hp: 50 }]
  };

  it('強行合戦: ?start_battle=true の場合、最優先で合戦場へ転移すること', () => {
    const result = resolveInitialState({
      search: '?start_battle=true&skip_intro=true', // 両方あっても合戦優先
      savedData: mockSaved,
      defaultState: mockDefault
    });

    expect(result.gameState).toBe('BATTLE');
    expect(result.enemy.name).toBe('鼠僧正');
    // 重要課題: 最初の行動者がセットされていること
    expect(result.activeBattlerIndex).toBe(0); 
    expect(result.messages[0].text).toContain('強行合戦を開始します');
    expect(result.injectedFromDebug).toBe(true);
  });

  it('中略: ?skip_intro=true の場合、社（0,0）から開始すること', () => {
    const result = resolveInitialState({
      search: '?skip_intro=true',
      savedData: mockSaved,
      defaultState: mockDefault
    });

    expect(result.gameState).toBe('EXPLORING');
    expect(result.playerState.x).toBe(0);
    expect(result.playerState.y).toBe(0);
    expect(result.injectedFromDebug).toBe(true);
  });

  it('過去の記憶: フラグがない場合、保存データを優先すること', () => {
    const result = resolveInitialState({
      search: '',
      savedData: mockSaved,
      defaultState: mockDefault
    });

    expect(result.gameState).toBe('EXPLORING');
    expect(result.playerState.x).toBe(5);
    expect(result.party[0].name).toBe('Saved Hero');
    expect(result.injectedFromDebug).toBe(false);
  });

  it('聖典の掟: 廃止された seed パラメータを完全に無視すること', () => {
    const result = resolveInitialState({
      search: '?seed=combat_test',
      savedData: null,
      defaultState: mockDefault
    });

    // seed は無視されるため、デフォルト（TITLE）になるはず
    expect(result.gameState).toBe('TITLE');
    expect(result.injectedFromDebug).toBe(false);
  });

  it('天地開闢: 何も指定がない場合は TITLE 画面になること', () => {
    const result = resolveInitialState({
      search: '',
      savedData: null,
      defaultState: mockDefault
    });

    expect(result.gameState).toBe('TITLE');
    expect(result.activeBattlerIndex).toBe(null);
  });

});
