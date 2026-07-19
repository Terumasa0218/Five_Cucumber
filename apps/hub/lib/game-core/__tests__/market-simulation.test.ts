import { describe, expect, it } from 'vitest';

import { compareClassicAndMarketRounds, simulateRound } from '../market-simulation';
import type { GameConfig } from '../types';

const config: GameConfig = {
  ruleSet: 'classic',
  players: 4,
  turnSeconds: null,
  maxCucumbers: 999,
  initialCards: 7,
  cpuLevel: 'easy',
};

describe('market simulation', () => {
  it('simulates a deterministic classic round', () => {
    const result = simulateRound({
      config,
      seed: 1234,
      ruleSet: 'classic',
    });

    expect(result.ruleSet).toBe('classic');
    expect(result.initialHands).toHaveLength(4);
    expect(result.initialHands.every(hand => hand.length === 7)).toBe(true);
    expect(result.roundPenalties).toHaveLength(4);
    expect(result.totalPenalty).toBeGreaterThanOrEqual(0);
    expect(result.actions).toBeGreaterThan(0);
  });

  it('simulates a market round with automatic market decisions', () => {
    const result = simulateRound({
      config,
      seed: 1234,
      ruleSet: 'market',
    });

    expect(result.ruleSet).toBe('market');
    expect(result.marketExchange?.marketState.phase).toBe('Complete');
    expect(result.roundPenalties).toHaveLength(4);
    expect(result.finalState.currentRound).toBe(2);
  });

  it('summarizes classic and market rounds with comparable metrics', () => {
    const summary = compareClassicAndMarketRounds({
      config,
      iterations: 12,
      seed: 200,
    });

    expect(summary.iterations).toBe(12);
    expect(summary.players).toBe(4);
    expect(summary.exchangeParticipationRate).toBeGreaterThanOrEqual(0);
    expect(summary.exchangeParticipationRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(summary.classicAveragePenaltyPerPlayer)).toBe(true);
    expect(Number.isFinite(summary.marketAveragePenaltyPerPlayer)).toBe(true);
    expect(Number.isFinite(summary.marketPenaltyDeltaPerPlayer)).toBe(true);
    expect(Number.isFinite(summary.classicRiskPenaltyCorrelation)).toBe(true);
    expect(Number.isFinite(summary.marketRiskPenaltyCorrelation)).toBe(true);
  });
});
