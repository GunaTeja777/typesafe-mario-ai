import type { BirdState } from '../types';
import { Brain } from '../ai/brain';
import { sounds } from '../audio/soundEffects';

export class HumanController {
  public bird: BirdState | null = null;
  public bestScore: number = 0;
  public flapQueued: boolean = false;

  public init(initialY: number): BirdState {
    this.bird = {
      id: 9999,
      sp: 3, // species index 3 reserved for Human
      brain: new Brain(1), // dummy brain
      y: initialY,
      vy: 0,
      alive: true,
      fit: 0,
      age: 0,
      score: 0,
      jx: -15, // slight horizontal separation for clarity
      tr: new Float32Array(24),
      ti: 0,
      isHuman: true
    };
    return this.bird;
  }

  public flap(flapStrength: number = -8.2) {
    if (!this.bird) return;
    if (!this.bird.alive) {
      // Allow instant respawn if flock is still flying
      this.bird.alive = true;
      this.bird.vy = flapStrength;
      sounds.playFlap();
      return;
    }
    this.bird.vy = flapStrength;
    sounds.playFlap();
  }

  public onCrash() {
    if (this.bird && this.bird.alive) {
      this.bird.alive = false;
      if (this.bird.score > this.bestScore) {
        this.bestScore = this.bird.score;
      }
      sounds.playCrash();
    }
  }
}
