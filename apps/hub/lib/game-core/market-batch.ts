import { compareClassicAndMarketRounds, type MarketComparisonSummary } from './market-simulation';
import type { GameConfig } from './types';

export interface MarketBatchOptions {
  config: Omit<GameConfig, 'players'>;
  players?: number[];
  extraCards?: number[];
  iterations: number;
  seed: number;
}

export interface MarketBatchReport {
  players: number;
  extraCards: number;
  label: string;
  summary: MarketComparisonSummary;
  middleOnlyZeroPenaltyDelta: number;
  exchangeLeaderAdvantage: number;
  evaluationScore: number;
  verdict: 'strong' | 'watch' | 'weak';
}

export interface MarketBatchExtraSummary {
  extraCards: number;
  label: string;
  reports: MarketBatchReport[];
  averageMiddleOnlyPenaltyDelta: number;
  averageMiddleOnlyZeroPenaltyDelta: number;
  averageMiddleOnlyEdgeRecoveryRate: number;
  averageContestedExchangeRoundRate: number;
  averageKnownCurrentCardShare: number;
  averageExchangeLeaderAdvantage: number;
  averageEvaluationScore: number;
}

export interface MarketBatchResult {
  iterations: number;
  seed: number;
  reports: MarketBatchReport[];
  byExtraCards: MarketBatchExtraSummary[];
  recommendedExtraCards: MarketBatchExtraSummary;
}

const DEFAULT_PLAYERS = [2, 3, 4, 5, 6];
const DEFAULT_EXTRA_CARDS = [1, 2, 3];

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveMiddleOnlyPenaltyDelta(summary: MarketComparisonSummary): number {
  return summary.middleOnlySampleCount === 0
    ? summary.weakHandAveragePenaltyMarket - summary.weakHandAveragePenaltyClassic
    : summary.middleOnlyPenaltyDelta;
}

function scoreReport(summary: MarketComparisonSummary): number {
  const middleOnlyPenaltyDelta = resolveMiddleOnlyPenaltyDelta(summary);
  const middleOnlyZeroPenaltyDelta =
    summary.middleOnlyZeroPenaltyRateMarket - summary.middleOnlyZeroPenaltyRateClassic;
  const exchangeLeaderAdvantage =
    summary.marketAveragePenaltyPerPlayer - summary.exchangeLeaderAveragePenalty;

  const rescueScore =
    -middleOnlyPenaltyDelta * 4
    + middleOnlyZeroPenaltyDelta * 5
    + summary.middleOnlyEdgeRecoveryRate * 1.5;
  const decisionScore =
    summary.contestedExchangeRoundRate * 2
    + Math.min(summary.averageBiddersPerMarketRound / summary.players, 0.6);
  const informationRisk =
    Math.max(0, summary.knownCurrentCardShareAfterMarket - 0.18) * 4
    + Math.max(0, summary.publicCardFactsPerRound - summary.players * 1.25) * 0.25
    + Math.max(0, summary.highSignalBidRate - 0.65) * 1.5;
  const leaderRisk = Math.max(0, exchangeLeaderAdvantage - 0.35) * 2.5;

  return rescueScore + decisionScore - informationRisk - leaderRisk;
}

function getVerdict(summary: MarketComparisonSummary, evaluationScore: number): MarketBatchReport['verdict'] {
  const middleOnlyPenaltyDelta = resolveMiddleOnlyPenaltyDelta(summary);
  const middleOnlyZeroPenaltyDelta =
    summary.middleOnlyZeroPenaltyRateMarket - summary.middleOnlyZeroPenaltyRateClassic;
  const exchangeLeaderAdvantage =
    summary.marketAveragePenaltyPerPlayer - summary.exchangeLeaderAveragePenalty;

  if (
    middleOnlyPenaltyDelta <= 0
    && middleOnlyZeroPenaltyDelta >= 0
    && summary.knownCurrentCardShareAfterMarket <= 0.22
    && exchangeLeaderAdvantage <= 0.55
    && evaluationScore >= 0.5
  ) {
    return 'strong';
  }

  if (
    middleOnlyPenaltyDelta > 0.2
    || summary.knownCurrentCardShareAfterMarket > 0.3
    || exchangeLeaderAdvantage > 0.8
  ) {
    return 'weak';
  }

  return 'watch';
}

export function compareMarketBatch(options: MarketBatchOptions): MarketBatchResult {
  const players = options.players ?? DEFAULT_PLAYERS;
  const extraCardsList = options.extraCards ?? DEFAULT_EXTRA_CARDS;
  const reports: MarketBatchReport[] = [];

  for (const playerCount of players) {
    for (const extraCards of extraCardsList) {
      const summary = compareClassicAndMarketRounds({
        config: {
          ...options.config,
          players: playerCount,
        },
        iterations: options.iterations,
        seed: options.seed,
        market: { extraCards },
      });
      const middleOnlyZeroPenaltyDelta =
        summary.middleOnlyZeroPenaltyRateMarket - summary.middleOnlyZeroPenaltyRateClassic;
      const exchangeLeaderAdvantage =
        summary.marketAveragePenaltyPerPlayer - summary.exchangeLeaderAveragePenalty;
      const evaluationScore = scoreReport(summary);

      reports.push({
        players: playerCount,
        extraCards,
        label: `${playerCount}人 / 人数 + ${extraCards}`,
        summary,
        middleOnlyZeroPenaltyDelta,
        exchangeLeaderAdvantage,
        evaluationScore,
        verdict: getVerdict(summary, evaluationScore),
      });
    }
  }

  const byExtraCards = extraCardsList.map(extraCards => {
    const matchingReports = reports.filter(report => report.extraCards === extraCards);

    return {
      extraCards,
      label: `人数 + ${extraCards}`,
      reports: matchingReports,
      averageMiddleOnlyPenaltyDelta: average(
        matchingReports.map(report => resolveMiddleOnlyPenaltyDelta(report.summary)),
      ),
      averageMiddleOnlyZeroPenaltyDelta: average(
        matchingReports.map(report => report.middleOnlyZeroPenaltyDelta),
      ),
      averageMiddleOnlyEdgeRecoveryRate: average(
        matchingReports.map(report => report.summary.middleOnlyEdgeRecoveryRate),
      ),
      averageContestedExchangeRoundRate: average(
        matchingReports.map(report => report.summary.contestedExchangeRoundRate),
      ),
      averageKnownCurrentCardShare: average(
        matchingReports.map(report => report.summary.knownCurrentCardShareAfterMarket),
      ),
      averageExchangeLeaderAdvantage: average(
        matchingReports.map(report => report.exchangeLeaderAdvantage),
      ),
      averageEvaluationScore: average(matchingReports.map(report => report.evaluationScore)),
    };
  });

  const recommendedExtraCards = [...byExtraCards].sort(
    (a, b) =>
      b.averageEvaluationScore - a.averageEvaluationScore
      || a.averageMiddleOnlyPenaltyDelta - b.averageMiddleOnlyPenaltyDelta
      || a.averageKnownCurrentCardShare - b.averageKnownCurrentCardShare,
  )[0];

  return {
    iterations: options.iterations,
    seed: options.seed,
    reports,
    byExtraCards,
    recommendedExtraCards,
  };
}
