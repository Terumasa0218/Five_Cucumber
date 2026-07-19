import { describe, expect, it } from 'vitest';

import { compareMarketBatch } from '../market-batch';
import type { GameConfig } from '../types';

const config: Omit<GameConfig, 'players'> = {
  ruleSet: 'classic',
  turnSeconds: null,
  maxCucumbers: 999,
  initialCards: 7,
  cpuLevel: 'easy',
};

describe('market batch comparison', () => {
  it('compares player counts and market sizes in one report', () => {
    const result = compareMarketBatch({
      config,
      players: [2, 4],
      extraCards: [1, 2],
      iterations: 12,
      seed: 800,
    });

    expect(result.iterations).toBe(12);
    expect(result.seed).toBe(800);
    expect(result.reports).toHaveLength(4);
    expect(result.byExtraCards).toHaveLength(2);
    expect(result.recommendedExtraCards.extraCards).toBeGreaterThanOrEqual(1);
    expect(result.recommendedExtraCards.extraCards).toBeLessThanOrEqual(2);

    for (const report of result.reports) {
      expect([2, 4]).toContain(report.players);
      expect([1, 2]).toContain(report.extraCards);
      expect(['strong', 'watch', 'weak']).toContain(report.verdict);
      expect(Number.isFinite(report.evaluationScore)).toBe(true);
      expect(Number.isFinite(report.middleOnlyZeroPenaltyDelta)).toBe(true);
      expect(Number.isFinite(report.exchangeLeaderAdvantage)).toBe(true);
    }
  });
});
