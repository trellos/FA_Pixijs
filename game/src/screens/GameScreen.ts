import { Application, Container, Graphics } from 'pixi.js';
import { BaseScreen } from './BaseScreen';
import { BoardState, createBoardState } from '../board/BoardState';
import { BoardView } from '../board/BoardView';
import { MatchSettler } from '../board/MatchSettler';
import { InputSystem } from '../systems/InputSystem';
import { TimerView } from '../hud/TimerView';
import { ScoreView } from '../hud/ScoreView';
import { GameContext } from '../GameContext';
import { EventBus } from '../utils/EventBus';
import { initBoard } from '../board/BoardLogic';
import type { SwapIntent } from '../utils/Types';
import { EV_SWAP_REQUESTED, EV_GAME_OVER } from '../utils/Types';
import { GameOverScreen } from './GameOverScreen';
import { audioSystem } from '../systems/AudioSystem';
import { RainbowSweepFrame } from '../animations/RainbowSweepFrame';

/**
 * Owns the in-game scene: board, HUD, input plumbing, and the round timer.
 * The match→clear→fall→spawn→expand pipeline lives in `MatchSettler`;
 * GameScreen is the wiring layer between input events, the settler, and
 * the timer's tick-down to game over.
 */
export class GameScreen extends BaseScreen {
  private state!: BoardState;
  private boardView!: BoardView;
  private settler!: MatchSettler;
  private input!: InputSystem;
  private timer!: TimerView;
  private scoreView!: ScoreView;
  private inputArea!: Container;
  private rainbowFx!: RainbowSweepFrame;
  private lastTickSecond = -1;

  constructor(app: Application) {
    super(app);
    this.state = createBoardState();
    initBoard(this.state);
    this.buildUI();
    this.settler = new MatchSettler(
      this.state, this.boardView, this.scoreView, this.rainbowFx,
      (mag, ms) => this.shake(mag, ms),
    );
    EventBus.on(EV_SWAP_REQUESTED, this.onSwapRequested);
    this.exposeTestHooks();
  }

  // ── UI build ─────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const { width: W, height: H } = this.app.screen;

    // Translucent dark overlay — keeps tiles legible while letting the
    // animated synthwave backdrop bleed through.
    const bg = new Graphics().rect(0, 0, W, H).fill({ color: 0x05000a, alpha: 0.45 });
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

    // Rainbow board-expand fanfare overlay — sits above the board so it
    // composites over everything when an expand happens.
    this.rainbowFx = new RainbowSweepFrame(W, H);
    this.addChild(this.rainbowFx);

    // Input
    this.input = new InputSystem(this.inputArea, this.boardView);
    this.input.enable();
  }

  // ── Game loop ─────────────────────────────────────────────────────────────────

  override update(deltaMS: number): void {
    // Rainbow expand FX advances every frame regardless of game phase so it
    // continues to flow during the ANIMATING_EXPAND phase.
    this.rainbowFx.update(deltaMS);

    if (this.state.phase !== 'IDLE') return;

    this.state.timeRemaining -= deltaMS / 1000;
    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.state.phase = 'GAME_OVER';
      audioSystem.playGameOver();
      GameContext.screens.replace(GameOverScreen);
      EventBus.emit(EV_GAME_OVER, this.state.score);
      return;
    }

    this.timer.setTime(this.state.timeRemaining);

    // Tick sound in final 10 seconds — once per whole second
    if (this.state.timeRemaining <= 10) {
      const s = Math.ceil(this.state.timeRemaining);
      if (s !== this.lastTickSecond) {
        this.lastTickSecond = s;
        audioSystem.playTick(1 - this.state.timeRemaining / 10);
      }
    }
  }

  // ── Swap handling ─────────────────────────────────────────────────────────────

  private onSwapRequested = async (intent: SwapIntent): Promise<void> => {
    this.input.disable();
    await this.settler.processSwap(intent);
    this.input.enable();
  };

  // ── Test hooks ────────────────────────────────────────────────────────────────

  private exposeTestHooks(): void {
    if (!import.meta.env.DEV) return;
    interface TestWindow {
      __setBoard: (cells: number[][]) => void;
      __getState: () => { score: number; timeRemaining: number; phase: string; cells: number[][] };
      __triggerSwap: (fc: number, fr: number, tc: number, tr: number) => void;
    }
    const win = window as unknown as TestWindow;
    win.__setBoard = (cells: number[][]) => {
      this.state.cells = cells;
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
    win.__triggerSwap = (fc, fr, tc, tr) => {
      EventBus.emit(EV_SWAP_REQUESTED, { from: { col: fc, row: fr }, to: { col: tc, row: tr } });
    };
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  override onHide(): void {
    EventBus.off(EV_SWAP_REQUESTED, this.onSwapRequested);
    this.input.destroy();
  }
}
