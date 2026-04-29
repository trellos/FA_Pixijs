import { Container, Graphics } from 'pixi.js';
import { animator } from './Animator';

/**
 * Vaporwave board-expand fanfare. A big rakish (sheared) triangle frame
 * slides diagonally across the screen — fast at the edges, lingering near
 * the centre but never fully stopping. While the triangle is on-screen the
 * area outside it is darkened (a "letterbox through a triangle" effect), so
 * the player's gaze is yanked through the rainbow corridor inside.
 *
 * Lifecycle:
 *   - Construct with the screen width/height.
 *   - Call play({ centerX, centerY, magnitude }) — returns a Promise that
 *     resolves when the effect has fully exited.
 */
export class RainbowSweepFrame extends Container {
  private readonly W: number;
  private readonly H: number;

  // Layered scene:
  //   darkRect           full-screen black fill, masked by triangle (inverse)
  //                      so the area OUTSIDE the triangle is opaque black and
  //                      the triangle itself is transparent.
  //   darkMask           triangle Graphics, used as inverse mask for darkRect.
  //   corridorGfx        rays + rungs, masked normally to the triangle.
  //   corridorMask       triangle Graphics, used as forward mask for corridor.
  //   edgeGfx            rainbow triangle outline, drawn on top (no mask).
  private readonly darkRect = new Graphics();
  private readonly darkMask = new Graphics();
  private readonly corridorGfx = new Graphics();
  private readonly corridorMask = new Graphics();
  private readonly edgeGfx = new Graphics();

  // Animation state.
  private travel = 0;       // 0 = entry off-screen, 1 = exit off-screen
  private alpha01 = 0;      // global opacity multiplier
  private maskAlpha = 0;    // strength of the dark mask (0..0.85)
  private flowPhase = 0;    // continuously incrementing for the rainbow flow

  // Per-play settings.
  private targetX = 0;
  private targetY = 0;
  private size = 1;
  private lineWidth = 6;
  private hueSpan = 360;
  private hueBase = 300;
  private dirX = 1;
  private dirY = -0.7;
  private playing = false;

  constructor(width: number, height: number) {
    super();
    this.W = width;
    this.H = height;
    this.eventMode = 'none';

    // Dark frame: full-screen rect masked by the triangle in INVERSE mode,
    // so what's drawn (black) only shows OUTSIDE the triangle.
    this.addChild(this.darkRect);
    this.addChild(this.darkMask);
    this.darkRect.setMask({ mask: this.darkMask, inverse: true });

    // Corridor + its triangle clip mask (normal, not inverse).
    this.addChild(this.corridorGfx);
    this.addChild(this.corridorMask);
    this.corridorGfx.mask = this.corridorMask;

    // Edges drawn last so they sit on top of the dark mask boundary.
    this.addChild(this.edgeGfx);
  }

  /** Drive the rainbow flow. Call this on every frame the effect is active. */
  update(deltaMS: number): void {
    if (!this.playing) return;
    // Flow keeps moving at constant rate even while triangle slows — gives
    // the impression of a "live" object hanging in the centre of the screen.
    this.flowPhase += deltaMS / 1000 * 0.45;
    this.redraw();
  }

