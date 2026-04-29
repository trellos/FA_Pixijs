// Procedural SFX + vaporwave BGM via Web Audio API — no external files needed.

type OscType = OscillatorType;

// 80 BPM. The full phrase is 4 chords × 8 eighth-notes = 32 steps.
const EIGHTH = 60 / 80 / 2; // seconds per eighth note
const PHRASE = 32;

// Am – F – C – G. For each chord we keep the pad voicing, a bass root,
// and a five-note scale used by the lead.
const CHORDS: { pad: number[]; bass: number; scale: number[] }[] = [
  // Am
  { pad: [220.00, 261.63, 329.63], bass: 110.00, scale: [220.00, 261.63, 293.66, 329.63, 392.00] },
  // F
  { pad: [174.61, 220.00, 261.63], bass:  87.31, scale: [174.61, 220.00, 261.63, 293.66, 349.23] },
  // C
  { pad: [196.00, 261.63, 329.63], bass: 130.81, scale: [196.00, 261.63, 293.66, 329.63, 392.00] },
  // G (with B as the colour tone)
  { pad: [196.00, 246.94, 293.66], bass:  98.00, scale: [196.00, 246.94, 293.66, 329.63, 392.00] },
];

// One entry per step in the 32-step phrase. null = rest.
// d = scale-degree index, oct = frequency multiplier (1 = base, 2 = octave up).
type Hit = { d: number; oct: number } | null;
const LEAD_PATTERN: Hit[] = [
  // Am
  null, null, { d: 4, oct: 2 }, null,   null, { d: 2, oct: 2 }, null, { d: 0, oct: 2 },
  // F
  null, { d: 1, oct: 2 }, null, { d: 3, oct: 2 },   null, null, { d: 2, oct: 2 }, null,
  // C
  null, null, { d: 0, oct: 2 }, null,   { d: 4, oct: 2 }, null, { d: 3, oct: 2 }, { d: 2, oct: 2 },
  // G
  null, { d: 3, oct: 2 }, null, null,   { d: 2, oct: 2 }, null, { d: 4, oct: 2 }, { d: 3, oct: 2 },
];

class AudioSystem {
  private ctx: AudioContext | null = null;
  private _sfxVol = 0.4;
  private _bgmVol = 0.2;

  // BGM state
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStart = 0;     // ac.currentTime of step 0
  private bgmStep = 0;      // next step to schedule
  private _distCurve: Float32Array | null = null;

  private get ac(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ── SFX primitives ────────────────────────────────────────────────────────

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

  // ── SFX (unchanged) ───────────────────────────────────────────────────────

  playSwap(): void { this.sweep(350, 550, 0.09, 'sine', 0.5); }

  playInvalid(): void {
    this.tone(140, 0.12, 'sawtooth', 0.45);
    this.tone(110, 0.12, 'sawtooth', 0.45, 0.1);
  }

  playTick(urgency: number): void {
    if (urgency > 0.7) this.tone(1200 + urgency * 400, 0.05, 'square', 0.35 + urgency * 0.2);
    else this.tone(880, 0.05, 'sine', 0.25);
  }

  playMatch(maxLen: number): void {
    if (maxLen >= 5) {
      this.tone(523,  0.22, 'square', 0.4);
      this.tone(659,  0.22, 'square', 0.4);
      this.tone(784,  0.22, 'square', 0.4);
      this.tone(988,  0.22, 'square', 0.35);
      this.tone(1047, 0.28, 'square', 0.3, 0.2);
    } else if (maxLen === 4) {
      this.tone(523, 0.14, 'square', 0.35);
      this.tone(659, 0.14, 'square', 0.35, 0.07);
      this.tone(784, 0.14, 'square', 0.35, 0.14);
      this.tone(988, 0.20, 'square', 0.35, 0.21);
    } else {
      this.tone(523, 0.14, 'square', 0.35);
      this.tone(659, 0.14, 'square', 0.35, 0.08);
      this.tone(784, 0.18, 'square', 0.35, 0.16);
    }
  }

  playCombo(maxLen: number): void {
    if (maxLen >= 5) {
      this.tone(131,  0.3,  'sawtooth', 0.25);
      this.tone(1175, 0.12, 'square', 0.5);
      this.tone(1319, 0.12, 'square', 0.5);
      this.tone(1568, 0.14, 'square', 0.5);
      this.tone(1760, 0.20, 'square', 0.45);
      this.tone(2093, 0.24, 'square', 0.4, 0.18);
    } else if (maxLen === 4) {
      this.tone(784,  0.10, 'square', 0.5);
      this.tone(988,  0.10, 'square', 0.5, 0.06);
      this.tone(1175, 0.12, 'square', 0.5, 0.12);
      this.tone(1568, 0.18, 'square', 0.5, 0.18);
    } else {
      this.tone(784,  0.10, 'square', 0.5);
      this.tone(988,  0.10, 'square', 0.5, 0.06);
      this.tone(1175, 0.14, 'square', 0.5, 0.12);
      this.tone(1568, 0.18, 'square', 0.5, 0.18);
    }
  }

  playExpand(): void {
    this.sweep(180, 900, 0.4, 'sawtooth', 0.4);
    this.tone(1047, 0.3, 'square', 0.3, 0.38);
  }

  playGameOver(): void {
    this.sweep(440, 110, 0.9, 'sine', 0.6);
    this.tone(110, 0.6, 'sawtooth', 0.3, 0.3);
  }

  // ── BGM ───────────────────────────────────────────────────────────────────

  startBgm(): void {
    if (this.bgmGain) return;
    const ac = this.ac;
    this.bgmGain = ac.createGain();
    this.bgmGain.gain.value = this._bgmVol;
    this.bgmGain.connect(ac.destination);

    this.bgmStart = ac.currentTime + 0.15;
    this.bgmStep = 0;

    this.scheduleAhead();
    this.bgmTimer = window.setInterval(() => this.scheduleAhead(), 120);
  }

  stopBgm(): void {
    if (this.bgmTimer != null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain && this.ctx) {
      const ac = this.ctx;
      const g = this.bgmGain;
      g.gain.cancelScheduledValues(ac.currentTime);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
      window.setTimeout(() => g.disconnect(), 500);
      this.bgmGain = null;
    }
  }

  private scheduleAhead(): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    const lookahead = 0.4;
    while (this.bgmStart + this.bgmStep * EIGHTH < ac.currentTime + lookahead) {
      const t = this.bgmStart + this.bgmStep * EIGHTH;
      this.scheduleStep(this.bgmStep, t);
      this.bgmStep++;
    }
  }

