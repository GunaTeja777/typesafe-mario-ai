import { CONSTS, Simulation } from '../engine/simulation';
import { THEMES } from '../engine/environment';
import { birdSprites } from './sprites';
import { ParticleSystem } from './particles';

const INK = '#141a3a';
const F_UI = '"IBM Plex Sans", system-ui, sans-serif';
const F_DISP = '"Lilita One", "Arial Black", system-ui, sans-serif';

function mulberry(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(a: number, b: number, c: number) {
  const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skyCache!: HTMLCanvasElement;
  private cloudFarCache!: HTMLCanvasElement;
  private cloudNearCache!: HTMLCanvasElement;
  private hillFarCache!: HTMLCanvasElement;
  private hillNearCache!: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupResolution();
    this.buildStaticLayers('cartoon');
  }

  public setupResolution() {
    this.canvas.width = CONSTS.W * 2;
    this.canvas.height = CONSTS.H * 2;
  }

  public buildStaticLayers(themeName: 'cartoon' | 'neon' | 'sunset') {
    const t = THEMES[themeName];

    // Sky
    const sky = document.createElement('canvas');
    sky.width = CONSTS.W * 2;
    sky.height = CONSTS.H * 2;
    const sx = sky.getContext('2d')!;
    sx.scale(2, 2);
    const g = sx.createLinearGradient(0, 0, 0, CONSTS.H);
    g.addColorStop(0, t.skyTop);
    g.addColorStop(0.6, t.skyBot);
    g.addColorStop(1, t.skyBot);
    sx.fillStyle = g;
    sx.fillRect(0, 0, CONSTS.W, CONSTS.H);

    // Sun / Moon
    sx.fillStyle = t.sunColor;
    sx.beginPath();
    sx.arc(92, 118, 28, 0, Math.PI * 2);
    sx.fill();
    this.skyCache = sky;

    // Clouds Far
    this.cloudFarCache = this.renderCloudLayer(5, 7, 0.5, 0.8, t.cloudFarColor);
    // Clouds Near
    this.cloudNearCache = this.renderCloudLayer(8, 5, 0.9, 1.4, t.cloudNearColor);

    // Hills Far
    this.hillFarCache = this.renderHillLayer(t.hillFarColor, CONSTS.H - 120, 26, 2, 5, 0.6);
    // Hills Near
    this.hillNearCache = this.renderHillLayer(t.hillNearColor, CONSTS.H - 70, 18, 3, 7, 2.1);
  }

  private renderCloudLayer(seed: number, n: number, smin: number, smax: number, color: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = CONSTS.W * 2;
    c.height = CONSTS.H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);
    const r = mulberry(seed);
    x.fillStyle = color;

    const drawCloud = (cx: number, cy: number, s: number) => {
      x.beginPath();
      for (const [dx, dy, cr] of [[0, 0, 15], [18, -9, 19], [38, -3, 16], [54, 4, 12], [-13, 5, 11]]) {
        x.arc(cx + dx * s, cy + dy * s, cr * s, 0, Math.PI * 2);
      }
      x.fill();
      rr(x, cx - 22 * s, cy + 2 * s, 86 * s, 14 * s, 7 * s);
      x.fill();
    };

    for (let i = 0; i < n; i++) {
      const cx = r() * CONSTS.W;
      const cy = 30 + r() * 330;
      const s = smin + r() * (smax - smin);
      for (const o of [-CONSTS.W, 0, CONSTS.W]) {
        drawCloud(cx + o, cy, s);
      }
    }
    return c;
  }

  private renderHillLayer(color: string, base: number, amp: number, k1: number, k2: number, ph: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = CONSTS.W * 2;
    c.height = CONSTS.H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(0, CONSTS.H);
    for (let px = 0; px <= CONSTS.W; px += 4) {
      const y = base + amp * Math.sin((2 * Math.PI * k1 * px) / CONSTS.W + ph) + amp * 0.5 * Math.sin((2 * Math.PI * k2 * px) / CONSTS.W + ph * 2);
      x.lineTo(px, y);
    }
    x.lineTo(CONSTS.W, CONSTS.H);
    x.closePath();
    x.fill();
    return c;
  }

  private drawParallax(img: HTMLCanvasElement, dist: number, k: number) {
    const off = (dist * k) % CONSTS.W;
    this.ctx.drawImage(img, -off, 0, CONSTS.W, CONSTS.H);
    this.ctx.drawImage(img, CONSTS.W - off, 0, CONSTS.W, CONSTS.H);
  }

  private drawPipe(p: { x: number; gy: number; gap: number; id: number }, theme: typeof THEMES['cartoon']) {
    const c = this.ctx;
    const top = p.gy - p.gap / 2;
    const bot = p.gy + p.gap / 2;

    const tower = (y0: number, y1: number, seedOff: number) => {
      if (y1 <= y0) return;
      c.fillStyle = theme.pipeColor;
      c.fillRect(p.x, y0, CONSTS.PW, y1 - y0);
      c.fillStyle = theme.pipeHighlight;
      c.fillRect(p.x, y0, 6, y1 - y0);
      c.fillStyle = theme.pipeShadow;
      c.fillRect(p.x + CONSTS.PW - 12, y0, 12, y1 - y0);

      // Brick mortar lines
      c.strokeStyle = 'rgba(20,26,58,0.28)';
      c.lineWidth = 1.5;
      for (let y = y0 + (40 - (((y0 % 40) + 40) % 40)); y < y1; y += 40) {
        c.beginPath();
        c.moveTo(p.x, y);
        c.lineTo(p.x + CONSTS.PW, y);
        c.stroke();
      }

      // Windows
      for (let y = seedOff > 0 ? y0 + 40 : y1 - 52; seedOff > 0 ? y < y1 - 8 : y > y0 + 4; y += seedOff > 0 ? 26 : -26) {
        for (let k = 0; k < 3; k++) {
          const lit = hash(p.id, y | 0, k) > 0.86;
          c.fillStyle = lit ? theme.pipeWindowLit : theme.pipeWindowDark;
          c.fillRect(p.x + 8 + k * 16, y, 10, 13);
          c.fillStyle = 'rgba(255,255,255,0.28)';
          c.fillRect(p.x + 8 + k * 16, y, 3, 13);
        }
      }

      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.strokeRect(p.x, y0, CONSTS.PW, y1 - y0);
    };

    tower(-4, top - 14, 1);
    tower(bot + 14, CONSTS.H, 1);

    // Stone caps
    for (const y of [top - 16, bot]) {
      c.fillStyle = theme.pipeCap;
      c.fillRect(p.x - 7, y, CONSTS.PW + 14, 16);
      c.fillStyle = theme.pipeCapTop;
      c.fillRect(p.x - 7, y, CONSTS.PW + 14, 4);
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.strokeRect(p.x - 7, y, CONSTS.PW + 14, 16);
    }
  }

  private drawGround(dist: number, theme: typeof THEMES['cartoon']) {
    const c = this.ctx;
    const y = CONSTS.H - CONSTS.GROUND;
    c.fillStyle = theme.groundColor;
    c.fillRect(0, y, CONSTS.W, CONSTS.GROUND);
    c.fillStyle = theme.groundSubColor;
    c.fillRect(0, y + 9, CONSTS.W, CONSTS.GROUND - 9);

    c.fillStyle = theme.pipeHighlight;
    const off = dist % 22;
    for (let x = -off; x < CONSTS.W; x += 22) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 5, y - 5);
      c.lineTo(x + 10, y);
      c.fill();
    }
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(CONSTS.W, y);
    c.stroke();
  }

  private drawHud(sim: Simulation) {
    const c = this.ctx;
    c.save();

    // Stats pill
    rr(c, 15, 16, 218, 62, 14);
    c.fillStyle = INK;
    c.fill();
    rr(c, 12, 12, 218, 62, 14);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.stroke();

    c.fillStyle = '#4a5288';
    c.font = '600 11px ' + F_UI;
    c.fillText('GENERATION', 24, 32);
    c.fillText('POINTS', 114, 32);
    c.fillText('BEST', 174, 32);

    c.fillStyle = INK;
    c.font = '400 28px ' + F_DISP;
    c.fillText(sim.gen.toString(), 24, 62);
    c.fillText(sim.genPoints.toString(), 114, 62);
    c.fillText(sim.bestScore.toString(), 174, 62);

    // Alive counts
    rr(c, CONSTS.W - 180, 16, 168, 44, 14);
    c.fillStyle = INK;
    c.fill();
    rr(c, CONSTS.W - 184, 12, 168, 44, 14);
    c.fillStyle = '#ffffff';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.stroke();

    c.font = '400 17px ' + F_DISP;
    for (let s = 0; s < 3; s++) {
      let aliveCount = 0;
      for (const b of sim.birds) {
        if (b.sp === s && b.alive) aliveCount++;
      }
      const x = CONSTS.W - 176 + s * 54;
      c.drawImage(birdSprites[s][0], x - 10, 8, 54, 54);
      c.fillStyle = INK;
      c.fillText(aliveCount.toString(), x + 27, 40);
    }

    // Mutation rate & Wind badge
    c.font = '600 12px ' + F_UI;
    c.lineWidth = 4;
    c.lineJoin = 'round';
    c.strokeStyle = INK;
    const mutText = `Mutation: ${Math.round(sim.mutRate * 100)}%`;
    c.strokeText(mutText, 16, 96);
    c.fillStyle = '#ffffff';
    c.fillText(mutText, 16, 96);

    if (sim.settings.windEnabled) {
      const windText = `Wind: ${sim.env.wind > 0 ? '→' : '←'} ${Math.abs(sim.env.wind).toFixed(1)}kt`;
      c.strokeStyle = INK;
      c.strokeText(windText, 16, 114);
      c.fillStyle = '#ffc933';
      c.fillText(windText, 16, 114);
    }

    c.restore();
  }

  public render(sim: Simulation) {
    const theme = THEMES[sim.settings.theme];
    const c = this.ctx;

    c.setTransform(2, 0, 0, 2, 0, 0);

    // Sky & Parallax
    c.drawImage(this.skyCache, 0, 0, CONSTS.W, CONSTS.H);
    this.drawParallax(this.cloudFarCache, sim.dist, 0.12);
    this.drawParallax(this.hillFarCache, sim.dist, 0.3);
    this.drawParallax(this.cloudNearCache, sim.dist, 0.22);
    this.drawParallax(this.hillNearCache, sim.dist, 0.55);

    // Obstacle pipes
    for (const p of sim.pipes) {
      this.drawPipe(p, theme);
    }

    // Ground
    this.drawGround(sim.dist, theme);

    // Birds
    for (const b of sim.birds) {
      if (!b.alive) continue;
      c.save();
      c.translate(CONSTS.BX + b.jx, b.y);
      c.rotate(Math.max(-0.45, Math.min(0.8, b.vy * 0.055)));

      const spriteSet = b.isHuman ? birdSprites[3] : birdSprites[b.sp];
      const isWingUp = b.vy < -1;
      const sprite = spriteSet[isWingUp ? 1 : 0];

      c.globalAlpha = sim.viewer.includes(b) || b.isHuman ? 1 : 0.85;
      c.drawImage(sprite, -28, -33, 64, 64);

      // Human "YOU" indicator
      if (b.isHuman) {
        c.restore();
        c.save();
        c.fillStyle = '#38ef7d';
        c.strokeStyle = INK;
        c.lineWidth = 2.5;
        c.font = '700 11px ' + F_UI;
        c.textAlign = 'center';
        c.strokeText('YOU', CONSTS.BX + b.jx, b.y - 24);
        c.fillText('YOU', CONSTS.BX + b.jx, b.y - 24);
        c.restore();
        continue;
      }
      c.restore();
    }

    // Champion Trajectory & Rings
    for (let s = 0; s < 3; s++) {
      const v = sim.viewer[s];
      if (!v || !v.alive) continue;

      const n = Math.min(22, v.age - 1);
      for (let k = 2; k < n; k += 3) {
        const i1 = (v.ti - 1 - k + 48) % 24;
        c.globalAlpha = (1 - k / 24) * 0.85;
        c.fillStyle = sim.speciesList[s].color;
        c.beginPath();
        c.arc(CONSTS.BX + v.jx - k * 3 - 8, v.tr[i1], 3.2 - k * 0.07, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = INK;
        c.lineWidth = 1.5;
        c.stroke();
      }

      c.globalAlpha = 1;
      c.beginPath();
      c.arc(CONSTS.BX + v.jx + 2, v.y, CONSTS.R + 11, 0, Math.PI * 2);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 5;
      c.stroke();
      c.strokeStyle = sim.speciesList[s].color;
      c.lineWidth = 2.5;
      c.stroke();
    }

    // Particles
    ParticleSystem.updateAndDraw(c, sim.particles, sim.env.wind);

    // HUD
    this.drawHud(sim);

    // Generation Flash Announcement
    if (sim.flash > 0) {
      c.save();
      c.globalAlpha = Math.min(1, sim.flash * 1.6);
      c.textAlign = 'center';
      c.lineJoin = 'round';
      c.font = '400 46px ' + F_DISP;
      c.lineWidth = 9;
      c.strokeStyle = INK;
      c.strokeText(`Generation ${sim.gen}`, CONSTS.W / 2, CONSTS.H * 0.32);
      c.fillStyle = '#ffffff';
      c.fillText(`Generation ${sim.gen}`, CONSTS.W / 2, CONSTS.H * 0.32);
      c.restore();
      sim.flash -= 0.022;
    }
  }
}
