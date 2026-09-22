import { jevClient, JevMarioState } from '../ai/jevClient';
import { sounds } from '../audio/soundEffects';

export interface GroundObstacle {
  id: number;
  type: 'warp_pipe' | 'goomba' | 'koopa' | 'koopa_shell' | 'block' | 'brick' | 'coin' | 'mushroom' | 'star';
  x: number;
  y: number;
  w: number;
  h: number;
  vx?: number;
  vy?: number;
  alive?: boolean;
  collected?: boolean;
  hit?: boolean;
  bounceY?: number;
  // Piranha Plant in pipe
  hasPiranha?: boolean;
  plantYOffset?: number; // 0 to -34 (emerged)
  plantPhase?: number;   // tick counter
  plantBiteFrame?: number;
}

export interface FloatingScore {
  text: string;
  x: number;
  y: number;
  vy: number;
  l: number; // 0..1 life
  color: string;
}

export interface Fireball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alive: boolean;
}

export interface PoppingCoin {
  x: number;
  y: number;
  vy: number;
  frame: number;
  alive: boolean;
}

export interface RunStats {
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  dist: number;
  coins: number;
  enemiesDefeated: number;
  fireballsShot: number;
  maxCombo: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

export const CONSTS = {
  W: 880, // Widescreen Mario Viewport
  H: 640,
  GROUND_Y: 550, // Ground starts at y = 550 (90px tall)
  MARIO_X: 110,
  MARIO_H: 38,
  GRAV: 0.54,
  BASE_JUMP: -9.2, // Base jump impulse for responsive short hop
  RUN_SPEED: 2.2
};

export class Simulation {
  public gen: number = 1;
  public score: number = 0;
  public bestScore: number = 0;
  public coins: number = 0;
  public fireAmmo: number = 0;
  public dist: number = 0;
  public paused: boolean = false;
  public humanControl: boolean = false;
  public flash: number = 0;
  public poppingCoins: PoppingCoin[] = [];
  public lastStage: number = 1;

  // Run statistics
  public enemiesDefeated: number = 0;
  public fireballsShot: number = 0;
  public maxCombo: number = 0;
  public latestStats: RunStats | null = null;
  public onGameOver?: (stats: RunStats) => void;

  // Screen shake
  public shake: number = 0;
  public shakeX: number = 0;
  public shakeY: number = 0;

  // Mario State
  public mario = {
    y: CONSTS.GROUND_Y - CONSTS.MARIO_H,
    vy: 0,
    isGrounded: true,
    alive: true,
    isSuper: false,
    invincibleTicks: 0,
    starTicks: 0,        // Starman power timer
    jumpHolding: false,  // Variable jump key held
    jumpTicks: 0,        // Duration jump key held
    comboCount: 0,       // Aerial stomp streak
    runFrame: 0,
    animTick: 0
  };

  public obstacles: GroundObstacle[] = [];
  public particles: Array<{ x: number; y: number; vx: number; vy: number; l: number; c: string; r: number }> = [];
  public floatingScores: FloatingScore[] = [];
  public fireballs: Fireball[] = [];

  private nextSpawnX: number = 420;
  private objId: number = 0;

  constructor() {
    const savedBest = localStorage.getItem('mario_best_score');
    if (savedBest) {
      this.bestScore = parseInt(savedBest, 10) || 0;
    }
    this.restart();
  }