  /**
   * Diagonal cross-screen slide. `magnitude` (0..1) scales every dimension:
   *   0 = first expand: snappy, thin border, two-colour duotone, smallest
   *   1 = final expand: long, thick border, full rainbow, largest
   */
  async play(opts: {
    centerX: number;
    centerY: number;
    magnitude?: number;
  }): Promise<void> {
    const m = clamp01(opts.magnitude ?? 0.5);

    this.targetX = opts.centerX;
    this.targetY = opts.centerY;
    this.size      = lerp(0.42, 0.88, m) * Math.min(this.W, this.H);
    this.lineWidth = lerp(2.5, 11,    m);
    this.hueSpan   = lerp(60,  360,   m);
    this.hueBase   = 300; // pink

    // Total duration scales with magnitude; the slow-middle shape function
    // makes the triangle linger near the centre for most of that time.
    const totalMs = lerp(1500, 3500, m);

    // Diagonal axis. Up-and-to-the-right travel for a synthwave-y trajectory.
    this.dirX = 1;
    this.dirY = -0.65;

    this.playing = true;
    this.travel = 0;
    this.alpha01 = 0;
    this.maskAlpha = 0;
    this.flowPhase = 0;
    this.redraw();

    // Single tween — the shape function does the rest.
    await animator.tween({
      duration: totalMs,
      from: 0,
      to: 1,
      onUpdate: v => {
        const p = slowMiddle(v);
        this.travel = p;
        // Bell-shaped opacity — 0 at entry/exit (off-screen anyway), full
        // at centre. The exponent flattens the peak so the centre lingers
        // bright while the slowdown is happening.
        const bell = 1 - Math.pow(Math.abs(2 * p - 1), 1.6);
        this.alpha01 = clamp01(bell);
        // Outside the triangle is opaque black while the triangle is on
        // screen. The mask only fades at the very edges of entry/exit so
        // the player isn't slammed by a black rectangle before the triangle
        // arrives.
        this.maskAlpha = clamp01(bell);
      },
    });

    this.playing = false;
    this.darkRect.clear();
    this.darkMask.clear();
    this.corridorGfx.clear();
    this.corridorMask.clear();
    this.edgeGfx.clear();
  }

  // ── Geometry helpers ──────────────────────────────────────────────────────

  private trianglePoints(): { x: number; y: number }[] {
    const s = this.size;
    const baseX = this.targetX;
    const baseY = this.targetY;
    return [
      { x: baseX + s * 0.04, y: baseY - s * 0.95 }, // top
      { x: baseX + s * 0.95, y: baseY + s * 0.50 }, // bottom-right
      { x: baseX - s * 0.85, y: baseY + s * 0.42 }, // bottom-left
    ];
  }

