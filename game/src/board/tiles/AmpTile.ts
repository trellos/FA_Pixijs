import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 2 — Combo amp cabinet with knobs and speaker cone. */
export class AmpTile extends Tile {
  readonly id = 2;
  readonly name = 'Amp';
  readonly color = 0xff7c35;
  readonly glowColor = 0xff6b35;
  readonly glowColorStr = '#ff6b35';

  draw(g: Graphics, sz: number): void {
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
    g.circle(0, gy, gr * 0.60).stroke({ color: 0xff7c35, width: 0.8, alpha: 0.18 });
    g.circle(0, gy, gr * 0.30).stroke({ color: 0xff7c35, width: 0.8, alpha: 0.18 });
    g.circle(0, gy, gr * 0.26).fill({ color: 0xff7c35, alpha: 0.45 });
  }
}
