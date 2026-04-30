import type { TileTypeId } from '../../utils/Types';
import { Tile } from './Tile';
import { RecordTile } from './RecordTile';
import { FireTile } from './FireTile';
import { AmpTile } from './AmpTile';
import { StratTile } from './StratTile';
import { LesPaulTile } from './LesPaulTile';
import { JetTile } from './JetTile';
import { CassetteTile } from './CassetteTile';
import { HeadphonesTile } from './HeadphonesTile';
import { BeerTile } from './BeerTile';

export { Tile } from './Tile';
export type { TileMatchContext } from './Tile';

/**
 * Master registry — index = TileTypeId. Add a new entry to register a tile.
 * The index in this array MUST equal the tile's `id` field; a runtime check
 * below catches drift at boot.
 *
 * Order also defines the *unlock progression*: `BoardState.unlockedTypes`
 * starts at 3 and grows up to `TILES.length`, so earlier entries are the
 * first the player encounters. Reorder thoughtfully.
 */
export const TILES: readonly Tile[] = Object.freeze([
  new RecordTile(),
  new FireTile(),
  new AmpTile(),
  new StratTile(),
  new LesPaulTile(),
  new JetTile(),
  new CassetteTile(),
  new HeadphonesTile(),
  new BeerTile(),
]);

// Sanity check: registry index must match tile.id, or lookups silently break.
TILES.forEach((t, i) => {
  if (t.id !== i) {
    throw new Error(`Tile registry mismatch: TILES[${i}] has id ${t.id} (${t.name})`);
  }
});

/** Resolve a tile by id. Returns the singleton; throws on unknown id. */
export function getTile(id: TileTypeId): Tile {
  const t = TILES[id];
  if (!t) throw new Error(`Unknown tile id: ${id}`);
  return t;
}

/** Total number of registered tile types. Used for progression caps. */
export const TILE_COUNT = TILES.length;
