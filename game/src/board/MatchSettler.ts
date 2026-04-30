import type { BoardState } from './BoardState';
import type { BoardView } from './BoardView';
import type { ScoreView } from '../hud/ScoreView';
import type { RainbowSweepFrame } from '../animations/RainbowSweepFrame';
import type { SwapIntent, GridPos } from '../utils/Types';
import {
  findMatches, isValidSwap, applySwap,
  clearMatches, applyGravity, spawnTiles, computeScore,
  ensureSolvable, expandBoard,
} from './BoardLogic';
import { EventBus } from '../utils/EventBus';
import {
  EV_SWAP_INVALID, EV_MATCH_FOUND, EV_TILES_FELL,
  EV_TILES_SPAWNED, EV_BOARD_EXPANDED,
} from '../utils/Types';
import { audioSystem } from '../systems/AudioSystem';
import { GameContext } from '../GameContext';
import { getTile, TILE_COUNT } from './tiles';

const EXPAND_EVERY = 4; // lines before board grows
const MAX_COLS = 10;    // hard cap on board width
const FIRST_COLS = 4;   // pre-expand cols at the very first expansion
const LAST_COLS = 9;    // pre-expand cols at the final expansion

/**
 * Owns the match→clear→fall→spawn→expand pipeline. Extracted from
 * `GameScreen` so the orchestrator is decoupled from screen wiring and
 * future game modes (e.g. timed-blitz, puzzle, endless) can reuse the
 * settle loop without inheriting the screen.
 *
 * The settler holds *no own state* — it mutates the `BoardState` it was
 * given and drives the views passed to its constructor. `process()`
 * resolves only when the board is fully idle (no chain reactions left).
 */
export class MatchSettler {
  private settling = false;

  constructor(
    private readonly state: BoardState,
    private readonly boardView: BoardView,
    private readonly scoreView: ScoreView,
    private readonly rainbowFx: RainbowSweepFrame,
    /** Camera-shake hook supplied by the screen — settler doesn't otherwise
     *  need a Container reference. */
    private readonly shake: (mag: number, ms: number) => void,
  ) {}

  get isSettling(): boolean { return this.settling; }

  /**
   * Validate and execute a swap. Returns when the board is fully settled
   * (all chain matches resolved, all expansions finished). Caller is
   * responsible for re-enabling input.
   */
  async processSwap(intent: SwapIntent): Promise<void> {
    if (this.state.phase !== 'IDLE' || this.settling) return;

    const { from, to } = intent;
    if (!this.inBounds(from) || !this.inBounds(to)) return;

    if (!isValidSwap(this.state, intent)) {
      EventBus.emit(EV_SWAP_INVALID, { from, to });
      this.boardView.shakeInvalidSwap(from, to);
      audioSystem.playInvalid();
      this.shake(6, 250);
      return;
    }

    audioSystem.playSwap();
    this.state.phase = 'ANIMATING_SWAP';
    this.state.chainDepth = 0;

    await this.boardView.animateSwap(from, to);
    applySwap(this.state, intent);

    await this.settleLoop();
  }

  // ── Settle loop ─────────────────────────────────────────────────────────────

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

      const maxLen = Math.max(...result.lines.map(l => l.tiles.length));
      if (this.state.chainDepth > 0) audioSystem.playCombo(maxLen);
      else audioSystem.playMatch(maxLen);

      // Per-tile particle burst + behavior hook dispatch.
      // This is where polymorphic tile behavior plugs in: each matched cell
      // gets `tile.onMatch()` called, so future power-ups, area clears, or
      // score multipliers attach to a tile class without touching this loop.
      for (const line of result.lines) {
        for (const pos of line.tiles) {
          const tile = getTile(this.state.cells[pos.row][pos.col]);
          const w = this.boardView.tileCenterWorld(pos);
          GameContext.particles.emit(w.x, w.y, tile.glowColor, 6);
          tile.onMatch({
            pos,
            chainDepth: this.state.chainDepth,
            runLength: line.tiles.length,
          });
        }
      }

      EventBus.emit(EV_MATCH_FOUND, result);

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

      // Expansion is checked after the board is fully filled.
      if (this.state.linesMatchedSinceExpand >= EXPAND_EVERY && this.state.cols < MAX_COLS) {
        await this.runExpansion();
      }

      ensureSolvable(this.state);
    }

    this.state.phase = 'IDLE';
    this.state.chainDepth = 0;
    this.settling = false;
  }

  private async runExpansion(): Promise<void> {
    this.state.phase = 'ANIMATING_EXPAND';
    audioSystem.playExpand();

    // Shower of particles across the whole board
    const bx = this.boardView.x + this.boardView.boardPixelWidth() / 2;
    const by = this.boardView.y + this.boardView.boardPixelHeight() / 2;
    GameContext.particles.emit(bx, by, 0x9b59ff, 60, 220, 130);
    EventBus.emit(EV_BOARD_EXPANDED);

    // Rainbow sweep frame composites over the screen during expand.
    // Magnitude ramps 0→1 across the run of expansions: first expand is
    // small/quick/duotone, the final one is huge/long/full-rainbow.
    const mag = Math.max(0, Math.min(1,
      (this.state.cols - FIRST_COLS) / (LAST_COLS - FIRST_COLS)));
    void this.rainbowFx.play({ centerX: bx, centerY: by, magnitude: mag });

    expandBoard(this.state, TILE_COUNT);
    await this.boardView.animateExpand(this.state);
  }

  private inBounds(p: GridPos): boolean {
    return p.col >= 0 && p.row >= 0 &&
           p.col < this.state.cols && p.row < this.state.rows;
  }
}
