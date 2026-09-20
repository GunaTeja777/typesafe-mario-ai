import type { BirdState, Pipe, SimSettings, SpeciesSpec } from '../types';
import { Brain } from '../ai/brain';
import { GeneticEngine } from '../ai/genetic';
import { DEFAULT_SETTINGS, DEFAULT_SPECIES, HUMAN_SPECIES } from '../ai/presets';
import { HumanController } from './human';
import { EnvironmentEngine } from './environment';
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
  R: 13,
  PW: 62,
  SPACING: 235,
  GRAV: 0.5,
  FLAP: -8.2,
  GROUND: 18
};

export class Simulation {
  public gen: number = 1;
  public bestScore: number = 0;
  public genPoints: number = 0;
  public dist: number = 0;
  public pipes: Pipe[] = [];
  public birds: BirdState[] = [];
  public particles: Array<{ x: number; y: number; vx: number; vy: number; l: number; c: string; r: number }> = [];
  public viewer: (BirdState | null)[] = [null, null, null];
  public history: number[][] = [[], [], []];
  public wins: number[] = [0, 0, 0];
  public mutRate: number = 0.3;
  public flash: number = 1;

  public paused: boolean = false;
  public speedIdx: number = 2; // default 4x
  public readonly speeds: number[] = [1, 2, 4, 8, 16, 32];

  public speciesList: SpeciesSpec[] = [...DEFAULT_SPECIES];
  public settings: SimSettings = { ...DEFAULT_SETTINGS };

  public human: HumanController = new HumanController();
  public env: EnvironmentEngine = new EnvironmentEngine();

  private pipeId: number = 0;
  private lastGy: number = CONSTS.H / 2;
  public onMessage?: (msg: string) => void;

  constructor() {
    this.restart();
  }

  public newPop(): Brain[][] {
    return this.speciesList.map(s =>
      Array.from({ length: this.settings.popPerSpecies }, () => new Brain(s.h, undefined, s.activation))
    );
  }

  public addPipe(x: number) {
    const id = this.pipeId++;
    const gap = this.settings.difficultyRamp ? Math.max(116, 170 - id * 3) : 170;
    let gy = this.lastGy + (Math.random() * 2 - 1) * 170;
    gy = Math.max(gap / 2 + 70, Math.min(CONSTS.H - CONSTS.GROUND - gap / 2 - 60, gy));
    this.lastGy = gy;
    this.pipes.push({ id, x, gy, gap });
  }

  public fillPipes() {
    while (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < CONSTS.W + 40) {
      const prevX = this.pipes.length > 0 ? this.pipes[this.pipes.length - 1].x : 340;
      this.addPipe(prevX + CONSTS.SPACING);
    }
  }

  public spawn(brainLists: Brain[][]) {
    this.birds = [];
    let idCounter = 0;

    brainLists.forEach((list, sIdx) => {
      list.forEach(brain => {
        this.birds.push({
          id: idCounter++,
          sp: sIdx,
          brain,
          y: CONSTS.H / 2 + (Math.random() - 0.5) * 20,
          vy: 0,
          alive: true,
          fit: 0,
          age: 0,
          score: 0,
          jx: (Math.random() - 0.5) * 8,
          tr: new Float32Array(24),
          ti: 0
        });
      });
    });

    if (this.settings.humanMode) {
      this.birds.push(this.human.init(CONSTS.H / 2));
    }

    this.pipes = [];
    this.pipeId = 0;
    this.lastGy = CONSTS.H / 2;
    this.dist = 0;
    this.genPoints = 0;
    this.viewer = [null, null, null];
    this.addPipe(340);
    this.fillPipes();
  }

