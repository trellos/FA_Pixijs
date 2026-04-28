import { linear } from './Easing';

export type EasingFn = (t: number) => number;

export class Tween {
  private elapsed = 0;
  private _done = false;

  constructor(
    private readonly duration: number,
    private readonly from: number,
    private readonly to: number,
    private readonly onUpdate: (value: number) => void,
    private readonly easing: EasingFn = linear,
    private readonly onComplete?: () => void,
  ) {}

  get done(): boolean { return this._done; }

  update(deltaMS: number): void {
    if (this._done) return;
    this.elapsed += deltaMS;
    const t = Math.min(this.elapsed / this.duration, 1);
    this.onUpdate(this.from + (this.to - this.from) * this.easing(t));
    if (t >= 1) {
      this._done = true;
      this.onComplete?.();
    }
  }
}
