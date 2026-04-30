/**
 * Pure logic unit tests — no browser, no PixiJS.
 * Imports TypeScript source directly; Playwright compiles via esbuild.
 */
import { test, expect } from '@playwright/test';
import {
  findMatches, isValidSwap, applySwap,
  applyGravity, spawnTiles, computeScore,
  expandBoard, initBoard,
} from '../src/board/BoardLogic';
import { createBoardState } from '../src/board/BoardState';
import type { TileTypeId } from '../src/utils/Types';
import { EMPTY_CELL } from '../src/utils/Types';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Cells = TileTypeId[][];
const T = (cells: number[][]): Cells => cells;
const E = EMPTY_CELL; // empty sentinel used after clearMatches

function makeState(cells: Cells) {
  const s = createBoardState();
  s.cells = cells;
  s.cols  = cells[0].length;
  s.rows  = cells.length;
  return s;
}

// ── findMatches ───────────────────────────────────────────────────────────────

test('findMatches — detects a horizontal run of 3', () => {
  const s = makeState(T([
    [0, 0, 0],
    [1, 2, 1],
    [2, 1, 2],
  ]));
  const r = findMatches(s);
  expect(r.lines).toHaveLength(1);
  expect(r.lines[0].isHorizontal).toBe(true);
  expect(r.lines[0].tiles).toHaveLength(3);
  expect(r.lines[0].tiles.every(p => p.row === 0)).toBe(true);
});

test('findMatches — detects a vertical run of 3', () => {
  const s = makeState(T([
    [0, 1, 2],
    [0, 2, 1],
    [0, 1, 2],
  ]));
  const r = findMatches(s);
  expect(r.lines).toHaveLength(1);
  expect(r.lines[0].isHorizontal).toBe(false);
  expect(r.lines[0].tiles.every(p => p.col === 0)).toBe(true);
});

test('findMatches — detects both horizontal and vertical simultaneously', () => {
  const s = makeState(T([
    [0, 0, 0],
    [0, 2, 1],
    [0, 1, 2],
  ]));
  // Row 0 → horizontal. Col 0 → vertical.
  const r = findMatches(s);
  expect(r.lines.length).toBeGreaterThanOrEqual(2);
});

test('findMatches — returns empty when no match', () => {
  const s = makeState(T([
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0],
  ]));
  expect(findMatches(s).lines).toHaveLength(0);
});

test('findMatches — detects run of 4', () => {
  const s = makeState(T([
    [0, 0, 0, 0],
    [1, 2, 1, 2],
    [2, 1, 2, 1],
    [1, 2, 1, 2],
  ]));
  const r = findMatches(s);
  expect(r.lines[0].tiles).toHaveLength(4);
});

// ── isValidSwap ───────────────────────────────────────────────────────────────

test('isValidSwap — rejects non-adjacent tiles', () => {
  const s = makeState(T([
    [0, 1, 2],
    [0, 1, 2],
    [0, 1, 2],
  ]));
  // Same cell
  expect(isValidSwap(s, { from: {col:0,row:0}, to: {col:0,row:0} })).toBe(false);
  // Two apart horizontally
  expect(isValidSwap(s, { from: {col:0,row:0}, to: {col:2,row:0} })).toBe(false);
  // Diagonal
  expect(isValidSwap(s, { from: {col:0,row:0}, to: {col:1,row:1} })).toBe(false);
});

test('isValidSwap — rejects swap that creates no match', () => {
  const s = makeState(T([
    [0, 1, 2],
    [1, 0, 1],
    [2, 1, 0],
  ]));
  // Every swap here leaves a checkerboard — no run of 3
  expect(isValidSwap(s, { from: {col:0,row:0}, to: {col:1,row:0} })).toBe(false);
});

test('isValidSwap — accepts swap that creates a column match', () => {
  // Col 0 will become [0,0,0] after swapping (col:0,row:2) ↔ (col:1,row:2)
  const s = makeState(T([
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],  // swap col:0 and col:1 in this row
  ]));
  expect(isValidSwap(s, { from: {col:0,row:2}, to: {col:1,row:2} })).toBe(true);
});

test('isValidSwap — accepts swap that creates a row match', () => {
  // Row 2 will become [0, 0, 0] after swapping (col:2,row:2) ↔ (col:2,row:1)
  const s = makeState(T([
    [1, 2, 1],
    [1, 2, 0],  // swap (col:2,row:1) ↔ (col:2,row:2)
    [0, 0, 2],
  ]));
  expect(isValidSwap(s, { from: {col:2,row:1}, to: {col:2,row:2} })).toBe(true);
});

// ── applySwap ─────────────────────────────────────────────────────────────────

