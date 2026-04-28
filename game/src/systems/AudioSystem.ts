// Procedural SFX via Web Audio API — no external files needed.

type OscType = OscillatorType;

class AudioSystem {
  private ctx: AudioContext | null = null;
  private _sfxVol = 0.4;
  private _bgmVol = 0.2;

  private get ac(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscType = 'sine', vol = 1, delay = 0): void {
    const ac = this.ac;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(this._sfxVol * vol, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  }

  private sweep(f0: number, f1: number, dur: number, type: OscType = 'sine', vol = 1, delay = 0): void {
    const ac = this.ac;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(f0, ac.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + delay + dur);
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(this._sfxVol * vol, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + dur + 0.01);
  }

  playSwap(): void {
    this.sweep(350, 550, 0.09, 'sine', 0.5);
  }

  playInvalid(): void {
    this.tone(140, 0.12, 'sawtooth', 0.45);
    this.tone(110, 0.12, 'sawtooth', 0.45, 0.1);
  }

  playMatch(): void {
    this.tone(523, 0.14, 'square', 0.35);       // C5
    this.tone(659, 0.14, 'square', 0.35, 0.08); // E5
    this.tone(784, 0.18, 'square', 0.35, 0.16); // G5
  }

  playCombo(): void {
    this.tone(784,  0.10, 'square', 0.5);
    this.tone(988,  0.10, 'square', 0.5, 0.06);
    this.tone(1175, 0.14, 'square', 0.5, 0.12);
    this.tone(1568, 0.18, 'square', 0.5, 0.18);
  }

  playExpand(): void {
    this.sweep(180, 900, 0.4, 'sawtooth', 0.4);
    this.tone(1047, 0.3, 'square', 0.3, 0.38);
  }

  playGameOver(): void {
    this.sweep(440, 110, 0.9, 'sine', 0.6);
    this.tone(110, 0.6, 'sawtooth', 0.3, 0.3);
  }

  get sfxVolume(): number { return this._sfxVol; }
  get bgmVolume(): number { return this._bgmVol; }
  setSfxVolume(v: number): void { this._sfxVol = Math.max(0, Math.min(1, v)); }
  setBgmVolume(v: number): void { this._bgmVol = Math.max(0, Math.min(1, v)); }
}

export const audioSystem = new AudioSystem();
