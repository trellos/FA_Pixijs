import { Container, Graphics } from 'pixi.js';
import type { TileTypeId } from '../utils/Types';
import { getTile } from './tiles';

export const TILE_SIZE = 48;
const R = TILE_SIZE / 2; // 24

/**
 * Renders a single tile cell. Owns no game state — just a typeId pointer
 * into the `TILES` registry. Repaints on `setType()` by delegating to the
 * tile singleton's polymorphic `draw()`.
 */
export class TileView extends Container {
  private gfx = new Graphics();
  private typeId!: TileTypeId;

  constructor(typeId: TileTypeId) {
    super();
    // Circular mask keeps all art within the tile boundary
    const mask = new Graphics();
    mask.circle(0, 0, R).fill({ color: 0xffffff });
    this.addChild(this.gfx);
    this.mask = mask;
    this.addChild(mask);
    this.setType(typeId);
  }

  get currentType(): TileTypeId { return this.typeId; }

  setType(typeId: TileTypeId): void {
    this.typeId = typeId;
    this.draw();
  }

  private draw(): void {
    const tile = getTile(this.typeId);
    const g = this.gfx;
    g.clear();

    // Dark tile background
    g.circle(0, 0, R).fill({ color: 0x0e0020 });

    // Polymorphic tile art (centered at 0,0 within TILE_SIZE square)
    tile.draw(g, TILE_SIZE);

    // Neon ring on top of art
    g.circle(0, 0, R - 1).stroke({ color: tile.glowColor, width: 2, alpha: 0.85 });
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
