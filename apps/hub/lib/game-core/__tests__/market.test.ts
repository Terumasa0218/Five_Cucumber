import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine';
import {
  allMarketBidsSubmitted,
  applyCompletedMarketToGameState,
  createMarketStateFromGameState,
  getCurrentMarketPlayer,
  getMarketSize,
  isMarketComplete,
  revealMarketBids,
  submitMarketBid,
  takeMarketCard,
} from '../market';
import { SeededRng } from '../rng';
import type { GameConfig, GameState } from '../types';

const config: GameConfig = {
  ruleSet: 'classic',
  players: 4,
  turnSeconds: null,
  maxCucumbers: 30,
  initialCards: 7,
  cpuLevel: 'easy',
};

function createMarketBaseState(): GameState {
  return {
    players: [
      { hand: [4, 5, 7, 8, 12, 13, 15], cucumbers: 0, graveyard: [] },
      { hand: [2, 4, 6, 6, 7, 8, 9], cucumbers: 0, graveyard: [] },
      { hand: [1, 3, 5, 10, 11, 12, 14], cucumbers: 0, graveyard: [] },
      { hand: [3, 5, 6, 8, 9, 11, 13], cucumbers: 0, graveyard: [] },
    ],
    currentPlayer: 0,
    currentRound: 1,
    currentTrick: 1,
    fieldCard: null,
    sharedGraveyard: [],
    trickCards: [],
    actionCount: 0,
    firstPlayer: 0,
    isGameOver: false,
    gameOverPlayers: [],
    remainingCards: [2, 5, 9, 11, 15, 1, 14, 7],
    cardCounts: [],
    phase: 'AwaitMove',
    isFinalTrick: false,
  };
}

function submitAll(
  state: ReturnType<typeof createMarketStateFromGameState>,
  bids: Array<number | null>,
) {
  return bids.reduce((current, card, player) => {
    const result = submitMarketBid(current, player, card);
    expect(result.success).toBe(true);
    return result.state;
  }, state);
}

describe('classic rule model protection', () => {
  it('classic config still starts directly in AwaitMove without a market phase', () => {
    const state = createInitialState(config, new SeededRng(123));

    expect(config.ruleSet).toBe('classic');
    expect(state.phase).toBe('AwaitMove');
    expect(state.players).toHaveLength(4);
    expect(state.players.every(player => player.hand.length === 7)).toBe(true);
    expect(state.remainingCards).toHaveLength(105 - 4 * 7);
  });
});

describe('market setup', () => {
  it('uses player count plus two cards by default', () => {
    expect(getMarketSize(4)).toBe(6);
    expect(getMarketSize(4, 1)).toBe(5);
  });

  it('creates a face-up market from remaining cards without changing player hands', () => {
    const source = createMarketBaseState();
    const market = createMarketStateFromGameState(source);

    expect(market.phase).toBe('Bidding');
    expect(market.market).toEqual([1, 2, 5, 9, 11, 15]);
    expect(market.remainingCards).toEqual([14, 7]);
    expect(market.hands[0]).toEqual(source.players[0].hand);
    expect(source.remainingCards).toEqual([2, 5, 9, 11, 15, 1, 14, 7]);
  });
});

