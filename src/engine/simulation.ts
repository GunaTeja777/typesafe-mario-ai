import { jevClient, JevMarioState } from '../ai/jevClient';
import { sounds } from '../audio/soundEffects';

export interface GroundObstacle {
  id: number;
  type: 'warp_pipe' | 'goomba' | 'koopa' | 'koopa_shell' | 'block' | 'brick' | 'coin' | 'mushroom';
  x: number;
  y: number;
  w: number;
  h: number;
  vx?: number;
  alive?: boolean;
  collected?: boolean;
  hit?: boolean;
  bounceY?: number;
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

export const CONSTS = {
  W: 760, // Widescreen Mario Viewport
  H: 640,
  GROUND_Y: 550, // Ground starts at y = 550 (90px tall)
  MARIO_X: 110,
  MARIO_H: 38,
  GRAV: 0.52,
  JUMP_IMPULSE: -11.5,
  RUN_SPEED: 2.2 // Reduced frame speed so Groq LLM has ample time to decide!
};

export class Simulation {
  public gen: number = 1;
  public score: number = 0;
  public bestScore: number = 0;
  public coins: number = 0;
  public fireAmmo: number = 0; // Starts at 0, awarded by hitting ? boxes with head!
  public dist: number = 0;
  public paused: boolean = false;
  public humanControl: boolean = false;
  public flash: number = 0;
  public poppingCoins: PoppingCoin[] = [];
  public lastStage: number = 1;

  // Mario State
  public mario = {
    y: CONSTS.GROUND_Y - CONSTS.MARIO_H,
    vy: 0,
    isGrounded: true,
    alive: true,
    isSuper: false,
    invincibleTicks: 0,
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
      runFrame: 0,
      animTick: 0
    };
    this.score = 0;
    this.coins = 0;
    this.fireAmmo = 0; // Starts at 0, awarded by hitting ? boxes with head!
    this.dist = 0;
    this.lastStage = 1;
    this.obstacles = [];
    this.particles = [];
    this.floatingScores = [];
    this.fireballs = [];
    this.poppingCoins = [];
    this.objId = 0;

    // Introductory gentle runway for starting flow (gives LLM time to initialize):
    // 1. Initial ? question block at x = 360 (Mario starts at 110, so 250px clear runway ~1.9s)
    this.obstacles.push({
      id: this.objId++,
      type: 'block',
      x: 360,
      y: CONSTS.GROUND_Y - 120,
      w: 32,
      h: 32,
      hit: false
    });

    // 2. Introductory bonus coin at x = 540 to reward early navigation
    this.obstacles.push({
      id: this.objId++,
      type: 'coin',
      x: 540,
      y: CONSTS.GROUND_Y - 110,
      w: 22,
      h: 22,
      collected: false
    });

    // First ground hazard spawns far ahead at x = 860 (~5.7 seconds from start)!
    this.nextSpawnX = 860;
    this.fillObstacles();
  }

  public jump() {
    if (!this.mario.alive) return;
    if (this.mario.isGrounded) {
      this.mario.vy = CONSTS.JUMP_IMPULSE;
      this.mario.isGrounded = false;
      sounds.playFlap();
    }
  }

