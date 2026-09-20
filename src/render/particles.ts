import type { Particle } from '../types';

const INK = '#141a3a';

export class ParticleSystem {
  public static updateAndDraw(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    windOffset: number = 0
  ) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx + windOffset * 0.5;
      p.y += p.vy;
      p.vy += 0.14; // gravity
      p.l -= 0.028;

      if (p.l <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.l * 1.5);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 4.5, 2.2, p.r + p.l * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.restore();
    }
  }
}
