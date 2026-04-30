import type { Graphics } from 'pixi.js';
import { Tile } from './Tile';
import { drawPixelGrid } from './pixelArt';

/** Tile 3 — Fender Stratocaster: asymmetric headstock, double-cutaway, 3 single-coil pickups. */
export class StratTile extends Tile {
  readonly id = 3;
  readonly name = 'Strat';
  readonly color = 0x3399ff;
  readonly glowColor = 0x0077ff;
  readonly glowColorStr = '#0077ff';

  draw(g: Graphics, sz: number): void {
    drawPixelGrid(g, sz, [
      [1,1,0,0,0,0,0],  // headstock tip (bass side)
      [1,1,1,0,0,0,0],  // headstock widens
      [0,1,1,1,0,0,0],  // headstock base
      [0,0,1,1,0,0,0],  // nut
      [0,0,1,1,0,0,0],  // neck
      [1,0,1,1,0,0,0],  // bass horn + neck
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
}
