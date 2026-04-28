export type TileTypeId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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

// ── Event names ───────────────────────────────────────────────────────────────
export const EV_SWAP_REQUESTED  = 'swap:requested';
export const EV_SWAP_INVALID    = 'swap:invalid';
export const EV_MATCH_FOUND     = 'match:found';
export const EV_TILES_FELL      = 'tiles:fell';
export const EV_TILES_SPAWNED   = 'tiles:spawned';
export const EV_BOARD_EXPANDED  = 'board:expanded';
export const EV_TIMER_CHANGED   = 'timer:changed';
export const EV_SCORE_CHANGED   = 'score:changed';
export const EV_GAME_OVER       = 'game:over';
export const EV_COMBO           = 'combo';
