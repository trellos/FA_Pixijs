import { Application } from 'pixi.js';
import { ScreenManager } from './systems/ScreenManager';
import { ParticleSystem } from './systems/ParticleSystem';
import { SynthwaveBackground } from './systems/SynthwaveBackground';
import { audioSystem } from './systems/AudioSystem';
import { GameContext } from './GameContext';
import { animator } from './animations/Animator';
import { MainMenuScreen } from './screens/MainMenuScreen';

export class App {
  private pixi!: Application;
  private screens!: ScreenManager;
  private background!: SynthwaveBackground;

  async init(): Promise<void> {
    this.pixi = new Application();

    await this.pixi.init({
      resizeTo: document.getElementById('game-container') ?? window,
      backgroundColor: 0x05000a,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });

    document.getElementById('game-container')!.appendChild(this.pixi.canvas);

    if (import.meta.env.DEV) (window as unknown as { __pixi: Application }).__pixi = this.pixi;

    // Animated synthwave backdrop sits at the bottom of the stage so every screen sees it.
    this.background = new SynthwaveBackground(this.pixi.screen.width, this.pixi.screen.height);
    this.pixi.stage.addChild(this.background);

    this.pixi.renderer.on('resize', (w: number, h: number) => {
      this.background.resize(w, h);
    });

    this.screens = new ScreenManager(this.pixi);
    GameContext.setScreenManager(this.screens);

    const particles = new ParticleSystem(this.pixi);
    GameContext.setParticleSystem(particles);
    this.pixi.stage.addChild(particles.container);

    this.screens.replace(MainMenuScreen);

    // Web Audio requires a user gesture before it will produce sound.
    const startMusic = (): void => {
      audioSystem.startBgm();
      window.removeEventListener('pointerdown', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
    window.addEventListener('pointerdown', startMusic);
    window.addEventListener('keydown', startMusic);

    this.pixi.ticker.add(({ deltaMS }) => {
      this.background.update(deltaMS);
      this.screens.update(deltaMS);
      animator.update(deltaMS);
      particles.update(deltaMS);
    });
  }
}
