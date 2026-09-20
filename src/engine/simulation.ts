import type { Pipe } from '../types';
import { jevClient, JevGameState } from '../ai/jevClient';
import { sounds } from '../audio/soundEffects';

export interface SimConstants {
  W: number;
  H: number;
  BX: number;
  R: number;
  PW: number;
  SPACING: number;
  GRAV: number;
  FLAP: number;
  GROUND: number;
}

export const CONSTS: SimConstants = {
  W: 480,
  H: 640,
  BX: 110,
  R: 15,
  PW: 68,
  SPACING: 240,
  GRAV: 0.48,
  FLAP: -8.0,
  GROUND: 20
};

export interface MarioCharacter {
  y: number;
  vy: number;
  alive: boolean;
  score: number;
  age: number;
  tr: Float32Array;
  ti: number;
}

export class Simulation {
  public gen: number = 1;
  public bestScore: number = 4;
  public genPoints: number = 4;
  public dist: number = 0;
  public pipes: Pipe[] = [];
  public mario!: MarioCharacter;
  public particles: Array<{ x: number; y: number; vx: number; vy: number; l: number; c: string; r: number }> = [];
  public flash: number = 1;
  public paused: boolean = false;
  public humanControl: boolean = false;

  private pipeId: number = 0;
  private lastGy: number = CONSTS.H / 2;

  constructor() {
    this.restart();
  }

  public addPipe(x: number) {
    const id = this.pipeId++;
    const gap = 165;
    let gy = this.lastGy + (Math.random() * 2 - 1) * 160;
    gy = Math.max(gap / 2 + 70, Math.min(CONSTS.H - CONSTS.GROUND - gap / 2 - 60, gy));
    this.lastGy = gy;
    this.pipes.push({ id, x, gy, gap });
  }

  public fillPipes() {
    while (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < CONSTS.W + 40) {
      const prevX = this.pipes.length > 0 ? this.pipes[this.pipes.length - 1].x : 320;
      this.addPipe(prevX + CONSTS.SPACING);
    }
  }

  public restart() {
    this.mario = {
      y: 245,
      vy: 0,
      alive: true,
      score: 0,
      age: 0,
      tr: new Float32Array(24),
      ti: 0
    };
    this.pipes = [];
    this.pipeId = 0;
    this.lastGy = CONSTS.H / 2;
    this.dist = 0;
    this.genPoints = 0;
    this.particles = [];
    this.flash = 1;

    this.addPipe(280);
    this.fillPipes();
  }

  public flap() {
    if (!this.mario.alive) {
      this.restart();
      return;
    }
    this.mario.vy = CONSTS.FLAP;
    sounds.playFlap();
  }

  public burstMario() {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: CONSTS.BX,
        y: this.mario.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.7) * 7,
        l: 1,
        c: i % 2 === 0 ? '#ffcc00' : '#e52521',
        r: Math.random() * 6
      });
    }
    sounds.playCrash();
  }

  public step(nowMs: number) {
    if (this.paused) return;

    const speed = 2.8;
    this.dist += speed;

    // Move pipes
    for (const p of this.pipes) {
      p.x -= speed;
    }
    while (this.pipes.length > 1 && this.pipes[0].x + CONSTS.PW + 10 < -10) {
      this.pipes.shift();
    }
    this.fillPipes();

    // Identify current target pipe and next pipe
    let targetPipe = this.pipes[0];
    let nextPipe = this.pipes[1] || this.pipes[0];

    for (let i = 0; i < this.pipes.length; i++) {
      if (this.pipes[i].x + CONSTS.PW > CONSTS.BX - CONSTS.R) {
        targetPipe = this.pipes[i];
        nextPipe = this.pipes[i + 1] || targetPipe;
        break;
      }
    }

    const m = this.mario;

    if (m.alive) {
      const gapTop = Math.round(targetPipe.gy - targetPipe.gap / 2);
      const gapBot = Math.round(targetPipe.gy + targetPipe.gap / 2);
      const pipeX = Math.round(targetPipe.x - CONSTS.BX);

      const nextGapTop = Math.round(nextPipe.gy - nextPipe.gap / 2);
      const nextGapBot = Math.round(nextPipe.gy + nextPipe.gap / 2);
      const nextPipeX = Math.round(nextPipe.x - CONSTS.BX);

      // Trajectory predictions (0.1s is ~6 frames, 0.2s is ~12 frames)
      const g = CONSTS.GRAV;
      const y01 = Math.round(m.y + m.vy * 6 + 0.5 * g * 36);
      const y02 = Math.round(m.y + m.vy * 12 + 0.5 * g * 144);

      const state: JevGameState = {
        bird_y: Math.round(m.y),
        bird_speed: Math.round(m.vy),
        y_after_0_1s: y01,
        y_after_0_2s: y02,
        pipe_x: pipeX,
        gap_top: gapTop,
        gap_bottom: gapBot,
        room_above: Math.round(m.y - gapTop),
        room_below: Math.round(gapBot - m.y),
        next_pipe_x: nextPipeX,
        next_gap_top: nextGapTop,
        next_gap_bottom: nextGapBot
      };

      // If AI is in control, ask Jev
      if (!this.humanControl) {
        jevClient.decide(state, nowMs).then(decision => {
          if (decision.shouldJump && m.alive) {
            this.flap();
          }
        });
      }

      // Physics update
      m.vy += CONSTS.GRAV;
      m.y += m.vy;
      m.age++;

      // Trail
      m.tr[m.ti] = m.y;
      m.ti = (m.ti + 1) % 24;

      // Score
      if (targetPipe.id > this.genPoints) {
        this.genPoints = targetPipe.id;
        if (this.genPoints > this.bestScore) {
          this.bestScore = this.genPoints;
        }
        sounds.playScore();
      }

      // Collision detection
      const topEdge = gapTop;
      const botEdge = gapBot;
      let crashed = m.y < CONSTS.R || m.y > CONSTS.H - CONSTS.GROUND - CONSTS.R;

      if (
        !crashed &&
        CONSTS.BX + CONSTS.R > targetPipe.x - 4 &&
        CONSTS.BX - CONSTS.R < targetPipe.x + CONSTS.PW + 4 &&
        (m.y - CONSTS.R < topEdge || m.y + CONSTS.R > botEdge)
      ) {
        crashed = true;
      }

      if (crashed) {
        m.alive = false;
        this.burstMario();
        // Respawn after short delay
        setTimeout(() => {
          this.gen++;
          this.restart();
        }, 1200);
      }
    }
  }
}
