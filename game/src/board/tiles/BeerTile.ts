import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 8 — Pint glass with foam head and bubble lines. */
export class BeerTile extends Tile {
  readonly id = 8;
  readonly name = 'Beer';
  readonly color = 0xff4455;
  readonly glowColor = 0xff2244;
  readonly glowColorStr = '#ff2244';

  draw(g: Graphics, sz: number): void {
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
}
