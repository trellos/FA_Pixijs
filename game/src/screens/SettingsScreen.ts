import { Application, Graphics, Text, Container } from 'pixi.js';
import { BaseScreen } from './BaseScreen';
import { GameContext } from '../GameContext';
import { MainMenuScreen } from './MainMenuScreen';
import { audioSystem } from '../systems/AudioSystem';
import { i18n } from '../systems/I18nSystem';

type Locale = 'en' | 'ja' | 'es';

export class SettingsScreen extends BaseScreen {
  constructor(app: Application) {
    super(app);
    this.build();
  }

  private build(): void {
    const { width: W, height: H } = this.app.screen;
    const bg = new Graphics().rect(0, 0, W, H).fill({ color: 0x0a0010 });
    this.addChild(bg);

    const title = new Text({ text: i18n.t('settings.title'), style: {
      fontFamily: 'Courier New', fontSize: 22, fontWeight: 'bold',
      fill: 0x9b59ff, letterSpacing: 6,
    }});
    title.anchor.set(0.5);
    title.position.set(W / 2, H * 0.18);
    this.addChild(title);

    this.addChild(this.makeSlider(W / 2, H * 0.35, i18n.t('settings.sfx'),
      audioSystem.sfxVolume, v => audioSystem.setSfxVolume(v)));

    this.addChild(this.makeSlider(W / 2, H * 0.49, i18n.t('settings.bgm'),
      audioSystem.bgmVolume, v => audioSystem.setBgmVolume(v)));

    this.addChild(this.makeLangPicker(W / 2, H * 0.63));

    this.addChild(this.makeButton(W / 2, H * 0.78, i18n.t('settings.back'), 0x9b59ff,
      () => GameContext.screens.replace(MainMenuScreen)));
  }

  private makeLangPicker(x: number, y: number): Container {
    const c = new Container();
    c.position.set(x, y);

    const lbl = new Text({ text: i18n.t('settings.language'), style: {
      fontFamily: 'Courier New', fontSize: 11, fill: 0xaaaacc, letterSpacing: 3,
    }});
    lbl.anchor.set(0.5);
    lbl.position.set(0, -26);
    c.addChild(lbl);

    const locales: { code: Locale; label: string }[] = [
      { code: 'en', label: 'EN' },
      { code: 'ja', label: 'JA' },
      { code: 'es', label: 'ES' },
    ];
    const spacing = 64;
    const startX = -spacing;

    locales.forEach(({ code, label }, i) => {
      const active = i18n.locale === code;
      const color = active ? 0x9b59ff : 0x443366;
      const btn = new Graphics();
      btn.roundRect(-24, -16, 48, 32, 5)
        .fill({ color: active ? 0x1a0a33 : 0x0a0010 })
        .stroke({ color, width: active ? 2 : 1, alpha: 0.9 });
      btn.eventMode = 'static';
      btn.cursor = 'pointer';
      btn.position.set(startX + i * spacing, 0);

      const txt = new Text({ text: label, style: {
        fontFamily: 'Courier New', fontSize: 13, fontWeight: 'bold',
        fill: active ? 0x9b59ff : 0x665588, letterSpacing: 2,
      }});
      txt.anchor.set(0.5);
      btn.addChild(txt);

      btn.on('pointerdown', () => {
        i18n.setLocale(code);
        // Rebuild this screen to reflect new locale immediately
        GameContext.screens.replace(SettingsScreen);
      });
      c.addChild(btn);
    });

    return c;
  }

  private makeSlider(x: number, y: number, label: string, initial: number, onChange: (v: number) => void): Container {
    const TRACK_W = 200, TRACK_H = 6, KNOB_R = 10;
    const c = new Container();
    c.position.set(x, y);

    const lbl = new Text({ text: label, style: {
      fontFamily: 'Courier New', fontSize: 11, fill: 0xaaaacc, letterSpacing: 3,
    }});
    lbl.anchor.set(0.5);
    lbl.position.set(0, -26);
    c.addChild(lbl);

    const track = new Graphics();
    track.roundRect(-TRACK_W / 2, -TRACK_H / 2, TRACK_W, TRACK_H, 3).fill({ color: 0x2a1a4a });
    c.addChild(track);

    const fill = new Graphics();
    c.addChild(fill);

    const knob = new Graphics();
    knob.circle(0, 0, KNOB_R).fill({ color: 0x9b59ff });
    knob.eventMode = 'static';
    knob.cursor = 'pointer';
    c.addChild(knob);

    let dragging = false;
    const setVal = (v: number): void => {
      v = Math.max(0, Math.min(1, v));
      knob.position.set(-TRACK_W / 2 + v * TRACK_W, 0);
      fill.clear();
      fill.roundRect(-TRACK_W / 2, -TRACK_H / 2, v * TRACK_W, TRACK_H, 3).fill({ color: 0x9b59ff });
      onChange(v);
    };
    setVal(initial);

    knob.on('pointerdown', (e) => { dragging = true; e.stopPropagation(); });
    c.eventMode = 'static';
    c.on('pointermove', (e) => {
      if (!dragging) return;
      const local = c.toLocal(e.global);
      setVal((local.x + TRACK_W / 2) / TRACK_W);
    });
    c.on('pointerup', () => { dragging = false; });
    c.on('pointerupoutside', () => { dragging = false; });

    track.eventMode = 'static';
    track.cursor = 'pointer';
    track.on('pointerdown', (e) => {
      const local = c.toLocal(e.global);
      setVal((local.x + TRACK_W / 2) / TRACK_W);
    });

    return c;
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const bg = new Graphics();
    bg.roundRect(-90, -22, 180, 44, 6).fill({ color: 0x0a0010 }).stroke({ color, width: 1.5, alpha: 0.8 });
    c.addChild(bg);
    const txt = new Text({ text: label, style: {
      fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold', fill: color, letterSpacing: 4,
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
