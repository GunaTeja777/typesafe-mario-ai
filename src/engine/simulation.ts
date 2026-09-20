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

export const CONSTS = {
  W: 760, // Widescreen Mario Viewport
  H: 640,
  GROUND_Y: 550, // Ground starts at y = 550 (90px tall)
  MARIO_X: 110,
  MARIO_H: 38,
  GRAV: 0.65,
  JUMP_IMPULSE: -12.5,
  RUN_SPEED: 3.8
};

export class Simulation {
  public gen: number = 1;
  public score: number = 0;
  public bestScore: number = 0;
  public coins: number = 0;
  public dist: number = 0;
  public paused: boolean = false;
  public humanControl: boolean = false;
  public flash: number = 0;

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
    this.dist = 0;
    this.obstacles = [];
    this.particles = [];
    this.floatingScores = [];
    this.nextSpawnX = 420;
    this.objId = 0;

    this.fillObstacles();
  }

  public jump() {
    if (!this.mario.alive) {
      this.restart();
      return;
    }
    if (this.mario.isGrounded) {
      this.mario.vy = CONSTS.JUMP_IMPULSE;
      this.mario.isGrounded = false;
      sounds.playFlap();
    }
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

  public spawnObstacle(x: number) {
    const r = Math.random();
    const id = this.objId++;

    if (r < 0.35) {
      // Classic Warp Pipe (short: 48, medium: 66, tall: 82)
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
      // Floating question block or coin 130px after pipe
      this.obstacles.push({
        id: this.objId++,
        type: 'block',
        x: x + 130,
        y: CONSTS.GROUND_Y - 125,
        w: 32,
        h: 32,
        hit: false
      });
    } else if (r < 0.65) {
      // Walking Goomba
      this.obstacles.push({
        id,
        type: 'goomba',
        x,
        y: CONSTS.GROUND_Y - 30,
        w: 30,
        h: 30,
        alive: true
      });
      // Coin arc overhead
      this.obstacles.push({
        id: this.objId++,
        type: 'coin',
        x: x + 20,
        y: CONSTS.GROUND_Y - 110,
        w: 22,
        h: 22,
        collected: false
      });
    } else if (r < 0.82) {
      // Koopa Troopa (Turtle)
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
      // Breakable Brick Block & Question Block
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
        x: x + 80,
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
      this.nextSpawnX += 260 + Math.floor(Math.random() * 150);
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
    b.bounceY = -10;

    // 30% chance for Super Mushroom, 70% chance for Coin
    if (Math.random() < 0.35) {
      this.obstacles.push({
        id: this.objId++,
        type: 'mushroom',
        x: b.x,
        y: b.y - 28,
        w: 28,
        h: 28,
        vx: 2.2
      });
      this.addScorePopup('MUSHROOM!', b.x, b.y - 30, '#ffd700');
    } else {
      this.coins++;
      this.score += 100;
      this.addScorePopup('+100', b.x, b.y - 20, '#ffffff');
      sounds.playScore();

      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: b.x + 16,
          y: b.y - 12,
          vx: (Math.random() - 0.5) * 4,
          vy: -4 - Math.random() * 3,
          l: 1,
          c: '#ffd700',
          r: Math.random() * 3
        });
      }
    }
  }

  public popBrick(b: GroundObstacle) {
    b.bounceY = -6;
    sounds.playClick();
    this.addScorePopup('+50', b.x, b.y - 16, '#f97316');
    this.score += 50;
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

      while (this.obstacles.length > 0 && this.obstacles[0].x + this.obstacles[0].w < -60) {
        this.obstacles.shift();
      }
      this.fillObstacles();

      // Identify nearest GROUND THREAT for Jev (pipes, goombas, koopas)
      let nearestObs: GroundObstacle | null = null;
      let nextObs: GroundObstacle | null = null;

      for (const ob of this.obstacles) {
        // Collectibles and overhead blocks are NOT ground threats!
        if (ob.type === 'coin' || ob.type === 'mushroom' || ob.type === 'block' || ob.type === 'brick') continue;
        if ((ob.type === 'goomba' || ob.type === 'koopa') && !ob.alive) continue;
        if (ob.type === 'koopa_shell' && (ob.vx || 0) > 0) continue; // Sliding away safely!

        const dist = ob.x - CONSTS.MARIO_X;
        if (dist > -ob.w) {
          if (!nearestObs) {
            nearestObs = ob;
          } else if (!nextObs) {
            nextObs = ob;
            break;
          }
        }
      }

      const obsDist = nearestObs ? Math.max(0, Math.round(nearestObs.x - CONSTS.MARIO_X)) : 500;
      const obsType = nearestObs ? nearestObs.type : 'none';
      const obsH = nearestObs ? nearestObs.h : 0;
      const nextDist = nextObs ? Math.max(0, Math.round(nextObs.x - CONSTS.MARIO_X)) : 800;
      const nextType = nextObs ? nextObs.type : 'none';

      const state: JevMarioState = {
        mario_y: Math.round(CONSTS.GROUND_Y - marioH - m.y),
        mario_vy: +m.vy.toFixed(1),
        is_grounded: m.isGrounded,
        obstacle_type: obsType === 'warp_pipe' ? 'warp_pipe' : (obsType === 'goomba' || obsType === 'koopa' ? 'goomba' : 'none'),
        obstacle_dist: obsDist,
        obstacle_height: obsH,
        next_obstacle: nextType === 'warp_pipe' ? 'warp_pipe' : (nextType === 'goomba' || nextType === 'koopa' ? 'goomba' : 'none'),
        next_dist: nextDist,
        run_speed: speed
      };

      if (!this.humanControl) {
        // Query Jev LLM for real-time telemetry, JSON streaming, and reasoning
        jevClient.decide(state, nowMs);

        // Immediate autonomous jump response:
        // Jump when approaching a ground hazard within the physics-calibrated window!
        if (m.alive && m.isGrounded && nearestObs) {
          const isHazard = obsType === 'warp_pipe' || obsType === 'goomba' || obsType === 'koopa';
          // Calibrated jump window: 35px to 85px gives Mario perfect parabolic arc to clear or land on obstacles
          if (isHazard && obsDist <= 85 && obsDist >= 35) {
            this.jump();
          }
        }
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

        // Hit Question Block
        if (ob.type === 'block' && !ob.hit) {
          if (mx + mw > ob.x && mx < ob.x + ob.w && m.vy < 0 && my <= ob.y + ob.h && my >= ob.y + ob.h - 10) {
            m.vy = 2;
            this.popBlock(ob);
          }
          continue;
        }

        // Hit Brick Block
        if (ob.type === 'brick') {
          if (mx + mw > ob.x && mx < ob.x + ob.w && m.vy < 0 && my <= ob.y + ob.h && my >= ob.y + ob.h - 10) {
            m.vy = 2;
            this.popBrick(ob);
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
