import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 0 — Vinyl record, concentric grooves, hot-pink centre label. */
export class RecordTile extends Tile {
  readonly id = 0;
  readonly name = 'Record';
  readonly color = 0x00d4ff;
  readonly glowColor = 0x00aaff;
  readonly glowColorStr = '#00aaff';

  draw(g: Graphics, sz: number): void {
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
}
