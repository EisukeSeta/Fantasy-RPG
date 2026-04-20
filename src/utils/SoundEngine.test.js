// src/utils/SoundEngine.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SoundEngine from './SoundEngine';
import { Logger } from './logger';

/**
 * 【音響の理】異常系・デバッグ挙動の検証
 */
describe('SoundEngine 異常系・デバッグテスト', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // browser env mock
    global.window = {
      location: { search: '' },
      Audio: vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn()
      }))
    };
  });

  it('debug=true 時、初期状態が消音 (muted) であること', () => {
    // URLパラメータのモック
    global.window.location.search = '?debug=true';
    
    // singleton なので、初期化をエミュレートするプロパティチェック
    // 注: 現状の SoundEngine の実装に合わせて調整が必要
    const engine = SoundEngine; 
    engine.init(); // URLパラメータを読み込んで初期化
    
    expect(engine.isMuted).toBe(true);
  });

  it('存在しない音源を再生しようとした際、isDebug=true かつ開発時なら Logger.impurity が呼ばれること', () => {
    global.window.location.search = '?debug=true';
    const impuritySpy = vi.spyOn(Logger, 'impurity');
    
    // 存在しないキーで再生
    SoundEngine.play('NON_EXISTENT_SOUND_XYZ');
    
    expect(impuritySpy).toHaveBeenCalled();
    expect(impuritySpy).toHaveBeenCalledWith('Sound', expect.stringContaining('Missing'), expect.anything());
  });

  it('isDebug=false (本番) の時は、音源がなくてもエラーを吐かずに続行すること', () => {
    global.window.location.search = '';
    const impuritySpy = vi.spyOn(Logger, 'impurity');
    
    // 存在しないキーで再生。エラーにならず、警告も出ないことを期待
    expect(() => {
      SoundEngine.play('NON_EXISTENT_SOUND_XYZ');
    }).not.toThrow();
    
    expect(impuritySpy).not.toHaveBeenCalled();
  });
});
