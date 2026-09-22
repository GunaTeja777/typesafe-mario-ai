/**
 * Procedural Web Audio API sound & chiptune synthesizer
 * Zero external audio files required, 100% offline, ultra-low latency.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Music sequencer state
  private isMusicPlaying: boolean = false;
  private musicMode: 'normal' | 'rush' | 'starman' = 'normal';
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private timerId: number | null = null;

  constructor() {
    // Saved preferences
    const savedSfx = localStorage.getItem('audio_sfx');
    if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
    const savedMusic = localStorage.getItem('audio_music');
    if (savedMusic !== null) this.musicEnabled = savedMusic === 'true';
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.9 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.22 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      if (this.musicEnabled) {
        this.startMusic();
      }
    } catch {
      console.warn('Web Audio API not supported');
    }
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    localStorage.setItem('audio_sfx', String(enabled));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(enabled ? 0.9 : 0, this.ctx.currentTime);
    }
    if (this.ctx && this.ctx.state === 'suspended' && enabled) {
      this.ctx.resume();
    }
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    localStorage.setItem('audio_music', String(enabled));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(enabled ? 0.22 : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.init();
      if (!this.isMusicPlaying) this.startMusic();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  // Legacy compatibility for single sound button
  public setEnabled(enabled: boolean) {
    this.setSfxEnabled(enabled);
    this.setMusicEnabled(enabled);
  }

  public isEnabled(): boolean {
    return this.sfxEnabled || this.musicEnabled;
  }

  // ==========================================
  // PROCEDURAL 8-BIT SOUND EFFECTS
  // ==========================================

  public playJump(power: number = 1.0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const startFreq = 160 + power * 60;
    const endFreq = 380 + power * 120;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // Alias for backward compatibility
  public playFlap() {
    this.playJump(1.0);
  }

  public playStomp(comboIndex: number = 0) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Rising pitch based on combo streak!
    const pitches = [240, 320, 420, 560, 720, 960];
    const baseFreq = pitches[Math.min(comboIndex, pitches.length - 1)];

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.1);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  public playScore() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.07); // E6

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playPowerUp() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const freqs = [330, 392, 659, 523, 587, 784];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.05;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.11);
    });
  }

  public play1Up() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const notes = [330, 392, 659, 523, 587, 784, 1046];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.06;

      osc.type = 'square';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.13);
    });
  }

  public playPipe() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  public playFireball() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.09);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCrash() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;

    // Sub thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.18);

    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.exponentialRampToValueAtTime(90, t + 0.14);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
  }

  public playGameOver() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const notes = [
      { f: 523.25, d: 0.14 }, // C5
      { f: 392.00, d: 0.14 }, // G4
      { f: 329.63, d: 0.14 }, // E4
      { f: 440.00, d: 0.20 }, // A4
      { f: 493.88, d: 0.20 }, // B4
      { f: 466.16, d: 0.20 }, // Bb4
      { f: 440.00, d: 0.22 }, // A4
      { f: 392.00, d: 0.40 }  // G4
    ];

    let start = t;
    notes.forEach(n => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + n.d + 0.01);

      start += n.d;
    });
  }

  public playFanfare() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + idx * 0.08;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  public playClick() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  // ==========================================
  // PROCEDURAL 8-BIT CHIPTUNE BGM ENGINE
  // ==========================================

  public setMusicMode(mode: 'normal' | 'rush' | 'starman') {
    this.musicMode = mode;
  }

  private startMusic() {
    if (this.isMusicPlaying || !this.ctx) return;
    this.isMusicPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    this.scheduleMusicLoop();
  }

  private scheduleMusicLoop = () => {
    if (!this.isMusicPlaying || !this.ctx) return;

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playChiptuneStep(this.nextNoteTime);

      const tempo = this.musicMode === 'starman' ? 0.085 : this.musicMode === 'rush' ? 0.11 : 0.135;
      this.nextNoteTime += tempo;
      this.currentStep++;
    }

    this.timerId = window.setTimeout(this.scheduleMusicLoop, 50);
  };

  private playChiptuneStep(time: number) {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;

    let leadFreq = 0;
    let bassFreq = 0;

    if (this.musicMode === 'starman') {
      // High speed Starman arpeggios
      const starScale = [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 587.33, 659.25];
      const starBass = [261.63, 261.63, 329.63, 329.63, 392.00, 392.00, 261.63, 261.63];
      leadFreq = starScale[this.currentStep % starScale.length];
      bassFreq = starBass[Math.floor(this.currentStep / 2) % starBass.length];
    } else {
      // Classic lively Mario-style Overworld/Underground progression
      // 16-step melody pattern
      const melody = [
        659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0,
        783.99, 0, 0, 0, 392.00, 0, 0, 0,
        523.25, 0, 0, 392.00, 0, 0, 329.63, 0,
        440.00, 0, 493.88, 0, 466.16, 440.00, 392.00, 0
      ];
      const bass = [
        164.81, 0, 164.81, 0, 130.81, 0, 164.81, 0,
        196.00, 0, 196.00, 0, 98.00, 0, 98.00, 0,
        130.81, 0, 130.81, 0, 98.00, 0, 82.41, 0,
        110.00, 0, 123.47, 0, 116.54, 110.00, 98.00, 0
      ];
      leadFreq = melody[this.currentStep % melody.length];
      bassFreq = bass[this.currentStep % bass.length];
    }

    // Lead Voice (Square Wave)
    if (leadFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(leadFreq, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.09);
    }

    // Bass Voice (Triangle / Low Square)
    if (bassFreq > 0) {
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bassFreq, time);

      bGain.gain.setValueAtTime(0.12, time);
      bGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      bOsc.connect(bGain);
      bGain.connect(this.musicGain);

      bOsc.start(time);
      bOsc.stop(time + 0.1);
    }
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

export const sounds = new SoundEngine();
