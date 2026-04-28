// Pure logic — zero PixiJS imports
import type { TileTypeId, GridPos, MatchLine, MatchResult, ScoreDelta, SwapIntent } from '../utils/Types';
import type { BoardState } from './BoardState';
import { shuffle, randInt } from '../utils/MathUtils';

const MIN_MATCH = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────


// ── Initialise ────────────────────────────────────────────────────────────────

export function initBoard(state: BoardState): void {
  let attempts = 0;
  do {
    state.cells = Array.from({ length: state.rows }, () =>
      Array.from({ length: state.cols }, () => randTile(state.unlockedTypes)),
    );
    attempts++;
  } while (findMatches(state).lines.length > 0 && attempts < 100);
  ensureSolvable(state);
}

function randTile(unlockedTypes: number): TileTypeId {
  return randInt(0, unlockedTypes - 1) as TileTypeId;
}

// ── Match finding ─────────────────────────────────────────────────────────────

export function findMatches(state: BoardState): MatchResult {
  const lines: MatchLine[] = [];

  // Horizontal
  for (let r = 0; r < state.rows; r++) {
    let run = 1;
    for (let c = 1; c <= state.cols; c++) {
      const v  = c < state.cols ? (state.cells[r][c] as number) : -2;
      const pv = (state.cells[r][c - 1] as number);
      const same = v >= 0 && pv >= 0 && v === pv;
      if (same) { run++; }
      else {
        if (run >= MIN_MATCH && pv >= 0) {
          const tiles: GridPos[] = Array.from({ length: run }, (_, i) => ({ col: c - run + i, row: r }));
          lines.push({ tiles, isHorizontal: true });
        }
        run = 1;
      }
    }
  }

  // Vertical
  for (let c = 0; c < state.cols; c++) {
    let run = 1;
    for (let r = 1; r <= state.rows; r++) {
      const v  = r < state.rows ? (state.cells[r][c] as number) : -2;
      const pv = (state.cells[r - 1][c] as number);
      const same = v >= 0 && pv >= 0 && v === pv;
      if (same) { run++; }
      else {
        if (run >= MIN_MATCH && pv >= 0) {
          const tiles: GridPos[] = Array.from({ length: run }, (_, i) => ({ col: c, row: r - run + i }));
          lines.push({ tiles, isHorizontal: false });
        }
        run = 1;
      }
    }
  }

  const isCombo = state.chainDepth > 0;
  return { lines, isCombo, chainDepth: state.chainDepth };
}

// ── Swap validation ───────────────────────────────────────────────────────────

export function isAdjacent(a: GridPos, b: GridPos): boolean {
  const dc = Math.abs(a.col - b.col), dr = Math.abs(a.row - b.row);
  return (dc === 1 && dr === 0) || (dc === 0 && dr === 1);
}

export function isValidSwap(state: BoardState, intent: SwapIntent): boolean {
  if (!isAdjacent(intent.from, intent.to)) return false;
  const clone = cloneState(state);
  applySwap(clone, intent);
  return findMatches(clone).lines.length > 0;
}

export function applySwap(state: BoardState, intent: SwapIntent): void {
  const { from, to } = intent;
  const tmp = state.cells[from.row][from.col];
  state.cells[from.row][from.col] = state.cells[to.row][to.col];
  state.cells[to.row][to.col] = tmp;
}

// ── Clear matched tiles ────────────────────────────────────────────────────────

export function clearMatches(state: BoardState, result: MatchResult): Set<string> {
  const cleared = new Set<string>();
  for (const line of result.lines) {
    for (const pos of line.tiles) {
      cleared.add(`${pos.row},${pos.col}`);
    }
  }
  for (const key of cleared) {
    const [r, c] = key.split(',').map(Number);
    (state.cells[r][c] as number) = -1; // sentinel: empty
  }
  return cleared;
}

// ── Gravity ───────────────────────────────────────────────────────────────────

