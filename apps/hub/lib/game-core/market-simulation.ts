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
  const exchangeLeaderPenalties: number[] = [];
  let exchangeCount = 0;
  let possibleExchanges = 0;

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
    }

    const exchange = market.marketExchange;
    if (exchange) {
      const exchangedPlayers = exchange.bidDecisions.filter(decision => decision.card !== null);
      exchangeCount += exchangedPlayers.length;
      possibleExchanges += options.config.players;

      const leader = exchange.marketState.exchangeOrder[0];
      if (leader) {
        exchangeLeaderPenalties.push(market.roundPenalties[leader.player]);
      }
    }
  }

  const classicAveragePenaltyPerPlayer = average(classicPenalties);
  const marketAveragePenaltyPerPlayer = average(marketPenalties);

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
  };
}
