import { Container, Application } from 'pixi.js';
import type { GridPos, MatchResult } from '../utils/Types';
import type { BoardState } from './BoardState';
import { TileView } from './TileView';
import { animator } from '../animations/Animator';
import { easeOutBounce, easeInQuad, easeOutBack } from '../animations/Easing';

const TILE_SIZE = 48;
const GAP = 6;

export class BoardView extends Container {
  private tiles: TileView[][] = []; // tiles[row][col]
  private cols = 0;
  private rows = 0;

  constructor(private readonly app: Application) {
    super();
  }

  // ── Build / sync ─────────────────────────────────────────────────────────────

  syncFromState(state: BoardState): void {
    if (state.cols !== this.cols || state.rows !== this.rows) {
      this.rebuild(state);
    } else {
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          this.tiles[r][c].setType(state.cells[r][c]);
        }
      }
    }
    this.centerOnScreen();
  }

  private rebuild(state: BoardState): void {
    this.removeChildren();
    this.tiles = [];
    this.cols = state.cols;
    this.rows = state.rows;

    for (let r = 0; r < state.rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < state.cols; c++) {
        const tv = new TileView(state.cells[r][c]);
        tv.position.set(this.tileX(c), this.tileY(r));
        this.addChild(tv);
        this.tiles[r][c] = tv;
      }
    }
  }

  // ── Coordinate helpers ───────────────────────────────────────────────────────

  private tileX(col: number): number { return col * (TILE_SIZE + GAP) + TILE_SIZE / 2; }
  private tileY(row: number): number { return row * (TILE_SIZE + GAP) + TILE_SIZE / 2; }

  boardPixelWidth(): number { return this.cols * (TILE_SIZE + GAP) - GAP; }
  boardPixelHeight(): number { return this.rows * (TILE_SIZE + GAP) - GAP; }

  centerOnScreen(): void {
    const w = this.app.screen.width, h = this.app.screen.height;
    this.x = Math.round((w - this.boardPixelWidth()) / 2);
    this.y = Math.round((h - this.boardPixelHeight()) / 2 - 30); // slight upward offset for HUD
  }

  tileCenterWorld(pos: GridPos): { x: number; y: number } {
    return { x: this.x + this.tileX(pos.col), y: this.y + this.tileY(pos.row) };
  }

  tileAtPixel(localX: number, localY: number): GridPos | null {
    const col = Math.floor(localX / (TILE_SIZE + GAP));
    const row = Math.floor(localY / (TILE_SIZE + GAP));
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) return { col, row };
    return null;
  }

  getTileView(pos: GridPos): TileView { return this.tiles[pos.row][pos.col]; }

  // ── Animations ───────────────────────────────────────────────────────────────

  async animateSwap(a: GridPos, b: GridPos): Promise<void> {
    const tvA = this.tiles[a.row][a.col];
    const tvB = this.tiles[b.row][b.col];
    const ax = tvA.x, ay = tvA.y, bx = tvB.x, by = tvB.y;

    await Promise.all([
      animator.tween({ duration: 200, from: 0, to: 1, onUpdate: t => {
        tvA.x = ax + (bx - ax) * t; tvA.y = ay + (by - ay) * t;
        tvB.x = bx + (ax - bx) * t; tvB.y = by + (ay - by) * t;
      }}),
    ]);

    // Swap in tiles array
    this.tiles[a.row][a.col] = tvB;
    this.tiles[b.row][b.col] = tvA;
  }

  async animateSwapBack(a: GridPos, b: GridPos): Promise<void> {
    // Positions are already swapped in tiles[][] — swap back visually
    await this.animateSwap(a, b);
    // Re-swap in array to restore original
    const tmp = this.tiles[a.row][a.col];
    this.tiles[a.row][a.col] = this.tiles[b.row][b.col];
    this.tiles[b.row][b.col] = tmp;
  }

  async animateMatch(result: MatchResult): Promise<void> {
    const matched = new Set<string>();
    for (const line of result.lines) {
      for (const pos of line.tiles) matched.add(`${pos.row},${pos.col}`);
    }
    const promises: Promise<void>[] = [];
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      const tv = this.tiles[r][c];
      // Flash bright before shrinking
      tv.scale.set(1.2);
      promises.push(animator.tween({
        duration: 280, from: 1.2, to: 0,
        onUpdate: s => { tv.scale.set(s); tv.alpha = s > 0.5 ? 1 : (s / 0.5); },
        easing: easeInQuad,
      }));
    }
    await Promise.all(promises);
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      this.tiles[r][c].visible = false;
    }
  }

  async animateFall(_moved: GridPos[], _state: BoardState): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let c = 0; c < this.cols; c++) {
      // Partition column into surviving (visible) and cleared (hidden) views
      const visible: TileView[] = [];
      const hidden: TileView[] = [];
      for (let r = 0; r < this.rows; r++) {
        (this.tiles[r][c].visible ? visible : hidden).push(this.tiles[r][c]);
      }

      if (hidden.length === 0) continue; // column has no gaps

      // Surviving tiles fall to the bottom slots
      visible.forEach((tv, i) => {
        const targetRow = hidden.length + i;
        this.tiles[targetRow][c] = tv;
        const targetY = this.tileY(targetRow);
        if (tv.y !== targetY) {
          const dist = Math.abs(targetY - tv.y);
          const duration = 180 + dist * 0.8; // longer fall for farther tiles
          promises.push(animator.tween({
            duration, from: tv.y, to: targetY,
            onUpdate: y => { tv.y = y; },
            easing: easeOutBounce,
          }));
        }
      });

      // Cleared views park at the top positions, ready to be reused by animateSpawn
      hidden.forEach((tv, i) => {
        this.tiles[i][c] = tv;
        tv.position.set(this.tileX(c), this.tileY(i));
      });
    }

    await Promise.all(promises);
  }

  async animateSpawn(spawned: GridPos[], state: BoardState): Promise<void> {
    const promises: Promise<void>[] = [];

    // Group spawned tiles by column so each column's tiles stagger
    // starting above the board — topmost spawn slot is furthest above.
    const byCol = new Map<number, GridPos[]>();
    for (const pos of spawned) {
      if (!byCol.has(pos.col)) byCol.set(pos.col, []);
      byCol.get(pos.col)!.push(pos);
    }

    for (const [, colPoses] of byCol) {
      // Sort top-to-bottom so col slot 0 gets the highest start position
      colPoses.sort((a, b) => a.row - b.row);
      colPoses.forEach((pos, slotIdx) => {
        const tv = this.tiles[pos.row][pos.col];
        tv.setType(state.cells[pos.row][pos.col]);
        tv.visible = true;
        tv.alpha = 1;
        tv.scale.set(1);
        const targetY = this.tileY(pos.row);
        // Start above the board; stagger by slot so they don't all overlap
        const startY = this.tileY(0) - (colPoses.length - slotIdx) * (TILE_SIZE + GAP);
        tv.position.set(this.tileX(pos.col), startY);
        const dist = targetY - startY;
        const duration = 220 + dist * 0.6;
        promises.push(animator.tween({
          duration, from: startY, to: targetY,
          onUpdate: y => { tv.y = y; },
          easing: easeOutBounce,
        }));
      });
    }
    await Promise.all(promises);
  }

  async animateExpand(state: BoardState): Promise<void> {
    const oldCols = this.cols, oldRows = this.rows;
    this.cols = state.cols;
    this.rows = state.rows;

    // Add new tile views for expanded cells
    for (let r = 0; r < state.rows; r++) {
      if (!this.tiles[r]) this.tiles[r] = [];
      for (let c = 0; c < state.cols; c++) {
        if (!this.tiles[r][c]) {
          const tv = new TileView(state.cells[r][c]);
          tv.position.set(this.tileX(c), this.tileY(r));
          tv.alpha = 0; tv.scale.set(0);
          this.addChild(tv);
          this.tiles[r][c] = tv;
        }
      }
    }

    // Animate board to new centered position + pop in new tiles
    this.centerOnScreen();

    const newTiles: TileView[] = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (r >= oldRows || c >= oldCols) newTiles.push(this.tiles[r][c]);
      }
    }

    await Promise.all(newTiles.map((tv, i) =>
      new Promise<void>(resolve => setTimeout(() =>
        animator.tween({ duration: 250, from: 0, to: 1,
          onUpdate: s => { tv.scale.set(s); tv.alpha = s; },
          easing: easeOutBack,
        }).then(resolve)
      , i * 20))
    ));
  }

  shakeInvalidSwap(a: GridPos, b: GridPos): void {
    this.tiles[a.row][a.col].shake();
    this.tiles[b.row][b.col].shake();
  }
}
