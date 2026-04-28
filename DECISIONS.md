# DECISIONS.md — Architectural Decisions

Each entry records a decision that shaped the codebase, the tradeoff accepted, and whether it's still active or superseded.

---

## D1 — BoardLogic / BoardState have zero PixiJS imports

**Decision:** `BoardLogic.ts` and `BoardState.ts` contain only pure TypeScript. No PixiJS import is ever permitted.

**Why:** Separation of concerns. Logic can be unit-tested in Node without a browser or renderer. It also forces a clean data → view sync contract: `BoardView.syncFromState(state)` is the only legitimate way for rendering to read board data.

**Tradeoff:** Requires explicit `syncFromState()` calls after every mutation; risk of view/state desync if a mutation is forgotten.

**Status:** Active. Enforced by AGENTS.md rule #1. Verified by the unit test suite running in Node.

---

## D2 — Promise-based animation sequencing (await)

**Decision:** Animations are `async` functions that return `Promise<void>`, resolved by the `Animator` tween runner when the tween completes. The settle loop uses `await` to sequence them.

**Why:** Readable linear code for what is inherently a sequential async state machine. Alternatives (callback chains, state flags, coroutines) are more complex to follow.

**Tradeoff:** A `Promise` object is allocated per animation call. Mitigated by short durations — allocations are infrequent and GC pressure is negligible at this scale.

**Status:** Active.

---

## D3 — Single Ticker drives all updates

**Decision:** One `pixi.ticker.add` callback in `App.ts` drives: `ScreenManager.update()`, `animator.update()`, and `particleSystem.update()`.

**Why:** Single authoritative frame loop. Easier to reason about update order. No hidden `requestAnimationFrame` calls that could fire at different times.

**Tradeoff:** All animation is tied to the render frame rate. On low-end devices capped at 30fps, animations will be slower.

**Status:** Active. `TileView.shake()` is a known exception — it uses `requestAnimationFrame` directly for the per-tile shake because it needs to run even during phase transitions. This is acceptable since it is purely cosmetic and short-lived.

---

## D4 — EventBus for cross-system communication

**Decision:** All cross-system events are emitted and received via `EventBus`. All `EV_*` constants live in `Types.ts`.

**Why:** Decouples emitters from receivers. `GameScreen` doesn't need references to `AudioSystem`, `ParticleSystem`, or `ScoreView` to notify them — it just emits.

**Tradeoff:** Event name strings must stay in sync. Mitigated by putting all constants in one file (`Types.ts`) and enforcing it via AGENTS.md rule #2. Type safety for payloads is not enforced at the EventBus level — callers must cast.

**Status:** Active, though audio and particles are now called directly from `GameScreen` rather than via EventBus. This is a deliberate simplification — those systems don't need to be decoupled because they have no other callers.

---

## D5 — Particle pool — no Sprite allocation after init

**Decision:** `ParticleSystem` pre-allocates 300 `Sprite` objects at startup and never allocates during gameplay.

**Why:** Prevents GC spikes during bursts. Particle systems are a classic source of allocation pressure.

**Tradeoff:** Fixed pool size. If 300 simultaneous particles are needed (unlikely at current board sizes), excess bursts are silently dropped.

**Status:** Active. 300 is sufficient for a 10×10 board clearing fully (100 tiles × 6 particles = 600 worst case, but lines never span the entire board simultaneously at that density in practice).

---

## D6 — Board always expands symmetrically (+1 col AND +1 row)

**Decision:** `expandBoard` increments both `cols` and `rows` together, keeping the board square.

**Why:** Simplifies centering math. `BoardView.centerOnScreen()` only needs to handle square boards.

**Tradeoff:** Non-square boards are impossible. This is intentional — asymmetric boards weren't in the design spec.

**Status:** Active.

---

## D7 — spawnTiles uses match-avoidance per cell

**Decision:** `spawnTiles` calls `safeTile()` for each empty cell, which tries tile types in random order and picks the first one that doesn't extend any horizontal or vertical run to ≥ 3.

**Why:** Prevents freshly spawned tiles from immediately creating matches that the settle loop would then clear. This was a visible bug — players saw tiles appear and vanish in the same second.

**Tradeoff:** In degenerate boards (nearly impossible with 3+ types) where every type would create a match, `safeTile` falls back to `randTile`. The settle loop handles it if that occurs.

**Status:** Active. Verified by unit test: `spawnTiles — spawned tiles never create an immediate match` (50 trials).

---

## D8 — Tiles drawn with PixiJS Graphics (placeholder circles)

**Decision:** All tile art is rendered by `TileView.draw()` using `PIXI.Graphics` circles with a coloured body and neon ring. No PNG assets.

**Why:** Enables iteration without a separate asset pipeline. The entire game is self-contained — no `public/assets/` directory required.

**Tradeoff:** Tiles look like coloured circles, not the intended instrument/music icons. Pixel art iteration was deferred to a separate session (Piskel-based design work).

**To replace:** Swap `TileView.draw()` to load a `Sprite` from a texture atlas. `TILE_TYPES[id].color` and `glowColor` remain valid for tinting. Everything else in the codebase is unchanged.

**Status:** Active (placeholder). Pixel art designs are pending.

---

## D9 — Procedural SFX via Web Audio API

**Decision:** `AudioSystem.ts` generates all sounds using `AudioContext` oscillators. No MP3 files.

**Why:** Zero external asset dependencies. Works immediately with no file loading. Gives the game audio feedback without requiring a sound design pass.

**Tradeoff:** Sounds are simple and synthetic. No background music. Replacing with recorded audio requires adding `@pixi/sound` loading and swapping out `AudioSystem`'s methods.

**Status:** Active (placeholder). Real SFX/BGM can be dropped in later.

---

## D10 — Mobile-first with pointer events API

**Decision:** `InputSystem` uses PixiJS pointer events (`pointerdown`, `pointermove`, `pointerup`) which unify mouse and touch. Drag threshold is 12px to accommodate touch imprecision.

**Why:** Single code path for mouse and touch. Works on both desktop and mobile without separate handling.

**Tradeoff:** The drag detection is directional (first axis of movement past threshold wins). Diagonal drags snap to the dominant axis.

**Status:** Active.

---

## D11 — I18n translations embedded in TypeScript

**Decision:** All locale strings are in a `MESSAGES` constant in `I18nSystem.ts`, not in external JSON files.

**Why:** No fetch required, no async loading, no CORS issues, no missing-file errors. Works immediately in any dev or prod environment.

**Tradeoff:** Adding a new language requires a code change. Strings are not accessible to translators without reading TypeScript.

**Status:** Active. Three locales: `en`, `ja`, `es`.

---

## D12 — Screen navigation is replace-only (no stack)

**Decision:** `ScreenManager` only exposes `replace()`. There is no push/pop/back stack.

**Why:** The game has a linear flow (menu → game → gameover → menu). A stack adds complexity without benefit for this navigation model.

**Tradeoff:** Deep navigation trees (e.g., settings sub-pages) would require manual tracking of the "back" destination. Currently acceptable — there is only one level of settings.

**Status:** Active.
