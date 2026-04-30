import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 6 — Cassette tape with twin reels and label strip. */
export class CassetteTile extends Tile {
  readonly id = 6;
  readonly name = 'Cassette';
  readonly color = 0x00ffaa;
  readonly glowColor = 0x00ffaa;
  readonly glowColorStr = '#00ffaa';

  draw(g: Graphics, sz: number): void {
    const w = sz*0.84, h = sz*0.60, x = -w/2, y = -h/2;
    g.roundRect(x, y, w, h, 6).fill({ color: 0x0c0018 });
    g.roundRect(x, y, w, h, 6).stroke({ color: 0xaa44ff, width: 1.5 });
    // Top label strip
    const lh = h * 0.30;
    g.roundRect(x+3, y+3, w-6, lh, 3).fill({ color: 0x330066 });
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
}
