import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';
import { drawPixelGrid } from './pixelArt';

/** Tile 4 — Gibson Les Paul: symmetric headstock, single-cutaway, 2 humbuckers. */
export class LesPaulTile extends Tile {
  readonly id = 4;
  readonly name = 'Les Paul';
  readonly color = 0xaa44ff;
  readonly glowColor = 0x9b59ff;
  readonly glowColorStr = '#9b59ff';

  draw(g: Graphics, sz: number): void {
    drawPixelGrid(g, sz, [
      [0,1,1,1,1,1,0],  // Gibson headstock — symmetric 5-wide
      [0,1,1,1,1,1,0],  // headstock (rectangular, no Fender taper)
      [0,0,1,1,1,0,0],  // headstock tapers to nut
      [0,0,1,1,0,0,0],  // nut
      [0,0,1,1,0,0,0],  // neck
      [0,0,1,1,0,0,0],  // neck
      [1,1,1,1,0,0,0],  // SINGLE CUTAWAY — bass shoulder only
      [1,1,1,1,1,1,1],  // upper bout
      [1,3,3,3,3,3,1],  // neck humbucker top
      [1,3,3,3,3,3,1],  // neck humbucker bottom (2-row = humbucker width)
      [1,1,1,1,1,1,1],  // body between humbuckers
      [1,3,3,3,3,3,1],  // bridge humbucker top
      [1,3,3,3,3,3,1],  // bridge humbucker bottom
      [1,1,1,1,1,1,1],  // lower bout
    ], { 1: 0xff2d9b, 3: 0x220008 });
  }
}