  public restart() {
    this.mario = {
      y: CONSTS.GROUND_Y - CONSTS.MARIO_H,
      vy: 0,
      isGrounded: true,
      alive: true,
      isSuper: false,
      invincibleTicks: 0,
      starTicks: 0,
      jumpHolding: false,
      jumpTicks: 0,
      comboCount: 0,
      runFrame: 0,
      animTick: 0
    };
    this.score = 0;
    this.coins = 0;
    this.fireAmmo = 0;
    this.dist = 0;
    this.lastStage = 1;
    this.enemiesDefeated = 0;
    this.fireballsShot = 0;
    this.maxCombo = 0;
    this.latestStats = null;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.obstacles = [];
    this.particles = [];
    this.floatingScores = [];
    this.fireballs = [];
    this.poppingCoins = [];
    this.objId = 0;

    sounds.setMusicMode('normal');

    // Runway question box
    this.obstacles.push({
      id: this.objId++,
      type: 'block',
      x: 360,
      y: CONSTS.GROUND_Y - 120,
      w: 32,
      h: 32,
      hit: false
    });

    // Runway bonus coin
    this.obstacles.push({
      id: this.objId++,
      type: 'coin',
      x: 540,
      y: CONSTS.GROUND_Y - 110,
      w: 22,
      h: 22,
      collected: false
    });

    this.nextSpawnX = 860;
    this.fillObstacles();
  }

  public triggerShake(amount: number) {
    this.shake = Math.min(22, this.shake + amount);
  }

  public jump() {
    if (!this.mario.alive) return;
    if (this.mario.isGrounded) {
      this.mario.vy = CONSTS.BASE_JUMP;
      this.mario.isGrounded = false;
      this.mario.jumpHolding = true;
      this.mario.jumpTicks = 0;
      sounds.playJump(1.0);
      this.spawnDust(CONSTS.MARIO_X + 14, CONSTS.GROUND_Y);
    }
  }

  public releaseJump() {
    this.mario.jumpHolding = false;
    // Variable jump cut: if still ascending rapidly, cut vertical momentum smoothly
    if (!this.mario.isGrounded && this.mario.vy < -3.2) {
      this.mario.vy *= 0.52;
    }
  }

  public shoot() {
    if (!this.mario.alive) return;
    if (this.fireAmmo <= 0) {
      this.addScorePopup('NO BULLETS! HIT ? BOX WITH HEAD!', CONSTS.MARIO_X + 10, this.mario.y - 16, '#f59e0b');
      sounds.playClick();
      return;
    }
    this.fireAmmo--;
    this.fireballsShot++;
    this.fireballs.push({
      id: this.objId++,
      x: CONSTS.MARIO_X + 24,
      y: this.mario.y + 14,
      vx: 8.8,
      vy: 1.2,
      r: 7,
      alive: true
    });
    sounds.playFireball();
    this.triggerShake(1.5);
    this.addScorePopup('🔥 SHOOT!', CONSTS.MARIO_X + 20, this.mario.y - 12, '#ff6600');
  }

  public addScorePopup(text: string, x: number, y: number, color: string = '#ffffff') {
    this.floatingScores.push({
      text,
      x,
      y,
      vy: -2,
      l: 1,
      color
    });
  }

