import { Container, Graphics } from 'pixi.js';
import type { TileTypeId } from '../utils/Types';
import { TILE_TYPES } from './TileType';

export const TILE_SIZE = 48;
const R = TILE_SIZE / 2; // 24

export class TileView extends Container {
  private gfx = new Graphics();
  private typeId!: TileTypeId;

  constructor(typeId: TileTypeId) {
    super();
    // Circular mask keeps all art within the tile boundary
    const mask = new Graphics();
    mask.circle(0, 0, R).fill({ color: 0xffffff });
    this.addChild(this.gfx);
    this.mask = mask;
    this.addChild(mask);
    this.setType(typeId);
  }

  get currentType(): TileTypeId { return this.typeId; }

  setType(typeId: TileTypeId): void {
    this.typeId = typeId;
    this.draw();
  }

  private draw(): void {
    const g = this.gfx;
    const sz = TILE_SIZE;
    const def = TILE_TYPES[this.typeId];
    g.clear();

    // Dark tile background
    g.circle(0, 0, R).fill({ color: 0x0e0020 });

    // Tile art (centered at 0,0)
    switch (this.typeId) {
      case 0: artRecord(g, sz);      break;
      case 1: artFire(g, sz);        break;
      case 2: artAmp(g, sz);         break;
      case 3: artStrat(g, sz);       break;
      case 4: artLesPaul(g, sz);     break;
      case 5: artJet(g, sz);         break;
      case 6: artCassette(g, sz);    break;
      case 7: artHeadphones(g, sz);  break;
      case 8: artBeer(g, sz);        break;
    }

    // Neon ring on top of art
    g.circle(0, 0, R - 1).stroke({ color: def.glowColor, width: 2, alpha: 0.85 });
  }

  // Called by BoardView during invalid-swap shake
  shake(): void {
    const startX = this.x;
    let t = 0;
    const step = (): void => {
      t++;
      this.x = startX + Math.sin(t * 1.4) * 5 * Math.max(0, 1 - t / 12);
      if (t < 12) requestAnimationFrame(step);
      else this.x = startX;
    };
    requestAnimationFrame(step);
  }
}

// ─── Shared pixel-art renderer ────────────────────────────────────────────────
function drawPixelGrid(
  g: Graphics, sz: number,
  grid: number[][], colorMap: Record<number, number>
): void {
  const cols = grid[0].length, rows = grid.length;
  const px = Math.min(Math.floor(sz * 0.85 / cols), Math.floor(sz * 0.85 / rows));
  const ox = -Math.round((cols * px) / 2);
  const oy = -Math.round((rows * px) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      g.rect(ox + c * px, oy + r * px, px, px).fill({ color: colorMap[v] });
    }
  }
}

// ─── Tile 0 — Record (vinyl disc) ────────────────────────────────────────────
function artRecord(g: Graphics, sz: number): void {
  const r = sz * 0.42;
  g.circle(0, 0, r).fill({ color: 0x080c14 });
  for (let i = 1; i <= 5; i++) {
    g.circle(0, 0, r * (0.93 - i * 0.12))
     .stroke({ color: i % 2 === 0 ? 0x1a2436 : 0x0e1520, width: 1.5 });
  }
  // Centre label (approximate radial gradient: pink core fading to magenta)
  g.circle(0, 0, r * 0.30).fill({ color: 0xff00dd });
  g.circle(0, 0, r * 0.14).fill({ color: 0xff6699 });
  // Centre hole
  g.circle(0, 0, r * 0.065).fill({ color: 0x0e0020 });
  // Rim
  g.circle(0, 0, r).stroke({ color: 0x00f5ff, width: 1.5, alpha: 0.4 });
}

