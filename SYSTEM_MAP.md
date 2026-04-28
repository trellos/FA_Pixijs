# SYSTEM_MAP.md — System Responsibilities & Event Flow

## System Responsibilities

| System | File | Responsibility |
|---|---|---|
| **App** | `App.ts` | Creates `PIXI.Application`, registers Ticker, initialises all singletons, bootstraps screens |
| **ScreenManager** | `systems/ScreenManager.ts` | Holds current screen; `replace()` swaps screens; delegates `update()` per frame |
| **InputSystem** | `systems/InputSystem.ts` | Converts pointer drag gestures into `SwapIntent`; emits `EV_SWAP_REQUESTED` |
| **AudioSystem** | `systems/AudioSystem.ts` | Generates SFX via Web Audio API oscillators; exposes named play methods |
| **ParticleSystem** | `systems/ParticleSystem.ts` | Manages 300-sprite pool; `emit()` spawns burst; `update()` advances physics each frame |
| **I18nSystem** | `systems/I18nSystem.ts` | Holds current locale; `t(key)` returns translated string; embedded en/ja/es data |
| **Animator** | `animations/Animator.ts` | Module singleton; holds active `Tween` set; `update(deltaMS)` advances all tweens |
| **EventBus** | `utils/EventBus.ts` | Typed static pub/sub; all `EV_*` constants declared in `Types.ts` |
| **GameContext** | `GameContext.ts` | Static accessor for `ScreenManager` and `ParticleSystem`; populated once at boot |
| **BoardLogic** | `board/BoardLogic.ts` | Pure functions: `initBoard`, `findMatches`, `isValidSwap`, `applySwap`, `clearMatches`, `applyGravity`, `spawnTiles`, `computeScore`, `ensureSolvable`, `expandBoard` |
| **BoardState** | `board/BoardState.ts` | Plain data object: `cells[][]`, `score`, `timeRemaining`, `phase`, `unlockedTypes`, etc. |
| **BoardView** | `board/BoardView.ts` | PixiJS Container; builds/syncs tile grid; `animate*()` methods return Promises |
| **TileView** | `board/TileView.ts` | Single tile Container; draws with Graphics; `setType()`, `shake()` |
| **GameScreen** | `screens/GameScreen.ts` | Owns `BoardState`; drives timer; handles `EV_SWAP_REQUESTED`; runs async `settleLoop` |

---

## Boot Sequence

```
main.ts
  └─ new App().init()
       ├─ new PIXI.Application() + init()
       ├─ new ScreenManager(pixi)  → GameContext.setScreenManager()
       ├─ new ParticleSystem(pixi) → GameContext.setParticleSystem()
       │    └─ generates circle RenderTexture, pre-allocates 300 Sprites
       ├─ screens.replace(MainMenuScreen)
       └─ pixi.ticker.add(({ deltaMS }) => {
              screens.update(deltaMS)
              animator.update(deltaMS)
              particles.update(deltaMS)
          })
```

---

## Full Event Flow

### Swap attempt

```
[User drag] ──pointer events──▶ [InputSystem]
                                    │
                              EV_SWAP_REQUESTED { from, to }
                                    │
                            [GameScreen.onSwapRequested]
                                    │
                        ┌───────────┴───────────┐
                  isValidSwap = false       isValidSwap = true
                        │                       │
              EV_SWAP_INVALID             audioSystem.playSwap()
              shakeInvalidSwap()          input.disable()
              audioSystem.playInvalid()   phase = ANIMATING_SWAP
              this.shake(6, 250)          await boardView.animateSwap()
                                          applySwap(state)
                                          await settleLoop()
                                          input.enable()
```

### Settle loop (runs until no matches remain)

