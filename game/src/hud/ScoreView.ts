import { Container, Text } from 'pixi.js';
import { animator } from '../animations/Animator';
import { easeOutQuad } from '../animations/Easing';

export class ScoreView extends Container {
  private scoreText: Text;
  private comboText: Text;
  private displayScore = 0;

  constructor() {
    super();
    this.scoreText = new Text({ text: '0', style: {
      fontFamily: 'Courier New',
      fontSize: 32,
      fontWeight: 'bold',
      fill: 0xffdd00,
    }});
    this.scoreText.anchor.set(0.5, 0);

    this.comboText = new Text({ text: '', style: {
      fontFamily: 'Courier New',
      fontSize: 13,
      fontWeight: 'bold',
      fill: 0xff2d9b,
    }});
    this.comboText.anchor.set(0.5, 0);
    this.comboText.y = 38;
    this.comboText.alpha = 0;

    this.addChild(this.scoreText, this.comboText);
  }

  setScore(target: number, chainDepth: number): void {
    const from = this.displayScore;
    animator.tween({
      duration: 300, from, to: target,
      onUpdate: v => {
        this.displayScore = Math.round(v);
        this.scoreText.text = String(this.displayScore);
      },
      easing: easeOutQuad,
    });

    if (chainDepth > 0) {
      this.comboText.text = `✦ COMBO ×${chainDepth + 1}`;
      this.comboText.alpha = 1;
      animator.tween({
        duration: 1200, from: 1, to: 0,
        onUpdate: a => { this.comboText.alpha = a; },
      });
    }
  }
}
