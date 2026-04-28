import type { TileTypeId, GamePhase } from '../utils/Types';

export interface BoardState {
  cols: number;
  rows: number;
  cells: TileTypeId[][];   // cells[row][col]
  score: number;
  timeRemaining: number;   // seconds
  phase: GamePhase;
  unlockedTypes: number;   // how many tile types are in rotation (starts at 3)
  linesMatchedSinceExpand: number;
  chainDepth: number;
}

export function createBoardState(): BoardState {
  return {
    cols: 4,
    rows: 4,
    cells: [],
    score: 0,
    timeRemaining: 60,
    phase: 'IDLE',
    unlockedTypes: 3,
    linesMatchedSinceExpand: 0,
    chainDepth: 0,
  };
}
