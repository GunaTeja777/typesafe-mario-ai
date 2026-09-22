import { CONSTS, Simulation } from '../engine/simulation';
import {
  marioRunSprites,
  marioJumpSprite,
  marioFallSprite,
  marioDeadSprite,
  goombaSprites,
  koopaSprites,
  koopaShellSprite,
  piranhaSprites,
  starSprites,
  questionBlockSprite,
  emptyBlockSprite,
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
  private coinTick: number = 0;

  // Classic Vibrant Super Mario Parallax Layers
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
    // Classic Bright Super Mario Sky Blue Gradient
    const sky = document.createElement('canvas');
    sky.width = CONSTS.W * 2;
    sky.height = CONSTS.H * 2;
    const sx = sky.getContext('2d')!;
    sx.scale(2, 2);
    const g = sx.createLinearGradient(0, 0, 0, CONSTS.H);
    g.addColorStop(0, '#5c94fc');   // Iconic Nintendo Sky Blue
    g.addColorStop(0.75, '#88b5fc');
    g.addColorStop(1, '#c4dcfe');
    sx.fillStyle = g;
    sx.fillRect(0, 0, CONSTS.W, CONSTS.H);
    this.skyCache = sky;

    // Fluffy White Clouds
    this.cloudLayerCache = this.renderClouds();

    // Rolling Green Hills
    this.hillLayerCache = this.renderHills();
  }

  private renderClouds(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = CONSTS.W * 2;
    c.height = CONSTS.H * 2;
    const x = c.getContext('2d')!;
    x.scale(2, 2);
    const rand = mulberry(42);

    const drawCloud = (cx: number, cy: number, scale: number) => {
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

      x.fillStyle = 'rgba(255, 255, 255, 0.7)';
      x.beginPath();
      x.ellipse(-7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.ellipse(7, 2, 2, 4.5, 0, 0, Math.PI * 2);
      x.fill();

      x.restore();
    };

    for (let i = 0; i < 5; i++) {
      const cx = 70 + i * 160 + rand() * 50;
      const cy = 50 + rand() * 170;
      const scale = 0.85 + rand() * 0.3;
      for (const offset of [-CONSTS.W, 0, CONSTS.W]) {
        drawCloud(cx + offset, cy, scale);
      }
    }
    return c;
  }

  private renderHills(): HTMLCanvasElement {
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
    const overhang = 4;
    const capX = x - overhang;
    const capW = w + overhang * 2;

    // Classic Vibrant NES/SNES Super Mario Green Pipe Palette
    const C_BASE = '#00a800';      // Vibrant classic Nintendo green
    const C_LIME = '#84e400';      // Smooth lime highlight
    const C_GLINT = '#e2fa60';     // Specular glint stripe
    const C_SHADOW = '#006200';    // Deep shaded forest green
    const C_DARK = '#003600';      // Deepest right edge shadow

    // 1. Pipe Body Base
    c.fillStyle = C_BASE;
    c.fillRect(x, y + capH, w, h - capH);

    // Body Highlight Vertical Bands
    c.fillStyle = C_LIME;
    c.fillRect(x + 3, y + capH, 9, h - capH);
    c.fillStyle = C_GLINT;
    c.fillRect(x + 6, y + capH, 4, h - capH);

    // Body Shadow Vertical Bands
    c.fillStyle = C_SHADOW;
    c.fillRect(x + w - 15, y + capH, 9, h - capH);
    c.fillStyle = C_DARK;
    c.fillRect(x + w - 6, y + capH, 6, h - capH);

    // Under-cap Drop Shadow
    c.fillStyle = 'rgba(0, 30, 0, 0.45)';
    c.fillRect(x, y + capH, w, 5);

    // Body Outlines
    c.strokeStyle = '#000000';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x, y + capH);
    c.lineTo(x, y + h);
    c.moveTo(x + w, y + capH);
    c.lineTo(x + w, y + h);
    c.stroke();

    // 2. Pipe Cap
    c.fillStyle = C_BASE;
    c.fillRect(capX, y, capW, capH);

    c.fillStyle = C_LIME;
    c.fillRect(capX, y, overhang + 3, capH);
    c.fillRect(x + 3, y, 9, capH);
    c.fillStyle = C_GLINT;
    c.fillRect(x + 6, y, 4, capH);

    c.fillStyle = C_SHADOW;
    c.fillRect(x + w - 15, y, 9, capH);
    c.fillStyle = C_DARK;
    c.fillRect(x + w - 6, y, 6 + overhang, capH);

    c.fillStyle = C_GLINT;
    c.fillRect(capX + 2, y + 1.5, capW - 4, 2);
    c.fillStyle = C_DARK;
    c.fillRect(capX + 1, y + capH - 2, capW - 2, 2);

    c.strokeStyle = '#000000';
    c.lineWidth = 2.5;
    c.strokeRect(capX, y, capW, capH);
  }

  private drawGround(dist: number) {
    const c = this.ctx;
    const gy = CONSTS.GROUND_Y;
    const gh = CONSTS.H - gy;

    // Classic Warm Earthen Mario Soil with Lush Green Grass Cap
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

    // Brick ground mortar lines
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

    c.font = '700 16px "IBM Plex Mono", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'top';

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');

    const scoreStr = `MARIO\n${pad(sim.score, 6)}`;
    const coinStr = `COINS\n🪙 x${pad(sim.coins, 2)}`;
    const fireStr = `AMMO\n🔥 ${pad(sim.fireAmmo, 2)}`;
    const worldStr = `WORLD\n 1-1`;
    const bestStr = `TOP RECORD\n🏆 ${pad(sim.bestScore, 6)}`;

    const drawPill = (txt: string, x: number, y: number, highlight: boolean = false, width: number = 120) => {
      if (highlight) {
        c.save();
        c.fillStyle = 'rgba(234, 88, 12, 0.45)';
        c.strokeStyle = '#f97316';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(x - 6, y - 4, width, 46, 6);
        c.fill();
        c.stroke();
        c.restore();
      }
      c.fillStyle = 'rgba(0, 0, 0, 0.55)';
      c.fillText(txt, x + 1, y + 1);
      c.fillStyle = highlight ? '#ffedd5' : '#ffffff';
      c.fillText(txt, x, y);
    };

    // Clean, perfectly spaced layout across 880px width — zero overlapping!
    drawPill(scoreStr, 30, 16, false, 125);
    drawPill(coinStr, 195, 16, false, 115);
    drawPill(fireStr, 345, 16, sim.fireAmmo > 0, 120);
    drawPill(worldStr, 500, 16, false, 105);
    drawPill(bestStr, 650, 16, sim.score > sim.bestScore && sim.score > 0, 160);

    // Active Starman Power Banner
    if (sim.mario.starTicks > 0) {
      const starTime = (sim.mario.starTicks / 60).toFixed(1);
      c.save();
      c.fillStyle = 'rgba(255, 215, 0, 0.88)';
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(CONSTS.W / 2 - 120, 72, 240, 32, 8);
      c.fill();
      c.stroke();

      c.fillStyle = '#000000';
      c.font = '900 16px "Lilita One", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`🌟 INVINCIBLE STAR: ${starTime}s!`, CONSTS.W / 2, 88);
      c.restore();
    }

    c.restore();
  }

  public render(sim: Simulation) {
    const c = this.ctx;
    c.setTransform(2, 0, 0, 2, 0, 0);

    // Apply Screen Shake
    c.save();
    if (sim.shake > 0.1) {
      c.translate(sim.shakeX, sim.shakeY);
    }

    // 1. Classic Overworld Sky & Parallax
    c.drawImage(this.skyCache, 0, 0, CONSTS.W, CONSTS.H);
    this.drawParallax(this.cloudLayerCache, sim.dist, 0.15);
    this.drawParallax(this.hillLayerCache, sim.dist, 0.45);

    this.coinTick++;
    const coinFrame = Math.floor(this.coinTick / 8) % 4;
    const enemyFrame = Math.floor(sim.dist / 14) % 2;

    // 2. Obstacles & Entities
    for (const ob of sim.obstacles) {
      if (ob.type === 'warp_pipe') {
        // Draw emerging Piranha Plant behind pipe cap
        if (ob.hasPiranha && (ob.plantYOffset || 0) < 0) {
          const plantY = ob.y + (ob.plantYOffset || 0);
          const pFrame = ob.plantBiteFrame || 0;
          c.drawImage(piranhaSprites[pFrame], ob.x + 10, plantY, 36, 44);
        }
        this.drawPipe(ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'block') {
        const by = ob.bounceY ? ob.y + ob.bounceY : ob.y;
        c.drawImage(ob.hit ? emptyBlockSprite : questionBlockSprite, ob.x, by, ob.w, ob.h);
      } else if (ob.type === 'brick') {
        const by = ob.bounceY ? ob.y + ob.bounceY : ob.y;
        c.drawImage(brickBlockSprite, ob.x, by, ob.w, ob.h);
      } else if (ob.type === 'coin' && !ob.collected) {
        c.drawImage(coinSprites[coinFrame], ob.x, ob.y, ob.w, ob.h);
      } else if (ob.type === 'star' && !ob.collected) {
        c.drawImage(starSprites[coinFrame % 4], ob.x, ob.y, ob.w, ob.h);
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

    // 3. Popping Coins
    for (const pc of sim.poppingCoins) {
      const f = Math.floor(pc.frame / 3) % 4;
      c.drawImage(coinSprites[f], pc.x, pc.y, 22, 22);
    }

    // 4. Ground Layer
    this.drawGround(sim.dist);

    // 5. Fireballs
    for (const fb of sim.fireballs) {
      c.save();
      c.translate(fb.x, fb.y);

      const grad = c.createRadialGradient(0, 0, 1, 0, 0, fb.r + 4);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffcc00');
      grad.addColorStop(0.7, '#ff4400');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.arc(0, 0, fb.r + 4, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = '#ff9900';
      c.strokeStyle = '#000000';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 0, fb.r - 2, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.restore();
    }

    // 6. Mario Character
    const m = sim.mario;
    c.save();

    if (m.invincibleTicks > 0 && Math.floor(m.invincibleTicks / 3) % 2 === 0) {
      c.globalAlpha = 0.82;
    }

    c.translate(CONSTS.MARIO_X, m.y);

    const scale = m.isSuper ? 1.25 : 1.0;
    c.scale(scale, scale);

    // Starman Rainbow Chromatic Aura
    if (m.starTicks > 0) {
      c.save();
      const rainbowColors = ['#ffd700', '#ff0055', '#00e5ff', '#38ef7d', '#ff9900'];
      const curColor = rainbowColors[Math.floor(this.coinTick / 3) % rainbowColors.length];
      c.strokeStyle = curColor;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(18, 20, 22, 24, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    if (!m.alive) {
      c.drawImage(marioDeadSprite, -6, -4, 48, 48);
    } else if (!m.isGrounded) {
      c.drawImage(m.vy < 0 ? marioJumpSprite : marioFallSprite, -6, -4, 48, 48);
    } else {
      c.drawImage(marioRunSprites[m.runFrame], -6, -4, 48, 48);
    }
    c.restore();

    // Aerial Stomp Combo Badge
    if (m.comboCount > 1 && m.alive) {
      c.save();
      c.fillStyle = '#facc15';
      c.strokeStyle = '#000000';
      c.lineWidth = 3;
      c.font = '900 15px "Lilita One", sans-serif';
      c.textAlign = 'center';
      const comboTxt = `x${m.comboCount} COMBO!`;
      c.strokeText(comboTxt, CONSTS.MARIO_X + 18, m.y - 14);
      c.fillText(comboTxt, CONSTS.MARIO_X + 18, m.y - 14);
      c.restore();
    }

    // 7. Floating Score Popups
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

    // 8. Particles
    ParticleSystem.updateAndDraw(c, sim.particles);

    // 9. HUD
    this.drawHud(sim);

    c.restore();
  }
}