// ─── Tile 1 — Fire (triple-layer flame) ──────────────────────────────────────
function artFire(g: Graphics, sz: number): void {
  const h = sz * 0.82, w = sz * 0.52;
  const top = -h / 2, bot = h / 2;
  // Outer flame — hot pink
  g.moveTo(0, top)
   .bezierCurveTo( w*0.50, -h*0.12,  w*0.56,  h*0.18,  w*0.38, bot)
   .bezierCurveTo( w*0.10,  bot+3,  -w*0.10,  bot+3,  -w*0.38, bot)
   .bezierCurveTo(-w*0.56,  h*0.18, -w*0.50, -h*0.12,  0, top)
   .fill({ color: 0xff2d78 });
  // Mid flame — orange
  g.moveTo(0, top + h*0.15)
   .bezierCurveTo( w*0.32, -h*0.06,  w*0.34,  h*0.20,  w*0.20, bot-7)
   .bezierCurveTo( 0,       bot-2,  -w*0.20,  bot-7,  -w*0.34,  h*0.20)
   .bezierCurveTo(-w*0.32, -h*0.06,  0,  top+h*0.15,  0, top+h*0.15)
   .fill({ color: 0xff7c35 });
  // Inner flame — yellow
  g.moveTo(0, top + h*0.33)
   .bezierCurveTo( w*0.17,  h*0.05,  w*0.17,  h*0.26,  w*0.09, bot-12)
   .bezierCurveTo( 0,       bot-8,  -w*0.09,  bot-12, -w*0.17,  h*0.26)
   .bezierCurveTo(-w*0.17,  h*0.05,  0,  top+h*0.33,  0, top+h*0.33)
   .fill({ color: 0xffdd00 });
}

// ─── Tile 2 — Amp (combo cabinet) ────────────────────────────────────────────
function artAmp(g: Graphics, sz: number): void {
  const w = sz*0.84, h = sz*0.80, x = -w/2, y = -h/2;
  // Cabinet body
  g.roundRect(x, y, w, h, 4).fill({ color: 0x130900 });
  g.roundRect(x, y, w, h, 4).stroke({ color: 0xff7c35, width: 1.5, alpha: 0.4 });
  // Top panel
  const ph = h * 0.24;
  g.roundRect(x+2, y+2, w-4, ph, 3).fill({ color: 0x1e0e00 });
  // Knobs
  [0.25, 0.5, 0.75].forEach(p => {
    const kx = x + w*p, ky = y + ph*0.55;
    g.circle(kx, ky, 4).fill({ color: 0xffd700 });
    g.moveTo(kx, ky).lineTo(kx, ky - 4).stroke({ color: 0x080400, width: 1.5 });
  });
  // Speaker cone
  const gr = (h - ph) * 0.38;
  const gy = y + ph + (h - ph) * 0.52;
  g.circle(0, gy, gr).fill({ color: 0x0c0600 });
  g.circle(0, gy, gr).stroke({ color: 0xff7c35, width: 1, alpha: 0.27 });
  // Speaker rings
  g.circle(0, gy, gr * 0.60).stroke({ color: 0xff7c35, width: 0.8, alpha: 0.18 });
  g.circle(0, gy, gr * 0.30).stroke({ color: 0xff7c35, width: 0.8, alpha: 0.18 });
  // Dust cap highlight
  g.circle(0, gy, gr * 0.26).fill({ color: 0xff7c35, alpha: 0.45 });
}

// ─── Tile 3 — Stratocaster (7×14 pixel portrait) ─────────────────────────────
// Fender asymmetric headstock, double-cutaway, 3 single-coil pickups
function artStrat(g: Graphics, sz: number): void {
  drawPixelGrid(g, sz, [
    [1,1,0,0,0,0,0],  // headstock tip (bass side)
    [1,1,1,0,0,0,0],  // headstock widens
    [0,1,1,1,0,0,0],  // headstock base
    [0,0,1,1,0,0,0],  // nut
    [0,0,1,1,0,0,0],  // neck
    [1,0,1,1,0,0,0],  // bass horn + neck (treble absent — bass horn taller)
    [1,0,1,1,0,1,1],  // both horns + neck; gaps = double cutaway
    [1,1,1,1,1,1,1],  // upper bout
    [1,2,3,3,3,2,1],  // neck pickup
    [1,2,2,2,2,2,1],  // pickguard
    [1,2,3,3,3,2,1],  // middle pickup
    [1,2,2,2,2,2,1],  // pickguard
    [1,2,3,3,3,2,1],  // bridge pickup
    [1,1,1,1,1,1,1],  // lower bout
  ], { 1: 0x00c8ff, 2: 0xd8f0ff, 3: 0x001822 });
}

