import { CONSTS, Simulation } from '../engine/simulation';
import { marioSprites } from './sprites';
import { ParticleSystem } from './particles';

const INK = '#000000';

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skyCache!: HTMLCanvasElement;
  private cloudLayerCache!: HTMLCanvasElement;
  private hillLayerCache!: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupResolution();
    this.buildStaticLayers();
  }

  public setupResolution() {
    this.canvas.width = CONSTS.W * 2;
    this.canvas.height = CONSTS.H * 2;
  }

  public buildStaticLayers() {
    // Super Mario Sky
    const sky = document.createElement('canvas');
    sky.width = CONSTS.W * 2;
    sky.height = CONSTS.H * 2;
    const sx = sky.getContext('2d')!;
    sx.scale(2, 2);

    const g = sx.createLinearGradient(0, 0, 0, CONSTS.H);
    g.addColorStop(0, '#5c94fc');   // Classic Mario Sky Blue
    g.addColorStop(0.7, '#88b5fc');
    g.addColorStop(1, '#c4dcfe');
    sx.fillStyle = g;
    sx.fillRect(0, 0, CONSTS.W, CONSTS.H);
    this.skyCache = sky;

    // Mario Puffy Clouds
    this.cloudLayerCache = this.renderMarioClouds();

    // Mario Rolling Green Hills
    this.hillLayerCache = this.renderMarioHills();
  }

  private renderMarioClouds(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = CONSTS.W * 2;
    c.height = CONSTS.H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);
    const rand = mulberry(42);

    const drawMarioCloud = (cx: number, cy: number, scale: number) => {
      x.save();
      x.translate(cx, cy);
      x.scale(scale, scale);

      // Cloud body
      x.fillStyle = '#ffffff';
      x.strokeStyle = INK;
      x.lineWidth = 2.5;

      x.beginPath();
      x.arc(-24, 0, 16, 0, Math.PI * 2);
      x.arc(0, -10, 22, 0, Math.PI * 2);
      x.arc(24, 0, 16, 0, Math.PI * 2);
      x.rect(-24, 0, 48, 16);
      x.fill();
      x.stroke();

      // Mario eyes on clouds
      x.fillStyle = INK;
      x.beginPath();
      x.ellipse(-6, -4, 2, 4.5, 0, 0, Math.PI * 2);
      x.ellipse(6, -4, 2, 4.5, 0, 0, Math.PI * 2);
      x.fill();

      x.restore();
    };

    for (let i = 0; i < 7; i++) {
      const cx = rand() * CONSTS.W;
      const cy = 35 + rand() * 320;
      const scale = 0.75 + rand() * 0.45;
      for (const offset of [-CONSTS.W, 0, CONSTS.W]) {
        drawMarioCloud(cx + offset, cy, scale);
      }
    }
    return c;
  }

  private renderMarioHills(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = CONSTS.W * 2;
    c.height = CONSTS.H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);

    x.fillStyle = '#00a800'; // Mario Hill Green
    x.strokeStyle = INK;
    x.lineWidth = 3;

    x.beginPath();
    x.moveTo(0, CONSTS.H);
    for (let px = 0; px <= CONSTS.W; px += 4) {
      const y = CONSTS.H - 90 + 24 * Math.sin((2 * Math.PI * 2 * px) / CONSTS.W + 0.5) + 12 * Math.sin((2 * Math.PI * 5 * px) / CONSTS.W);
      x.lineTo(px, y);
    }
    x.lineTo(CONSTS.W, CONSTS.H);
    x.closePath();
    x.fill();
    x.stroke();

    return c;
  }

  private drawParallax(img: HTMLCanvasElement, dist: number, speedRatio: number) {
    const off = (dist * speedRatio) % CONSTS.W;
    this.ctx.drawImage(img, -off, 0, CONSTS.W, CONSTS.H);
    this.ctx.drawImage(img, CONSTS.W - off, 0, CONSTS.W, CONSTS.H);
  }

  /**
   * Classic Super Mario Green Warp Pipe
   */
  private drawMarioPipe(p: { x: number; gy: number; gap: number; id: number }) {
    const c = this.ctx;
    const top = p.gy - p.gap / 2;
    const bot = p.gy + p.gap / 2;

    const pipeWidth = CONSTS.PW;
    const capHeight = 24;
    const capOverhang = 7;

    const renderPipeCylinder = (y0: number, y1: number, isTopPipe: boolean) => {
      if (y1 <= y0) return;

      const px = p.x;
      const height = y1 - y0;

      // Pipe Body Gradient
      const bodyGrad = c.createLinearGradient(px, 0, px + pipeWidth, 0);
      bodyGrad.addColorStop(0, '#00a800');    // Mario green
      bodyGrad.addColorStop(0.2, '#74d600');  // highlight line
      bodyGrad.addColorStop(0.4, '#00a800');
      bodyGrad.addColorStop(0.85, '#006400'); // dark green shadow
      bodyGrad.addColorStop(1, '#004200');

      c.fillStyle = bodyGrad;
      c.fillRect(px, y0, pipeWidth, height);
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.strokeRect(px, y0, pipeWidth, height);

      // Pipe Lip / Cap
      const capY = isTopPipe ? y1 - capHeight : y0;
      const capX = px - capOverhang;
      const capW = pipeWidth + capOverhang * 2;

      const capGrad = c.createLinearGradient(capX, 0, capX + capW, 0);
      capGrad.addColorStop(0, '#00a800');
      capGrad.addColorStop(0.2, '#8ae800');
      capGrad.addColorStop(0.4, '#00a800');
      capGrad.addColorStop(0.85, '#006400');
      capGrad.addColorStop(1, '#004200');

      c.fillStyle = capGrad;
      c.fillRect(capX, capY, capW, capHeight);
      c.strokeRect(capX, capY, capW, capHeight);

      // Inner dark rim hole at pipe opening
      c.fillStyle = '#002800';
      if (isTopPipe) {
        c.fillRect(capX + 2, y1 - 4, capW - 4, 4);
      } else {
        c.fillRect(capX + 2, y0, capW - 4, 4);
      }
    };

    // Top Pipe
    renderPipeCylinder(-6, top, true);
    // Bottom Pipe
    renderPipeCylinder(bot, CONSTS.H, false);
  }

  private drawGround(dist: number) {
    const c = this.ctx;
    const y = CONSTS.H - CONSTS.GROUND;

    // Mario Brick Ground Base
    c.fillStyle = '#d88b28'; // Mario ground orange/brown
    c.fillRect(0, y, CONSTS.W, CONSTS.GROUND);

    // Green Grass Fringe on top
    c.fillStyle = '#00a800';
    c.fillRect(0, y, CONSTS.W, 6);
    c.fillStyle = '#74d600';
    c.fillRect(0, y, CONSTS.W, 2);

    // Brick outline pattern
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(CONSTS.W, y);
    c.stroke();

    const off = dist % 32;
    for (let x = -off; x < CONSTS.W; x += 32) {
      c.beginPath();
      c.moveTo(x, y + 6);
      c.lineTo(x, CONSTS.H);
      c.stroke();
    }
  }

  /**
   * HUD matching the exact style from the user's reference screenshot:
   * Points: X
   * Max Points: X
   * Generation: X
   */
  private drawHud(sim: Simulation) {
    const c = this.ctx;
    c.save();

    c.font = '700 24px "IBM Plex Sans", -apple-system, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'top';

    // Drop shadow
    c.fillStyle = 'rgba(0, 0, 0, 0.4)';
    c.fillText(`Points: ${sim.genPoints}`, 22, 20);
    c.fillText(`Max Points: ${sim.bestScore}`, 22, 54);
    c.fillText(`Generation: ${sim.gen}`, 22, 88);

    // Foreground text
    c.fillStyle = '#141414';
    c.fillText(`Points: ${sim.genPoints}`, 20, 18);
    c.fillText(`Max Points: ${sim.bestScore}`, 20, 52);
    c.fillText(`Generation: ${sim.gen}`, 20, 86);

    c.restore();
  }

  public render(sim: Simulation) {
    const c = this.ctx;
    c.setTransform(2, 0, 0, 2, 0, 0);

    // Sky & Parallax Mario World
    c.drawImage(this.skyCache, 0, 0, CONSTS.W, CONSTS.H);
    this.drawParallax(this.cloudLayerCache, sim.dist, 0.15);
    this.drawParallax(this.hillLayerCache, sim.dist, 0.4);

    // Super Mario Warp Pipes
    for (const p of sim.pipes) {
      this.drawMarioPipe(p);
    }

    // Ground
    this.drawGround(sim.dist);

    // Mario Character
    const mario = sim.mario;
    if (mario) {
      c.save();
      c.translate(CONSTS.BX, mario.y);

      // Rotation based on vertical speed
      const angle = Math.max(-0.4, Math.min(0.6, mario.vy * 0.05));
      c.rotate(angle);

      const spriteIdx = !mario.alive ? 2 : (mario.vy < -1 ? 1 : 0);
      c.drawImage(marioSprites[spriteIdx], -28, -32, 64, 64);
      c.restore();

      // Trajectory dots
      if (mario.alive) {
        c.fillStyle = 'rgba(255, 204, 0, 0.6)';
        for (let k = 2; k < Math.min(18, mario.age); k += 3) {
          const idx = (mario.ti - 1 - k + 48) % 24;
          c.beginPath();
          c.arc(CONSTS.BX - k * 3 - 6, mario.tr[idx], 2.5, 0, Math.PI * 2);
          c.fill();
        }
      }
    }

    // Particles (coin sparkles / feather bursts)
    ParticleSystem.updateAndDraw(c, sim.particles);

    // HUD (Points, Max Points, Generation)
    this.drawHud(sim);

    // Flash banner on new generation
    if (sim.flash > 0) {
      c.save();
      c.globalAlpha = Math.min(1, sim.flash * 1.5);
      c.textAlign = 'center';
      c.font = '900 42px "Lilita One", sans-serif';
      c.lineWidth = 7;
      c.strokeStyle = '#000000';
      c.strokeText(`Generation ${sim.gen}`, CONSTS.W / 2, CONSTS.H * 0.35);
      c.fillStyle = '#ffcc00';
      c.fillText(`Generation ${sim.gen}`, CONSTS.W / 2, CONSTS.H * 0.35);
      c.restore();
      sim.flash -= 0.025;
    }
  }
}
