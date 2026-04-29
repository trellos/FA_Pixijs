import { Container, Graphics, FillGradient } from 'pixi.js';

// Animated synthwave/vaporwave backdrop: gradient sky, banded sun,
// twinkling stars, distant mountains, scrolling perspective grid.
export class SynthwaveBackground extends Container {
  private W = 0;
  private H = 0;
  private elapsed = 0;

  private sky = new Graphics();
  private mountains = new Graphics();
  private sun = new Graphics();
  private stars = new Graphics();
  private grid = new Graphics();

  private starData: { x: number; y: number; r: number; phase: number }[] = [];

  constructor(w: number, h: number) {
    super();
    this.addChild(this.sky);
    this.addChild(this.sun);
    this.addChild(this.stars);
    this.addChild(this.mountains);
    this.addChild(this.grid);
    this.resize(w, h);
  }

  private get horizonY(): number { return this.H * 0.55; }

  resize(w: number, h: number): void {
    if (w === this.W && h === this.H) return;
    this.W = w;
    this.H = h;
    this.drawSky();
    this.drawSun();
    this.drawMountains();
    this.spawnStars();
  }

  update(deltaMS: number): void {
    this.elapsed += deltaMS / 1000;
    this.drawGrid(this.elapsed);
    this.drawStars(this.elapsed);
  }

  private drawSky(): void {
    const W = this.W, H = this.H, hy = this.horizonY;
    this.sky.clear();

    const skyGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end:   { x: 0, y: hy },
      colorStops: [
        { offset: 0,    color: 0x0a0020 },
        { offset: 0.45, color: 0x4a1a6a },
        { offset: 0.85, color: 0xff2d9b },
        { offset: 1,    color: 0xff7c35 },
      ],
      textureSpace: 'global',
    });
    this.sky.rect(0, 0, W, hy).fill(skyGrad);

    const groundGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: hy },
      end:   { x: 0, y: H },
      colorStops: [
        { offset: 0, color: 0x180028 },
        { offset: 1, color: 0x05000a },
      ],
      textureSpace: 'global',
    });
    this.sky.rect(0, hy, W, H - hy).fill(groundGrad);
  }

  private drawSun(): void {
    const cx = this.W / 2;
    const cy = this.horizonY;
    const r = Math.min(this.W, this.H) * 0.20;

    this.sun.clear();
    const grad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: cy - r },
      end:   { x: 0, y: cy + r },
      colorStops: [
        { offset: 0,    color: 0xffe24a },
        { offset: 0.55, color: 0xff7c35 },
        { offset: 1,    color: 0xff2d9b },
      ],
      textureSpace: 'global',
    });
    this.sun.circle(cx, cy, r).fill(grad);

    // Horizontal bands cutting through the lower half of the sun.
    const bands = 7;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const yy = cy + r * 0.05 + t * r * 0.95;
      const h = Math.max(1.5, 5 - t * 3.5);
      this.sun.rect(cx - r, yy, r * 2, h).fill({ color: 0x0a0020 });
    }

    // Soft outer glow (radial-ish via stacked alpha rings).
    for (let i = 0; i < 4; i++) {
      this.sun.circle(cx, cy, r + 6 + i * 8)
        .stroke({ color: 0xff2d9b, width: 2, alpha: 0.10 - i * 0.02 });
    }
  }

  private drawMountains(): void {
    const W = this.W, baseY = this.horizonY;
    this.mountains.clear();

    const peaks = 14;
    this.mountains.moveTo(0, baseY);
    for (let i = 0; i <= peaks; i++) {
      const x = (i / peaks) * W;
      // Deterministic pseudo-random heights so they don't shift between draws.
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const r = seed - Math.floor(seed);
      const h = 8 + r * 26;
      this.mountains.lineTo(x, baseY - h);
    }
    this.mountains.lineTo(W, baseY).closePath()
      .fill({ color: 0x10001a, alpha: 0.85 });

    // Pink rim along the tops.
    this.mountains.moveTo(0, baseY);
    for (let i = 0; i <= peaks; i++) {
      const x = (i / peaks) * W;
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const r = seed - Math.floor(seed);
      const h = 8 + r * 26;
      this.mountains.lineTo(x, baseY - h);
    }
    this.mountains.stroke({ color: 0xff2d9b, width: 1, alpha: 0.5 });
  }

  private spawnStars(): void {
    this.starData = [];
    const n = 80;
    for (let i = 0; i < n; i++) {
      this.starData.push({
        x: Math.random() * this.W,
        y: Math.random() * (this.horizonY * 0.75),
        r: 0.4 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private drawStars(t: number): void {
    this.stars.clear();
    for (const s of this.starData) {
      const a = 0.5 + 0.5 * Math.sin(t * 1.8 + s.phase);
      this.stars.circle(s.x, s.y, s.r).fill({ color: 0xffffff, alpha: 0.35 + a * 0.5 });
    }
  }

  private drawGrid(t: number): void {
    const W = this.W, H = this.H, hy = this.horizonY;
    const groundH = H - hy;
    this.grid.clear();

    const cx = W / 2;
    const lineColor = 0xff2d9b;

    // Vertical lines fan out from the horizon vanishing point.
    const vCount = 18;
    for (let i = -vCount; i <= vCount; i++) {
      const xb = cx + (i / vCount) * W * 1.6;
      this.grid.moveTo(cx, hy).lineTo(xb, H)
        .stroke({ color: lineColor, width: 1, alpha: 0.55 });
    }

    // Scrolling horizontal lines — bunched near horizon, spread near viewer.
    const hCount = 14;
    const speed = 0.20; // cycles per second
    const phase = (t * speed) % 1;
    for (let i = 0; i < hCount; i++) {
      let p = (i + phase) / hCount;
      const persp = p * p; // perspective easing
      const yy = hy + persp * groundH;
      const a = 0.65 * Math.min(1, persp * 5);
      this.grid.moveTo(0, yy).lineTo(W, yy)
        .stroke({ color: lineColor, width: 1, alpha: a });
    }

    // Bright horizon line.
    this.grid.moveTo(0, hy).lineTo(W, hy)
      .stroke({ color: 0xff80c0, width: 2, alpha: 0.9 });
  }
}
