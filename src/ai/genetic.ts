import { Brain } from './brain';
import type { BirdState, SimSettings, SpeciesSpec } from '../types';

export interface EvolutionResult {
  nextPop: Brain[][];
  mutRate: number;
  bestSpeciesIdx: number;
  generationBestScores: number[];
}

export class GeneticEngine {
  public static evolve(
    birds: BirdState[],
    speciesList: SpeciesSpec[],
    settings: SimSettings,
    allTimeBest: number
  ): EvolutionResult {
    // Dynamic mutation rate decays slightly as champion fitness climbs, unless overridden
    const baseRate = settings.mutationRate;
    const rate = Math.max(0.04, baseRate - allTimeBest * 0.003);
    const sd = Math.max(0.12, settings.mutationVariance - allTimeBest * 0.006);

    const nextPop: Brain[][] = [];
    const generationBestScores = [0, 0, 0];
    const topFitness = [0, 0, 0];

    speciesList.forEach((spec, sIdx) => {
      const speciesBirds = birds.filter(b => b.sp === sIdx && !b.isHuman).sort((a, b) => b.fit - a.fit);

      if (speciesBirds.length === 0) {
        // Fallback: fresh random brains
        nextPop.push(Array.from({ length: settings.popPerSpecies }, () => new Brain(spec.h, undefined, spec.activation)));
        return;
      }

      generationBestScores[sIdx] = speciesBirds[0]?.score || 0;
      topFitness[sIdx] = speciesBirds[0]?.fit || 0;

      // Elitism: carry over the top brains unchanged
      const nextBrains: Brain[] = [];
      const elitismCount = Math.min(settings.elitismCount, speciesBirds.length);
      for (let e = 0; e < elitismCount; e++) {
        nextBrains.push(Brain.clone(speciesBirds[e].brain as Brain));
      }

      // Add 2 fresh exploratory brains to prevent premature genetic stagnation
      nextBrains.push(new Brain(spec.h, undefined, spec.activation));
      if (nextBrains.length < settings.popPerSpecies) {
        nextBrains.push(new Brain(spec.h, undefined, spec.activation));
      }

      // Selection pool: top 50%
      const pool = speciesBirds.slice(0, Math.max(2, Math.ceil(speciesBirds.length / 2)));
      const selectParent = (): Brain => {
        // Tournament selection of size 3
        let bestCandidate = pool[0];
        for (let k = 0; k < 3; k++) {
          const randIdx = Math.floor(Math.random() * pool.length);
          if (pool[randIdx].fit > bestCandidate.fit) {
            bestCandidate = pool[randIdx];
          }
        }
        return bestCandidate.brain as Brain;
      };

      // Breed remainder of population
      while (nextBrains.length < settings.popPerSpecies) {
        const parentA = selectParent();
        const parentB = Math.random() < settings.crossoverRate ? selectParent() : null;
        nextBrains.push(Brain.child(parentA, parentB, rate, sd));
      }

      nextPop.push(nextBrains);
    });

    // Determine winning species for this generation
    let bestSpeciesIdx = 0;
    let maxFit = -1;
    topFitness.forEach((fit, idx) => {
      if (fit > maxFit) {
        maxFit = fit;
        bestSpeciesIdx = idx;
      }
    });

    return {
      nextPop,
      mutRate: rate,
      bestSpeciesIdx,
      generationBestScores
    };
  }
}
