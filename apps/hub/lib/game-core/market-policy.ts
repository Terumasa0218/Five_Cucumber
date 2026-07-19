import {
  type MarketExchangeTurn,
  type MarketState,
  revealMarketBids,
  submitMarketBid,
  takeMarketCard,
} from './market';
import { getCucumberCount } from './rules';

export interface HandEvaluation {
  cardCount: number;
  averageCard: number;
  lowCards: number;
  middleCards: number;
  highCards: number;
  ones: number;
  cucumberLoad: number;
  accidentScore: number;
  flexibilityScore: number;
}

export interface MarketPolicyOptions {
  bidThreshold?: number;
}

export interface MarketBidDecision {
  player: number;
  card: number | null;
  score: number;
  targetCard: number | null;
  evaluation: HandEvaluation;
}

export interface MarketTakeDecision {
  player: number;
  bidCard: number;
  card: number;
  score: number;
}

export interface AutomaticMarketExchangeResult {
  marketState: MarketState;
  bidDecisions: MarketBidDecision[];
  takeDecisions: MarketTakeDecision[];
}

const DEFAULT_BID_THRESHOLD = 3;

function countCard(hand: number[], card: number): number {
  return hand.filter(value => value === card).length;
}

function removeOneCard(hand: number[], card: number): number[] {
  const index = hand.indexOf(card);
  if (index < 0) return [...hand];
  return [...hand.slice(0, index), ...hand.slice(index + 1)];
}

function uniqueCards(cards: number[]): number[] {
  return [...new Set(cards)].sort((a, b) => a - b);
}

export function evaluateInitialHand(hand: number[]): HandEvaluation {
  if (hand.length === 0) {
    return {
      cardCount: 0,
      averageCard: 0,
      lowCards: 0,
      middleCards: 0,
      highCards: 0,
      ones: 0,
      cucumberLoad: 0,
      accidentScore: 0,
      flexibilityScore: 0,
    };
  }

  const lowCards = hand.filter(card => card <= 3).length;
  const middleCards = hand.filter(card => card >= 4 && card <= 12).length;
  const highCards = hand.filter(card => card >= 13).length;
  const ones = countCard(hand, 1);
  const cucumberLoad = hand.reduce((sum, card) => sum + getCucumberCount(card), 0);
  const averageCard = hand.reduce((sum, card) => sum + card, 0) / hand.length;

  const lowSafety = lowCards * 1.8 + ones * 1.2;
  const highControl = Math.min(highCards, 2) * 1.0;
  const middleBurden = middleCards * 1.1;
  const cucumberPressure = cucumberLoad * 0.3;
  const noOnePenalty = ones === 0 ? 1.2 : 0;
  const accidentScore = Math.max(
    0,
    middleBurden + cucumberPressure + noOnePenalty - lowSafety - highControl,
  );
  const flexibilityScore =
    lowCards * 2
    + ones * 2
    + Math.min(highCards, 2) * 1.1
    - Math.max(0, middleCards - 3) * 0.4;

  return {
    cardCount: hand.length,
    averageCard,
    lowCards,
    middleCards,
    highCards,
    ones,
    cucumberLoad,
    accidentScore,
    flexibilityScore,
  };
}

function scoreCardForKeeping(card: number, hand: number[]): number {
  const evaluation = evaluateInitialHand(hand);
  const duplicates = Math.max(0, countCard(hand, card) - 1);
  let value: number;

  if (card === 1) {
    value = 12;
  } else if (card <= 3) {
    value = 10 - card;
  } else if (card <= 5) {
    value = 5.5;
  } else if (card <= 9) {
    value = 3.2;
  } else if (card <= 12) {
    value = 2.8;
  } else {
    value = evaluation.highCards <= 2 ? 4.5 : 3.2;
  }

  value -= getCucumberCount(card) * 0.45;
  value -= duplicates * 1.2;

  if (evaluation.highCards >= 3 && card >= 13) {
    value -= 1.2;
  }

  return Math.max(0.5, value);
}

