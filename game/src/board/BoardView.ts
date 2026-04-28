import { Container, Application, Graphics } from 'pixi.js';
import type { GridPos, MatchResult } from '../utils/Types';
import type { BoardState } from './BoardState';
import { TileView } from './TileView';
import { animator } from '../animations/Animator';
import { easeOutBounce, easeInQuad, easeOutBack } from '../animations/Easing';

const TILE_SIZE = 48;
const GAP = 6;
const STRIDE = TILE_SIZE + GAP;

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

  private tileX(col: number): number { return col * STRIDE + TILE_SIZE / 2; }
  private tileY(row: number): number { return row * STRIDE + TILE_SIZE / 2; }

  boardPixelWidth(): number { return this.cols * STRIDE - GAP; }
  boardPixelHeight(): number { return this.rows * STRIDE - GAP; }

  centerOnScreen(): void {
    const w = this.app.screen.width, h = this.app.screen.height;
    this.x = Math.round((w - this.boardPixelWidth()) / 2);
    this.y = Math.round((h - this.boardPixelHeight()) / 2 - 30);
  }

  tileCenterWorld(pos: GridPos): { x: number; y: number } {
    return { x: this.x + this.tileX(pos.col), y: this.y + this.tileY(pos.row) };
  }

  tileAtPixel(localX: number, localY: number): GridPos | null {
    const col = Math.floor(localX / STRIDE);
    const row = Math.floor(localY / STRIDE);
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

    this.tiles[a.row][a.col] = tvB;
    this.tiles[b.row][b.col] = tvA;
  }

  async animateSwapBack(a: GridPos, b: GridPos): Promise<void> {
    await this.animateSwap(a, b);
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

    // Capsule outline per line
    for (const line of result.lines) {
      const cols = line.tiles.map(p => p.col);
      const rows = line.tiles.map(p => p.row);
      const minC = Math.min(...cols), maxC = Math.max(...cols);
      const minR = Math.min(...rows), maxR = Math.max(...rows);

      const cx = (this.tileX(minC) + this.tileX(maxC)) / 2;
      const cy = (this.tileY(minR) + this.tileY(maxR)) / 2;
      const hw = (this.tileX(maxC) - this.tileX(minC)) / 2 + TILE_SIZE / 2 + 4;
      const hh = (this.tileY(maxR) - this.tileY(minR)) / 2 + TILE_SIZE / 2 + 4;
      const radius = Math.min(hw, hh);

      const gfx = new Graphics();
      gfx.roundRect(-hw, -hh, hw * 2, hh * 2, radius)
        .stroke({ color: 0xffffff, width: 3, alpha: 0.9 });
      gfx.position.set(cx, cy);
      gfx.alpha = 0;
      this.addChild(gfx);

      // Expand on the short axis (height for horizontal, width for vertical)
      if (line.isHorizontal) {
        gfx.scale.set(1, 0);
        promises.push(
          animator.tween({
            duration: 500, from: 0, to: 1,
            onUpdate: t => { gfx.scale.set(1, t); gfx.alpha = 0.9 * (1 - t * 0.6); },
            easing: easeOutBack,
          }).then(() => gfx.destroy()),
        );
      } else {
        gfx.scale.set(0, 1);
        promises.push(
          animator.tween({
            duration: 500, from: 0, to: 1,
            onUpdate: t => { gfx.scale.set(t, 1); gfx.alpha = 0.9 * (1 - t * 0.6); },
            easing: easeOutBack,
          }).then(() => gfx.destroy()),
        );
      }
    }

    // Tile shrink — runs simultaneously with capsules
    for (const key of matched) {
      const [r, c] = key.split(',').map(Number);
      const tv = this.tiles[r][c];
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
      const visible: TileView[] = [];
      const hidden: TileView[] = [];
      for (let r = 0; r < this.rows; r++) {
        (this.tiles[r][c].visible ? visible : hidden).push(this.tiles[r][c]);
      }

      if (hidden.length === 0) continue;

      visible.forEach((tv, i) => {
        const targetRow = hidden.length + i;
        this.tiles[targetRow][c] = tv;
        const targetY = this.tileY(targetRow);
        if (tv.y !== targetY) {
          const dist = Math.abs(targetY - tv.y);
          promises.push(animator.tween({
            duration: 180 + dist * 0.8, from: tv.y, to: targetY,
            onUpdate: y => { tv.y = y; },
            easing: easeOutBounce,
          }));
        }
      });

      hidden.forEach((tv, i) => {
        this.tiles[i][c] = tv;
        tv.position.set(this.tileX(c), this.tileY(i));
      });
    }

    await Promise.all(promises);
  }

  async animateSpawn(spawned: GridPos[], state: BoardState): Promise<void> {
    const promises: Promise<void>[] = [];

    const byCol = new Map<number, GridPos[]>();
    for (const pos of spawned) {
      if (!byCol.has(pos.col)) byCol.set(pos.col, []);
      byCol.get(pos.col)!.push(pos);
    }

    for (const [, colPoses] of byCol) {
      colPoses.sort((a, b) => a.row - b.row);
      colPoses.forEach((pos, slotIdx) => {
        const tv = this.tiles[pos.row][pos.col];
        tv.setType(state.cells[pos.row][pos.col]);
        tv.visible = true;
        tv.alpha = 1;
        tv.scale.set(1);
        const targetY = this.tileY(pos.row);
        const startY = this.tileY(0) - (colPoses.length - slotIdx) * STRIDE;
        tv.position.set(this.tileX(pos.col), startY);
        const dist = targetY - startY;
        promises.push(animator.tween({
          duration: 220 + dist * 0.6, from: startY, to: targetY,
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

    // Create TileViews for all new cells, placed at their target positions
    for (let r = 0; r < state.rows; r++) {
      if (!this.tiles[r]) this.tiles[r] = [];
      for (let c = 0; c < state.cols; c++) {
        if (!this.tiles[r][c]) {
          const tv = new TileView(state.cells[r][c]);
          tv.position.set(this.tileX(c), this.tileY(r));
          tv.alpha = 1;
          tv.scale.set(1);
          this.addChild(tv);
          this.tiles[r][c] = tv;
        }
      }
    }

    this.centerOnScreen();

    const promises: Promise<void>[] = [];

    // New column (c = oldCols): top half slides from above, bottom half from below
    const newColMid = Math.floor((oldRows - 1) / 2);
    for (let r = 0; r < oldRows; r++) {
      const tv = this.tiles[r][oldCols];
      const targetY = this.tileY(r);
      const fromAbove = r <= newColMid;
      const startY = fromAbove
        ? this.tileY(0) - (newColMid - r + 1) * STRIDE * 2
        : this.tileY(oldRows - 1) + (r - newColMid) * STRIDE * 2;
      tv.y = startY;
      const delay = Math.abs(r - newColMid) * 20;
      promises.push(new Promise<void>(resolve =>
        setTimeout(() =>
          animator.tween({ duration: 350, from: startY, to: targetY,
            onUpdate: y => { tv.y = y; }, easing: easeOutBounce,
          }).then(resolve)
        , delay)
      ));
    }

    // New row (r = oldRows): left half slides from left, right half from right
    const newRowMid = Math.floor((state.cols - 1) / 2);
    for (let c = 0; c < state.cols; c++) {
      const tv = this.tiles[oldRows][c];
      const targetX = this.tileX(c);
      const fromLeft = c <= newRowMid;
      const startX = fromLeft
        ? this.tileX(0) - (newRowMid - c + 1) * STRIDE * 2
        : this.tileX(state.cols - 1) + (c - newRowMid) * STRIDE * 2;
      tv.x = startX;
      const delay = Math.abs(c - newRowMid) * 20;
      promises.push(new Promise<void>(resolve =>
        setTimeout(() =>
          animator.tween({ duration: 350, from: startX, to: targetX,
            onUpdate: x => { tv.x = x; }, easing: easeOutBounce,
          }).then(resolve)
        , delay)
      ));
    }

    await Promise.all(promises);
  }

  shakeInvalidSwap(a: GridPos, b: GridPos): void {
    this.tiles[a.row][a.col].shake();
    this.tiles[b.row][b.col].shake();
  }
}