  public burst(b: BirdState) {
    if (this.particles.length > 350) return;
    const color = b.isHuman ? HUMAN_SPECIES.color : this.speciesList[b.sp]?.color || '#ff5a4d';
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: CONSTS.BX + b.jx,
        y: b.y,
        vx: (Math.random() - 0.8) * 3.6,
        vy: (Math.random() - 0.6) * 4.6,
        l: 1,
        c: color,
        r: Math.random() * 6
      });
    }
  }

  public step() {
    this.env.update(this.settings.windEnabled, this.settings.windForce);

    const baseSpeed = this.settings.difficultyRamp ? Math.min(4.8, 3 + this.genPoints * 0.04) : 3;
    const sp = baseSpeed;
    this.dist += sp;

    // Move pipes
    for (const p of this.pipes) {
      p.x -= sp;
    }
    while (this.pipes.length > 1 && this.pipes[0].x + CONSTS.PW + 6 < -10) {
      this.pipes.shift();
    }
    this.fillPipes();

    // Identify target obstacle pipe
    let targetPipe = this.pipes[0];
    for (const p of this.pipes) {
      if (p.x + CONSTS.PW + 6 > CONSTS.BX - CONSTS.R) {
        targetPipe = p;
        break;
      }
    }

    const top = targetPipe.gy - targetPipe.gap / 2;
    const bot = targetPipe.gy + targetPipe.gap / 2;
    const nx = Math.min(1, Math.max(0, (targetPipe.x + CONSTS.PW + 6 - CONSTS.BX) / (CONSTS.SPACING + CONSTS.PW)));

    // Inputs: [bird_y / H, dist_to_pipe / norm, gap_top / H, gap_bot / H]
    const inp = [0, nx, top / CONSTS.H, bot / CONSTS.H];
    let aliveCount = 0;

    for (const b of this.birds) {
      if (!b.alive) continue;

      if (b.isHuman) {
        // Human controls handled via event trigger
        if (this.human.flapQueued) {
          b.vy = CONSTS.FLAP;
          this.human.flapQueued = false;
        }
      } else {
        inp[0] = b.y / CONSTS.H;
        if (b.brain.forward(inp) > 0.5) {
          b.vy = CONSTS.FLAP;
        }
      }

      // Wind turbulence
      if (this.settings.windEnabled) {
        b.vy += this.env.wind * 0.15;
      }

      b.vy += CONSTS.GRAV;
      b.y += b.vy;
      b.age++;

      // Fitness calculation: progress + staying centered in the gap
      b.fit += 1 + (1 - Math.min(1, Math.abs(b.y - targetPipe.gy) / CONSTS.H));
      b.score = targetPipe.id;

      // Trail record
      b.tr[b.ti] = b.y;
      b.ti = (b.ti + 1) % 24;

      // Collision checks
      let dead = b.y < CONSTS.R || b.y > CONSTS.H - CONSTS.GROUND - CONSTS.R + 4;
      if (
        !dead &&
        CONSTS.BX + CONSTS.R > targetPipe.x - 6 &&
        CONSTS.BX - CONSTS.R < targetPipe.x + CONSTS.PW + 6 &&
        (b.y - CONSTS.R < top || b.y + CONSTS.R > bot)
      ) {
        dead = true;
      }

      if (dead) {
        b.alive = false;
        b.fit += b.score * 300;
        this.burst(b);
        if (b.isHuman) {
          this.human.onCrash();
        }
      } else {
        if (!b.isHuman) aliveCount++;
      }
    }

    if (aliveCount > 0) {
      if (targetPipe.id > this.genPoints) {
        this.genPoints = targetPipe.id;
        sounds.playScore();
      }
      if (this.genPoints > this.bestScore) {
        const prev = this.bestScore;
        this.bestScore = this.genPoints;
        if (this.bestScore >= 5 && this.bestScore % 5 === 0 && this.bestScore !== prev) {
          sounds.playFanfare();
          this.notify(`🎉 New record: ${this.bestScore} pipes cleared in Generation ${this.gen}!`);
        }
      }
    } else {
      this.endGeneration();
    }
  }

  public endGeneration() {
    const topScores = [0, 0, 0];
    const topFit = [0, 0, 0];

    for (const b of this.birds) {
      if (b.isHuman) continue;
      topScores[b.sp] = Math.max(topScores[b.sp], b.score);
      topFit[b.sp] = Math.max(topFit[b.sp], b.fit);
    }

    topScores.forEach((score, i) => this.history[i].push(score));

    const evolution = GeneticEngine.evolve(this.birds, this.speciesList, this.settings, this.bestScore);
    this.wins[evolution.bestSpeciesIdx]++;

    const winner = this.speciesList[evolution.bestSpeciesIdx];
    this.notify(
      `Generation ${this.gen} finished. ${winner.name} (${winner.arch}) led with ${topScores[evolution.bestSpeciesIdx]} pipes! Mutation rate: ${Math.round(evolution.mutRate * 100)}%.`
    );

    this.gen++;
    this.flash = 1;
    this.mutRate = evolution.mutRate;
    this.spawn(evolution.nextPop);
  }

  public pickViewers() {
    for (let s = 0; s < 3; s++) {
      const v = this.viewer[s];
      if (!v || !v.alive) {
        let bestCandidate: BirdState | null = null;
        for (const b of this.birds) {
          if (b.sp === s && b.alive && (!bestCandidate || b.fit > bestCandidate.fit)) {
            bestCandidate = b;
          }
        }
        this.viewer[s] = bestCandidate;
      }
    }
  }

  public restart() {
    this.gen = 1;
    this.bestScore = 0;
    this.genPoints = 0;
    this.history = [[], [], []];
    this.wins = [0, 0, 0];
    this.mutRate = this.settings.mutationRate;
    this.flash = 1;
    this.particles = [];
    this.spawn(this.newPop());
    this.notify(`Restarted simulation. Generation 1 is running with ${this.birds.length} birds.`);
  }

  public skipGen() {
    for (const b of this.birds) {
      if (b.alive) {
        b.alive = false;
        b.fit += b.score * 300;
      }
    }
    this.endGeneration();
  }

  public loadChampion(brain: Brain, speciesIdx: number = 0) {
    const pop = this.newPop();
    pop[speciesIdx][0] = Brain.clone(brain);
    pop[speciesIdx][1] = Brain.clone(brain);
    this.spawn(pop);
    this.notify(`Loaded champion brain into ${this.speciesList[speciesIdx].name}!`);
  }

  private notify(msg: string) {
    if (this.onMessage) this.onMessage(msg);
  }
}
