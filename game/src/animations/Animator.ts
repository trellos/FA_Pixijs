import { Tween, EasingFn } from './Tween';

class Animator {
  private tweens: Set<Tween> = new Set();

  tween(opts: {
    duration: number;
    from: number;
    to: number;
    onUpdate: (v: number) => void;
    easing?: EasingFn;
  }): Promise<void> {
    return new Promise(resolve => {
      const t = new Tween(opts.duration, opts.from, opts.to, opts.onUpdate, opts.easing, resolve);
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
