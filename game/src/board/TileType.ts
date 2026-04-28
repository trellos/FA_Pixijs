import type { TileTypeId } from '../utils/Types';

export interface TileTypeDef {
  id: TileTypeId;
  name: string;
  color: number;        // body fill — must be visually unique across all 9 types
  glowColor: number;    // ring glow
  glowColorStr: string;
}

// Every type has a distinct saturated body color so they are unambiguous at a glance.
export const TILE_TYPES: TileTypeDef[] = [
  { id: 0, name: 'Record',     color: 0x00d4ff, glowColor: 0x00aaff, glowColorStr: '#00aaff' }, // cyan
  { id: 1, name: 'Fire',       color: 0xff2d78, glowColor: 0xff6b35, glowColorStr: '#ff6b35' }, // hot pink
  { id: 2, name: 'Amp',        color: 0xff7c35, glowColor: 0xff6b35, glowColorStr: '#ff6b35' }, // orange
  { id: 3, name: 'Strat',      color: 0x3399ff, glowColor: 0x0077ff, glowColorStr: '#0077ff' }, // blue
  { id: 4, name: 'Les Paul',   color: 0xaa44ff, glowColor: 0x9b59ff, glowColorStr: '#9b59ff' }, // purple
  { id: 5, name: 'Jet',        color: 0xffd700, glowColor: 0xffd700, glowColorStr: '#ffd700' }, // gold
  { id: 6, name: 'Cassette',   color: 0x00ffaa, glowColor: 0x00ffaa, glowColorStr: '#00ffaa' }, // mint
  { id: 7, name: 'Headphones', color: 0xe0e0ff, glowColor: 0xaaaaff, glowColorStr: '#aaaaff' }, // white/silver
  { id: 8, name: 'Beer',       color: 0xff4455, glowColor: 0xff2244, glowColorStr: '#ff2244' }, // red
];