  private scheduleStep(step: number, t: number): void {
    const phraseStep = step % PHRASE;
    const stepInChord = phraseStep % 8;
    const chordIdx = Math.floor(phraseStep / 8);
    const chord = CHORDS[chordIdx];

    // Pad: one long voicing per chord change.
    if (stepInChord === 0) {
      this.padChord(chord.pad, t, EIGHTH * 8);
    }

    // Bass: sub thump every quarter note (every 2 eighths).
    if (stepInChord % 2 === 0) {
      const isDownbeat = stepInChord === 0 || stepInChord === 4;
      this.bassNote(chord.bass * (isDownbeat ? 1 : 1), t, EIGHTH * 1.85);
      // Octave ghost on the back-half of each chord.
      if (stepInChord === 4) this.bassNote(chord.bass * 2, t, EIGHTH * 1.6);
    }

    // Guitar lead: from the static melody.
    const hit = LEAD_PATTERN[phraseStep];
    if (hit) {
      const freq = chord.scale[hit.d % chord.scale.length] * hit.oct;
      this.guitarNote(freq, t, EIGHTH * 1.5);
    }

    // Hi-hat-ish noise tick on offbeats for movement.
    if (stepInChord % 2 === 1) {
      this.noiseTick(t, 0.05);
    }
  }

  private padChord(freqs: number[], t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    for (const f of freqs) {
      // Two detuned saws per voice for a thick chorused pad.
      for (const detune of [-0.006, 0.006]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f * (1 + detune);

        const lpf = ac.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 950;
        lpf.Q.value = 1.5;

        const g = ac.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.5);
        g.gain.linearRampToValueAtTime(0.04, t + dur - 0.5);
        g.gain.linearRampToValueAtTime(0, t + dur);

        o.connect(lpf); lpf.connect(g); g.connect(this.bgmGain);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }

  private bassNote(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const sine = ac.createOscillator();
    sine.type = 'sine';
    sine.frequency.value = freq;

    const saw = ac.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = freq;

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(900, t);
    lpf.frequency.exponentialRampToValueAtTime(180, t + dur);

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    sine.connect(g);
    saw.connect(lpf); lpf.connect(g);
    g.connect(this.bgmGain);

    sine.start(t); saw.start(t);
    sine.stop(t + dur + 0.05); saw.stop(t + dur + 0.05);
  }

  private guitarNote(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(3200, t);
    lpf.frequency.exponentialRampToValueAtTime(420, t + dur);
    lpf.Q.value = 6;

    const dist = ac.createWaveShaper();
    dist.curve = this.distortionCurve as Float32Array<ArrayBuffer>;
    dist.oversample = '2x';

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(lpf); lpf.connect(dist); dist.connect(g); g.connect(this.bgmGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseTick(t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hpf = ac.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 6000;
    const g = ac.createGain();
    g.gain.value = 0.05;
    src.connect(hpf); hpf.connect(g); g.connect(this.bgmGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private get distortionCurve(): Float32Array {
    if (this._distCurve) return this._distCurve;
    const n = 1024;
    const c = new Float32Array(new ArrayBuffer(n * 4));
    const k = 12;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      c[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    this._distCurve = c;
    return c;
  }

  // ── Volume ────────────────────────────────────────────────────────────────

  get sfxVolume(): number { return this._sfxVol; }
  get bgmVolume(): number { return this._bgmVol; }
  setSfxVolume(v: number): void { this._sfxVol = Math.max(0, Math.min(1, v)); }
  setBgmVolume(v: number): void {
    this._bgmVol = Math.max(0, Math.min(1, v));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(this._bgmVol, this.ctx.currentTime);
    }
  }
}

export const audioSystem = new AudioSystem();
