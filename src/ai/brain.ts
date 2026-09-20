import type { ActivationFunction, BrainInstance, SerializedBrain } from '../types';

function activate(x: number, fn: ActivationFunction): number {
  switch (fn) {
    case 'relu':
      return x > 0 ? x : 0;
    case 'leaky_relu':
      return x > 0 ? x : 0.01 * x;
    case 'sigmoid':
      return 1 / (1 + Math.exp(-x));
    case 'tanh':
    default:
      return Math.tanh(x);
  }
}

function gauss(): number {
  let u = 0;
  while (!u) u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class Brain implements BrainInstance {
  public h: number;
  public n: number;
  public p: Float32Array; // Weights & biases: W1[4*h] + b1[h] + W2[h] + b2[1] = 6h + 1
  public m: Uint8Array;    // Mutation indicators
  public a0: Float32Array; // Input layer activations
  public a1: Float32Array; // Hidden layer activations
  public out: number;      // Output activation
  public activation: ActivationFunction;

  constructor(h: number, weights?: Float32Array | number[], activation: ActivationFunction = 'tanh') {
    this.h = h;
    this.n = 6 * h + 1;
    this.activation = activation;
    this.p = weights ? Float32Array.from(weights) : Float32Array.from({ length: this.n }, () => Math.random() * 2 - 1);
    this.m = new Uint8Array(this.n);
    this.a0 = new Float32Array(4);
    this.a1 = new Float32Array(h);
    this.out = 0.5;
  }

  public forward(x: number[] | Float32Array): number {
    const h = this.h;
    const p = this.p;

    // Layer 0 (Input)
    for (let i = 0; i < 4; i++) {
      this.a0[i] = x[i];
    }

    // Layer 1 (Hidden)
    let s2 = p[6 * h]; // output bias
    for (let j = 0; j < h; j++) {
      let s = p[4 * h + j]; // hidden bias
      for (let i = 0; i < 4; i++) {
        s += p[j * 4 + i] * x[i];
      }
      const a = activate(s, this.activation);
      this.a1[j] = a;
      s2 += p[5 * h + j] * a;
    }

    // Layer 2 (Output)
    this.out = 1 / (1 + Math.exp(-s2));
    return this.out;
  }

  public static clone(b: Brain): Brain {
    const clone = new Brain(b.h, b.p, b.activation);
    clone.m.set(b.m);
    return clone;
  }

  public static child(parentA: Brain, parentB: Brain | null, mutationRate: number, mutationSd: number): Brain {
    const child = new Brain(parentA.h, undefined, parentA.activation);
    for (let i = 0; i < child.n; i++) {
      // Uniform crossover if parentB exists
      let v = (parentB && Math.random() < 0.5) ? parentB.p[i] : parentA.p[i];

      // Gaussian mutation
      if (Math.random() < mutationRate) {
        v += gauss() * mutationSd;
        child.m[i] = 1;
      }
      child.p[i] = Math.max(-3, Math.min(3, v));
    }
    return child;
  }

  public toJSON(name: string, species: string, score: number, gen: number): SerializedBrain {
    return {
      version: '2.0',
      name,
      species,
      h: this.h,
      arch: `4-${this.h}-1`,
      weights: Array.from(this.p),
      score,
      generation: gen,
      timestamp: new Date().toISOString()
    };
  }

  public static fromJSON(data: SerializedBrain): Brain {
    return new Brain(data.h, data.weights, 'tanh');
  }
}
