import type { Graphics } from 'pixi.js';
import type { TileTypeId, GridPos } from '../../utils/Types';

/**
 * Context passed to a tile's behavior hooks when it participates in a match.
 *
 * Kept intentionally narrow so `Tile` doesn't depend on the full board logic
 * surface. New hooks should add fields here rather than couple `Tile` to
 * `BoardState` directly — that would create an import cycle with `BoardLogic`,
 * which deliberately knows nothing about tile classes.
 */
export interface TileMatchContext {
  pos: GridPos;
  chainDepth: number;
  /** Length of the line this tile was part of (3, 4, 5+). */
  runLength: number;
}

/**
 * Abstract base class for every tile type.
 *
 * Tiles are *flyweight singletons* — one instance per type, looked up by id
 * from the `TILES` registry. The board grid stores ids (numbers), not Tile
 * instances; views resolve `TILES[id]` to ask the tile to render itself.
 *
 * To add a new tile type:
 *   1. Subclass `Tile`, implement `draw()`, override behavior hooks as needed.
 *   2. Append the singleton instance to `TILES` in `tiles/index.ts`.
 * Nothing else in the codebase needs to change — no switch statements, no
 * union edits, no logic-side enumeration.
 */
export abstract class Tile {
  abstract readonly id: TileTypeId;
  abstract readonly name: string;

  /** Body fill — must be visually unique across all registered tiles. */
  abstract readonly color: number;
  /** Ring glow color used by `TileView`. */
  abstract readonly glowColor: number;
  /** CSS-string variant of `glowColor` for HTML/canvas effects. */
  abstract readonly glowColorStr: string;

  /**
   * Render the tile's art into the given graphics context, centered at (0,0)
   * within a `size`-square footprint. The caller handles the background disc
   * and the neon ring; `draw` only fills the interior.
   */
  abstract draw(g: Graphics, size: number): void;

  // ── Behavior hooks (no-op defaults; override in subclasses) ──────────────
  //
  // These exist now so adding behavior to a single tile type is a one-file
  // change. They are intentionally minimal until real power-ups land — the
  // contract surface should grow with concrete needs, not speculative ones.

  /** Called for each cell of this tile when it participates in a match. */
  onMatch(_ctx: TileMatchContext): void {}

  /**
   * Whether this tile is willing to swap with `other`. Default: yes.
   * Override for locked tiles or pairs that cannot combine.
   */
  canSwapWith(_other: Tile): boolean { return true; }

  /** Per-tile score multiplier. Default: 1×. */
  scoreMultiplier(): number { return 1; }
}
