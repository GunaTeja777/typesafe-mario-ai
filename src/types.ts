export type ActivationFunction = 'tanh' | 'relu' | 'sigmoid' | 'leaky_relu';

export interface SpeciesSpec {
  id: number;
  name: string;
  h: number;
  color: string;
  arch: string;
  activation?: ActivationFunction;
  palette: {
    body: string;
    dark: string;
    belly: string;
  };
}

export interface BirdState {
  id: number;
  sp: number; // species index
  brain: BrainInstance;
  y: number;
  vy: number;
  alive: boolean;
  fit: number;
  age: number;
  score: number;
  jx: number; // horizontal jitter for depth
  tr: Float32Array; // trail history
  ti: number;
  isHuman?: boolean;
}

export interface BrainInstance {
  h: number;
  n: number;
  p: Float32Array; // weights + biases
  m: Uint8Array;    // mutated flags
  a0: Float32Array; // input activations [bird_y, pipe_x, gap_top, gap_bot]
  a1: Float32Array; // hidden activations
  out: number;      // output probability
  activation: ActivationFunction;
  forward(x: number[] | Float32Array): number;
}

export interface Pipe {
  id: number;
  x: number;
  gy: number; // gap center y
  gap: number; // gap height
  vy?: number; // vertical movement for moving pipes
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  l: number; // life 0..1
  c: string; // color
  r: number; // rotation/size
  kind?: 'feather' | 'spark' | 'smoke';
}

export interface SimSettings {
  popPerSpecies: number;
  mutationRate: number;
  mutationVariance: number;
  elitismCount: number;
  crossoverRate: number;
  difficultyRamp: boolean;
  windEnabled: boolean;
  windForce: number;
  soundEnabled: boolean;
  theme: 'cartoon' | 'neon' | 'sunset';
  humanMode: boolean;
}

export interface SerializedBrain {
  version: string;
  name: string;
  species: string;
  h: number;
  arch: string;
  weights: number[];
  score: number;
  generation: number;
  timestamp: string;
}
