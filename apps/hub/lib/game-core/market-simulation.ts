import { applyMove, createInitialState } from './engine';
import {
  applyCompletedMarketToGameState,
  createMarketStateFromGameState,
  type MarketOptions,
} from './market';
import {
  type AutomaticMarketExchangeResult,
  evaluateInitialHand,
  type HandEvaluation,
  runAutomaticMarketExchange,
} from './market-policy';
import { SeededRng } from './rng';
import { getLegalMoves } from './rules';
import type { GameConfig, GameState, Move, RuleSetId } from './types';

export interface RoundSimulationOptions {
  config: GameConfig;
  seed: number;
  ruleSet: RuleSetId;
  market?: MarketOptions;
  maxActions?: number;
}

export interface RoundSimulationResult {
  seed: number;
  ruleSet: RuleSetId;
  initialHands: number[][];
  initialEvaluations: HandEvaluation[];
  roundPenalties: number[];
  totalPenalty: number;
  actions: number;
  finalState: GameState;
  marketExchange?: AutomaticMarketExchangeResult;
}

export interface MarketComparisonOptions {
  config: GameConfig;
  iterations: number;
  seed: number;
  market?: MarketOptions;
  weakHandThreshold?: number;
}

export interface MarketComparisonSummary {
  iterations: number;
  players: number;
  classicAveragePenaltyPerPlayer: number;
  marketAveragePenaltyPerPlayer: number;
  marketPenaltyDeltaPerPlayer: number;
  classicRiskPenaltyCorrelation: number;
  marketRiskPenaltyCorrelation: number;
  exchangeParticipationRate: number;
  exchangeLeaderAveragePenalty: number;
  weakHandAveragePenaltyClassic: number;
  weakHandAveragePenaltyMarket: number;
  middleOnlySampleCount: number;
  middleOnlyHandRate: number;
  middleOnlyAveragePenaltyClassic: number;
  middleOnlyAveragePenaltyMarket: number;
  middleOnlyPenaltyDelta: number;
  middleOnlyZeroPenaltyRateClassic: number;
  middleOnlyZeroPenaltyRateMarket: number;
  middleOnlyExchangeParticipationRate: number;
  middleOnlyEdgeRecoveryRate: number;
  marketDecisionRoundRate: number;
  contestedExchangeRoundRate: number;
  averageBiddersPerMarketRound: number;
  publicCardFactsPerRound: number;
  knownCurrentCardShareAfterMarket: number;
  highSignalBidRate: number;
}

function cloneHands(state: GameState): number[][] {
  return state.players.map(player => [...player.hand]);
}

function chooseSimulationMove(state: GameState): Move {
  const player = state.currentPlayer;
  const hand = state.players[player].hand;
  const legalMoves = getLegalMoves(state, player);

  if (legalMoves.length === 0) {
    throw new Error(`No legal moves for player ${player}`);
  }

  if (state.isFinalTrick || state.fieldCard === null) {
    return { player, card: Math.min(...legalMoves), timestamp: 0 };
  }

  const playableCards = hand.filter(card => card >= state.fieldCard!);
  if (playableCards.length > 0) {
    return { player, card: Math.min(...playableCards), timestamp: 0 };
  }

  return {
    player,
    card: Math.min(...hand),
    timestamp: 0,
    isDiscard: true,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;

  const avgX = average(xs);
  const avgY = average(ys);
  let numerator = 0;
  let varianceX = 0;
  let varianceY = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - avgX;
    const dy = ys[i] - avgY;
    numerator += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }

  const denominator = Math.sqrt(varianceX * varianceY);
  return denominator === 0 ? 0 : numerator / denominator;
}

function isEdgeCard(card: number): boolean {
  return card <= 3 || card >= 13;
}

function isMiddleOnlyHand(hand: number[]): boolean {
  return hand.length > 0 && hand.every(card => card >= 4 && card <= 12);
}

function hasEdgeCard(hand: number[]): boolean {
  return hand.some(isEdgeCard);
}