describe('market bidding', () => {
  it('waits until every player has submitted exchange or pass', () => {
    let market = createMarketStateFromGameState(createMarketBaseState());

    market = submitMarketBid(market, 0, 15).state;
    market = submitMarketBid(market, 1, 6).state;
    market = submitMarketBid(market, 2, null).state;

    expect(allMarketBidsSubmitted(market)).toBe(false);
    const revealEarly = revealMarketBids(market);
    expect(revealEarly.success).toBe(false);
    expect(revealEarly.message).toContain('Not all');

    market = submitMarketBid(market, 3, 11).state;
    expect(allMarketBidsSubmitted(market)).toBe(true);
  });

  it('rejects a bid card that is not in the player hand', () => {
    const market = createMarketStateFromGameState(createMarketBaseState());

    const result = submitMarketBid(market, 1, 15);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not in hand');
  });

  it('reveals active bids in high-card-first order and excludes bid cards from the game', () => {
    let market = createMarketStateFromGameState(createMarketBaseState());
    market = submitAll(market, [8, 6, null, 11]);

    const reveal = revealMarketBids(market);
    expect(reveal.success).toBe(true);
    expect(reveal.state.phase).toBe('Choosing');
    expect(reveal.state.exchangeOrder).toEqual([
      { player: 3, bidCard: 11 },
      { player: 0, bidCard: 8 },
      { player: 1, bidCard: 6 },
    ]);
    expect(reveal.state.excludedCards).toEqual([8, 6, 11]);
    expect(reveal.state.hands[0]).toEqual([4, 5, 7, 12, 13, 15]);
    expect(reveal.state.hands[2]).toEqual([1, 3, 5, 10, 11, 12, 14]);
  });
});

describe('market card selection', () => {
  it('lets players take market cards in reveal order', () => {
    let market = createMarketStateFromGameState(createMarketBaseState());
    market = revealMarketBids(submitAll(market, [8, 6, null, 11])).state;

    expect(getCurrentMarketPlayer(market)).toBe(3);

    let result = takeMarketCard(market, 3, 1);
    expect(result.success).toBe(true);
    market = result.state;
    expect(market.market).toEqual([2, 5, 9, 11, 15]);
    expect(market.hands[3]).toEqual([1, 3, 5, 6, 8, 9, 13]);
    expect(getCurrentMarketPlayer(market)).toBe(0);

    result = takeMarketCard(market, 0, 2);
    expect(result.success).toBe(true);
    market = result.state;
    expect(getCurrentMarketPlayer(market)).toBe(1);

    result = takeMarketCard(market, 1, 5);
    expect(result.success).toBe(true);
    market = result.state;
    expect(isMarketComplete(market)).toBe(true);
    expect(market.market).toEqual([9, 11, 15]);
  });

  it('rejects out-of-order market selection', () => {
    let market = createMarketStateFromGameState(createMarketBaseState());
    market = revealMarketBids(submitAll(market, [8, 6, null, 11])).state;

    const result = takeMarketCard(market, 0, 1);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Not this player');
  });
});

describe('market completion handoff', () => {
  it('applies completed market hands and remaining cards back to a clean game state', () => {
    const source = createMarketBaseState();
    let market = createMarketStateFromGameState(source);
    market = revealMarketBids(submitAll(market, [8, 6, null, 11])).state;
    market = takeMarketCard(market, 3, 1).state;
    market = takeMarketCard(market, 0, 2).state;
    market = takeMarketCard(market, 1, 5).state;

    const result = applyCompletedMarketToGameState(source, market);

    expect(result.success).toBe(true);
    expect(result.gameState.phase).toBe('AwaitMove');
    expect(result.gameState.fieldCard).toBeNull();
    expect(result.gameState.trickCards).toEqual([]);
    expect(result.gameState.sharedGraveyard).toEqual([]);
    expect(result.gameState.remainingCards).toEqual([14, 7]);
    expect(result.gameState.players[0].hand).toEqual([2, 4, 5, 7, 12, 13, 15]);
    expect(result.gameState.players[1].hand).toEqual([2, 4, 5, 6, 7, 8, 9]);
    expect(result.gameState.players[2].hand).toEqual([1, 3, 5, 10, 11, 12, 14]);
    expect(result.gameState.players[3].hand).toEqual([1, 3, 5, 6, 8, 9, 13]);
    expect(source.players[0].hand).toEqual([4, 5, 7, 8, 12, 13, 15]);
  });

  it('rejects handoff before the market is complete', () => {
    const source = createMarketBaseState();
    const market = createMarketStateFromGameState(source);

    const result = applyCompletedMarketToGameState(source, market);

    expect(result.success).toBe(false);
    expect(result.message).toContain('not complete');
  });
});
