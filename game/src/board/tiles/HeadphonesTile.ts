import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 7 — Headphones with cyan rim and teal ear cups. */
export class HeadphonesTile extends Tile {
  readonly id = 7;
  readonly name = 'Headphones';
  readonly color = 0xe0e0ff;
  readonly glowColor = 0xaaaaff;
  readonly glowColorStr = '#aaaaff';

  draw(g: Graphics, sz: number): void {
    const ar = sz * 0.22, cr = sz * 0.16, base = ar * 0.18;
    // Headband (thick dark, then thinner bright)
    g.arc(0, base, ar, Math.PI, 0, true).stroke({ color: 0x44446a, width: 9 });
    g.arc(0, base, ar, Math.PI, 0, true).stroke({ color: 0xaaaacc, width: 4 });
    // Ear cups
    [-ar, ar].forEach(ox => {
      const ey = base;
      g.circle(ox, ey, cr).fill({ color: 0x006688 });
      g.circle(ox, ey, cr * 0.50).fill({ color: 0x009fbb });
      g.circle(ox, ey, cr).stroke({ color: 0x00f5ff, width: 1 });
      g.circle(ox, ey, cr * 0.55).fill({ color: 0x003344 });
      g.circle(ox - cr*0.28, ey - cr*0.28, cr*0.14)
       .fill({ color: 0xffffff, alpha: 0.30 });
    });
  }
}