// ─── Tile 4 — Les Paul (7×14 pixel portrait) ─────────────────────────────────
// Gibson symmetric headstock, single-cutaway, 2 humbuckers
function artLesPaul(g: Graphics, sz: number): void {
  drawPixelGrid(g, sz, [
    [0,1,1,1,1,1,0],  // Gibson headstock — symmetric 5-wide
    [0,1,1,1,1,1,0],  // headstock (rectangular, no Fender taper)
    [0,0,1,1,1,0,0],  // headstock tapers to nut
    [0,0,1,1,0,0,0],  // nut
    [0,0,1,1,0,0,0],  // neck
    [0,0,1,1,0,0,0],  // neck
    [1,1,1,1,0,0,0],  // SINGLE CUTAWAY — bass shoulder only (treble side empty)
    [1,1,1,1,1,1,1],  // upper bout
    [1,3,3,3,3,3,1],  // neck humbucker top
    [1,3,3,3,3,3,1],  // neck humbucker bottom (2-row = humbucker width)
    [1,1,1,1,1,1,1],  // body between humbuckers
    [1,3,3,3,3,3,1],  // bridge humbucker top
    [1,3,3,3,3,3,1],  // bridge humbucker bottom
    [1,1,1,1,1,1,1],  // lower bout
  ], { 1: 0xff2d9b, 3: 0x220008 });
}

// ─── Tile 5 — Jet fighter ────────────────────────────────────────────────────
function artJet(g: Graphics, sz: number): void {
  const fw = sz*0.82, fh = sz*0.17;
  // Fuselage
  g.moveTo(-fw*0.5+4, 0)
   .bezierCurveTo(-fw*0.5+4, -fh/2, -fw*0.28, -fh/2, 0, -fh/2)
   .lineTo(fw*0.44, -fh/2)
   .bezierCurveTo(fw*0.5, -fh/2, fw*0.5, fh/2, fw*0.44, fh/2)
   .lineTo(0, fh/2)
   .bezierCurveTo(-fw*0.28, fh/2, -fw*0.5+4, fh/2, -fw*0.5+4, 0)
   .closePath()
   .fill({ color: 0xccccdd });
  // Yellow speed stripe
  g.moveTo(-fw*0.28, -1).lineTo(fw*0.42, -1)
   .stroke({ color: 0xffd700, width: 3 });
  // Belly fin
  g.moveTo(-fw*0.05, fh/2).lineTo(fw*0.18, sz*0.43).lineTo(fw*0.32, fh/2)
   .fill({ color: 0xaaaacc });
  // Tail fin
  g.moveTo(fw*0.30, -fh/2)
   .lineTo(fw*0.38, -fh/2 - sz*0.26)
   .lineTo(fw*0.50, -fh/2 - sz*0.10)
   .lineTo(fw*0.50, -fh/2)
   .fill({ color: 0xccccdd });
  // Hot-pink fin accent
  g.moveTo(fw*0.32, -fh/2 - sz*0.02).lineTo(fw*0.38, -fh/2 - sz*0.20)
   .stroke({ color: 0xff2d78, width: 1.5 });
  // Engine windows (cyan ellipses)
  for (let i = 0; i < 4; i++) {
    g.ellipse(-fw*0.08 + i*fw*0.12, -fh*0.08, 3, 2.2)
     .fill({ color: 0x00f5ff, alpha: 0.85 });
  }
}

