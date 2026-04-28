import { Container } from 'pixi.js';
import type { GridPos, SwapIntent } from '../utils/Types';
import { EV_SWAP_REQUESTED } from '../utils/Types';
import { EventBus } from '../utils/EventBus';
import type { BoardView } from '../board/BoardView';

const DRAG_THRESHOLD = 12; // px before a drag is committed

export class InputSystem {
  private dragStart: { x: number; y: number; pos: GridPos } | null = null;
  private active = false;

  constructor(private readonly hitArea: Container, private readonly boardView: BoardView) {
    hitArea.eventMode = 'static';
    hitArea.on('pointerdown', this.onDown, this);
    hitArea.on('pointermove', this.onMove, this);
    hitArea.on('pointerup', this.onUp, this);
    hitArea.on('pointerupoutside', this.onUp, this);
  }

  enable(): void  { this.active = true; }
  disable(): void { this.active = false; this.dragStart = null; }

  private onDown(e: { global: { x: number; y: number } }): void {
    if (!this.active) return;
    const local = this.boardView.toLocal(e.global);
    const pos = this.boardView.tileAtPixel(local.x, local.y);
    if (pos) this.dragStart = { x: e.global.x, y: e.global.y, pos };
  }

  private onMove(e: { global: { x: number; y: number } }): void {
    if (!this.active || !this.dragStart) return;
    const dx = e.global.x - this.dragStart.x;
    const dy = e.global.y - this.dragStart.y;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    const from = this.dragStart.pos;
    const to: GridPos = Math.abs(dx) > Math.abs(dy)
      ? { col: from.col + (dx > 0 ? 1 : -1), row: from.row }
      : { col: from.col, row: from.row + (dy > 0 ? 1 : -1) };

    this.dragStart = null;
    const intent: SwapIntent = { from, to };
    EventBus.emit(EV_SWAP_REQUESTED, intent);
  }

  private onUp(): void {
    this.dragStart = null;
  }

  destroy(): void {
    this.hitArea.off('pointerdown', this.onDown, this);
    this.hitArea.off('pointermove', this.onMove, this);
    this.hitArea.off('pointerup', this.onUp, this);
    this.hitArea.off('pointerupoutside', this.onUp, this);
  }
}
