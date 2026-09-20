import { jevClient, JevMarioState } from '../ai/jevClient';
import { sounds } from '../audio/soundEffects';

export interface GroundObstacle {
  id: number;
  type: 'warp_pipe' | 'goomba' | 'block' | 'coin';
  x: number;
  y: number;
  w: number;
  h: number;
  alive?: boolean;
  collected?: boolean;
  hit?: boolean;
  bounceY?: number;
}

export const CONSTS = {
  W: 580,
  H: 640,
  GROUND_Y: 560, // Ground starts at y = 560 (80px tall)
  MARIO_X: 95,
  MARIO_H: 36,
  GRAV: 0.65,
  JUMP_IMPULSE: -12.5,
  RUN_SPEED: 3.5
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
    runFrame: 0,
    animTick: 0
  };

  public obstacles: GroundObstacle[] = [];
  public particles: Array<{ x: number; y: number; vx: number; vy: number; l: number; c: string; r: number }> = [];

  private nextSpawnX: number = 380;
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
      runFrame: 0,
      animTick: 0
    };
    this.score = 0;
    this.dist = 0;
    this.obstacles = [];
    this.particles = [];
    this.nextSpawnX = 380;
    this.objId = 0;

    // Seed initial obstacles
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

  public spawnObstacle(x: number) {
    const r = Math.random();
    const id = this.objId++;

    if (r < 0.42) {
      // Warp Pipe
      const pipeH = 48 + Math.floor(Math.random() * 28);
      this.obstacles.push({
        id,
        type: 'warp_pipe',
        x,
        y: CONSTS.GROUND_Y - pipeH,
        w: 54,
        h: pipeH
      });
      // Floating question block above or after pipe
      if (Math.random() < 0.5) {
        this.obstacles.push({
          id: this.objId++,
          type: 'block',
          x: x + 90,
          y: CONSTS.GROUND_Y - 120,
          w: 32,
          h: 32,
          hit: false
        });
      }
    } else if (r < 0.78) {
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
    } else {
      // Question Block & Coin cluster
      this.obstacles.push({
        id,
        type: 'block',
        x,
        y: CONSTS.GROUND_Y - 110,
        w: 32,
        h: 32,
        hit: false
      });
      this.obstacles.push({
        id: this.objId++,
        type: 'coin',
        x: x + 60,
        y: CONSTS.GROUND_Y - 110,
        w: 22,
        h: 22,
        collected: false
      });
    }
  }

  public fillObstacles() {
    while (this.nextSpawnX < CONSTS.W + 400) {
      this.spawnObstacle(this.nextSpawnX);
      this.nextSpawnX += 200 + Math.floor(Math.random() * 120);
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
    b.bounceY = -8;
    this.coins++;
    this.score += 100;
    sounds.playScore();

    // Spawn popping coin sparkle
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

  public killMario() {
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

    if (m.alive) {
      // Running animation
      if (m.isGrounded) {
        m.animTick++;
        if (m.animTick % 6 === 0) {
          m.runFrame = (m.runFrame + 1) % 3;
        }
      }

      // Physics integration
      m.vy += CONSTS.GRAV;
      m.y += m.vy;

      // Ground collision
      if (m.y >= CONSTS.GROUND_Y - CONSTS.MARIO_H) {
        m.y = CONSTS.GROUND_Y - CONSTS.MARIO_H;
        m.vy = 0;
        m.isGrounded = true;
      }

      // Move obstacles & Goombas
      for (const ob of this.obstacles) {
        ob.x -= speed;
        // Goombas walk leftward slightly faster
        if (ob.type === 'goomba' && ob.alive) {
          ob.x -= 1.2;
        }
        // Block bounce decay
        if (ob.bounceY && ob.bounceY < 0) {
          ob.bounceY += 1.5;
          if (ob.bounceY > 0) ob.bounceY = 0;
        }
      }

      // Clean offscreen obstacles
      while (this.obstacles.length > 0 && this.obstacles[0].x + this.obstacles[0].w < -50) {
        this.obstacles.shift();
      }
      this.fillObstacles();

      // Find nearest threat for Jev
      let nearestObs: GroundObstacle | null = null;
      let nextObs: GroundObstacle | null = null;

      for (const ob of this.obstacles) {
        if (ob.type === 'coin' || (ob.type === 'goomba' && !ob.alive)) continue;
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

      const obsDist = nearestObs ? Math.max(0, Math.round(nearestObs.x - CONSTS.MARIO_X)) : 300;
      const obsType = nearestObs ? nearestObs.type : 'none';
      const obsH = nearestObs ? nearestObs.h : 0;
      const nextDist = nextObs ? Math.max(0, Math.round(nextObs.x - CONSTS.MARIO_X)) : 450;
      const nextType = nextObs ? nextObs.type : 'none';

      // Telemetry state sent to Jev
      const state: JevMarioState = {
        mario_y: Math.round(CONSTS.GROUND_Y - CONSTS.MARIO_H - m.y),
        mario_vy: +m.vy.toFixed(1),
        is_grounded: m.isGrounded,
        obstacle_type: obsType === 'warp_pipe' ? 'warp_pipe' : (obsType === 'goomba' ? 'goomba' : 'none'),
        obstacle_dist: obsDist,
        obstacle_height: obsH,
        next_obstacle: nextType === 'warp_pipe' ? 'warp_pipe' : (nextType === 'goomba' ? 'goomba' : 'none'),
        next_dist: nextDist,
        run_speed: speed
      };

      // AI decision tick
      if (!this.humanControl) {
        jevClient.decide(state, nowMs).then(dec => {
          if (dec.shouldJump && m.alive && m.isGrounded) {
            this.jump();
          }
        });
      }

      // Collisions with obstacles
      const mx = CONSTS.MARIO_X;
      const my = m.y;
      const mw = 26;
      const mh = CONSTS.MARIO_H;

      for (const ob of this.obstacles) {
        if (ob.type === 'coin' && !ob.collected) {
          // Coin collection
          if (mx + mw > ob.x && mx < ob.x + ob.w && my + mh > ob.y && my < ob.y + ob.h) {
            ob.collected = true;
            this.coins++;
            this.score += 50;
            sounds.playScore();
          }
          continue;
        }

        if (ob.type === 'block' && !ob.hit) {
          // Hit block from below
          if (mx + mw > ob.x && mx < ob.x + ob.w && m.vy < 0 && my <= ob.y + ob.h && my >= ob.y + ob.h - 10) {
            m.vy = 2; // bounce down
            this.popBlock(ob);
          }
          continue;
        }

        if (ob.type === 'goomba' && ob.alive) {
          if (mx + mw > ob.x + 4 && mx < ob.x + ob.w - 4 && my + mh >= ob.y) {
            // Stomp on Goomba from above
            if (m.vy > 0 && my + mh <= ob.y + 16) {
              ob.alive = false;
              m.vy = -8.5; // bounce up!
              this.score += 200;
              this.burstGoomba(ob.x + 15, ob.y + 15);
            } else {
              // Collide from side
              this.killMario();
              return;
            }
          }
          continue;
        }

        if (ob.type === 'warp_pipe') {
          // Pipe collision
          if (mx + mw > ob.x + 6 && mx < ob.x + ob.w - 6 && my + mh > ob.y + 6) {
            this.killMario();
            return;
          }
        }
      }

      // Score for surviving distance
      this.score += 1;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
    } else {
      // Dead Mario falling animation
      m.vy += CONSTS.GRAV * 0.8;
      m.y += m.vy;
    }
  }
}