  public shoot() {
    if (!this.mario.alive) return;
    if (this.fireAmmo <= 0) {
      this.addScorePopup('NO BULLETS! HIT ? BOX WITH HEAD!', CONSTS.MARIO_X + 10, this.mario.y - 16, '#f59e0b');
      sounds.playClick();
      return;
    }
    // Countable shooting: decrement ammo by 1
    this.fireAmmo--;
    this.fireballs.push({
      id: this.objId++,
      x: CONSTS.MARIO_X + 24,
      y: this.mario.y + 14,
      vx: 8.5,
      vy: 1.5,
      r: 7,
      alive: true
    });
    sounds.playFireball();
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

  public getFlowStage(): { stage: number; name: string; tag: string } {
    if (this.dist < 1200) {
      return { stage: 1, name: 'WARMUP', tag: '1-1' };
    } else if (this.dist < 2800) {
      return { stage: 2, name: 'FLOW', tag: '1-2' };
    } else {
      return { stage: 3, name: 'RUSH', tag: '1-3' };
    }
  }

  public getNextObstacleGap(): number {
    if (this.dist < 1200) {
      // Starting flow: generous, sparse spacing (580px - 740px gap)
      // Gives slow LLM responses 4.5 - 5.5 seconds of runway per obstacle
      return 580 + Math.floor(Math.random() * 160);
    } else if (this.dist < 2800) {
      // Transitioning flow: smoothly interpolating down from ~540px to ~380px
      const progress = (this.dist - 1200) / 1600;
      const base = 540 - progress * 160;
      return Math.round(base + Math.random() * 90);
    } else {
      // Late flow: denser & faster action (250px - 340px gap)
      const lateProgress = Math.min(1, (this.dist - 2800) / 3000);
      const base = 340 - lateProgress * 80;
      return Math.round(base + Math.random() * 80);
    }
  }

  public spawnObstacle(x: number) {
    const r = Math.random();
    const id = this.objId++;

    if (this.dist < 1200) {
      // --- STARTING FLOW (Sparse, single forgiving obstacles) ---
      if (r < 0.45) {
        // Classic short or medium Warp Pipe with generous clearance
        const heights = [46, 56];
        const pipeH = heights[Math.floor(Math.random() * heights.length)];
        this.obstacles.push({
          id,
          type: 'warp_pipe',
          x,
          y: CONSTS.GROUND_Y - pipeH,
          w: 56,
          h: pipeH
        });
        // Friendly ? block 130px after pipe
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x + 130,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
      } else if (r < 0.80) {
        // Single walking Goomba with an overhead ? block right before it
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x - 60,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
        this.obstacles.push({
          id,
          type: 'goomba',
          x,
          y: CONSTS.GROUND_Y - 30,
          w: 30,
          h: 30,
          alive: true
        });
      } else {
        // Safe reward cluster: no deadly hazard, just ? block and coins
        this.obstacles.push({
          id,
          type: 'block',
          x,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
        this.obstacles.push({
          id: this.objId++,
          type: 'coin',
          x: x + 48,
          y: CONSTS.GROUND_Y - 110,
          w: 22,
          h: 22,
          collected: false
        });
      }
    } else if (this.dist < 2800) {
      // --- MID FLOW (Moderate density & mixed variety) ---
      if (r < 0.35) {
        const heights = [48, 66];
        const pipeH = heights[Math.floor(Math.random() * heights.length)];
        this.obstacles.push({
          id,
          type: 'warp_pipe',
          x,
          y: CONSTS.GROUND_Y - pipeH,
          w: 56,
          h: pipeH
        });
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x + 110,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
      } else if (r < 0.65) {
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x - 45,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
        this.obstacles.push({
          id,
          type: 'goomba',
          x,
          y: CONSTS.GROUND_Y - 30,
          w: 30,
          h: 30,
          alive: true
        });
        this.obstacles.push({
          id: this.objId++,
          type: 'coin',
          x: x + 45,
          y: CONSTS.GROUND_Y - 110,
          w: 22,
          h: 22,
          collected: false
        });
      } else if (r < 0.82) {
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x - 40,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
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
    } else {
      // --- LATE FLOW (High density, faster action, multi-obstacle challenges) ---
      if (r < 0.35) {
        const heights = [48, 66, 82];
        const pipeH = heights[Math.floor(Math.random() * heights.length)];
        this.obstacles.push({
          id,
          type: 'warp_pipe',
          x,
          y: CONSTS.GROUND_Y - pipeH,
          w: 56,
          h: pipeH
        });
        // In late flow, occasionally chain with an oncoming Goomba
        if (Math.random() < 0.45) {
          this.obstacles.push({
            id: this.objId++,
            type: 'goomba',
            x: x + 95,
            y: CONSTS.GROUND_Y - 30,
            w: 30,
            h: 30,
            alive: true
          });
        }
      } else if (r < 0.65) {
        this.obstacles.push({
          id,
          type: 'goomba',
          x,
          y: CONSTS.GROUND_Y - 30,
          w: 30,
          h: 30,
          alive: true
        });
        this.obstacles.push({
          id: this.objId++,
          type: 'coin',
          x: x + 40,
          y: CONSTS.GROUND_Y - 110,
          w: 22,
          h: 22,
          collected: false
        });
      } else if (r < 0.85) {
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
      }
    }
  }

  public fillObstacles() {
    while (this.nextSpawnX < CONSTS.W + 500) {
      this.spawnObstacle(this.nextSpawnX);
      this.nextSpawnX += this.getNextObstacleGap();
    }
  }

  public burstGoomba(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.6) * 5,
        l: 1,
        c: '#9b4a1b',
        r: Math.random() * 4
      });
    }
    sounds.playScore();
  }

  public popBlock(b: GroundObstacle) {
    b.hit = true;
    b.bounceY = -12;

    // Mario hits ? box with his head: gets +5 countable shooting bullets & +1 coin!
    this.coins++;
    this.score += 100;
    this.fireAmmo += 5;
    this.addScorePopup('+5 BULLETS! 🔥', b.x - 12, b.y - 32, '#ff4500');
    this.addScorePopup('+1 🪙', b.x + 8, b.y - 12, '#ffd700');
    sounds.playScore();

    // Spurt a spinning coin popping out of the ? box
    this.poppingCoins.push({
      x: b.x + 6,
      y: b.y - 12,
      vy: -7.5,
      frame: 0,
      alive: true
    });

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
    this.addScorePopup('+50 & +1 FIRE!', b.x, b.y - 16, '#f97316');
  }

