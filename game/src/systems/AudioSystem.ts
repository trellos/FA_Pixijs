// Procedural SFX + vaporwave BGM via Web Audio API — no external files needed.

type OscType = OscillatorType;

// 104 BPM funk groove. Phrase = 4 chords × 16 sixteenth-notes = 64 steps.
const SIXTEENTH = 60 / 104 / 4; // seconds per sixteenth
const PHRASE = 64;
const STEPS_PER_CHORD = 16;

// Am – F – C – G. Each chord has a pad voicing, bass root, and a five-note
// pentatonic scale for both the bubble-picked guitar arpeggios and the
// staccato Axel-F-style synth lead.
const CHORDS: { pad: number[]; bass: number; scale: number[] }[] = [
  // Am
  { pad: [220.00, 261.63, 329.63], bass: 110.00, scale: [220.00, 261.63, 293.66, 329.63, 392.00] },
  // F
  { pad: [174.61, 220.00, 261.63], bass:  87.31, scale: [174.61, 220.00, 261.63, 293.66, 349.23] },
  // C
  { pad: [196.00, 261.63, 329.63], bass: 130.81, scale: [196.00, 261.63, 293.66, 329.63, 392.00] },
  // G (with B as colour tone)
  { pad: [196.00, 246.94, 293.66], bass:  98.00, scale: [196.00, 246.94, 293.66, 329.63, 392.00] },
];

// Funk bass groove (per chord, 16 sixteenths). 1 = root, 8 = octave, '.' = rest.
// JB-style: heavy on beat 1, octave pop in the middle, syncopated push.
//                                1   .   .   1   .   .   8   .    1   .   .   1   .   8   .   .
const BASS_PATTERN: (0 | 1 | 2)[] = [1, 0, 0, 1, 0, 0, 2, 0,   1, 0, 0, 1, 0, 2, 0, 0];

// Chicken-scratch rhythm guitar: muted 16ths, 1 = scratch hit, 0 = silent.
//                                   x   x   .   x   .   x   x   x    x   .   x   x   .   x   x   .
const SCRATCH_PATTERN: (0 | 1)[] = [1, 1, 0, 1, 0, 1, 1, 1,   1, 0, 1, 1, 0, 1, 1, 0];

// "Bubble picking" guitar arpeggio: scale-degree per 16th, -1 = rest.
// A flowing pentatonic run that wraps around the chord scale.
const PICK_PATTERN: number[] = [
  0, -1,  2,  4,  -1,  3,  -1,  2,    0, -1,  2,  4,   3, -1,  2, -1,
];

// Axel-F-flavoured staccato synth lead — sparse, syncopated punches that
// land on the funk pushes. d = scale-degree, oct multiplier of base scale.
type Hit = { d: number; oct: number } | null;
const LEAD_PATTERN: Hit[] = [
  // Am bar — riff opens on the &-of-1 push
  null, null, { d: 0, oct: 2 }, null,    { d: 2, oct: 2 }, null, null, { d: 4, oct: 2 },
  null, { d: 3, oct: 2 }, null, null,    { d: 2, oct: 2 }, null, { d: 0, oct: 2 }, null,
  // F bar — drops a step
  null, null, { d: 1, oct: 2 }, null,    null, { d: 3, oct: 2 }, null, { d: 2, oct: 2 },
  null, { d: 4, oct: 2 }, null, { d: 3, oct: 2 },   null, null, { d: 1, oct: 2 }, null,
  // C bar — climbs
  null, null, { d: 2, oct: 2 }, null,    { d: 4, oct: 2 }, null, { d: 3, oct: 2 }, null,
  { d: 2, oct: 2 }, null, { d: 0, oct: 3 }, null,   null, { d: 4, oct: 2 }, null, { d: 3, oct: 2 },
  // G bar — descending tag
  null, null, { d: 4, oct: 2 }, null,    { d: 3, oct: 2 }, null, { d: 2, oct: 2 }, null,
  { d: 1, oct: 2 }, null, null, { d: 0, oct: 2 },   null, null, null, null,
];

