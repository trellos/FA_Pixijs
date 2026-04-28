type Locale = 'en' | 'ja' | 'es';

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    'menu.title':    'SYNTHWAVE STAGE',
    'menu.subtitle': 'MATCH 3 · MUSIC · SYNTHWAVE',
    'menu.play':     'PLAY',
    'menu.settings': 'SETTINGS',
    'settings.title':      'SETTINGS',
    'settings.sfx':        'SFX VOLUME',
    'settings.bgm':        'BGM VOLUME',
    'settings.language':   'LANGUAGE',
    'settings.back':       'BACK',
    'gameover.title':      'GAME OVER',
    'gameover.score':      'SCORE',
    'gameover.play_again': 'PLAY AGAIN',
    'gameover.main_menu':  'MAIN MENU',
  },
  ja: {
    'menu.title':    'シンセウェーブ・ステージ',
    'menu.subtitle': 'マッチ3 · 音楽 · シンセウェーブ',
    'menu.play':     'プレイ',
    'menu.settings': '設定',
    'settings.title':      '設定',
    'settings.sfx':        'SFX 音量',
    'settings.bgm':        'BGM 音量',
    'settings.language':   '言語',
    'settings.back':       '戻る',
    'gameover.title':      'ゲームオーバー',
    'gameover.score':      'スコア',
    'gameover.play_again': 'もう一度',
    'gameover.main_menu':  'メニュー',
  },
  es: {
    'menu.title':    'SYNTHWAVE STAGE',
    'menu.subtitle': 'COMBINA 3 · MÚSICA · SYNTHWAVE',
    'menu.play':     'JUGAR',
    'menu.settings': 'AJUSTES',
    'settings.title':      'AJUSTES',
    'settings.sfx':        'VOLUMEN SFX',
    'settings.bgm':        'VOLUMEN BGM',
    'settings.language':   'IDIOMA',
    'settings.back':       'VOLVER',
    'gameover.title':      'FIN DEL JUEGO',
    'gameover.score':      'PUNTOS',
    'gameover.play_again': 'OTRA VEZ',
    'gameover.main_menu':  'MENÚ',
  },
};

class I18nSystem {
  private _locale: Locale = 'en';

  get locale(): Locale { return this._locale; }

  setLocale(locale: Locale): void { this._locale = locale; }

  t(key: string): string {
    return MESSAGES[this._locale][key] ?? MESSAGES.en[key] ?? key;
  }
}

export const i18n = new I18nSystem();
