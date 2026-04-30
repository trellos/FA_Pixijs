import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 5 — Jet fighter with yellow speed stripe and tail accent. */
export class JetTile extends Tile {
  readonly id = 5;
  readonly name = 'Jet';
  readonly color = 0xffd700;
  readonly glowColor = 0xffd700;
  readonly glowColorStr = '#ffd700';

  draw(g: Graphics, sz: number): void {
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
}
