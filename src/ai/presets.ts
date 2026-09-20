import type { SimSettings, SpeciesSpec, SerializedBrain } from '../types';

export const DEFAULT_SPECIES: SpeciesSpec[] = [
  {
    id: 0,
    name: 'Scarlet',
    h: 4,
    color: '#ff5a4d',
    arch: '4-4-1',
    activation: 'tanh',
    palette: { body: '#e8382d', dark: '#a91f16', belly: '#f9d2b0' }
  },
  {
    id: 1,
    name: 'Ash',
    h: 8,
    color: '#9aa3d6',
    arch: '4-8-1',
    activation: 'tanh',
    palette: { body: '#5d6486', dark: '#3a4062', belly: '#c9cde0' }
  },
  {
    id: 2,
    name: 'Rust',
    h: 16,
    color: '#ffb03a',
    arch: '4-16-1',
    activation: 'tanh',
    palette: { body: '#e08a22', dark: '#a85c10', belly: '#f7dca4' }
  }
];

export const HUMAN_SPECIES: SpeciesSpec = {
  id: 999,
  name: 'Human Challenger',
  h: 0,
  color: '#38ef7d',
  arch: 'Human Pilot',
  palette: { body: '#11998e', dark: '#0a635d', belly: '#e0fbf8' }
};

export const DEFAULT_SETTINGS: SimSettings = {
  popPerSpecies: 40,
  mutationRate: 0.3,
  mutationVariance: 0.65,
  elitismCount: 2,
  crossoverRate: 0.6,
  difficultyRamp: false,
  windEnabled: false,
  windForce: 0,
  soundEnabled: true,
  theme: 'cartoon',
  humanMode: false
};

// Pre-trained master champion (4-4-1 network that reliably clears pipes)
export const CHAMPION_PRESET: SerializedBrain = {
  version: '2.0',
  name: 'Acrobat Alpha (Pre-trained)',
  species: 'Scarlet',
  h: 4,
  arch: '4-4-1',
  score: 142,
  generation: 45,
  timestamp: '2026-09-20T11:00:00.000Z',
  weights: [
    // W1 [4*4=16]
    -2.14,  0.88,  1.72, -1.95,
     1.45, -0.62, -1.34,  1.85,
    -1.90,  1.12,  2.04, -1.68,
     0.95, -1.40, -1.15,  1.60,
    // b1 [4]
     0.32, -0.45,  0.28, -0.15,
    // W2 [4]
    -2.40,  1.95, -2.10,  1.82,
    // b2 [1]
    -0.18
  ]
};