// Drum kit pattern (one bar = one chord = 16 sixteenths). 1 = hit.
//                              1  .  .  .  .  .  .  .   1  .  .  .  .  .  .  .
const KICK_PATTERN: (0|1)[] = [1, 0, 0, 0, 0, 0, 1, 0,   1, 0, 0, 0, 0, 0, 0, 1];
//                              .  .  .  .  1  .  .  .   .  .  .  .  1  .  .  .
const SNARE_PATTERN: (0|1)[] = [0, 0, 0, 0, 1, 0, 0, 0,  0, 0, 1, 0, 1, 0, 0, 0];
// Hi-hat: every 16th, with accents on the &
const HAT_ACCENT: number[] =   [0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7, 0.4, 0.7];

class AudioSystem {
  private ctx: AudioContext | null = null;
  private _sfxVol = 0.4;
  private _bgmVol = 0.2;

  // BGM state
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStart = 0;     // ac.currentTime of step 0
  private bgmStep = 0;      // next step to schedule

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
    const lookahead = 0.3;
    while (this.bgmStart + this.bgmStep * SIXTEENTH < ac.currentTime + lookahead) {
      const t = this.bgmStart + this.bgmStep * SIXTEENTH;
      this.scheduleStep(this.bgmStep, t);
      this.bgmStep++;
    }
  }

  private scheduleStep(step: number, t: number): void {
    const phraseStep = step % PHRASE;
    const stepInChord = phraseStep % STEPS_PER_CHORD;
    const chordIdx = Math.floor(phraseStep / STEPS_PER_CHORD);
    const chord = CHORDS[chordIdx];

    // Pad: thin sustained wash, refreshed each chord.
    if (stepInChord === 0) {
      this.padChord(chord.pad, t, SIXTEENTH * STEPS_PER_CHORD);
    }

    // Slap-style funk bass.
    const bassHit = BASS_PATTERN[stepInChord];
    if (bassHit !== 0) {
      const freq = chord.bass * (bassHit === 2 ? 2 : 1);
      // Slight swing: push the back-half 16ths a hair late for groove.
      const swing = (stepInChord % 2 === 1) ? SIXTEENTH * 0.08 : 0;
      this.slapBass(freq, t + swing, SIXTEENTH * 1.6);
    }

    // Chicken-scratch rhythm guitar (muted 16ths around the chord's 3rd/5th).
    if (SCRATCH_PATTERN[stepInChord]) {
      const swing = (stepInChord % 2 === 1) ? SIXTEENTH * 0.08 : 0;
      // Use the chord's mid-range tones to emulate a strummed muted chord.
      const tone = chord.pad[1] * 2; // octave up for guitar register
      this.chickenScratch(tone, t + swing, SIXTEENTH * 0.5);
    }

    // Bubble-picked clean-guitar arpeggio.
    const pickDeg = PICK_PATTERN[stepInChord];
    if (pickDeg >= 0) {
      const freq = chord.scale[pickDeg % chord.scale.length] * 2;
      this.bubblePick(freq, t, SIXTEENTH * 1.8);
    }

    // Axel-F-style staccato lead.
    const hit = LEAD_PATTERN[phraseStep];
    if (hit) {
      const freq = chord.scale[hit.d % chord.scale.length] * hit.oct;
      this.synthLead(freq, t, SIXTEENTH * 1.4);
    }

    // Drum kit.
    if (KICK_PATTERN[stepInChord])  this.kick(t);
    if (SNARE_PATTERN[stepInChord]) this.snare(t);
    this.hat(t, HAT_ACCENT[stepInChord]);
  }

  private padChord(freqs: number[], t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    // Thinner pad — the funk rhythm carries the song. Single saw per voice.
    for (const f of freqs) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;

      const lpf = ac.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.value = 700;
      lpf.Q.value = 1.0;

      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.6);
      g.gain.linearRampToValueAtTime(0.025, t + dur - 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);

      o.connect(lpf); lpf.connect(g); g.connect(this.bgmGain);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  // Slap-style funk bass: punchy attack, fast filter snap, sub-sine layer.
  private slapBass(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const sub = ac.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq;

    const saw = ac.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = freq;

    const sq = ac.createOscillator();
    sq.type = 'square';
    sq.frequency.value = freq * 2; // octave up adds slap zing

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    // Pluck-style filter snap: open hard, close fast for the "thump-pop".
    lpf.frequency.setValueAtTime(2200, t);
    lpf.frequency.exponentialRampToValueAtTime(220, t + dur * 0.8);
    lpf.Q.value = 6;

    const subG = ac.createGain();
    subG.gain.setValueAtTime(0.22, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const harmG = ac.createGain();
    harmG.gain.setValueAtTime(0, t);
    harmG.gain.linearRampToValueAtTime(0.18, t + 0.005);
    harmG.gain.exponentialRampToValueAtTime(0.001, t + dur);

    sub.connect(subG); subG.connect(this.bgmGain);
    saw.connect(lpf); sq.connect(lpf);
    lpf.connect(harmG); harmG.connect(this.bgmGain);

    sub.start(t); saw.start(t); sq.start(t);
    sub.stop(t + dur + 0.05); saw.stop(t + dur + 0.05); sq.stop(t + dur + 0.05);
  }

  // Chicken-scratch rhythm guitar: super-short, high-passed, gritty saw burst.
  private chickenScratch(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;

    const hpf = ac.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 1100;
    hpf.Q.value = 3;

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 4500;
    lpf.Q.value = 4;

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(hpf); hpf.connect(lpf); lpf.connect(g); g.connect(this.bgmGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Clean "bubble-picked" guitar — triangle through a soft bandpass with
  // a quick attack and medium decay so notes ring like fingerpicked single notes.
  private bubblePick(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;

    // Subtle 5th harmonic for body.
    const o2 = ac.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2.005;

    const bpf = ac.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = freq * 1.6;
    bpf.Q.value = 4;

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.10, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.04, t + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.001, t + dur);

    o.connect(bpf); bpf.connect(g); g.connect(this.bgmGain);
    o2.connect(g2); g2.connect(this.bgmGain);

    o.start(t); o2.start(t);
    o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  // Axel-F-style staccato synth lead: bright square + saw, snappy envelope.
  private synthLead(freq: number, t: number, dur: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;

    const sq = ac.createOscillator();
    sq.type = 'square';
    sq.frequency.value = freq;

    const sw = ac.createOscillator();
    sw.type = 'sawtooth';
    sw.frequency.value = freq * 1.005; // tiny detune

    const lpf = ac.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(4200, t);
    lpf.frequency.exponentialRampToValueAtTime(900, t + dur);
    lpf.Q.value = 5;

    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.005);
    g.gain.linearRampToValueAtTime(0.10, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    sq.connect(lpf); sw.connect(lpf); lpf.connect(g); g.connect(this.bgmGain);
    sq.start(t); sw.start(t);
    sq.stop(t + dur + 0.05); sw.stop(t + dur + 0.05);
  }

  // ── Drums ─────────────────────────────────────────────────────────────────

  private kick(t: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(this.bgmGain);
    o.start(t);
    o.stop(t + 0.18);
  }

  private snare(t: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    // Body tone + filtered noise burst.
    const tone = ac.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(220, t);
    tone.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    const tg = ac.createGain();
    tg.gain.setValueAtTime(0.08, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    tone.connect(tg); tg.connect(this.bgmGain);
    tone.start(t); tone.stop(t + 0.12);

    const dur = 0.14;
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hpf = ac.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 1500;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hpf); hpf.connect(ng); ng.connect(this.bgmGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  private hat(t: number, vel: number): void {
    if (!this.bgmGain) return;
    const ac = this.ac;
    const dur = 0.04;
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hpf = ac.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 7000;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.06 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hpf); hpf.connect(g); g.connect(this.bgmGain);
    src.start(t); src.stop(t + dur + 0.02);
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
