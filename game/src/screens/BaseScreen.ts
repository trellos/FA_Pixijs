import { Container, Application } from 'pixi.js';
import { animator } from '../animations/Animator';

export abstract class BaseScreen extends Container {
  constructor(protected readonly app: Application) {
    super();
  }

  onShow(): void {}
  onHide(): void {}
  update(_deltaMS: number): void {}

  /** Shake this screen container for `duration` ms with pixel `intensity`. */
  protected shake(intensity = 10, duration = 350): void {
    const ox = this.x, oy = this.y;
    animator.tween({
      duration,
      from: 1,
      to: 0,
      onUpdate: decay => {
        this.x = ox + (Math.random() - 0.5) * intensity * 2 * decay;
        this.y = oy + (Math.random() - 0.5) * intensity * 2 * decay;
      },
    }).then(() => { this.x = ox; this.y = oy; });
  }
}
