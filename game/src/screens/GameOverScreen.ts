import { Application, Graphics, Text } from 'pixi.js';
import { BaseScreen } from './BaseScreen';
import { GameContext } from '../GameContext';
import { GameScreen } from './GameScreen';
import { MainMenuScreen } from './MainMenuScreen';
import { EventBus } from '../utils/EventBus';
import { EV_GAME_OVER } from '../utils/Types';
import { i18n } from '../systems/I18nSystem';

export class GameOverScreen extends BaseScreen {
  constructor(app: Application) {
    super(app);
    this.build(0);
    EventBus.on(EV_GAME_OVER, this.onScore as (...args: unknown[]) => void);
  }

  private onScore = (score: unknown): void => {
    this.removeChildren();
    this.build(score as number);
    this.shake(14, 500);
  };

  private build(score: number): void {
    const { width: W, height: H } = this.app.screen;

    const bg = new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0010 });
    this.addChild(bg);

    const title = new Text({ text: i18n.t('gameover.title'), style: {
      fontFamily: 'Courier New', fontSize: 34, fontWeight: 'bold',
      fill: 0xff2d9b, letterSpacing: 8,
    }});
    title.anchor.set(0.5);
    title.position.set(W / 2, H * 0.28);
    this.addChild(title);

    const scoreLbl = new Text({ text: i18n.t('gameover.score'), style: {
      fontFamily: 'Courier New', fontSize: 11, fill: 0x9b59ff, letterSpacing: 4,
    }});
    scoreLbl.anchor.set(0.5);
    scoreLbl.position.set(W / 2, H * 0.42);
    this.addChild(scoreLbl);

    const scoreVal = new Text({ text: String(score), style: {
      fontFamily: 'Courier New', fontSize: 48, fontWeight: 'bold', fill: 0xffdd00,
    }});
    scoreVal.anchor.set(0.5);
    scoreVal.position.set(W / 2, H * 0.50);
    this.addChild(scoreVal);

    this.addChild(this.makeBtn(W / 2, H * 0.68, i18n.t('gameover.play_again'), 0xff2d9b, () => {
      GameContext.screens.replace(GameScreen);
    }));
    this.addChild(this.makeBtn(W / 2, H * 0.80, i18n.t('gameover.main_menu'), 0x9b59ff, () => {
      GameContext.screens.replace(MainMenuScreen);
    }));
  }

  private makeBtn(x: number, y: number, label: string, color: number, cb: () => void): Graphics {
    const btn = new Graphics();
    btn.roundRect(-100, -24, 200, 48, 6).fill({ color: 0x0a0010 }).stroke({ color, width: 1.5, alpha: 0.8 });
    btn.eventMode = 'static'; btn.cursor = 'pointer';
    btn.position.set(x, y);
    const txt = new Text({ text: label, style: {
      fontFamily: 'Courier New', fontSize: 13, fontWeight: 'bold', fill: color, letterSpacing: 4,
    }});
    txt.anchor.set(0.5);
    btn.addChild(txt);
    btn.on('pointerdown', cb);
    return btn;
  }

  override onHide(): void {
    EventBus.off(EV_GAME_OVER, this.onScore as (...args: unknown[]) => void);
  }
}
