import { Application, Container, Graphics } from 'pixi.js';
import { BaseScreen } from './BaseScreen';
import { BoardState, createBoardState } from '../board/BoardState';
import { BoardView } from '../board/BoardView';
import { InputSystem } from '../systems/InputSystem';
import { TimerView } from '../hud/TimerView';
import { ScoreView } from '../hud/ScoreView';
import { GameContext } from '../GameContext';
import { EventBus } from '../utils/EventBus';
import {
  initBoard, findMatches, isValidSwap, applySwap,
  clearMatches, applyGravity, spawnTiles, computeScore,
  ensureSolvable, expandBoard,
} from '../board/BoardLogic';
import type { SwapIntent } from '../utils/Types';
import {
  EV_SWAP_REQUESTED, EV_SWAP_INVALID, EV_MATCH_FOUND,
  EV_TILES_FELL, EV_TILES_SPAWNED, EV_BOARD_EXPANDED,
  EV_TIMER_CHANGED, EV_SCORE_CHANGED, EV_GAME_OVER,
} from '../utils/Types';
import { GameOverScreen } from './GameOverScreen';
import { audioSystem } from '../systems/AudioSystem';
import { TILE_TYPES } from '../board/TileType';

const EXPAND_EVERY = 4; // lines before board grows

export class GameScreen extends BaseScreen {
  private state!: BoardState;
  private boardView!: BoardView;
  private input!: InputSystem;
  private timer!: TimerView;
  private scoreView!: ScoreView;
  private inputArea!: Container;
  private settling = false;

  constructor(app: Application) {
    super(app);
    this.state = createBoardState();
    initBoard(this.state);
    this.buildUI();
    this.registerEvents();
    this.exposeTestHooks();
  }

  private exposeTestHooks(): void {
    if (!import.meta.env.DEV) return;
    type Win = {
      __setBoard: (cells: number[][]) => void;
      __getState: () => { score: number; timeRemaining: number; phase: string; cells: number[][] };
    };
    const win = window as unknown as Win;
    win.__setBoard = (cells: number[][]) => {
      this.state.cells = cells as BoardState['cells'];
      this.state.cols = cells[0].length;
      this.state.rows = cells.length;
      this.boardView.syncFromState(this.state);
    };
    win.__getState = () => ({
      score: this.state.score,
      timeRemaining: this.state.timeRemaining,
      phase: this.state.phase,
      cells: this.state.cells.map(r => [...r]),
    });
    (win as unknown as Record<string, unknown>).__triggerSwap = (fc: number, fr: number, tc: number, tr: number) => {
      EventBus.emit(EV_SWAP_REQUESTED, { from: { col: fc, row: fr }, to: { col: tc, row: tr } });
    };
  }

  // ── UI build ─────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const { width: W, height: H } = this.app.screen;