  public killMario() {
    if (this.mario.isSuper) {
      // Demote from Super Mario with invincibility frames
      this.mario.isSuper = false;
      this.mario.invincibleTicks = 90; // ~1.5s invincibility
      this.mario.vy = -6;
      sounds.playCrash();
      this.addScorePopup('HIT!', CONSTS.MARIO_X, this.mario.y - 20, '#ef4444');
      return;
    }

    if (this.mario.invincibleTicks > 0) return;

    this.mario.alive = false;
    this.mario.vy = -9;
    sounds.playCrash();

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

    const currentStage = this.getFlowStage().stage;
    if (currentStage > this.lastStage) {
      this.lastStage = currentStage;
      const stageInfo = this.getFlowStage();
      this.addScorePopup(`⚡ WORLD ${stageInfo.tag}: ${stageInfo.name} PACING!`, CONSTS.MARIO_X + 15, this.mario.y - 34, '#facc15');
      sounds.playFanfare();
    }

    const m = this.mario;

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

      m.vy += CONSTS.GRAV;
      m.y += m.vy;

      const marioH = m.isSuper ? CONSTS.MARIO_H * 1.25 : CONSTS.MARIO_H;

      if (m.y >= CONSTS.GROUND_Y - marioH) {
        m.y = CONSTS.GROUND_Y - marioH;
        m.vy = 0;
        m.isGrounded = true;
      }

      // Move entities
      for (const ob of this.obstacles) {
        ob.x -= speed;

        if (ob.type === 'goomba' && ob.alive) {
          ob.x -= 1.3;
        } else if (ob.type === 'koopa' && ob.alive) {
          ob.x -= 1.5;
        } else if (ob.type === 'koopa_shell') {
          ob.x += (ob.vx || 8); // sliding shell
          // Shell destroys oncoming Goombas
          for (const other of this.obstacles) {
            if (other.type === 'goomba' && other.alive && Math.abs(other.x - ob.x) < 26) {
              other.alive = false;
              this.burstGoomba(other.x, other.y);
              this.score += 400;
              this.addScorePopup('+400', other.x, other.y - 10, '#4ade80');
            }
          }
        } else if (ob.type === 'mushroom') {
          ob.x += (ob.vx || 2);
        }

        if (ob.bounceY && ob.bounceY < 0) {
          ob.bounceY += 1.6;
          if (ob.bounceY > 0) ob.bounceY = 0;
        }
      }

      // Update Fireballs (Mario Fire Flower Attack)
      for (let i = this.fireballs.length - 1; i >= 0; i--) {
        const fb = this.fireballs[i];
        fb.x += fb.vx;
        fb.vy += 0.55; // gravity
        fb.y += fb.vy;

        // Bounce on ground
        if (fb.y >= CONSTS.GROUND_Y - fb.r) {
          fb.y = CONSTS.GROUND_Y - fb.r;
          fb.vy = -4.6; // bounce!
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

        // Check collision with enemies (Goomba / Koopa)
        for (const ob of this.obstacles) {
          if ((ob.type === 'goomba' || ob.type === 'koopa') && ob.alive) {
            if (Math.abs(fb.x - (ob.x + ob.w / 2)) < ob.w / 2 + fb.r &&
                Math.abs(fb.y - (ob.y + ob.h / 2)) < ob.h / 2 + fb.r) {
              ob.alive = false;
              fb.alive = false;
              this.burstGoomba(ob.x + 15, ob.y + 15);
              sounds.playScore();
              this.score += 300;
              this.addScorePopup('+300 FIRE!', ob.x, ob.y - 10, '#ff4500');
              break;
            }
          }
        }

        // Clean up out of bounds
        if (fb.x > CONSTS.W + 60 || fb.y > CONSTS.H || !fb.alive) {
          this.fireballs.splice(i, 1);
        }
      }

      // Update Popping Coins (popped from ? boxes)
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

      // 1. Identify nearest GROUND THREAT (pipe, live goomba, live koopa)
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

      // 2. Identify nearest OVERHEAD ITEM BOX / COIN (? block, brick, coin)
      let nearestBox: GroundObstacle | null = null;
      for (const ob of this.obstacles) {
        if (ob.type !== 'block' && ob.type !== 'brick' && ob.type !== 'coin') continue;
        if (ob.type === 'block' && ob.hit) continue;
        if (ob.type === 'coin' && ob.collected) continue;
        const dist = ob.x - CONSTS.MARIO_X;
        if (dist > -ob.w) {
          nearestBox = ob;
          break;
        }
      }

      const hazardDist = nearestHazard ? Math.max(0, Math.round(nearestHazard.x - CONSTS.MARIO_X)) : 999;
      const hazardType = nearestHazard ? nearestHazard.type : 'none';
      const hazardH = nearestHazard ? nearestHazard.h : 0;

      const boxDist = nearestBox ? Math.max(0, Math.round(nearestBox.x - CONSTS.MARIO_X)) : 999;
      const boxType = nearestBox ? (nearestBox.type === 'block' ? 'question_block' : nearestBox.type === 'brick' ? 'brick' : 'coin') : 'none';

      const state: JevMarioState = {
        mario_y: Math.round(CONSTS.GROUND_Y - marioH - m.y),
        mario_vy: +m.vy.toFixed(1),
        is_grounded: m.isGrounded,
        ground_hazard: hazardType === 'warp_pipe' ? 'warp_pipe' : (hazardType === 'goomba' || hazardType === 'koopa' ? 'goomba' : 'none'),
        hazard_dist: hazardDist,
        hazard_height: hazardH,
        item_box: boxType,
        item_box_dist: boxDist,
        can_shoot: this.fireAmmo > 0,
        fire_ammo: this.fireAmmo,
        run_speed: speed
      };

      if (!this.humanControl && m.alive) {
        // 100% PURE LLM CONTROL: Mario acts SOLELY when Groq LLM API responds!
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
            this.score += 50;
            this.addScorePopup('+50', ob.x, ob.y, '#ffd700');
            sounds.playScore();
          }
          continue;
        }

        // Collect Super Mushroom
        if (ob.type === 'mushroom' && !ob.collected) {
          if (mx + mw > ob.x && mx < ob.x + ob.w && my + mh > ob.y && my < ob.y + ob.h) {
            ob.collected = true;
            m.isSuper = true;
            this.score += 1000;
            this.addScorePopup('SUPER MARIO! +1000', mx, my - 24, '#ffcc00');
            sounds.playFanfare();
          }
          continue;
        }

        // Hit Question Block (Solid top and bottom)
        if (ob.type === 'block') {
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            // 1. Mario hits from underneath (head hits bottom of block):
            if (m.vy < 0 && my <= ob.y + ob.h + 3 && my >= ob.y) {
              m.y = ob.y + ob.h; // solid clamp - cannot phase through!
              m.vy = 3.5;        // bump downward
              if (!ob.hit) this.popBlock(ob);
            }
            // 2. Mario lands on top of the block:
            else if (m.vy >= 0 && my + mh >= ob.y - 8 && my + mh <= ob.y + 16) {
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
            }
          }
          continue;
        }

