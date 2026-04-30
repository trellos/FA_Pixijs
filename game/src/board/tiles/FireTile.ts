import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';

/** Tile 1 — Triple-layer flame (hot pink → orange → yellow). */
export class FireTile extends Tile {
  readonly id = 1;
  readonly name = 'Fire';
  readonly color = 0xff2d78;
  readonly glowColor = 0xff6b35;
  readonly glowColorStr = '#ff6b35';

  draw(g: Graphics, sz: number): void {
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
}