```
settleLoop():
  ┌─ findMatches(state)
  │    └─ lines.length === 0 → break → phase = IDLE
  │
  ├─ chainDepth++ (if not first iteration)
  ├─ computeScore → state.score += total
  ├─ state.timeRemaining += lines × 2  (capped at 99)
  ├─ scoreView.setScore()
  ├─ audioSystem.playMatch() or .playCombo()
  ├─ particles.emit() × matched tiles  (tile glowColor, 6 particles each)
  ├─ EV_MATCH_FOUND, EV_SCORE_CHANGED
  │
  ├─ await boardView.animateMatch()    ← tiles flash and shrink
  ├─ clearMatches(state)               ← cells set to -1 sentinel
  │
  ├─ phase = ANIMATING_FALL
  ├─ applyGravity(state)              ← surviving tiles shifted down in cells[][]
  ├─ EV_TILES_FELL
  ├─ await boardView.animateFall()    ← TileViews slide down with easeOutBounce
  │
  ├─ phase = ANIMATING_SPAWN
  ├─ spawnTiles(state)                ← -1 cells filled with safeTile() values
  ├─ EV_TILES_SPAWNED
  ├─ await boardView.animateSpawn()   ← new tiles fall in from above board
  │
  ├─ [if linesMatchedSinceExpand ≥ 4 and cols < 10]
  │    ├─ phase = ANIMATING_EXPAND
  │    ├─ audioSystem.playExpand()
  │    ├─ particles.emit() — 60 purple particles, board center
  │    ├─ EV_BOARD_EXPANDED
  │    ├─ expandBoard(state)          ← cols++, rows++, unlockedTypes++, +15s
  │    └─ await boardView.animateExpand()
  │
  ├─ ensureSolvable(state)
  └─ (loop)
```

### Timer expiry

```
GameScreen.update(deltaMS):
  state.timeRemaining -= deltaMS / 1000
  if timeRemaining ≤ 0:
    phase = GAME_OVER
    audioSystem.playGameOver()
    EV_GAME_OVER(score)
    GameContext.screens.replace(GameOverScreen)
```

### GameOverScreen

```
EV_GAME_OVER(score) ──▶ GameOverScreen.onScore()
                              └─ rebuild UI with final score
                              └─ this.shake(14, 500)
```

---

## Data Flow: Board State ↔ View

```
BoardState (pure data)
    │
    │  syncFromState(state)      ← called after: initBoard, __setBoard, expandBoard
    ▼
BoardView (PixiJS Container)
    │  tiles[row][col]: TileView[][]
    │
    ├─ animateSwap(a, b)         ← tweens positions, swaps tiles[][] entries
    ├─ animateMatch(result)      ← scales+fades matched TileViews, sets visible=false
    ├─ animateFall(moved, state) ← column scan: moves surviving views down, parks cleared at top
    ├─ animateSpawn(spawned, state) ← reuses parked views: setType, fall from above
    └─ animateExpand(state)      ← creates new TileViews for new cells, pop-in animation
```

The `tiles[row][col]` array is the view's source of truth for which `TileView` occupies which grid slot. It must stay in sync with `BoardState.cells[row][col]` at all times. `animateFall` is the most complex sync point — it physically rearranges which TileView object lives at which grid coordinate.

---

## Singleton Instances

| Symbol | Module | Notes |
|---|---|---|
| `animator` | `animations/Animator.ts` | Tween runner, ticked by App |
| `audioSystem` | `systems/AudioSystem.ts` | Lazy AudioContext (resumes on first user gesture) |
| `i18n` | `systems/I18nSystem.ts` | Locale state, default `en` |
| `GameContext` | `GameContext.ts` | Accessor — not a class instance, just a module object |
| `particleSystem` | via `GameContext.particles` | Initialised in App, stored in GameContext |

---

## Test Coverage

| Suite | File | Count | Runner |
|---|---|---|---|
| Unit — board logic | `tests/logic.spec.ts` | 21 tests | Node (no browser) |
| E2E — browser | `tests/e2e.spec.ts` | 8 tests | Chromium via Playwright |

Key invariants verified by tests:
- `spawnTiles` never creates immediate matches (50-trial stress test)
- `findMatches` detects horizontal, vertical, run-of-4, and cross-patterns correctly
- `isValidSwap` correctly accepts/rejects swaps
- `applyGravity` fills gaps correctly
- `expandBoard` increments dimensions and resets counters
- Board starts at 4×4 with score 0 and timer ~60s
- Valid swap increases score and leaves no holes (`cells.flat().every(v => v >= 0)`)
