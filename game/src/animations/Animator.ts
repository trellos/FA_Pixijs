import { Tween, EasingFn } from './Tween';

/**
 * Single ticker for all tweens. Driven from `App.ts` once per frame so pause,
 * background-tab throttling, and frame-rate adaptation all flow through one
 * place. Code wanting to "wait N ms" should use `delay()` rather than
 * `setTimeout`, so timing stays bound to the game's render clock.
 */
class Animator {
  private tweens: Set<Tween> = new Set();

  tween(opts: {
    duration: number;
    from: number;
    to: number;
    onUpdate: (v: number) => void;
    easing?: EasingFn;
    /** Wait this many ms (counted on the same ticker) before starting. */
    delay?: number;
  }): Promise<void> {
    const start = (): Promise<void> => new Promise(resolve => {
      const t = new Tween(opts.duration, opts.from, opts.to, opts.onUpdate, opts.easing, resolve);
      this.tweens.add(t);
    });
    if (!opts.delay || opts.delay <= 0) return start();
    return this.delay(opts.delay).then(start);
  }

  /**
   * Promise that resolves after `ms` of game-ticker time. Use instead of
   * `setTimeout` for animation pacing so it pauses when the ticker pauses.
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const t = new Tween(ms, 0, 1, () => {}, undefined, resolve);
      this.tweens.add(t);
    });
  }

  update(deltaMS: number): void {
    for (const t of this.tweens) {
      t.update(deltaMS);
      if (t.done) this.tweens.delete(t);
    }
  }

  clear(): void {
    this.tweens.clear();
  }
}

export const animator = new Animator();