    // Dark background
    const bg = new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0010 });
    this.addChild(bg);

    // Board
    this.boardView = new BoardView(this.app);
    this.boardView.syncFromState(this.state);
    this.addChild(this.boardView);

    // Invisible hit-area that covers the full screen for input
    this.inputArea = new Container();
    const hitBg = new Graphics().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0 });
    this.inputArea.addChild(hitBg);
    this.addChild(this.inputArea);

    // HUD — timer top-center, score top-right
    this.timer = new TimerView();
    this.timer.setTotal(this.state.timeRemaining);
    this.timer.setTime(this.state.timeRemaining);
    this.timer.position.set(W / 2, 60);
    this.addChild(this.timer);

    this.scoreView = new ScoreView();
    this.scoreView.position.set(W - 80, 36);
    this.addChild(this.scoreView);

    // Input
    this.input = new InputSystem(this.inputArea, this.boardView);
    this.input.enable();
  }

  private registerEvents(): void {
    EventBus.on(EV_SWAP_REQUESTED, this.onSwapRequested as (...args: unknown[]) => void);
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  override update(deltaMS: number): void {
    if (this.state.phase !== 'IDLE') return;

    this.state.timeRemaining -= deltaMS / 1000;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.phase = 'GAME_OVER';
      audioSystem.playGameOver();
      EventBus.emit(EV_GAME_OVER, this.state.score);
      GameContext.screens.replace(GameOverScreen);
      return;
    }

    this.timer.setTime(this.state.timeRemaining);
    EventBus.emit(EV_TIMER_CHANGED, this.state.timeRemaining);
  }

  // ── Swap handling ─────────────────────────────────────────────────────────────

  private onSwapRequested = async (intent: SwapIntent): Promise<void> => {
    if (this.state.phase !== 'IDLE' || this.settling) return;

    const { from, to } = intent;
    if (from.col < 0 || from.row < 0 || to.col < 0 || to.row < 0 ||
        from.col >= this.state.cols || from.row >= this.state.rows ||
        to.col >= this.state.cols || to.row >= this.state.rows) return;

    if (!isValidSwap(this.state, intent)) {
      EventBus.emit(EV_SWAP_INVALID, intent);
      this.boardView.shakeInvalidSwap(from, to);
      audioSystem.playInvalid();
      this.shake(6, 250);
      return;
    }

    audioSystem.playSwap();
    this.input.disable();
    this.state.phase = 'ANIMATING_SWAP';
    this.state.chainDepth = 0;

    await this.boardView.animateSwap(from, to);
    applySwap(this.state, intent);

    await this.settleLoop();
    this.input.enable();
  };

  // ── Settle loop ───────────────────────────────────────────────────────────────

  private async settleLoop(): Promise<void> {
    this.settling = true;
    let isFirst = true;

    while (true) {
      const result = findMatches(this.state);
      if (result.lines.length === 0) break;

      if (!isFirst) this.state.chainDepth++;
      isFirst = false;

      // Score + timer bonus
      this.state.phase = 'ANIMATING_MATCH';
      const delta = computeScore(result);
      this.state.score += delta.total;
      this.state.linesMatchedSinceExpand += result.lines.length;
      this.state.timeRemaining = Math.min(this.state.timeRemaining + result.lines.length * 2, 99);
      this.scoreView.setScore(this.state.score, this.state.chainDepth);
      if (this.state.chainDepth > 0) audioSystem.playCombo();
      else audioSystem.playMatch();

      // Particle burst at each matched tile using that tile's glow colour
      for (const line of result.lines) {
        for (const pos of line.tiles) {
          const typeId = this.state.cells[pos.row][pos.col] as number;
          const color = TILE_TYPES[typeId]?.glowColor ?? 0xffd700;
          const w = this.boardView.tileCenterWorld(pos);
          GameContext.particles.emit(w.x, w.y, color, 6);
        }
      }

      EventBus.emit(EV_MATCH_FOUND, result);
      EventBus.emit(EV_SCORE_CHANGED, this.state.score);

      await this.boardView.animateMatch(result);
      clearMatches(this.state, result);

      // Gravity + spawn always run before anything else, keeping the board full
      this.state.phase = 'ANIMATING_FALL';
      const moved = applyGravity(this.state);
      EventBus.emit(EV_TILES_FELL, moved);
      await this.boardView.animateFall(moved, this.state);

      this.state.phase = 'ANIMATING_SPAWN';
      const spawned = spawnTiles(this.state);
      EventBus.emit(EV_TILES_SPAWNED, spawned);
      await this.boardView.animateSpawn(spawned, this.state);

      // Expansion is checked after the board is fully filled
      if (this.state.linesMatchedSinceExpand >= EXPAND_EVERY && this.state.cols < 10) {
        this.state.phase = 'ANIMATING_EXPAND';
        audioSystem.playExpand();
        // Shower of particles across the whole board
        const bx = this.boardView.x + this.boardView.boardPixelWidth() / 2;
        const by = this.boardView.y + this.boardView.boardPixelHeight() / 2;
        GameContext.particles.emit(bx, by, 0x9b59ff, 60, 220, 130);
        EventBus.emit(EV_BOARD_EXPANDED);
        expandBoard(this.state);
        await this.boardView.animateExpand(this.state);
      }

      ensureSolvable(this.state);
    }

    this.state.phase = 'IDLE';
    this.state.chainDepth = 0;
    this.settling = false;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  override onHide(): void {
    EventBus.off(EV_SWAP_REQUESTED, this.onSwapRequested as (...args: unknown[]) => void);
    this.input.destroy();
  }
}