  /** Diagonal offset for the current travel value. */
  private diagonalOffset(p: number): { x: number; y: number } {
    const len = Math.hypot(this.dirX, this.dirY);
    const ux = this.dirX / len;
    const uy = this.dirY / len;
    // Travel ~2× the screen's longer axis so the triangle is fully off-screen
    // at p = 0 (lower-left of the diagonal) and p = 1 (upper-right).
    const D = 2.0 * Math.max(this.W, this.H);
    return { x: ux * D * (p - 0.5), y: uy * D * (p - 0.5) };
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private redraw(): void {
    this.darkRect.clear();
    this.darkMask.clear();
    this.corridorGfx.clear();
    this.corridorMask.clear();
    this.edgeGfx.clear();

    if (this.alpha01 <= 0.001 && this.maskAlpha <= 0.001) return;

    const off = this.diagonalOffset(this.travel);
    const pts = this.trianglePoints().map(p => ({ x: p.x + off.x, y: p.y + off.y }));
    const triFlat = [pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y];

    // Dark frame masked by triangle (inverse → outside is black).
    if (this.maskAlpha > 0.001) {
      this.darkRect.rect(0, 0, this.W, this.H)
        .fill({ color: 0x000000, alpha: this.maskAlpha });
      this.darkMask.poly(triFlat).fill({ color: 0xffffff, alpha: 1 });
    }

    // Triangle clip mask for the corridor.
    this.corridorMask.poly(triFlat).fill({ color: 0xffffff, alpha: 1 });

    this.drawCorridor(pts, this.alpha01);
    this.drawEdges(pts, this.alpha01);
  }

  private drawEdges(pts: { x: number; y: number }[], alpha: number): void {
    const edges: [{ x: number; y: number }, { x: number; y: number }, number][] = [
      [pts[0], pts[1], 0.00],
      [pts[1], pts[2], 0.33],
      [pts[2], pts[0], 0.66],
    ];
    const STEPS = 18;
    for (const [a, b, edgePhase] of edges) {
      for (let i = 0; i < STEPS; i++) {
        const t0 = i / STEPS;
        const t1 = (i + 1) / STEPS;
        const x0 = a.x + (b.x - a.x) * t0;
        const y0 = a.y + (b.y - a.y) * t0;
        const x1 = a.x + (b.x - a.x) * t1;
        const y1 = a.y + (b.y - a.y) * t1;
        const hue = this.hueAt(this.flowPhase + edgePhase + t0);
        const color = hslToHex(hue, 1, 0.6);
        this.edgeGfx.moveTo(x0, y0).lineTo(x1, y1)
          .stroke({ color, width: this.lineWidth, alpha });
      }
    }
  }

  /**
   * Map an unbounded "phase" value into the hue band controlled by magnitude.
   * Triangle-wave so duotone bounces between two anchors instead of wrapping.
   */
  private hueAt(phase: number): number {
    const tri = 1 - Math.abs(((phase * 2) % 2) - 1);
    return (this.hueBase + tri * this.hueSpan) % 360;
  }

  private drawCorridor(pts: { x: number; y: number }[], alpha: number): void {
    const vp = {
      x: pts[0].x * 0.55 + (pts[1].x + pts[2].x) * 0.225,
      y: pts[0].y * 0.55 + (pts[1].y + pts[2].y) * 0.225,
    };

    const density = clamp01((this.lineWidth - 2) / 9);
    const RAYS = Math.round(lerp(10, 22, density));
    const innerAlpha = alpha * lerp(0.40, 0.65, density);
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2 + this.flowPhase * Math.PI * 2;
      const len = Math.max(this.W, this.H);
      const x2 = vp.x + Math.cos(a) * len;
      const y2 = vp.y + Math.sin(a) * len;
      const hue = this.hueAt(i / RAYS);
      const color = hslToHex(hue, 1, 0.6);
      this.corridorGfx.moveTo(vp.x, vp.y).lineTo(x2, y2)
        .stroke({ color, width: lerp(1.0, 1.6, density), alpha: innerAlpha });
    }

    const baseMid = {
      x: (pts[1].x + pts[2].x) / 2,
      y: (pts[1].y + pts[2].y) / 2,
    };
    const RUNGS = Math.round(lerp(4, 8, density));
    for (let i = 1; i <= RUNGS; i++) {
      const tProg = ((i + this.flowPhase * RUNGS) % RUNGS) / RUNGS;
      const ix = baseMid.x + (vp.x - baseMid.x) * tProg;
      const iy = baseMid.y + (vp.y - baseMid.y) * tProg;
      const halfW = (1 - tProg) * this.size * 0.65;
      const hue = this.hueAt(tProg + this.flowPhase);
      const color = hslToHex(hue, 1, 0.65);
      const a = alpha * (1 - tProg) * 0.85;
      this.corridorGfx.moveTo(ix - halfW, iy).lineTo(ix + halfW, iy)
        .stroke({ color, width: lerp(1.5, 3, density), alpha: a });
    }
  }
}

// Piecewise S-curve: fast at the edges, ~6× slower in the middle but never
// stopping. Maps tween-time t∈[0,1] → travel position p∈[0,1].
//   t∈[0.00, 0.30]  →  p∈[0.00, 0.45]   (fast entry)
//   t∈[0.30, 0.70]  →  p∈[0.45, 0.55]   (slow lingering centre)
//   t∈[0.70, 1.00]  →  p∈[0.55, 1.00]   (fast exit)
function slowMiddle(t: number): number {
  if (t < 0.30) return (t / 0.30) * 0.45;
  if (t < 0.70) return 0.45 + ((t - 0.30) / 0.40) * 0.10;
  return 0.55 + ((t - 0.70) / 0.30) * 0.45;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

// HSL (h in degrees, s/l in 0..1) → 0xRRGGBB integer.
function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if      (hp < 1) { r = c; g = x; b = 0; }
  else if (hp < 2) { r = x; g = c; b = 0; }
  else if (hp < 3) { r = 0; g = c; b = x; }
  else if (hp < 4) { r = 0; g = x; b = c; }
  else if (hp < 5) { r = x; g = 0; b = c; }
  else             { r = c; g = 0; b = x; }
  const m = l - c / 2;
  const R = Math.max(0, Math.min(255, Math.round((r + m) * 255)));
  const G = Math.max(0, Math.min(255, Math.round((g + m) * 255)));
  const B = Math.max(0, Math.min(255, Math.round((b + m) * 255)));
  return (R << 16) | (G << 8) | B;
}
