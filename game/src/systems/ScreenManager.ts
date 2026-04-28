import { Container, Application } from 'pixi.js';
import { BaseScreen } from '../screens/BaseScreen';

export class ScreenManager {
  private current: BaseScreen | null = null;
  private readonly stage: Container;

  constructor(private readonly app: Application) {
    this.stage = app.stage;
  }

  replace(ScreenClass: new (app: Application) => BaseScreen): void {
    if (this.current) {
      this.current.onHide();
      this.stage.removeChild(this.current);
      this.current.destroy();
    }
    this.current = new ScreenClass(this.app);
    this.stage.addChild(this.current);
    this.current.onShow();
  }

  update(deltaMS: number): void {
    this.current?.update(deltaMS);
  }
}