test('applySwap — exchanges two adjacent cells', () => {
  const s = makeState(T([
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ]));
  applySwap(s, { from: {col:0,row:0}, to: {col:1,row:0} });
  expect(s.cells[0][0]).toBe(1);
  expect(s.cells[0][1]).toBe(0);
});

// ── applyGravity ──────────────────────────────────────────────────────────────

test('applyGravity — tiles fall into empty slots', () => {
  const s = makeState(T([
    [0, 1],
    [E, 2],   // col 0, row 1 is empty
    [E, 0],   // col 0, row 2 is empty
  ]));
  const moved = applyGravity(s);
  // The tile 0 from (col:0,row:0) should fall to (col:0,row:2)
  expect(s.cells[2][0]).toBe(0);
  // Rows 0 and 1 in col 0 should now be empty (-1)
  expect(s.cells[0][0]).toBe(-1);
  expect(s.cells[1][0]).toBe(-1);
  expect(moved.some(p => p.col === 0 && p.row === 2)).toBe(true);
});

test('applyGravity — columns with no gaps are unchanged', () => {
  const s = makeState(T([
    [0, 1],
    [1, 2],
    [2, 0],
  ]));
  applyGravity(s);
  expect(s.cells[0][1]).toBe(1);
  expect(s.cells[1][1]).toBe(2);
  expect(s.cells[2][1]).toBe(0);
});

// ── spawnTiles ────────────────────────────────────────────────────────────────

test('spawnTiles — fills every empty slot with a valid tile type', () => {
  const s = makeState(T([
    [E, E, E],
    [0, E, 1],
    [1, 2, E],
  ]));
  s.unlockedTypes = 3;
  const spawned = spawnTiles(s);
  // 5 empty slots originally
  expect(spawned).toHaveLength(5);
  // All cells now 0–2 (within unlockedTypes range)
  for (const row of s.cells) {
    for (const v of row) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
    }
  }
});

test('spawnTiles — spawned tiles never create an immediate match', () => {
  // Run many times with a large board to stress-test the safe-tile logic
  for (let trial = 0; trial < 50; trial++) {
    const s = makeState(T([
      [E, E, E, E, E],
      [E, E, E, E, E],
      [0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0],
    ]));
    s.unlockedTypes = 3;
    spawnTiles(s);
    expect(findMatches(s).lines).toHaveLength(0);
  }
});

// ── computeScore ──────────────────────────────────────────────────────────────

test('computeScore — base score is 10 per tile', () => {
  const result = { lines: [{ tiles: [{col:0,row:0},{col:1,row:0},{col:2,row:0}], isHorizontal: true }], isCombo: false, chainDepth: 0 };
  const delta = computeScore(result);
  expect(delta.base).toBe(30);
  expect(delta.comboBonus).toBe(0);
  expect(delta.total).toBe(30);
});

test('computeScore — combo bonus multiplies by chainDepth', () => {
  const result = { lines: [{ tiles: [{col:0,row:0},{col:1,row:0},{col:2,row:0}], isHorizontal: true }], isCombo: true, chainDepth: 2 };
  const delta = computeScore(result);
  expect(delta.base).toBe(30);
  expect(delta.comboBonus).toBe(60); // 30 * 2
  expect(delta.total).toBe(90);
});

// ── expandBoard ───────────────────────────────────────────────────────────────

test('expandBoard — increases cols and rows by 1', () => {
  const s = makeState(T([
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ]));
  s.unlockedTypes = 4;
  expandBoard(s, 9);
  expect(s.cols).toBe(5);
  expect(s.rows).toBe(5);
  expect(s.cells).toHaveLength(5);
  expect(s.cells[0]).toHaveLength(5);
});

test('expandBoard — resets linesMatchedSinceExpand', () => {
  const s = makeState(T([
    [0, 1], [1, 0],
  ]));
  s.linesMatchedSinceExpand = 7;
  s.unlockedTypes = 3;
  expandBoard(s, 9);
  expect(s.linesMatchedSinceExpand).toBe(0);
});

test('expandBoard — adds time bonus', () => {
  const s = makeState(T([
    [0, 1], [1, 0],
  ]));
  s.timeRemaining = 20;
  s.unlockedTypes = 3;
  expandBoard(s, 9);
  expect(s.timeRemaining).toBeGreaterThan(20);
});

// ── initBoard ─────────────────────────────────────────────────────────────────

test('initBoard — produces a board with no initial matches', () => {
  const s = createBoardState();
  s.unlockedTypes = 5;
  initBoard(s);
  expect(findMatches(s).lines).toHaveLength(0);
});

test('initBoard — fills all cells within unlockedTypes range', () => {
  const s = createBoardState();
  s.unlockedTypes = 4;
  initBoard(s);
  for (const row of s.cells) {
    for (const v of row) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
    }
  }
});
