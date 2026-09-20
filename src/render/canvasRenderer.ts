import { CONSTS, Simulation } from '../engine/simulation';
import {
  marioRunSprites,
  marioJumpSprite,
  marioDeadSprite,
  goombaSprites,
  koopaSprites,
  koopaShellSprite,
  questionBlockSprite,
  brickBlockSprite,
  mushroomSprite,
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
    const sky = document.createElement('canvas');
    sky.width = CONSTS.W * 2;
    sky.height = CONSTS.H * 2;
    const sx = sky.getContext('2d')!;
    sx.scale(2, 2);

    const g = sx.createLinearGradient(0, 0, 0, CONSTS.H);
    g.addColorStop(0, '#5c94fc');   // Super Mario Sky Blue
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

      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(-22, 0, 16, 0, Math.PI * 2);
      x.arc(0, -9, 21, 0, Math.PI * 2);
      x.arc(22, 0, 16, 0, Math.PI * 2);
      x.rect(-22, -2, 44, 18);
      x.fill();

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

      x.fillStyle = INK;
      x.beginPath();
      x.ellipse(-7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.ellipse(7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.fill();

      x.restore();
    };

    for (let i = 0; i < 5; i++) {
      const cx = 70 + i * 160 + rand() * 50;
      const cy = 50 + rand() * 180;
      const scale = 0.85 + rand() * 0.3;
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

    x.fillStyle = '#00a800';
    x.strokeStyle = INK;
    x.lineWidth = 3;

    x.beginPath();
    x.moveTo(0, CONSTS.GROUND_Y);
    for (let px = 0; px <= CONSTS.W; px += 4) {
      const y = CONSTS.GROUND_Y - 60 + 24 * Math.sin((2 * Math.PI * 2 * px) / CONSTS.W + 0.4) + 10 * Math.sin((2 * Math.PI * 4 * px) / CONSTS.W);
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

  private drawPipe(x: number, y: number, w: number, h: number) {
    const c = this.ctx;
    const capH = 20;
    const overhang = 6;

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

    c.fillStyle = '#002800';
    c.fillRect(capX + 2, y + 2, capW - 4, 3);
  }

  private drawGround(dist: number) {
    const c = this.ctx;
    const gy = CONSTS.GROUND_Y;
    const gh = CONSTS.H - gy;

    c.fillStyle = '#d88b28';
    c.fillRect(0, gy, CONSTS.W, gh);

    c.fillStyle = '#00a800';
    c.fillRect(0, gy, CONSTS.W, 9);
    c.fillStyle = '#74d600';
    c.fillRect(0, gy, CONSTS.W, 3);

    c.strokeStyle = INK;
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, gy);
    c.lineTo(CONSTS.W, gy);
    c.stroke();

    const off = dist % 28;
    for (let x = -off; x < CONSTS.W; x += 28) {
      c.beginPath();
      c.moveTo(x, gy + 9);
      c.lineTo(x, CONSTS.H);
      c.stroke();
    }
    for (let y = gy + 9; y < CONSTS.H; y += 18) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(CONSTS.W, y);
      c.stroke();
    }
  }

  private drawHud(sim: Simulation) {
    const c = this.ctx;
    c.save();

    c.font = '700 18px "IBM Plex Mono", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'top';

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

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

    // Safe margins across widescreen
    drawPill(scoreStr, 34, 18);
    drawPill(coinStr, 220, 18);
    drawPill(worldStr, 410, 18);
    drawPill(genStr, 600, 18);

    c.restore();
  }

  public render(sim: Simulation) {
    const c = this.ctx;
    c.setTransform(2, 0, 0, 2, 0, 0);

    c.drawImage(this.skyCache, 0, 0, CONSTS.W, CONSTS.H);
    this.drawParallax(this.cloudLayerCache, sim.dist, 0.15);
    this.drawParallax(this.hillLayerCache, sim.dist, 0.45);

    this.coinTick++;
    const coinFrame = Math.floor(this.coinTick / 8) % 4;
    const enemyFrame = Math.floor(sim.dist / 14) % 2;

    // Render Obstacles & Entities
    for (const ob of sim.obstacles) {
      if (ob.type === 'warp_pipe') {
        this.drawPipe(ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'block') {
        const by = ob.bounceY ? ob.y + ob.bounceY : ob.y;
        c.drawImage(questionBlockSprite, ob.x, by, ob.w, ob.h);
      } else if (ob.type === 'brick') {
        const by = ob.bounceY ? ob.y + ob.bounceY : ob.y;
        c.drawImage(brickBlockSprite, ob.x, by, ob.w, ob.h);
      } else if (ob.type === 'coin' && !ob.collected) {
        c.drawImage(coinSprites[coinFrame], ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'mushroom' && !ob.collected) {
        c.drawImage(mushroomSprite, ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'goomba') {
        if (ob.alive) {
          c.drawImage(goombaSprites[enemyFrame], ob.x, ob.y, ob.w, ob.h);
        } else {
          c.save();
          c.translate(ob.x, ob.y + 14);
          c.scale(1.2, 0.4);
          c.drawImage(goombaSprites[0], 0, 0, ob.w, ob.h);
          c.restore();
        }
      } else if (ob.type === 'koopa') {
        c.drawImage(koopaSprites[enemyFrame], ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'koopa_shell') {
        c.drawImage(koopaShellSprite, ob.x, ob.y, ob.w, ob.h);
      }
    }

    this.drawGround(sim.dist);

    // Mario Character
    const m = sim.mario;
    c.save();

    // Invincibility flash
    if (m.invincibleTicks > 0 && Math.floor(m.invincibleTicks / 4) % 2 === 0) {
      c.globalAlpha = 0.4;
    }

    c.translate(CONSTS.MARIO_X, m.y);

    const scale = m.isSuper ? 1.25 : 1.0;
    c.scale(scale, scale);

    if (!m.alive) {
      c.drawImage(marioDeadSprite, -6, -4, 48, 48);
    } else if (!m.isGrounded) {
      c.drawImage(marioJumpSprite, -6, -4, 48, 48);
    } else {
      c.drawImage(marioRunSprites[m.runFrame], -6, -4, 48, 48);
    }
    c.restore();

    // Floating Score Popups
    for (const fs of sim.floatingScores) {
      c.save();
      c.globalAlpha = Math.max(0, fs.l);
      c.font = 'bold 16px "Lilita One", sans-serif';
      c.lineWidth = 3;
      c.strokeStyle = '#000000';
      c.strokeText(fs.text, fs.x, fs.y);
      c.fillStyle = fs.color;
      c.fillText(fs.text, fs.x, fs.y);
      c.restore();
    }

    // Particles
    ParticleSystem.updateAndDraw(c, sim.particles);

    // HUD
    this.drawHud(sim);
  }
}
