import type { GameState } from './types';
import { updateCardCounts } from './rules';

export type MarketPhase = 'Bidding' | 'Choosing' | 'Complete';
export type MarketExchangeOrder = 'high-card-first';

export interface MarketOptions {
  extraCards?: number;
  order?: MarketExchangeOrder;
}

export interface MarketBid {
  player: number;
  card: number | null;
}

interface ActiveMarketBid {
  player: number;
  card: number;
}

export interface MarketExchangeTurn {
  player: number;
  bidCard: number;
}

export interface MarketState {
  phase: MarketPhase;
  hands: number[][];
  market: number[];
  remainingCards: number[];
  bids: Array<MarketBid | null>;
  exchangeOrder: MarketExchangeTurn[];
  currentExchangeIndex: number;
  excludedCards: number[];
  order: MarketExchangeOrder;
  extraCards: number;
}

export interface MarketActionResult {
  success: boolean;
  state: MarketState;
  message?: string;
}

export interface MarketGameStateResult {
  success: boolean;
  gameState: GameState;
  message?: string;
}

const DEFAULT_MARKET_EXTRA_CARDS = 2;
const DEFAULT_EXCHANGE_ORDER: MarketExchangeOrder = 'high-card-first';

function sortHand(hand: number[]): number[] {
  return [...hand].sort((a, b) => a - b);
}

function cloneMarketState(state: MarketState): MarketState {
  return {
    ...state,
    hands: state.hands.map(hand => [...hand]),
    market: [...state.market],
    remainingCards: [...state.remainingCards],
    bids: state.bids.map(bid => (bid ? { ...bid } : null)),
    exchangeOrder: state.exchangeOrder.map(turn => ({ ...turn })),
    excludedCards: [...state.excludedCards],
  };
}

function resolveOptions(options: MarketOptions = {}): Required<MarketOptions> {
  return {
    extraCards: options.extraCards ?? DEFAULT_MARKET_EXTRA_CARDS,
    order: options.order ?? DEFAULT_EXCHANGE_ORDER,
  };
}

export function getMarketSize(playerCount: number, extraCards = DEFAULT_MARKET_EXTRA_CARDS): number {
  return playerCount + extraCards;
}

export function createMarketStateFromGameState(
  state: GameState,
  options: MarketOptions = {},
): MarketState {
  const { extraCards, order } = resolveOptions(options);
  const marketSize = getMarketSize(state.players.length, extraCards);

  if (state.remainingCards.length < marketSize) {
    throw new Error('Not enough remaining cards for market');
  }

  return {
    phase: 'Bidding',
    hands: state.players.map(player => sortHand(player.hand)),
    market: sortHand(state.remainingCards.slice(0, marketSize)),
    remainingCards: state.remainingCards.slice(marketSize),
    bids: new Array(state.players.length).fill(null),
    exchangeOrder: [],
    currentExchangeIndex: 0,
    excludedCards: [],
    order,
    extraCards,
  };
}

export function submitMarketBid(
  state: MarketState,
  player: number,
  card: number | null,
): MarketActionResult {
  if (state.phase !== 'Bidding') {
    return { success: false, state, message: 'Market is not accepting bids' };
  }

  if (player < 0 || player >= state.hands.length) {
    return { success: false, state, message: 'Invalid player' };
  }

  if (state.bids[player]) {
    return { success: false, state, message: 'Player already submitted a market choice' };
  }

  if (card !== null && !state.hands[player].includes(card)) {
    return { success: false, state, message: 'Bid card is not in hand' };
  }

  const next = cloneMarketState(state);
  next.bids[player] = { player, card };
  return { success: true, state: next };
}

export function allMarketBidsSubmitted(state: MarketState): boolean {
  return state.bids.every(Boolean);
}

export function revealMarketBids(state: MarketState): MarketActionResult {
  if (state.phase !== 'Bidding') {
    return { success: false, state, message: 'Market bids already revealed' };
  }

  if (!allMarketBidsSubmitted(state)) {
    return { success: false, state, message: 'Not all market choices are submitted' };
  }

  const next = cloneMarketState(state);
  const activeBids = next.bids.filter(
    (bid): bid is ActiveMarketBid => bid !== null && bid.card !== null,
  );

  for (const bid of activeBids) {
    const cardIndex = next.hands[bid.player].indexOf(bid.card);
    if (cardIndex < 0) {
      return { success: false, state, message: 'Bid card is not in hand' };
    }
    next.hands[bid.player].splice(cardIndex, 1);
    next.excludedCards.push(bid.card);
  }

  next.exchangeOrder = activeBids
    .map(bid => ({ player: bid.player, bidCard: bid.card }))
    .sort((a, b) => b.bidCard - a.bidCard || a.player - b.player);
  next.currentExchangeIndex = 0;
  next.phase = next.exchangeOrder.length > 0 ? 'Choosing' : 'Complete';
  return { success: true, state: next };
}

export function getCurrentMarketPlayer(state: MarketState): number | null {
  if (state.phase !== 'Choosing') return null;
  return state.exchangeOrder[state.currentExchangeIndex]?.player ?? null;
}

export function takeMarketCard(
  state: MarketState,
  player: number,
  card: number,
): MarketActionResult {
  if (state.phase !== 'Choosing') {
    return { success: false, state, message: 'Market is not in card selection phase' };
  }

  const currentPlayer = getCurrentMarketPlayer(state);
  if (currentPlayer !== player) {
    return { success: false, state, message: 'Not this player market turn' };
  }

  const cardIndex = state.market.indexOf(card);
  if (cardIndex < 0) {
    return { success: false, state, message: 'Card is not in market' };
  }

  const next = cloneMarketState(state);
  next.market.splice(cardIndex, 1);
  next.hands[player] = sortHand([...next.hands[player], card]);
  next.currentExchangeIndex += 1;
  if (next.currentExchangeIndex >= next.exchangeOrder.length) {
    next.phase = 'Complete';
  }

  return { success: true, state: next };
}

export function isMarketComplete(state: MarketState): boolean {
  return state.phase === 'Complete';
}

export function applyCompletedMarketToGameState(
  gameState: GameState,
  marketState: MarketState,
): MarketGameStateResult {
  if (!isMarketComplete(marketState)) {
    return { success: false, gameState, message: 'Market is not complete' };
  }

  if (gameState.players.length !== marketState.hands.length) {
    return { success: false, gameState, message: 'Market player count does not match game state' };
  }

  const removedCards = [...marketState.excludedCards, ...marketState.market];

  return {
    success: true,
    gameState: {
      ...gameState,
      players: gameState.players.map((player, index) => ({
        ...player,
        hand: sortHand(marketState.hands[index]),
        graveyard: [],
      })),
      fieldCard: null,
      sharedGraveyard: [],
      trickCards: [],
      actionCount: 0,
      remainingCards: [...marketState.remainingCards],
      cardCounts:
        gameState.cardCounts.length > 0
          ? updateCardCounts(gameState.cardCounts, removedCards)
          : [...gameState.cardCounts],
      phase: 'AwaitMove',
    },
  };
}
