import { Application, Container, Sprite, Graphics } from 'pixi.js';

const POOL_SIZE = 300;

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticleSystem {
  readonly container: Container;
  private pool: Particle[] = [];

  constructor(app: Application) {
    this.container = new Container();

    const gfx = new Graphics().circle(0, 0, 5).fill({ color: 0xffffff });
    const tex = app.renderer.generateTexture(gfx);
    gfx.destroy();

    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.pool.push({ sprite, vx: 0, vy: 0, life: 0, maxLife: 1, active: false });
    }
  }

  /** Burst `count` particles from (x, y) in world coordinates. */
  emit(x: number, y: number, color: number, count: number, spread = 130, upBias = 90): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (p.active || spawned >= count) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = spread * 0.3 + Math.random() * spread;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - upBias;
      p.life = 0.45 + Math.random() * 0.45;
      p.maxLife = p.life;
      p.active = true;
      p.sprite.position.set(x, y);
      p.sprite.tint = color;
      p.sprite.visible = true;
      p.sprite.alpha = 1;
      p.sprite.scale.set(0.4 + Math.random() * 0.9);
      spawned++;
    }
  }

  update(deltaMS: number): void {
    const dt = deltaMS / 1000;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.vy += 320 * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.life -= dt;
      p.sprite.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        p.active = false;
        p.sprite.visible = false;
      }
    }
  }
}