export function applyGravity(state: BoardState): GridPos[] {
  const moved: GridPos[] = [];
  for (let c = 0; c < state.cols; c++) {
    let writeRow = state.rows - 1;
    for (let r = state.rows - 1; r >= 0; r--) {
      if ((state.cells[r][c] as number) !== -1) {
        if (r !== writeRow) {
          state.cells[writeRow][c] = state.cells[r][c];
          (state.cells[r][c] as number) = -1;
          moved.push({ col: c, row: writeRow });
        }
        writeRow--;
      }
    }
  }
  return moved;
}

// ── Spawn ─────────────────────────────────────────────────────────────────────

export function spawnTiles(state: BoardState): GridPos[] {
  const spawned: GridPos[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if ((state.cells[r][c] as number) === -1) {
        state.cells[r][c] = safeTile(state, r, c);
        spawned.push({ col: c, row: r });
      }
    }
  }
  return spawned;
}

function safeTile(state: BoardState, row: number, col: number): TileTypeId {
  const types = Array.from({ length: state.unlockedTypes }, (_, i) => i as TileTypeId);
  shuffle(types);
  for (const t of types) {
    if (!wouldMatch(state, row, col, t)) return t;
  }
  return randInt(0, state.unlockedTypes - 1) as TileTypeId;
}

function wouldMatch(state: BoardState, row: number, col: number, type: TileTypeId): boolean {
  let run = 1;
  for (let dc = 1; col - dc >= 0 && (state.cells[row][col - dc] as number) === (type as number); dc++) run++;
  for (let dc = 1; col + dc < state.cols && (state.cells[row][col + dc] as number) === (type as number); dc++) run++;
  if (run >= MIN_MATCH) return true;
  run = 1;
  for (let dr = 1; row - dr >= 0 && (state.cells[row - dr][col] as number) === (type as number); dr++) run++;
  for (let dr = 1; row + dr < state.rows && (state.cells[row + dr][col] as number) === (type as number); dr++) run++;
  return run >= MIN_MATCH;
}

// ── Solvability ───────────────────────────────────────────────────────────────

export function ensureSolvable(state: BoardState): void {
  if (hasSolvableSwap(state)) return;
  let attempts = 0;
  do {
    shuffleBoard(state);
    attempts++;
  } while (!hasSolvableSwap(state) && attempts < 100);
}

function hasSolvableSwap(state: BoardState): boolean {
  const dirs: GridPos[] = [{ col: 1, row: 0 }, { col: 0, row: 1 }];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      for (const d of dirs) {
        const nr = r + d.row, nc = c + d.col;
        if (nr < state.rows && nc < state.cols) {
          if (isValidSwap(state, { from: { col: c, row: r }, to: { col: nc, row: nr } })) return true;
        }
      }
    }
  }
  return false;
}

function shuffleBoard(state: BoardState): void {
  const flat: TileTypeId[] = state.cells.flat() as TileTypeId[];
  shuffle(flat);
  let i = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      state.cells[r][c] = flat[i++];
    }
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function computeScore(result: MatchResult): ScoreDelta {
  const totalTiles = result.lines.reduce((s, l) => s + l.tiles.length, 0);
  const base = totalTiles * 10;
  const comboBonus = result.isCombo ? base * result.chainDepth : 0;
  return { base, comboBonus, total: base + comboBonus };
}

// ── Board expansion ───────────────────────────────────────────────────────────

export function expandBoard(state: BoardState): void {
  state.cols++;
  state.rows++;
  // Add a new column to each existing row
  for (let r = 0; r < state.rows - 1; r++) {
    state.cells[r].push(randTile(state.unlockedTypes));
  }
  // Add a full new row
  state.cells.push(Array.from({ length: state.cols }, () => randTile(state.unlockedTypes)));
  state.linesMatchedSinceExpand = 0;
  if (state.unlockedTypes < 9) state.unlockedTypes++;
  state.timeRemaining = Math.min(state.timeRemaining + 15, 60);
  ensureSolvable(state);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function cloneState(state: BoardState): BoardState {
  return {
    ...state,
    cells: state.cells.map(row => [...row]),
  };
}