export function simulateRound(options: RoundSimulationOptions): RoundSimulationResult {
  const rng = new SeededRng(options.seed);
  const config = { ...options.config, ruleSet: options.ruleSet };
  let state = createInitialState(config, rng);
  const startRound = state.currentRound;
  const initialHands = cloneHands(state);
  const initialEvaluations = initialHands.map(evaluateInitialHand);
  const beforeCucumbers = state.players.map(player => player.cucumbers);
  let marketExchange: AutomaticMarketExchangeResult | undefined;

  if (options.ruleSet === 'market') {
    const marketState = createMarketStateFromGameState(state, options.market);
    marketExchange = runAutomaticMarketExchange(marketState);
    const applied = applyCompletedMarketToGameState(state, marketExchange.marketState);

    if (!applied.success) {
      throw new Error(applied.message ?? 'Failed to apply market result');
    }

    state = applied.gameState;
  }

  const maxActions = options.maxActions ?? config.players * config.initialCards * 2;
  let actions = 0;

  while (!state.isGameOver && state.currentRound === startRound && actions < maxActions) {
    if (state.phase !== 'AwaitMove') {
      throw new Error(`Unexpected simulation phase: ${state.phase}`);
    }

    const move = chooseSimulationMove(state);
    const result = applyMove(state, move, config, rng);

    if (!result.success) {
      throw new Error(result.message ?? 'Simulation move failed');
    }

    state = result.newState;
    actions += 1;
  }

  if (!state.isGameOver && state.currentRound === startRound) {
    throw new Error('Simulation exceeded max actions before round end');
  }

  const roundPenalties = state.players.map(
    (player, index) => player.cucumbers - beforeCucumbers[index],
  );

  return {
    seed: options.seed,
    ruleSet: options.ruleSet,
    initialHands,
    initialEvaluations,
    roundPenalties,
    totalPenalty: roundPenalties.reduce((sum, penalty) => sum + penalty, 0),
    actions,
    finalState: state,
    marketExchange,
  };
}