        // Hit Brick Block (Solid top and bottom)
        if (ob.type === 'brick') {
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            // 1. Mario hits from underneath:
            if (m.vy < 0 && my <= ob.y + ob.h + 3 && my >= ob.y) {
              m.y = ob.y + ob.h; // solid clamp
              m.vy = 3.5;
              this.popBrick(ob);
            }
            // 2. Mario lands on top of the brick:
            else if (m.vy >= 0 && my + mh >= ob.y - 8 && my + mh <= ob.y + 16) {
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
            }
          }
          continue;
        }

        // Stomp Goomba
        if (ob.type === 'goomba' && ob.alive) {
          if (mx + mw > ob.x + 3 && mx < ob.x + ob.w - 3 && my + mh >= ob.y) {
            if (m.vy > 0 && my + mh <= ob.y + 22) {
              ob.alive = false;
              m.vy = -8.5;
              this.score += 200;
              this.addScorePopup('+200', ob.x, ob.y - 10, '#ffffff');
              this.burstGoomba(ob.x + 15, ob.y + 15);
            } else {
              this.killMario();
              return;
            }
          }
          continue;
        }

        // Stomp Koopa
        if (ob.type === 'koopa' && ob.alive) {
          if (mx + mw > ob.x + 3 && mx < ob.x + ob.w - 3 && my + mh >= ob.y) {
            if (m.vy > 0 && my + mh <= ob.y + 22) {
              ob.type = 'koopa_shell';
              ob.vx = 8.5; // kick shell forward!
              m.vy = -8.5;
              this.score += 500;
              this.addScorePopup('+500 SHELL KICK!', ob.x, ob.y - 10, '#38ef7d');
              sounds.playScore();
            } else {
              this.killMario();
              return;
            }
          }
          continue;
        }

        // Pipe collision
        if (ob.type === 'warp_pipe') {
          // Landing on TOP of the pipe or running along it:
          if (mx + mw > ob.x + 2 && mx < ob.x + ob.w - 2) {
            if (my + mh >= ob.y - 8 && my + mh <= ob.y + 16 && m.vy >= 0) {
              m.y = ob.y - mh;
              m.vy = 0;
              m.isGrounded = true;
              continue;
            } else if (my + mh > ob.y + 14 && (m.vy >= 0 || my + mh > ob.y + 20)) {
              // Collide with the side of the pipe
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
