import type { Graphics } from 'pixi.js';

/**
 * Shared helper for tiles drawn from a pixel-grid: each non-zero cell becomes
 * a square of the mapped color. Used by guitar tiles for crisp pixel-art look.
 */
export function drawPixelGrid(
  g: Graphics, sz: number,
  grid: number[][], colorMap: Record<number, number>,
): void {
  const cols = grid[0].length, rows = grid.length;
  const px = Math.min(Math.floor(sz * 0.85 / cols), Math.floor(sz * 0.85 / rows));
  const ox = -Math.round((cols * px) / 2);
  const oy = -Math.round((rows * px) / 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      g.rect(ox + c * px, oy + r * px, px, px).fill({ color: colorMap[v] });
    }
  }
}