export function scoreMarketCardForHand(card: number, hand: number[]): number {
  const evaluation = evaluateInitialHand(hand);
  let score = scoreCardForKeeping(card, [...hand, card]);

  if (card <= 3) {
    score += 3 + evaluation.accidentScore * 0.25;
  } else if (card <= 5) {
    score += 1.2 + evaluation.accidentScore * 0.12;
  }

  if (card >= 13 && evaluation.highCards === 0) {
    score += 2.2;
  } else if (card >= 13 && evaluation.highCards >= 2) {
    score -= 2.4;
  }

  if (card >= 4 && card <= 12 && evaluation.middleCards >= 4) {
    score -= 1.8;
  }

  return score;
}

export function chooseMarketCardForHand(hand: number[], market: number[]): MarketTakeDecision | null {
  if (market.length === 0) return null;

  const ranked = uniqueCards(market)
    .map(card => ({
      player: -1,
      bidCard: -1,
      card,
      score: scoreMarketCardForHand(card, hand),
    }))
    .sort((a, b) => b.score - a.score || a.card - b.card);

  return ranked[0];
}

export function chooseMarketBidForHand(
  player: number,
  hand: number[],
  market: number[],
  options: MarketPolicyOptions = {},
): MarketBidDecision {
  const evaluation = evaluateInitialHand(hand);
  const threshold = options.bidThreshold ?? DEFAULT_BID_THRESHOLD;
  let bestDecision: MarketBidDecision = {
    player,
    card: null,
    score: 0,
    targetCard: null,
    evaluation,
  };

  for (const bidCard of uniqueCards(hand)) {
    const nextHand = removeOneCard(hand, bidCard);
    const target = chooseMarketCardForHand(nextHand, market);
    if (!target) continue;

    const keepCost = scoreCardForKeeping(bidCard, hand);
    const orderPremium = bidCard * 0.12;
    const urgency = evaluation.accidentScore * 0.18;
    const trimHighBonus = evaluation.highCards >= 3 && bidCard >= 13 ? 1.8 : 0;
    const score = target.score - keepCost + orderPremium + urgency + trimHighBonus;

    if (score > bestDecision.score) {
      bestDecision = {
        player,
        card: bidCard,
        score,
        targetCard: target.card,
        evaluation,
      };
    }
  }

  if (bestDecision.score < threshold) {
    return {
      player,
      card: null,
      score: bestDecision.score,
      targetCard: bestDecision.targetCard,
      evaluation,
    };
  }

  return bestDecision;
}

export function runAutomaticMarketExchange(
  state: MarketState,
  options: MarketPolicyOptions = {},
): AutomaticMarketExchangeResult {
  let marketState = state;
  const bidDecisions: MarketBidDecision[] = [];
  const takeDecisions: MarketTakeDecision[] = [];

  for (let player = 0; player < marketState.hands.length; player++) {
    const decision = chooseMarketBidForHand(
      player,
      marketState.hands[player],
      marketState.market,
      options,
    );
    const result = submitMarketBid(marketState, player, decision.card);
    if (!result.success) {
      throw new Error(result.message ?? 'Failed to submit market bid');
    }

    bidDecisions.push(decision);
    marketState = result.state;
  }

  const reveal = revealMarketBids(marketState);
  if (!reveal.success) {
    throw new Error(reveal.message ?? 'Failed to reveal market bids');
  }
  marketState = reveal.state;

  while (marketState.phase === 'Choosing') {
    const turn = marketState.exchangeOrder[marketState.currentExchangeIndex] as
      | MarketExchangeTurn
      | undefined;
    if (!turn) break;

    const decision = chooseMarketCardForHand(marketState.hands[turn.player], marketState.market);
    if (!decision) break;

    const take = takeMarketCard(marketState, turn.player, decision.card);
    if (!take.success) {
      throw new Error(take.message ?? 'Failed to take market card');
    }

    takeDecisions.push({
      ...decision,
      player: turn.player,
      bidCard: turn.bidCard,
    });
    marketState = take.state;
  }

  return { marketState, bidDecisions, takeDecisions };
}