// ─── Tile 6 — Cassette tape ───────────────────────────────────────────────────
function artCassette(g: Graphics, sz: number): void {
  const w = sz*0.84, h = sz*0.60, x = -w/2, y = -h/2;
  // Body
  g.roundRect(x, y, w, h, 6).fill({ color: 0x0c0018 });
  g.roundRect(x, y, w, h, 6).stroke({ color: 0xaa44ff, width: 1.5 });
  // Top label strip
  const lh = h * 0.30;
  g.roundRect(x+3, y+3, w-6, lh, 3).fill({ color: 0x330066 });
  // Label line (stand-in for text)
  g.rect(x+8, y + lh*0.45, w-16, 1.5).fill({ color: 0xcc88ff, alpha: 0.8 });
  // Tape window
  const wx = -w*0.30, wy = y + h*0.38, ww = w*0.60, wh = h*0.38;
  g.roundRect(wx, wy, ww, wh, 3).fill({ color: 0x080010 });
  g.roundRect(wx, wy, ww, wh, 3).stroke({ color: 0xaa44ff, width: 0.8, alpha: 0.27 });
  // Reels
  [-ww*0.27, ww*0.27].forEach(ox => {
    const ry = wy + wh/2, rr = wh * 0.38;
    g.circle(ox, ry, rr).fill({ color: 0xaa44ff });
    g.circle(ox, ry, rr * 0.44).fill({ color: 0x0c0018 });
    for (let a = 0; a < 3; a++) {
      const ang = (a / 3) * Math.PI * 2;
      g.moveTo(ox + Math.cos(ang)*rr*0.44, ry + Math.sin(ang)*rr*0.44)
       .lineTo(ox + Math.cos(ang)*rr*0.88, ry + Math.sin(ang)*rr*0.88)
       .stroke({ color: 0x0c0018, width: 1.5 });
    }
  });
}

// ─── Tile 7 — Headphones ─────────────────────────────────────────────────────
function artHeadphones(g: Graphics, sz: number): void {
  const ar = sz * 0.22, cr = sz * 0.16, base = ar * 0.18;
  // Headband (thick dark, then thinner bright)
  g.arc(0, base, ar, Math.PI, 0, true).stroke({ color: 0x44446a, width: 9 });
  g.arc(0, base, ar, Math.PI, 0, true).stroke({ color: 0xaaaacc, width: 4 });
  // Ear cups
  [-ar, ar].forEach(ox => {
    const ey = base;
    g.circle(ox, ey, cr).fill({ color: 0x006688 });              // dark teal
    g.circle(ox, ey, cr * 0.50).fill({ color: 0x009fbb });       // lighter centre
    g.circle(ox, ey, cr).stroke({ color: 0x00f5ff, width: 1 });  // cyan rim
    g.circle(ox, ey, cr * 0.55).fill({ color: 0x003344 });       // speaker cone
    g.circle(ox - cr*0.28, ey - cr*0.28, cr*0.14)
     .fill({ color: 0xffffff, alpha: 0.30 });                     // highlight
  });
}

// ─── Tile 8 — Beer (pint glass) ──────────────────────────────────────────────
function artBeer(g: Graphics, sz: number): void {
  const tw = sz*0.60, bw = sz*0.42, h = sz*0.78;
  const y0 = -h/2, y1 = h/2, foamH = h * 0.14;
  // Pint glass body
  g.moveTo(-tw/2, y0+foamH).lineTo(-bw/2, y1)
   .lineTo(bw/2, y1).lineTo(tw/2, y0+foamH)
   .closePath()
   .fill({ color: 0xd4a000 });
  // Left highlight stripe
  g.moveTo(-tw/2+5, y0+foamH).lineTo(-bw/2+4, y1-5)
   .stroke({ color: 0xffffff, width: 3, alpha: 0.28 });
  // Vertical bubble lines
  [-tw*0.12, tw*0.04, tw*0.18].forEach(ox => {
    g.moveTo(ox, y1-6).lineTo(ox, y0+foamH+6)
     .stroke({ color: 0xffffff, width: 1, alpha: 0.18 });
  });
  // Foam: side edge up, then bubbly arcs across the top
  g.moveTo(-tw/2, y0+foamH).lineTo(-tw/2, y0+4);
  const segs = 6, sw2 = tw / segs;
  for (let i = 0; i <= segs; i++) {
    g.arc(-tw/2 + i*sw2, y0+4, sw2*0.48, Math.PI, 0);
  }
  g.lineTo(tw/2, y0+foamH).closePath().fill({ color: 0xf5f0ea });
  // Glass outline
  g.moveTo(-tw/2, y0+foamH).lineTo(-bw/2, y1)
   .stroke({ color: 0xffffff, width: 1, alpha: 0.22 });
  g.moveTo(tw/2, y0+foamH).lineTo(bw/2, y1)
   .stroke({ color: 0xffffff, width: 1, alpha: 0.22 });
  g.moveTo(-bw/2, y1).lineTo(bw/2, y1)
   .stroke({ color: 0xffffff, width: 1, alpha: 0.22 });
}
