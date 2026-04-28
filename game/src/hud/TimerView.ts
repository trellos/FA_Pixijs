import { Container, Graphics, Text } from 'pixi.js';

const RADIUS = 44;
const TRACK_WIDTH = 8;

export class TimerView extends Container {
  private arc = new Graphics();
  private timeLabel: Text;
  private totalTime = 60;

  constructor() {
    super();
    // Track ring
    const track = new Graphics();
    track.circle(0, 0, RADIUS - TRACK_WIDTH / 2).stroke({ color: 0x22003a, width: TRACK_WIDTH });
    this.addChild(track);
    this.addChild(this.arc);

    this.timeLabel = new Text({ text: '60', style: {
      fontFamily: 'Courier New',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0xffffff,
    }});
    this.timeLabel.anchor.set(0.5);
    this.addChild(this.timeLabel);
  }

  setTotal(seconds: number): void { this.totalTime = seconds; }

  setTime(seconds: number): void {
    const t = Math.max(0, seconds / this.totalTime);
    const color = seconds <= 5 ? 0xff2222 : seconds <= 10 ? 0xff7700 : 0xff2d9b;

    this.arc.clear();
    this.arc
      .arc(0, 0, RADIUS - TRACK_WIDTH / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t)
      .stroke({ color, width: TRACK_WIDTH, cap: 'round' });

    this.timeLabel.text = String(Math.ceil(seconds));
    this.timeLabel.style.fill = color;
  }
}
