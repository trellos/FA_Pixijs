/**
 * `TileTypeId` is a tile's index into the `TILES` registry. We use plain
 * `number` rather than a closed union (`0|1|...|N`) because the registry is
 * meant to grow — closing the union forces every consumer to be edited each
 * time a new tile is registered, and forces casts at logic sites that iterate
 * `0..unlockedTypes-1`. Bounds are validated at the registry boundary.
 *
 * The board grid stores `TileTypeId` cells. The sentinel value `-1` means
 * "empty" and is used transiently during gravity/spawn. It's stored as
 * `TileTypeId` because TS lacks a cheap way to express "non-negative number"
 * — discipline matters: only `BoardLogic` writes `-1`, and only `applyGravity`
 * + `spawnTiles` read it.
 */
export type TileTypeId = number;
export const EMPTY_CELL: TileTypeId = -1;

export interface GridPos { col: number; row: number; }
export interface SwapIntent { from: GridPos; to: GridPos; }
export interface MatchLine { tiles: GridPos[]; isHorizontal: boolean; }
export interface MatchResult { lines: MatchLine[]; isCombo: boolean; chainDepth: number; }
export interface ScoreDelta { base: number; comboBonus: number; total: number; }
export interface BoardSnapshot {
  cols: number;
  rows: number;
  cells: TileTypeId[][];
  unlockedTypes: number;
}

export type GamePhase =
  | 'IDLE'
  | 'ANIMATING_SWAP'
  | 'ANIMATING_MATCH'
  | 'ANIMATING_FALL'
  | 'ANIMATING_SPAWN'
  | 'ANIMATING_EXPAND'
  | 'GAME_OVER';

// ── Event map ─────────────────────────────────────────────────────────────────
//
// Single source of truth for every event on the bus. Keys are the wire names
// (kept stable across refactors); values are the payload type. Adding an
// event = one entry here; the bus enforces the payload type at every emit
// and on() call site.
//
// Scope rule: the bus carries *cross-cutting* signals (game-over, match
// found, board expanded, swap requested/invalid, tiles fell/spawned) that
// future audio, achievement, and effect systems need to hook into without
// editing the orchestrator. HUD-update plumbing (score change, timer tick)
// lives as direct method calls — the bus is not a one-way data binding
// system.

export interface SwapInvalidPayload { from: GridPos; to: GridPos; }

export interface EventMap {
  'swap:requested':  SwapIntent;
  'swap:invalid':    SwapInvalidPayload;
  'match:found':     MatchResult;
  'tiles:fell':      GridPos[];
  'tiles:spawned':   GridPos[];
  'board:expanded':  void;
  'game:over':       number;          // final score
}

// String-constant aliases for ergonomic emit/on. Each is the literal key it
// names — no drift possible.
export const EV_SWAP_REQUESTED  = 'swap:requested'  as const;
export const EV_SWAP_INVALID    = 'swap:invalid'    as const;
export const EV_MATCH_FOUND     = 'match:found'     as const;
export const EV_TILES_FELL      = 'tiles:fell'      as const;
export const EV_TILES_SPAWNED   = 'tiles:spawned'   as const;
export const EV_BOARD_EXPANDED  = 'board:expanded'  as const;
export const EV_GAME_OVER       = 'game:over'       as const;
