import { Container, Graphics } from 'pixi.js';
import type { TileTypeId } from '../utils/Types';
import { TILE_TYPES } from './TileType';

const TILE_SIZE = 48;

export class TileView extends Container {
  private gfx = new Graphics();
  private typeId!: TileTypeId;

  constructor(typeId: TileTypeId) {
    super();
    this.addChild(this.gfx);
    this.setType(typeId);
  }

  get currentType(): TileTypeId { return this.typeId; }

  setType(typeId: TileTypeId): void {
    this.typeId = typeId;
    this.draw();
  }

  private draw(): void {
    const def = TILE_TYPES[this.typeId];
    const sz = TILE_SIZE;
    const r = sz / 2;
    const g = this.gfx;
    g.clear();

    // Dark circle background
    g.circle(0, 0, r).fill({ color: 0x0e0020 });

    // Colored body indicator (placeholder art — will be replaced with pixel art)
    g.circle(0, 0, r * 0.70).fill({ color: def.color });

    // Neon ring
    g.circle(0, 0, r - 1).stroke({ color: def.glowColor, width: 2, alpha: 0.7 });
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
