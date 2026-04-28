import { Application, Graphics, Text, Container } from 'pixi.js';
import { BaseScreen } from './BaseScreen';
import { GameContext } from '../GameContext';
import { GameScreen } from './GameScreen';
import { SettingsScreen } from './SettingsScreen';
import { i18n } from '../systems/I18nSystem';

export class MainMenuScreen extends BaseScreen {
  constructor(app: Application) {
    super(app);
    this.build();
  }

  private build(): void {
    const { width: W, height: H } = this.app.screen;

    const bg = new Graphics();
    bg.rect(0, 0, W, H).fill({ color: 0x0a0010 });
    bg.rect(0, H * 0.6, W, 2).fill({ color: 0xff2d9b, alpha: 0.7 });
    this.addChild(bg);

    const title = new Text({ text: i18n.t('menu.title'), style: {
      fontFamily: 'Courier New', fontSize: 28, fontWeight: 'bold',
      fill: 0xff2d9b, letterSpacing: 6,
    }});
    title.anchor.set(0.5);
    title.position.set(W / 2, H * 0.30);
    this.addChild(title);

    const sub = new Text({ text: i18n.t('menu.subtitle'), style: {
      fontFamily: 'Courier New', fontSize: 11, fill: 0x9b59ff, letterSpacing: 3,
    }});
    sub.anchor.set(0.5);
    sub.position.set(W / 2, H * 0.30 + 38);
    this.addChild(sub);

    this.addChild(this.makeButton(W / 2, H * 0.52, i18n.t('menu.play'), 0xff2d9b, () => {
      GameContext.screens.replace(GameScreen);
    }));

    this.addChild(this.makeButton(W / 2, H * 0.65, i18n.t('menu.settings'), 0x9b59ff, () => {
      GameContext.screens.replace(SettingsScreen);
    }));
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const bg = new Graphics();
    bg.roundRect(-90, -22, 180, 44, 6).fill({ color: 0x0a0010 }).stroke({ color, width: 1.5, alpha: 0.8 });
    c.addChild(bg);

    const txt = new Text({ text: label, style: {
      fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold',
      fill: color, letterSpacing: 4,
    }});
    txt.anchor.set(0.5);
    c.addChild(txt);
    c.position.set(x, y);

    c.on('pointerover', () => { bg.clear(); bg.roundRect(-90,-22,180,44,6).fill({ color, alpha: 0.15 }).stroke({ color, width: 2 }); });
    c.on('pointerout',  () => { bg.clear(); bg.roundRect(-90,-22,180,44,6).fill({ color: 0x0a0010 }).stroke({ color, width: 1.5, alpha: 0.8 }); });
    c.on('pointerdown', onClick);

    return c;
  }
}