export function compareClassicAndMarketRounds(
  options: MarketComparisonOptions,
): MarketComparisonSummary {
  const weakHandThreshold = options.weakHandThreshold ?? 8;
  const classicPenalties: number[] = [];
  const marketPenalties: number[] = [];
  const riskScoresClassic: number[] = [];
  const riskScoresMarket: number[] = [];
  const weakClassicPenalties: number[] = [];
  const weakMarketPenalties: number[] = [];
  const middleOnlyClassicPenalties: number[] = [];
  const middleOnlyMarketPenalties: number[] = [];
  const exchangeLeaderPenalties: number[] = [];
  let exchangeCount = 0;
  let possibleExchanges = 0;
  let middleOnlyExchangeCount = 0;
  let middleOnlyEdgeRecoveryCount = 0;
  let marketDecisionRoundCount = 0;
  let contestedExchangeRoundCount = 0;
  let totalBidders = 0;
  let publicCardFactCount = 0;
  let knownCurrentCardCount = 0;
  let highSignalBidCount = 0;

  for (let index = 0; index < options.iterations; index++) {
    const seed = options.seed + index;
    const classic = simulateRound({
      config: options.config,
      seed,
      ruleSet: 'classic',
    });
    const market = simulateRound({
      config: options.config,
      seed,
      ruleSet: 'market',
      market: options.market,
    });

    for (let player = 0; player < options.config.players; player++) {
      const classicRisk = classic.initialEvaluations[player].accidentScore;
      const marketRisk = market.initialEvaluations[player].accidentScore;
      const classicPenalty = classic.roundPenalties[player];
      const marketPenalty = market.roundPenalties[player];

      classicPenalties.push(classicPenalty);
      marketPenalties.push(marketPenalty);
      riskScoresClassic.push(classicRisk);
      riskScoresMarket.push(marketRisk);

      if (classicRisk >= weakHandThreshold) {
        weakClassicPenalties.push(classicPenalty);
        weakMarketPenalties.push(marketPenalty);
      }

      if (isMiddleOnlyHand(classic.initialHands[player])) {
        middleOnlyClassicPenalties.push(classicPenalty);
        middleOnlyMarketPenalties.push(marketPenalty);
      }
    }

    const exchange = market.marketExchange;
    if (exchange) {
      const exchangedPlayers = exchange.bidDecisions.filter(decision => decision.card !== null);
      exchangeCount += exchangedPlayers.length;
      possibleExchanges += options.config.players;
      totalBidders += exchangedPlayers.length;
      publicCardFactCount += exchangedPlayers.length + exchange.takeDecisions.length;
      knownCurrentCardCount += exchange.takeDecisions.length;
      highSignalBidCount += exchangedPlayers.filter(decision => isEdgeCard(decision.card!)).length;

      if (exchangedPlayers.length > 0) {
        marketDecisionRoundCount += 1;
      }

      if (exchangedPlayers.length >= 2) {
        contestedExchangeRoundCount += 1;
      }

      const leader = exchange.marketState.exchangeOrder[0];
      if (leader) {
        exchangeLeaderPenalties.push(market.roundPenalties[leader.player]);
      }

      for (const decision of exchangedPlayers) {
        if (!isMiddleOnlyHand(classic.initialHands[decision.player])) continue;

        middleOnlyExchangeCount += 1;
        if (hasEdgeCard(exchange.marketState.hands[decision.player])) {
          middleOnlyEdgeRecoveryCount += 1;
        }
      }
    }
  }

  const classicAveragePenaltyPerPlayer = average(classicPenalties);
  const marketAveragePenaltyPerPlayer = average(marketPenalties);
  const middleOnlyAveragePenaltyClassic = average(middleOnlyClassicPenalties);
  const middleOnlyAveragePenaltyMarket = average(middleOnlyMarketPenalties);
  const middleOnlySampleCount = middleOnlyClassicPenalties.length;
  const middleOnlyZeroPenaltyRateClassic =
    middleOnlySampleCount === 0
      ? 0
      : middleOnlyClassicPenalties.filter(penalty => penalty === 0).length / middleOnlySampleCount;
  const middleOnlyZeroPenaltyRateMarket =
    middleOnlySampleCount === 0
      ? 0
      : middleOnlyMarketPenalties.filter(penalty => penalty === 0).length / middleOnlySampleCount;
  const totalPlayerSamples = options.iterations * options.config.players;

  return {
    iterations: options.iterations,
    players: options.config.players,
    classicAveragePenaltyPerPlayer,
    marketAveragePenaltyPerPlayer,
    marketPenaltyDeltaPerPlayer: marketAveragePenaltyPerPlayer - classicAveragePenaltyPerPlayer,
    classicRiskPenaltyCorrelation: pearsonCorrelation(riskScoresClassic, classicPenalties),
    marketRiskPenaltyCorrelation: pearsonCorrelation(riskScoresMarket, marketPenalties),
    exchangeParticipationRate: possibleExchanges === 0 ? 0 : exchangeCount / possibleExchanges,
    exchangeLeaderAveragePenalty: average(exchangeLeaderPenalties),
    weakHandAveragePenaltyClassic: average(weakClassicPenalties),
    weakHandAveragePenaltyMarket: average(weakMarketPenalties),
    middleOnlySampleCount,
    middleOnlyHandRate: totalPlayerSamples === 0 ? 0 : middleOnlySampleCount / totalPlayerSamples,
    middleOnlyAveragePenaltyClassic,
    middleOnlyAveragePenaltyMarket,
    middleOnlyPenaltyDelta: middleOnlyAveragePenaltyMarket - middleOnlyAveragePenaltyClassic,
    middleOnlyZeroPenaltyRateClassic,
    middleOnlyZeroPenaltyRateMarket,
    middleOnlyExchangeParticipationRate:
      middleOnlySampleCount === 0 ? 0 : middleOnlyExchangeCount / middleOnlySampleCount,
    middleOnlyEdgeRecoveryRate:
      middleOnlyExchangeCount === 0 ? 0 : middleOnlyEdgeRecoveryCount / middleOnlyExchangeCount,
    marketDecisionRoundRate:
      options.iterations === 0 ? 0 : marketDecisionRoundCount / options.iterations,
    contestedExchangeRoundRate:
      options.iterations === 0 ? 0 : contestedExchangeRoundCount / options.iterations,
    averageBiddersPerMarketRound: options.iterations === 0 ? 0 : totalBidders / options.iterations,
    publicCardFactsPerRound:
      options.iterations === 0 ? 0 : publicCardFactCount / options.iterations,
    knownCurrentCardShareAfterMarket:
      totalPlayerSamples === 0
        ? 0
        : knownCurrentCardCount / (totalPlayerSamples * options.config.initialCards),
    highSignalBidRate: exchangeCount === 0 ? 0 : highSignalBidCount / exchangeCount,
  };
}
