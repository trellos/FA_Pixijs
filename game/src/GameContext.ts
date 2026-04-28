import type { ScreenManager } from './systems/ScreenManager';
import type { ParticleSystem } from './systems/ParticleSystem';

// Populated once by App.init() — safe to import anywhere after boot
const ctx: { screens: ScreenManager | null; particles: ParticleSystem | null } = {
  screens: null,
  particles: null,
};

export const GameContext = {
  setScreenManager(sm: ScreenManager): void { ctx.screens = sm; },
  get screens(): ScreenManager {
    if (!ctx.screens) throw new Error('ScreenManager not initialised');
    return ctx.screens;
  },
  setParticleSystem(ps: ParticleSystem): void { ctx.particles = ps; },
  get particles(): ParticleSystem {
    if (!ctx.particles) throw new Error('ParticleSystem not initialised');
    return ctx.particles;
  },
};
