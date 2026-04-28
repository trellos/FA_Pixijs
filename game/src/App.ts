import { Application } from 'pixi.js';
import { ScreenManager } from './systems/ScreenManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { GameContext } from './GameContext';
import { animator } from './animations/Animator';
import { MainMenuScreen } from './screens/MainMenuScreen';

export class App {
  private pixi!: Application;
  private screens!: ScreenManager;

  async init(): Promise<void> {
    this.pixi = new Application();

    await this.pixi.init({
      resizeTo: document.getElementById('game-container') ?? window,
      backgroundColor: 0x0a0010,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    document.getElementById('game-container')!.appendChild(this.pixi.canvas);

    this.screens = new ScreenManager(this.pixi);
    GameContext.setScreenManager(this.screens);

    const particles = new ParticleSystem(this.pixi);
    GameContext.setParticleSystem(particles);
    this.pixi.stage.addChild(particles.container);

    this.screens.replace(MainMenuScreen);

    this.pixi.ticker.add(({ deltaMS }) => {
      this.screens.update(deltaMS);
      animator.update(deltaMS);
      particles.update(deltaMS);
    });
  }
}
