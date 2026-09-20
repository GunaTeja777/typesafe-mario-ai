import { CONSTS, Simulation } from '../engine/simulation';
import {
  marioRunSprites,
  marioJumpSprite,
  marioDeadSprite,
  goombaSprites,
  questionBlockSprite,
  coinSprites
} from './sprites';
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
  private coinTick: number = 0;

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
    g.addColorStop(0.75, '#88b5fc');
    g.addColorStop(1, '#c4dcfe');
    sx.fillStyle = g;
    sx.fillRect(0, 0, CONSTS.W, CONSTS.H);
    this.skyCache = sky;

    this.cloudLayerCache = this.renderMarioClouds();
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

      // Solid white cloud body
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(-22, 0, 16, 0, Math.PI * 2);
      x.arc(0, -9, 21, 0, Math.PI * 2);
      x.arc(22, 0, 16, 0, Math.PI * 2);
      x.rect(-22, -2, 44, 18);
      x.fill();

      // Outer outline
      x.strokeStyle = INK;
      x.lineWidth = 2.5;
      x.lineJoin = 'round';
      x.beginPath();
      x.arc(-22, 0, 16, Math.PI * 0.7, Math.PI * 1.6, false);
      x.arc(0, -9, 21, Math.PI * 1.15, Math.PI * 1.85, false);
      x.arc(22, 0, 16, Math.PI * 1.4, Math.PI * 2.3, false);
      x.lineTo(-22, 16);
      x.closePath();
      x.stroke();

      // Cloud eyes
      x.fillStyle = INK;
      x.beginPath();
      x.ellipse(-7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.ellipse(7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.fill();

      x.restore();
    };

    for (let i = 0; i < 4; i++) {
      const cx = 80 + i * 140 + rand() * 40;
      const cy = 60 + rand() * 160;
      const scale = 0.85 + rand() * 0.25;
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
    x.moveTo(0, CONSTS.GROUND_Y);
    for (let px = 0; px <= CONSTS.W; px += 4) {
      const y = CONSTS.GROUND_Y - 50 + 20 * Math.sin((2 * Math.PI * 2 * px) / CONSTS.W + 0.4) + 8 * Math.sin((2 * Math.PI * 4 * px) / CONSTS.W);
      x.lineTo(px, y);
    }
    x.lineTo(CONSTS.W, CONSTS.GROUND_Y);
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
   * Ground Warp Pipe
   */
  private drawPipe(x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    const capH = 18;
    const overhang = 5;

    // Pipe Body
    const bodyGrad = c.createLinearGradient(x, 0, x + w, 0);
    bodyGrad.addColorStop(0, '#00a800');
    bodyGrad.addColorStop(0.22, '#7ce800');
    bodyGrad.addColorStop(0.45, '#00a800');
    bodyGrad.addColorStop(0.85, '#006400');
    bodyGrad.addColorStop(1, '#004200');

    c.fillStyle = bodyGrad;
    c.fillRect(x, y + capH, w, h - capH);
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.strokeRect(x, y + capH, w, h - capH);

    // Pipe Cap
    const capX = x - overhang;
    const capW = w + overhang * 2;
    const capGrad = c.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, '#00a800');
    capGrad.addColorStop(0.22, '#8ef800');
    capGrad.addColorStop(0.45, '#00a800');
    capGrad.addColorStop(0.85, '#006400');
    capGrad.addColorStop(1, '#004200');

    c.fillStyle = capGrad;
    c.fillRect(capX, y, capW, capH);
    c.strokeRect(capX, y, capW, capH);

    // Inner Opening
    c.fillStyle = '#002800';
    c.fillRect(capX + 2, y + 2, capW - 4, 3);
  }

  /**
   * Super Mario Ground (Brick & Grass)
   */
  private drawGround(dist: number) {
    const c = this.ctx;
    const gy = CONSTS.GROUND_Y;
    const gh = CONSTS.H - gy;

    // Ground Base Orange / Brown
    c.fillStyle = '#d88b28';
    c.fillRect(0, gy, CONSTS.W, gh);

    // Top Green Grass Fringe
    c.fillStyle = '#00a800';
    c.fillRect(0, gy, CONSTS.W, 8);
    c.fillStyle = '#74d600';
    c.fillRect(0, gy, CONSTS.W, 3);

    // Dark Divider Line
    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, gy);
    c.lineTo(CONSTS.W, gy);
    c.stroke();

    // Brick Pattern
    const off = dist % 28;
    for (let x = -off; x < CONSTS.W; x += 28) {
      c.beginPath();
      c.moveTo(x, gy + 8);
      c.lineTo(x, CONSTS.H);
      c.stroke();
    }
    for (let y = gy + 8; y < CONSTS.H; y += 18) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(CONSTS.W, y);
      c.stroke();
    }
  }

  /**
   * Classic Super Mario Arcade HUD
   */
  private drawHud(sim: Simulation) {
    const c = this.ctx;
    c.save();

    c.font = '700 16px "IBM Plex Mono", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'top';

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    // Header values
    const scoreStr = `MARIO\n${pad(sim.score, 6)}`;
    const coinStr = `COINS\n🪙x${pad(sim.coins, 2)}`;
    const worldStr = `WORLD\n 1-1`;
    const genStr = `GEN\n ${sim.gen}`;

    const drawPill = (txt: string, x: number, y: number) => {
      c.fillStyle = 'rgba(0, 0, 0, 0.4)';
      c.fillText(txt, x + 1, y + 1);
      c.fillStyle = '#ffffff';
      c.fillText(txt, x, y);
    };

    drawPill(scoreStr, 28, 16);
    drawPill(coinStr, 170, 16);
    drawPill(worldStr, 310, 16);
    drawPill(genStr, 440, 16);

    c.restore();
  }

  public render(sim: Simulation) {
    const c = this.ctx;
    c.setTransform(2, 0, 0, 2, 0, 0);

    // Sky & Parallax World
    c.drawImage(this.skyCache, 0, 0, CONSTS.W, CONSTS.H);
    this.drawParallax(this.cloudLayerCache, sim.dist, 0.15);
    this.drawParallax(this.hillLayerCache, sim.dist, 0.45);

    // Render Obstacles (Pipes, Blocks, Coins, Goombas)
    this.coinTick++;
    const coinFrame = Math.floor(this.coinTick / 8) % 4;
    const goombaFrame = Math.floor(sim.dist / 14) % 2;

    for (const ob of sim.obstacles) {
      if (ob.type === 'warp_pipe') {
        this.drawPipe(ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'block') {
        const by = ob.bounceY ? ob.y + ob.bounceY : ob.y;
        c.drawImage(questionBlockSprite, ob.x, by, ob.w, ob.h);
      } else if (ob.type === 'coin' && !ob.collected) {
        c.drawImage(coinSprites[coinFrame], ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'goomba') {
        if (ob.alive) {
          c.drawImage(goombaSprites[goombaFrame], ob.x, ob.y, ob.w, ob.h);
        } else {
          // Squished Goomba
          c.save();
          c.translate(ob.x, ob.y + 14);
          c.scale(1.2, 0.4);
          c.drawImage(goombaSprites[0], 0, 0, ob.w, ob.h);
          c.restore();
        }
      }
    }

    // Ground
    this.drawGround(sim.dist);

    // Mario Character
    const m = sim.mario;
    c.save();
    c.translate(CONSTS.MARIO_X, m.y);

    if (!m.alive) {
      c.drawImage(marioDeadSprite, -6, -4, 48, 48);
    } else if (!m.isGrounded) {
      c.drawImage(marioJumpSprite, -6, -4, 48, 48);
    } else {
      c.drawImage(marioRunSprites[m.runFrame], -6, -4, 48, 48);
    }
    c.restore();

    // Particles (coin sparkles / Goomba pops)
    ParticleSystem.updateAndDraw(c, sim.particles);

    // HUD
    this.drawHud(sim);
  }
}
