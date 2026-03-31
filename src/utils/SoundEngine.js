/**
 * 平安音響合成エンジン (Heian Sound Engine)
 * Web Audio API を使用して、ファイル不要で平安ダークファンタジーの音響を生成します。
 */

class HeianSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.shoNodes = []; // 笙のクラスター和音用
    this.hichirikiOsc = null; // 糒篥の旋律用
    this.hichirikiGain = null;
    this.droneOsc = null; // 地鳴り用
    this.isStarted = false;
    this.currentMode = 'EXPLORING'; // EXPLORING, BATTLE, DEAD
  }

  /**
   * 初回のユーザー操作（クリック等）で呼び出し、AudioContextを有効化
   */
  init() {
    if (this.isStarted) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5; // 初期音量
      this.masterGain.connect(this.ctx.destination);
      
      this.setupSho();
      this.setupDrone();
      this.setupHichiriki();
      
      this.isStarted = true;
      this.transitionTo('EXPLORING');
      console.log('⛩️ 平安音響合成エンジン 起動成功');
    } catch (e) {
      console.error('音響エンジンの初期化に失敗しました:', e);
    }
  }

  /**
   * 笙 (Sho): クラスター和音のセットアップ
   */
  setupSho() {
    // 平安の響き（律・呂）に近い周波数構成
    const shoFreqs = [440, 493.88, 554.37, 659.25, 739.99, 830.61]; 
    shoFreqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // わずかな揺らぎ（鳳凰の羽ばたき）
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.5 + Math.random();
      lfoGain.gain.value = 2; // 周波数を数Hz揺らす
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      
      this.shoNodes.push({ osc, gain, baseGain: 0.05 + Math.random() * 0.05 });
    });
  }

  /**
   * 糒篥 (Hichiriki): リード系の旋律
   */
  setupHichiriki() {
    this.hichirikiOsc = this.ctx.createOscillator();
    this.hichirikiGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    this.hichirikiOsc.type = 'sawtooth'; // 鋭い音
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 10; // 共鳴

    this.hichirikiGain.gain.value = 0;
    
    // 呪術的なビブラート
    const vibLfo = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vibLfo.frequency.value = 5;
    vibGain.gain.value = 15;
    vibLfo.connect(vibGain);
    vibGain.connect(this.hichirikiOsc.frequency);
    vibLfo.start();

    this.hichirikiOsc.connect(filter);
    filter.connect(this.hichirikiGain);
    this.hichirikiGain.connect(this.masterGain);
    this.hichirikiOsc.start();
  }

  /**
   * 地鳴り (Drone): 超低域
   */
  setupDrone() {
    this.droneOsc = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = 55; // 低い「ラ」
    droneGain.gain.value = 0.1;
    this.droneOsc.connect(droneGain);
    droneGain.connect(this.masterGain);
    this.droneOsc.start();
  }

  /**
   * ゲームの状態に応じて音を変化させる
   * @param {string} mode - EXPLORING, BATTLE, DEAD
   */
  transitionTo(mode) {
    if (!this.isStarted) return;
    const now = this.ctx.currentTime;
    this.currentMode = mode;

    if (mode === 'EXPLORING') {
      // 笙を前面に、不気味な旋律を抑える
      this.shoNodes.forEach(node => {
        node.gain.gain.linearRampToValueAtTime(node.baseGain, now + 2);
      });
      this.hichirikiGain.gain.linearRampToValueAtTime(0.01, now + 2);
      // 旋律をゆっくり動かす
      this.playMelody(220, 4); 
    } 
    else if (mode === 'BATTLE') {
      // 笙を緊迫させ、糒篥を激しく動かす
      this.shoNodes.forEach(node => {
        node.gain.gain.linearRampToValueAtTime(node.baseGain * 1.5, now + 0.5);
      });
      this.hichirikiGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
      this.playBattleNotes();
    }
    else if (mode === 'DEAD') {
      // 静寂と超低音
      this.shoNodes.forEach(node => {
        node.gain.gain.linearRampToValueAtTime(0, now + 3);
      });
      this.hichirikiGain.gain.linearRampToValueAtTime(0, now + 3);
    }
  }

  /**
   * リード（糒篥）の旋律を制御
   */
  playMelody(freq, duration) {
    if (!this.isStarted || this.currentMode !== 'EXPLORING') return;
    const now = this.ctx.currentTime;
    this.hichirikiOsc.frequency.exponentialRampToValueAtTime(freq, now + duration);
    
    // 次の音を予約
    const nextFreqs = [220, 246.94, 277.18, 329.63, 369.99]; // 呂音階的
    setTimeout(() => {
      this.playMelody(nextFreqs[Math.floor(Math.random() * nextFreqs.length)], 3 + Math.random() * 4);
    }, duration * 1000);
  }

  playBattleNotes() {
    if (!this.isStarted || this.currentMode !== 'BATTLE') return;
    const now = this.ctx.currentTime;
    // 不協和音、急激なスライド
    const freq = 300 + Math.random() * 400;
    this.hichirikiOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.2);
    
    setTimeout(() => this.playBattleNotes(), 300 + Math.random() * 500);
  }

  setVolume(val) {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
  }
}

// シングルトンとしてエクスポート
const engine = new HeianSoundEngine();
export default engine;
