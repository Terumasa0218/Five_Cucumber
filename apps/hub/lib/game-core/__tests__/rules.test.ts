import { describe, expect, it } from 'vitest';

import {
  calculateFinalTrickPenalty,
  createDeck,
  dealCards,
  determineTrickWinner,
} from '../rules';
import { GameConfig, Move } from '../types';

const baseConfig: GameConfig = {
  players: 4,
  turnSeconds: null,
  maxCucumbers: 30,
  initialCards: 7,
  cpuLevel: 'easy',
};

describe('createDeck', () => {
  it('105枚のデッキを生成する（15種類 × 7枚）', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(105);
  });

  it('各数字が7枚ずつある', () => {
    const deck = createDeck();

    for (let i = 1; i <= 15; i++) {
      expect(deck.filter(card => card === i)).toHaveLength(7);
    }
  });
});

describe('dealCards', () => {
  it('各プレイヤーに7枚配る', () => {
    const hands = dealCards(createDeck(), 4, 7);

    expect(hands).toHaveLength(4);
    hands.forEach(hand => expect(hand).toHaveLength(7));
  });
});

describe('determineTrickWinner', () => {
  it('最高値カードのプレイヤーが勝者', () => {
    const trick: Move[] = [
      { player: 0, card: 5, timestamp: 1 },
      { player: 1, card: 10, timestamp: 2 },
      { player: 2, card: 3, timestamp: 3 },
      { player: 3, card: 8, timestamp: 4 },
    ];

    expect(determineTrickWinner(trick)).toBe(1);
  });

  it('同値の場合は最後に出した方が勝者', () => {
    const trick: Move[] = [
      { player: 0, card: 8, timestamp: 1 },
      { player: 1, card: 4, timestamp: 2 },
      { player: 2, card: 8, timestamp: 3 },
      { player: 3, card: 8, timestamp: 4 },
    ];

    expect(determineTrickWinner(trick)).toBe(3);
  });
});

describe('最終トリックペナルティ', () => {
  it('勝者のカード数字分のきゅうりを獲得', () => {
    const trick: Move[] = [
      { player: 0, card: 7, timestamp: 1 },
      { player: 1, card: 12, timestamp: 2 },
      { player: 2, card: 9, timestamp: 3 },
      { player: 3, card: 3, timestamp: 4 },
    ];

    const result = calculateFinalTrickPenalty(trick, baseConfig);
    expect(result).toEqual({ winner: 1, penalty: 12 });
  });

  it('場に1がある場合はペナルティ2倍', () => {
    const trick: Move[] = [
      { player: 0, card: 1, timestamp: 1 },
      { player: 1, card: 5, timestamp: 2 },
      { player: 2, card: 10, timestamp: 3 },
      { player: 3, card: 8, timestamp: 4 },
    ];

    const result = calculateFinalTrickPenalty(trick, baseConfig);
    expect(result).toEqual({ winner: 2, penalty: 20 });
  });

  it('全員が1を出した場合はペナルティ0', () => {
    const trick: Move[] = [
      { player: 0, card: 1, timestamp: 1 },
      { player: 1, card: 1, timestamp: 2 },
      { player: 2, card: 1, timestamp: 3 },
      { player: 3, card: 1, timestamp: 4 },
    ];

    const result = calculateFinalTrickPenalty(trick, baseConfig);
    expect(result).toEqual({ winner: 3, penalty: 0 });
  });

  it('勝者自身が1を出して勝った場合もペナルティ0', () => {
    const trick: Move[] = [
      { player: 0, card: 1, timestamp: 1 },
      { player: 1, card: 1, timestamp: 2 },
      { player: 2, card: 1, timestamp: 3 },
      { player: 3, card: 1, timestamp: 4 },
    ];

    const result = calculateFinalTrickPenalty(trick, baseConfig);
    expect(result.winner).toBe(3);
    expect(result.penalty).toBe(0);
  });
});
