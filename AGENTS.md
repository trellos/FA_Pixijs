# AGENTS.md — AI Governance for Synthwave Stage

This file tells AI coding agents how to work safely in this repo. Read it before touching any file.

---

## What this project is

A mobile-first match-3 web game. Music theme (guitars, amps, records, cassettes). Synthwave/Outrun visual style. Built with PixiJS v8 + TypeScript + Vite, living in `game/`. A standalone HTML mockup for iterating tile art lives at `mockup.html`.

---

## Directory map

```
FA_Pixijs/
├── AGENTS.md          ← you are here
├── DESIGN.md          ← full game design spec
├── DECISIONS.md       ← architectural decisions + accepted tradeoffs
├── SYSTEM_MAP.md      ← system responsibilities + event flow
├── mockup.html        ← standalone Canvas tile-art mockup (no build step)
├── refs.html          ← pixel art reference viewer
└── game/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── playwright.config.ts
    ├── index.html
    ├── tests/
    │   ├── logic.spec.ts   ← pure logic unit tests (no browser)
    │   └── e2e.spec.ts     ← Playwright browser E2E tests
    └── src/
        ├── main.ts
        ├── App.ts
        ├── GameContext.ts       ← singleton access to ScreenManager
        ├── animations/
        │   ├── Animator.ts      ← tween runner (module singleton)
        │   ├── Tween.ts
        │   └── Easing.ts
        ├── board/
        │   ├── BoardLogic.ts    ← ALL pure game logic (zero PixiJS imports)
        │   ├── BoardState.ts    ← plain data types only
        │   ├── BoardView.ts     ← PixiJS rendering + animations
        │   ├── TileType.ts      ← tile definitions + color table
        │   └── TileView.ts      ← single tile container
        ├── hud/
        │   ├── TimerView.ts
        │   └── ScoreView.ts
        ├── screens/
        │   ├── BaseScreen.ts
        │   ├── MainMenuScreen.ts
        │   ├── GameScreen.ts    ← async settle-loop state machine
        │   ├── GameOverScreen.ts
        │   └── SettingsScreen.ts
        ├── systems/
        │   ├── AudioSystem.ts   ← procedural SFX via Web Audio API
        │   ├── I18nSystem.ts    ← embedded en/ja/es translations; t(key)
        │   ├── InputSystem.ts   ← pointer drag → SwapIntent via EventBus
        │   ├── ParticleSystem.ts← 300-sprite pool; emit() + update()
        │   └── ScreenManager.ts
        └── utils/
            ├── EventBus.ts      ← typed static pub/sub
            ├── MathUtils.ts
            └── Types.ts         ← all shared types + EV_* constants
```

---

## Hard rules

### 1. BoardLogic.ts must never import from PixiJS
`src/board/BoardLogic.ts` and `src/board/BoardState.ts` are pure logic. They have zero PixiJS imports. This is enforced by architectural decision D1 and is the most important invariant in the codebase. If you need to add logic that touches the board, put it there. If it needs PixiJS, put it in `BoardView.ts` or `TileView.ts`.

### 2. All event names live in Types.ts
Every `EV_*` constant is declared in `src/utils/Types.ts`. Never hardcode event name strings elsewhere. If you add a new event, add it there first.

### 3. Run tests before claiming a task is done
```bash
cd game && npm test
```
28 tests (20 unit + 8 E2E) must all pass. The unit tests run without a browser and complete in ~1s. The E2E tests require the Vite dev server (auto-started by Playwright).

### 4. TypeScript strict mode — no `any`, no `@ts-ignore`
`tsconfig.json` has `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`. Run `npx tsc --noEmit` before finishing. Do not use `as any` to silence errors — fix the underlying type issue.

### 5. Tile art stays in TileView.ts / mockup.html only
Tile visual designs are drawn in `TileView.ts` (PixiJS Graphics) for the game, and mirrored in `mockup.html` (Canvas 2D) for design iteration. Do not scatter drawing code elsewhere.

### 6. Screen navigation goes through GameContext.screens
Never instantiate screens directly and attach them to stage. Always use `GameContext.screens.replace(SomeScreen)`.

### 7. Test hooks are DEV-only
`window.__setBoard` and `window.__getState` are gated behind `import.meta.env.DEV`. Do not expose internal state in production builds.

---

## Dev workflow

```bash
# Start dev server
cd game && npm run dev         # http://localhost:5173

# Type-check without building
cd game && npx tsc --noEmit

# Run all tests (unit + browser)
cd game && npm test

# Run only logic unit tests (fast, no browser)
cd game && npm test -- --project=unit

# Run only browser E2E tests
cd game && npm test -- --project=browser

# Serve mockup and reference images
python -m http.server 7832     # from FA_Pixijs/ root
# then open http://localhost:7832/mockup.html
```

---

## What's implemented

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Mockup | Partial | Circle tiles done; guitar pixel art pending separate session |
| 1 — Scaffold | Done | Full directory structure, tsconfig, Vite |
| 2 — Board logic | Done | BoardLogic.ts fully tested (21 unit tests) |
| 3 — Rendering | Done | TileView (distinct-color circles), BoardView |
| 4 — Input + swap | Done | Drag threshold, valid/invalid swap |
| 5 — Gravity + spawn | Done | applyGravity, spawnTiles (match-safe), settleLoop, ensureSolvable |
| 6 — Animations | Done | Animator/Tween/Easing; swap/match/fall/spawn/expand |
| 7 — HUD + timer | Done | TimerView (arc), ScoreView, game-over trigger |
| 8 — Screens | Done | Menu, Game, GameOver, Settings |
| 9 — Audio | Done | AudioSystem.ts — procedural Web Audio SFX, volume controls |
| 10 — Particles | Done | ParticleSystem.ts — 300-sprite pool, match + expand bursts |
| 11 — Board expansion | Done | expandBoard, animateExpand, tile-type unlock |
| 12 — i18n + polish | Done | I18nSystem (en/ja/es), screen shake, language picker |
| 13 — Governance docs | Done | AGENTS.md, DESIGN.md, DECISIONS.md, SYSTEM_MAP.md |

---

## Key palette (Synthwave/Outrun)

| Role | Hex |
|------|-----|
| Background | `#0a0010` |
| Hot pink | `#ff2d9b` |
| Cyan | `#00aaff` |
| Magenta | `#ff2d78` |
| Purple | `#9b59ff` |
| Gold | `#ffd700` |
| Orange | `#ff6b35` |
