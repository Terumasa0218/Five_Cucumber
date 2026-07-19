import { describe, expect, it } from 'vitest';

import { createMarketStateFromGameState } from '../market';
import {
  chooseMarketBidForHand,
  chooseMarketCardForHand,
  evaluateInitialHand,
  runAutomaticMarketExchange,
} from '../market-policy';
import { initializeCardCounts } from '../rules';
import type { GameState } from '../types';

function createState(): GameState {
  return {
    players: [
      { hand: [4, 5, 6, 6, 7, 8, 9], cucumbers: 0, graveyard: [] },
      { hand: [1, 2, 3, 10, 12, 14, 15], cucumbers: 0, graveyard: [] },
      { hand: [4, 5, 7, 8, 12, 13, 15], cucumbers: 0, graveyard: [] },
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
    remainingCards: [1, 2, 5, 9, 11, 15, 14, 7],
    cardCounts: initializeCardCounts(),
    phase: 'AwaitMove',
    isFinalTrick: false,
  };
}

describe('market hand evaluation', () => {
  it('scores middle-heavy hands as riskier than flexible hands', () => {
    const risky = evaluateInitialHand([4, 5, 6, 6, 7, 8, 9]);
    const flexible = evaluateInitialHand([1, 2, 3, 10, 12, 14, 15]);

    expect(risky.accidentScore).toBeGreaterThan(flexible.accidentScore);
    expect(risky.middleCards).toBe(7);
    expect(flexible.lowCards).toBe(3);
  });
});

describe('market policy', () => {
  it('bids an expendable middle card from a risky hand when the market has low cards', () => {
    const decision = chooseMarketBidForHand(
      0,
      [4, 5, 6, 6, 7, 8, 9],
      [1, 2, 5, 9, 11, 15],
    );

    expect(decision.card).toBe(6);
    expect(decision.targetCard).toBe(1);
  });

  it('passes a flexible hand when the market has no clear upgrade', () => {
    const decision = chooseMarketBidForHand(
      1,
      [1, 2, 3, 10, 12, 14, 15],
      [6, 7, 8, 9, 10, 11],
    );

    expect(decision.card).toBeNull();
  });

  it('chooses the best market card for the current hand', () => {
    const decision = chooseMarketCardForHand([4, 5, 6, 7, 8, 9], [1, 2, 5, 9, 11, 15]);

    expect(decision?.card).toBe(1);
  });

  it('can complete an automatic exchange without mutating the source market', () => {
    const market = createMarketStateFromGameState(createState());
    const result = runAutomaticMarketExchange(market);

    expect(result.marketState.phase).toBe('Complete');
    expect(result.bidDecisions).toHaveLength(4);
    expect(result.takeDecisions.length).toBeGreaterThan(0);
    expect(result.marketState.hands.every(hand => hand.length === 7)).toBe(true);
    expect(market.phase).toBe('Bidding');
  });
});
