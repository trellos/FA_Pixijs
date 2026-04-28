# DESIGN.md — Synthwave Stage Game Design Specification

## Overview

Synthwave Stage is a mobile-first match-3 puzzle game with a music theme and Outrun/Synthwave aesthetic. Players swap adjacent tiles on a grid to form runs of 3+ matching tiles. Matches clear tiles, earn points, add time, and trigger animated juicy feedback. The board grows over time, unlocking new tile types and increasing complexity.

---

## Core Loop

1. **Swap** — Player drags one tile onto an adjacent tile.
2. **Validate** — If the swap creates no match, tiles shake and snap back. If valid, the swap commits.
3. **Match** — All runs of 3+ identical tiles are identified and cleared with an animation.
4. **Gravity** — Surviving tiles fall to fill gaps; new tiles fall in from the top.
5. **Chain** — If the new board state contains another match, the settle loop repeats (combo).
6. **Score** — Base 10 pts × tiles matched. Combo multiplier scales with chain depth.
7. **Timer** — Every match adds +2s per line; board expansion adds +15s. Game ends at 0s.

---

## Board

| Property | Value |
|---|---|
| Starting size | 4 × 4 |
| Max size | 10 × 10 |
| Expansion trigger | Every 4 lines matched |
| Expansion step | +1 col, +1 row |
| Starting tile types | 3 |
| Max tile types | 9 |
| New type per expansion | Yes (until 9 reached) |

Expansion adds a new rightmost column and bottom row simultaneously. The board re-centers on screen. A time bonus (+15s, capped at 60s) is awarded and a particle shower fires.

The board always has at least one valid swap (`ensureSolvable`). If no valid swap exists after a settlement, the board is shuffled until one is found (up to 100 attempts).

Spawned tiles are generated using match-avoidance logic — they will never form an immediate 3-in-a-row, so players never see tiles appear and immediately vanish.

---

## Tile Types

| # | Name | Color | Glow |
|---|------|-------|------|
| 0 | Record | Dark navy | Cyan `#00aaff` |
| 1 | Fire | Magenta | Orange `#ff6b35` |
| 2 | Amp | Dark brown | Orange `#ff6b35` |
| 3 | Strat | Blue | Cyan `#00aaff` |
| 4 | Les Paul | Magenta | Pink `#ff2d78` |
| 5 | Jet | Silver | Gold `#ffd700` |
| 6 | Cassette | Dark purple | Purple `#9b59ff` |
| 7 | Headphones | Dark grey | Cyan `#00aaff` |
| 8 | Beer | Gold | Gold `#ffd700` |

All tiles are drawn programmatically with PixiJS Graphics (placeholder circles with glow rings). PNG sprites can replace them by swapping `TileView.draw()` without touching any other code.

---

## Scoring

```
base       = matched_tiles × 10
comboBonus = base × chainDepth   (chainDepth = 0 for first match in a chain)
total      = base + comboBonus
```

Chains start at depth 0. Each subsequent auto-match in the same settle loop increments depth by 1. A chain of 3 at depth 2 yields: `30 + 30×2 = 90 pts`.

---

## Timer

- **Starts at:** 60 seconds
- **Countdown:** Real-time (decrements each frame in IDLE phase only)
- **Bonus per line matched:** +2s (capped at 99s)
- **Bonus on board expansion:** +15s (capped at 60s)
- **Game over:** Timer hits 0 → `GAME_OVER` phase → GameOverScreen

---

## Game Phases

```
IDLE               — accepting input, timer counting
ANIMATING_SWAP     — swap animation playing
ANIMATING_MATCH    — matched tiles shrinking/popping
ANIMATING_FALL     — surviving tiles falling
ANIMATING_SPAWN    — new tiles falling in from top
ANIMATING_EXPAND   — board growing
GAME_OVER          — terminal state, no input accepted
```

Input is disabled in all non-IDLE phases (except GAME_OVER which exits the screen).

---

## Visual Style — Synthwave Stage

| Element | Spec |
|---|---|
| Background | Near-black purple `#0a0010` |
| Horizon line | Hot pink `#ff2d9b` glow strip at 60% height |
| Tile background | Dark circle `#0e0020` |
| Tile body | Solid fill using type's `color` |
| Tile ring | Neon stroke using type's `glowColor`, alpha 0.7 |
| Font | Courier New, monospace |
| Score/Timer color | Gold `#ffdd00` / Purple `#9b59ff` |

---

## Animations

| Event | Animation |
|---|---|
| Valid swap | 200ms position lerp |
| Invalid swap | Per-tile shake + screen shake (6px, 250ms) |
| Match | Flash to 1.2× scale, then 280ms shrink to 0 |
| Tile fall | easeOutBounce, distance-proportional duration |
| Tile spawn | Fall from above board, easeOutBounce |
| Board expand | New tiles pop in with staggered easeOutBack |
| Game over | Screen shake (14px, 500ms) |

---

## Audio — Procedural SFX

All sounds are generated with Web Audio API (no external files). No BGM yet.

| Event | Sound |
|---|---|
| Valid swap | Short upward pitch sweep |
| Invalid swap | Two descending sawtooth buzzes |
| Match | C major arpeggio (3 notes, square wave) |
| Combo | Higher faster 4-note arpeggio |
| Board expand | Rising sawtooth sweep + high note |
| Game over | Descending sine + sawtooth drone |

---

## Particles

300-particle pool (Sprites, white circle texture, tinted per tile). Never allocates after initialisation.

| Event | Burst |
|---|---|
| Match | 6 particles per tile, tile's `glowColor` |
| Board expand | 60 particles, purple `#9b59ff`, wide spread |

---

## Screens

| Screen | Behaviour |
|---|---|
| MainMenuScreen | Title, PLAY button, SETTINGS button |
| GameScreen | Full game loop, HUD, board |
| GameOverScreen | Final score, PLAY AGAIN, MAIN MENU |
| SettingsScreen | SFX/BGM volume sliders, EN/JA/ES language picker |

Navigation always uses `GameContext.screens.replace(TargetScreen)`. No screen stack / push-pop.

---

## i18n

Three locales supported: English (`en`), Japanese (`ja`), Spanish (`es`). Translations are embedded directly in `I18nSystem.ts` — no fetch or external JSON files. Locale persists for the session (not saved to localStorage). Language can be changed in the Settings screen; the screen rebuilds immediately on change.