  public spawnDust(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x,
        y: y - 2,
        vx: (Math.random() - 0.5) * 3.5,
        vy: -Math.random() * 1.8,
        l: 0.8,
        c: '#ffffff',
        r: Math.random() * 3 + 1
      });
    }
  }

  public getFlowStage(): { stage: number; name: string; tag: string } {
    if (this.dist < 1500) {
      return { stage: 1, name: 'WARMUP', tag: '1-1' };
    } else if (this.dist < 3400) {
      return { stage: 2, name: 'FLOW', tag: '1-2' };
    } else {
      return { stage: 3, name: 'RUSH', tag: '1-3' };
    }
  }

  public getBiome(): { id: 'meadow'; name: 'OVERWORLD'; world: 'WORLD 1-1' } {
    return { id: 'meadow', name: 'OVERWORLD', world: 'WORLD 1-1' };
  }

  public getNextObstacleGap(): number {
    if (this.dist < 1500) {
      return 560 + Math.floor(Math.random() * 160);
    } else if (this.dist < 3400) {
      const progress = (this.dist - 1500) / 1900;
      const base = 520 - progress * 160;
      return Math.round(base + Math.random() * 80);
    } else {
      const lateProgress = Math.min(1, (this.dist - 3400) / 3000);
      const base = 340 - lateProgress * 80;
      return Math.round(base + Math.random() * 70);
    }
  }

  public spawnObstacle(x: number) {
    const r = Math.random();
    const id = this.objId++;
    const isLate = this.dist >= 3400;

    // Pipe with potential Piranha Plant
    if (r < 0.42) {
      const heights = [48, 62, 76];
      const pipeH = heights[Math.floor(Math.random() * heights.length)];
      const hasPlant = this.dist > 1200 && Math.random() < 0.55;

      this.obstacles.push({
        id,
        type: 'warp_pipe',
        x,
        y: CONSTS.GROUND_Y - pipeH,
        w: 56,
        h: pipeH,
        hasPiranha: hasPlant,
        plantYOffset: 0,
        plantPhase: Math.floor(Math.random() * 180),
        plantBiteFrame: 0
      });

      // Spawn ? block or coin overhead after pipe
      if (Math.random() < 0.75) {
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x + 115,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
      }
    } else if (r < 0.75) {
      // Goomba or Koopa Patrol
      const isKoopa = Math.random() < 0.45;
      this.obstacles.push({
        id: this.objId++,
        type: 'block',
        x: x - 45,
        y: CONSTS.GROUND_Y - 120,
        w: 32,
        h: 32,
        hit: false
      });

      if (isKoopa) {
        this.obstacles.push({
          id,
          type: 'koopa',
          x,
          y: CONSTS.GROUND_Y - 34,
          w: 32,
          h: 34,
          alive: true
        });
      } else {
        this.obstacles.push({
          id,
          type: 'goomba',
          x,
          y: CONSTS.GROUND_Y - 30,
          w: 30,
          h: 30,
          alive: true
        });
      }

      // Late stage chain enemy
      if (isLate && Math.random() < 0.4) {
        this.obstacles.push({
          id: this.objId++,
          type: 'goomba',
          x: x + 90,
          y: CONSTS.GROUND_Y - 30,
          w: 30,
          h: 30,
          alive: true
        });
      }
    } else {
      // Brick / Block Platform with Coins
      this.obstacles.push({
        id,
        type: 'brick',
        x,
        y: CONSTS.GROUND_Y - 120,
        w: 32,
        h: 32,
        hit: false
      });
      this.obstacles.push({
        id: this.objId++,
        type: 'block',
        x: x + 34,
        y: CONSTS.GROUND_Y - 120,
        w: 32,
        h: 32,
        hit: false
      });
      this.obstacles.push({
        id: this.objId++,
        type: 'coin',
        x: x + 76,
        y: CONSTS.GROUND_Y - 120,
        w: 22,
        h: 22,
        collected: false
      });
    }
  }

  public fillObstacles() {
    while (this.nextSpawnX < CONSTS.W + 500) {
      this.spawnObstacle(this.nextSpawnX);
      this.nextSpawnX += this.getNextObstacleGap();
    }
  }

  public burstGoomba(x: number, y: number) {
    this.triggerShake(4);
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.7) * 6,
        l: 1,
        c: '#9b4a1b',
        r: Math.random() * 4 + 1
      });
    }
  }

  public popBlock(b: GroundObstacle) {
    b.hit = true;
    b.bounceY = -12;
    this.triggerShake(3);

    // Chance to pop a Super Star if in deep flow!
    const spawnStar = (this.dist > 1600 && Math.random() < 0.28 && this.mario.starTicks <= 0);

    if (spawnStar) {
      this.obstacles.push({
        id: this.objId++,
        type: 'star',
        x: b.x + 4,
        y: b.y - 32,
        w: 24,
        h: 24,
        vx: 3.2,
        vy: -5.5,
        collected: false
      });
      sounds.playPowerUp();
      this.addScorePopup('🌟 SUPER STAR!', b.x - 8, b.y - 32, '#ffd700');
    } else {
      this.coins++;
      this.score += 100;
      this.fireAmmo += 5;
      this.addScorePopup('+5 BULLETS! 🔥', b.x - 12, b.y - 32, '#ff4500');
      this.addScorePopup('+1 🪙', b.x + 8, b.y - 12, '#ffd700');
      sounds.playScore();

      this.poppingCoins.push({
        x: b.x + 6,
        y: b.y - 12,
        vy: -7.5,
        frame: 0,
        alive: true
      });
    }

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: b.x + 16,
        y: b.y - 12,
        vx: (Math.random() - 0.5) * 5,
        vy: -4 - Math.random() * 4,
        l: 1,
        c: i % 2 === 0 ? '#ff7700' : '#ffd700',
        r: Math.random() * 4 + 2
      });
    }
  }

  public popBrick(b: GroundObstacle) {
    b.bounceY = -6;
    sounds.playClick();
    this.score += 50;
    this.fireAmmo += 1;
    this.triggerShake(2);
    this.addScorePopup('+50 & +1 FIRE!', b.x, b.y - 16, '#f97316');
  }

  public killMario() {
    if (this.mario.starTicks > 0) {
      // Star power protects completely!
      return;
    }

    if (this.mario.isSuper) {
      this.mario.isSuper = false;
      this.mario.invincibleTicks = 90;
      this.mario.vy = -6;
      this.triggerShake(8);
      sounds.playCrash();
      this.addScorePopup('SUPER MARIO LOST!', CONSTS.MARIO_X, this.mario.y - 20, '#ef4444');
      return;
    }

    if (this.mario.invincibleTicks > 0) return;

    this.mario.alive = false;
    this.mario.vy = -10;
    this.triggerShake(14);
    sounds.playCrash();
    sounds.playGameOver();

    // Save High Score
    const isNew = this.score > this.bestScore;
    if (isNew) {
      this.bestScore = this.score;
      localStorage.setItem('mario_best_score', String(this.bestScore));
    }

    setTimeout(() => {
      this.gen++;
      this.restart();
    }, 1400);
  }

  public step(nowMs: number) {
    if (this.paused) return;

    const speed = CONSTS.RUN_SPEED;
    this.dist += speed;
    this.nextSpawnX -= speed;

    // Screen Shake Decay
    if (this.shake > 0.2) {
      this.shakeX = (Math.random() - 0.5) * this.shake * 1.5;
      this.shakeY = (Math.random() - 0.5) * this.shake * 1.5;
      this.shake *= 0.86;
    } else {
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Stage progression
    const currentStage = this.getFlowStage().stage;
    if (currentStage > this.lastStage) {
      this.lastStage = currentStage;
      const stageInfo = this.getFlowStage();
      this.addScorePopup(`⚡ ${stageInfo.name} PACING!`, CONSTS.MARIO_X + 15, this.mario.y - 34, '#facc15');
      sounds.playFanfare();
      if (this.mario.starTicks <= 0) {
        sounds.setMusicMode(currentStage === 3 ? 'rush' : 'normal');
      }
    }

    const m = this.mario;

    // Countdown Starman power
    if (m.starTicks > 0) {
      m.starTicks--;
      if (m.starTicks % 3 === 0) {
        // Rainbow sparkle trail
        const hues = ['#ffd700', '#ff0055', '#00ffcc', '#00ff00', '#ff7700'];
        this.particles.push({
          x: CONSTS.MARIO_X + (Math.random() - 0.5) * 20,
          y: m.y + (Math.random() - 0.5) * 24,
          vx: -2 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 3,
          l: 0.6,
          c: hues[Math.floor(Math.random() * hues.length)],
          r: Math.random() * 3 + 1.5
        });
      }
      if (m.starTicks === 0) {
        sounds.setMusicMode(this.getFlowStage().stage === 3 ? 'rush' : 'normal');
        this.addScorePopup('STAR POWER EXPIRED', CONSTS.MARIO_X, m.y - 20, '#cbd5e1');
      }
    }

    // Invincibility countdown
    if (m.invincibleTicks > 0) {
      m.invincibleTicks--;
    }

    // Update Floating Scores
    for (let i = this.floatingScores.length - 1; i >= 0; i--) {
      const fs = this.floatingScores[i];
      fs.y += fs.vy;
      fs.l -= 0.025;
      if (fs.l <= 0) {
        this.floatingScores.splice(i, 1);
      }
    }

    if (m.alive) {
      if (m.isGrounded) {
        m.animTick++;
        if (m.animTick % 6 === 0) {
          m.runFrame = (m.runFrame + 1) % 3;
        }
      }

      // Variable Jump Upward Impulse
      if (m.jumpHolding && m.jumpTicks < 11) {
        m.vy -= 0.42; // Extend jump height while button is held
        m.jumpTicks++;
      }

      m.vy += CONSTS.GRAV;
      m.y += m.vy;

      const marioH = m.isSuper ? CONSTS.MARIO_H * 1.25 : CONSTS.MARIO_H;

      if (m.y >= CONSTS.GROUND_Y - marioH) {
        if (!m.isGrounded) {
          // Touchdown on ground: spawn landing dust and reset combo
          this.spawnDust(CONSTS.MARIO_X + 14, CONSTS.GROUND_Y);
          m.comboCount = 0;
        }
        m.y = CONSTS.GROUND_Y - marioH;
        m.vy = 0;
        m.isGrounded = true;
      }

      // Move entities & update Piranha plants
      for (const ob of this.obstacles) {
        ob.x -= speed;

        // Piranha Plant emergence cycle in pipes
        if (ob.type === 'warp_pipe' && ob.hasPiranha) {
          ob.plantPhase = (ob.plantPhase || 0) + 1;
          const cycle = ob.plantPhase % 240;
          // 0..60 rise, 60..140 stay up and bite, 140..190 retract, 190..240 stay down
          if (cycle < 60) {
            ob.plantYOffset = -(cycle / 60) * 32;
          } else if (cycle < 140) {
            ob.plantYOffset = -32;
            ob.plantBiteFrame = Math.floor((cycle / 10) % 2);
          } else if (cycle < 190) {
            ob.plantYOffset = -32 + ((cycle - 140) / 50) * 32;
          } else {
            ob.plantYOffset = 0;
          }
        }

        if (ob.type === 'goomba' && ob.alive) {
          ob.x -= 1.3;
        } else if (ob.type === 'koopa' && ob.alive) {
          ob.x -= 1.5;
        } else if (ob.type === 'koopa_shell') {
          ob.x += (ob.vx || 8.5);
          for (const other of this.obstacles) {
            if (other.type === 'goomba' && other.alive && Math.abs(other.x - ob.x) < 26) {
              other.alive = false;
              this.burstGoomba(other.x, other.y);
              this.score += 400;
              this.enemiesDefeated++;
              this.addScorePopup('+400 SHELL!', other.x, other.y - 10, '#4ade80');
            }
          }
        } else if (ob.type === 'star' && !ob.collected) {
          // Bouncing Super Star physics
          ob.x += (ob.vx || 3.2);
          ob.vy = (ob.vy || 0) + 0.38;
          ob.y += ob.vy;
          if (ob.y >= CONSTS.GROUND_Y - ob.h) {
            ob.y = CONSTS.GROUND_Y - ob.h;
            ob.vy = -6.5; // Bounce!
          }
        }

        if (ob.bounceY && ob.bounceY < 0) {
          ob.bounceY += 1.6;
          if (ob.bounceY > 0) ob.bounceY = 0;
        }
      }

      // Update Fireballs
      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        fb.x += fb.vx;
        fb.vy += 0.55;
        fb.y += fb.vy;

        if (fb.y >= CONSTS.GROUND_Y - fb.r) {
          fb.y = CONSTS.GROUND_Y - fb.r;
          fb.vy = -4.8;
          for (let p = 0; p < 3; p++) {
            this.particles.push({
              x: fb.x,
              y: fb.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 3,
              l: 0.8,
              c: '#ff7700',
              r: Math.random() * 3
            });
          }
        }

        // Fireball kills Goomba, Koopa, or Piranha Plant
        for (const ob of this.obstacles) {
          if ((ob.type === 'goomba' || ob.type === 'koopa') && ob.alive) {
            if (Math.abs(fb.x - (ob.x + ob.w / 2)) < ob.w / 2 + fb.r &&
                Math.abs(fb.y - (ob.y + ob.h / 2)) < ob.h / 2 + fb.r) {
              ob.alive = false;
              fb.alive = false;
              this.burstGoomba(ob.x + 15, ob.y + 15);
              sounds.playScore();
              this.score += 300;
              this.enemiesDefeated++;
              this.addScorePopup('+300 FIRE!', ob.x, ob.y - 10, '#ff4500');
              break;
            }
          } else if (ob.type === 'warp_pipe' && ob.hasPiranha && (ob.plantYOffset || 0) < -12) {
            // Check collision with emerged Piranha Plant
            const plantTop = ob.y + (ob.plantYOffset || 0);
            if (fb.x > ob.x + 8 && fb.x < ob.x + ob.w - 8 && fb.y > plantTop && fb.y < ob.y) {
              ob.hasPiranha = false; // plant destroyed!
              fb.alive = false;
              this.burstGoomba(ob.x + 24, plantTop + 10);
              sounds.playScore();
              this.score += 500;
              this.enemiesDefeated++;
              this.addScorePopup('+500 PIRANHA!', ob.x, plantTop - 12, '#4ade80');
              break;
            }
          }
        }

        if (fb.x > CONSTS.W + 60 || fb.y > CONSTS.H || !fb.alive) {
          this.fireballs.splice(i, 1);
        }
      }

      // Update Popping Coins
      for (let i = this.poppingCoins.length - 1; i >= 0; i--) {
        const pc = this.poppingCoins[i];
        pc.vy += 0.45;
        pc.y += pc.vy;
        pc.frame++;
        if (pc.vy > 4) {
          this.poppingCoins.splice(i, 1);
        }
      }

      while (this.obstacles.length > 0 && this.obstacles[0].x + this.obstacles[0].w < -60) {
        this.obstacles.shift();
      }
      this.fillObstacles();

      // Nearest ground threat identification for AI
      let nearestHazard: GroundObstacle | null = null;
      for (const ob of this.obstacles) {
        if (ob.type !== 'warp_pipe' && ob.type !== 'goomba' && ob.type !== 'koopa') continue;
        if ((ob.type === 'goomba' || ob.type === 'koopa') && !ob.alive) continue;
        const dist = ob.x - CONSTS.MARIO_X;
        if (dist > -ob.w) {
          nearestHazard = ob;
          break;
        }
      }

      let nearestBox: GroundObstacle | null = null;
      for (const ob of this.obstacles) {
        if (ob.type !== 'block' && ob.type !== 'brick' && ob.type !== 'coin' && ob.type !== 'star') continue;
        if (ob.type === 'block' && ob.hit) continue;
        if (ob.type === 'coin' && ob.collected) continue;
        if (ob.type === 'star' && ob.collected) continue;
        const dist = ob.x - CONSTS.MARIO_X;
        if (dist > -ob.w) {
          nearestBox = ob;
          break;
        }
      }

      const hazardDist = nearestHazard ? Math.max(0, Math.round(nearestHazard.x - CONSTS.MARIO_X)) : 999;
      const hazardType = nearestHazard ? nearestHazard.type : 'none';
      const hazardH = nearestHazard ? nearestHazard.h : 0;
      const hasPlant = nearestHazard?.type === 'warp_pipe' && !!nearestHazard.hasPiranha;

      const boxDist = nearestBox ? Math.max(0, Math.round(nearestBox.x - CONSTS.MARIO_X)) : 999;
      const boxType = nearestBox ? (nearestBox.type === 'block' ? 'question_block' : nearestBox.type === 'brick' ? 'brick' : 'coin') : 'none';

      const state: JevMarioState = {
        mario_y: Math.round(CONSTS.GROUND_Y - marioH - m.y),
        mario_vy: +m.vy.toFixed(1),
        is_grounded: m.isGrounded,
        ground_hazard: hazardType === 'warp_pipe' ? 'warp_pipe' : (hazardType === 'goomba' || hazardType === 'koopa' ? 'goomba' : 'none'),
        hazard_dist: hazardDist,
        hazard_height: hazardH,
        has_piranha: hasPlant,
        is_star_powered: m.starTicks > 0,
        item_box: boxType,
        item_box_dist: boxDist,
        can_shoot: this.fireAmmo > 0,
        fire_ammo: this.fireAmmo,
        run_speed: speed
      };

      if (!this.humanControl && m.alive) {
        jevClient.decide(state, nowMs).then(dec => {
          if (!m.alive || this.humanControl) return;
          if (dec.action === 'SHOOT' && this.fireAmmo > 0) {
            this.shoot();
            this.addScorePopup(`🧠 LLM: SHOOT! (${dec.reason || 'Blast enemy'})`, CONSTS.MARIO_X, m.y - 30, '#ff4500');
          } else if (dec.action === 'JUMP' && m.isGrounded) {
            this.jump();
            this.addScorePopup(`🧠 LLM: JUMP! (${dec.reason || 'Jump action'})`, CONSTS.MARIO_X, m.y - 30, '#22c55e');
          }
        });
      }

      // Collisions
      const mx = CONSTS.MARIO_X;
      const my = m.y;
      const mw = 28;
      const mh = marioH;

      for (const ob of this.obstacles) {
        // Collect Coin
        if (ob.type === 'coin' && !ob.collected) {
          if (mx + mw > ob.x && mx < ob.x + ob.w && my + mh > ob.y && my < ob.y + ob.h) {
            ob.collected = true;
            this.coins++;
            const coinPts = m.starTicks > 0 ? 100 : 50;
            this.score += coinPts;
            this.addScorePopup(`+${coinPts}`, ob.x, ob.y, '#ffd700');
            sounds.playScore();
          }
          continue;
        }

        // Collect Super Star
        if (ob.type === 'star' && !ob.collected) {
          if (mx + mw > ob.x && mx < ob.x + ob.w && my + mh > ob.y && my < ob.y + ob.h) {
            ob.collected = true;
            m.starTicks = 380;
            this.score += 1000;
            sounds.playPowerUp();
            sounds.setMusicMode('starman');
            this.addScorePopup('🌟 STAR POWER INVINCIBLE!', mx, my - 24, '#ffd700');
            this.triggerShake(5);
          }
          continue;
        }

        // Hit Question Block
        if (ob.type === 'block') {
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            if (m.vy < 0 && my <= ob.y + ob.h + 3 && my >= ob.y) {
              m.y = ob.y + ob.h;
              m.vy = 3.5;
              if (!ob.hit) this.popBlock(ob);
            } else if (m.vy >= 0 && my + mh >= ob.y - 8 && my + mh <= ob.y + 16) {
              if (!m.isGrounded) {
                this.spawnDust(mx + 14, ob.y);
                m.comboCount = 0;
              }
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
            }
          }
          continue;
        }

        // Hit Brick Block
        if (ob.type === 'brick') {
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            if (m.vy < 0 && my <= ob.y + ob.h + 3 && my >= ob.y) {
              m.y = ob.y + ob.h;
              m.vy = 3.5;
              this.popBrick(ob);
            } else if (m.vy >= 0 && my + mh >= ob.y - 8 && my + mh <= ob.y + 16) {
              if (!m.isGrounded) {
                this.spawnDust(mx + 14, ob.y);
                m.comboCount = 0;
              }
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
            }
          }
          continue;
        }

        // Stomp / Collide with Goomba
        if (ob.type === 'goomba' && ob.alive) {
          if (mx + mw > ob.x + 3 && mx < ob.x + ob.w - 3 && my + mh >= ob.y) {
            if (m.starTicks > 0) {
              // Starman rush: destroys enemy immediately
              ob.alive = false;
              this.burstGoomba(ob.x + 15, ob.y + 15);
              this.score += 500;
              this.enemiesDefeated++;
              sounds.playScore();
              this.addScorePopup('🌟 +500 STAR!', ob.x, ob.y - 12, '#ffd700');
            } else if (m.vy > 0 && my + mh <= ob.y + 22) {
              // Stomp with combo multiplier!
              ob.alive = false;
              m.vy = -8.8;
              m.comboCount++;
              if (m.comboCount > this.maxCombo) this.maxCombo = m.comboCount;

              const multiplier = Math.min(8, Math.pow(2, m.comboCount - 1));
              const pts = 200 * multiplier;
              this.score += pts;
              this.enemiesDefeated++;

              sounds.playStomp(m.comboCount - 1);
              this.burstGoomba(ob.x + 15, ob.y + 15);

              if (m.comboCount >= 4) {
                this.fireAmmo += 3;
                sounds.play1Up();
                this.addScorePopup('🔥 +3 BULLETS!', ob.x, ob.y - 28, '#ff6600');
              }
              this.addScorePopup(m.comboCount > 1 ? `COMBO x${m.comboCount}! +${pts}` : `+${pts}`, ob.x, ob.y - 10, m.comboCount > 1 ? '#facc15' : '#ffffff');
            } else {
              this.killMario();
              return;
            }
          }
          continue;
        }

        // Stomp / Collide with Koopa
        if (ob.type === 'koopa' && ob.alive) {
          if (mx + mw > ob.x + 3 && mx < ob.x + ob.w - 3 && my + mh >= ob.y) {
            if (m.starTicks > 0) {
              ob.alive = false;
              this.burstGoomba(ob.x + 15, ob.y + 15);
              this.score += 500;
              this.enemiesDefeated++;
              sounds.playScore();
              this.addScorePopup('🌟 +500 STAR!', ob.x, ob.y - 12, '#ffd700');
            } else if (m.vy > 0 && my + mh <= ob.y + 22) {
              ob.type = 'koopa_shell';
              ob.vx = 8.5;
              m.vy = -8.8;
              m.comboCount++;
              if (m.comboCount > this.maxCombo) this.maxCombo = m.comboCount;

              const multiplier = Math.min(8, Math.pow(2, m.comboCount - 1));
              const pts = 300 * multiplier;
              this.score += pts;
              this.enemiesDefeated++;

              sounds.playStomp(m.comboCount - 1);
              this.triggerShake(4);
              this.addScorePopup(m.comboCount > 1 ? `COMBO x${m.comboCount}! +${pts}` : `+${pts}`, ob.x, ob.y - 10, '#38ef7d');
            } else {
              this.killMario();
              return;
            }
          }
          continue;
        }

        // Pipe collision & Piranha Plant hazard
        if (ob.type === 'warp_pipe') {
          // Check collision with emerged Piranha Plant
          if (ob.hasPiranha && (ob.plantYOffset || 0) < -14) {
            const plantTop = ob.y + (ob.plantYOffset || 0);
            if (mx + mw > ob.x + 10 && mx < ob.x + ob.w - 10 && my + mh > plantTop && my < ob.y + 6) {
              if (m.starTicks > 0) {
                ob.hasPiranha = false;
                this.burstGoomba(ob.x + 24, plantTop + 10);
                this.score += 600;
                this.enemiesDefeated++;
                sounds.playScore();
                this.addScorePopup('🌟 +600 PLANT!', ob.x, plantTop - 12, '#ffd700');
              } else {
                this.killMario();
                return;
              }
            }
          }

          // Landing on TOP of the pipe:
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            if (my + mh >= ob.y - 8 && my + mh <= ob.y + 16 && m.vy >= 0) {
              if (!m.isGrounded) {
                this.spawnDust(mx + 14, ob.y);
                m.comboCount = 0;
              }
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
              continue;
            } else if (my + mh > ob.y + 14 && (m.vy >= 0 || my + mh > ob.y + 20)) {
              this.killMario();
              return;
            }
          }
        }
      }

      this.score += 1;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
    } else {
      m.vy += CONSTS.GRAV * 0.8;
      m.y += m.vy;
    }
  }
}
