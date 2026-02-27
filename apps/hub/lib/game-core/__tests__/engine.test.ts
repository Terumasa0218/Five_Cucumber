import { describe, expect, it } from 'vitest';

import { applyMove, createInitialState, endTrick } from '../engine';
import { createDeck, getLegalMoves, initializeCardCounts } from '../rules';
import { SeededRng } from '../rng';
import { GameConfig, GameState } from '../types';

const config: GameConfig = {
  players: 4,
  turnSeconds: null,
  maxCucumbers: 30,
  initialCards: 7,
  cpuLevel: 'easy',
};

function createBaseState(partial?: Partial<GameState>): GameState {
  return {
    players: [
      { hand: [1, 7], cucumbers: 0, graveyard: [] },
      { hand: [2, 8], cucumbers: 0, graveyard: [] },
      { hand: [3, 9], cucumbers: 0, graveyard: [] },
      { hand: [4, 10], cucumbers: 0, graveyard: [] },
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
    remainingCards: createDeck(),
    cardCounts: initializeCardCounts(),
    phase: 'AwaitMove',
    isFinalTrick: false,
    ...partial,
  };
}

describe('applyMove - 通常プレイ', () => {
  it('場の最高値以上のカードを出せる', () => {
    const rng = new SeededRng(1);
    const state = createBaseState({
      fieldCard: 5,
      players: [
        { hand: [3, 7], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 7, timestamp: 1 }, config, rng);

    expect(result.success).toBe(true);
    expect(result.newState.fieldCard).toBe(7);
    expect(result.newState.players[0].hand).toEqual([3]);
    expect(result.newState.trickCards).toHaveLength(1);
  });

  it('場の最高値未満のカードは出せない', () => {
    const rng = new SeededRng(2);
    const state = createBaseState({
      fieldCard: 10,
      players: [
        { hand: [5, 12], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 5, timestamp: 1 }, config, rng);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Illegal move');
  });

  it('リードプレイヤーは任意のカードを出せる', () => {
    const rng = new SeededRng(3);
    const state = createBaseState({
      fieldCard: null,
      players: [
        { hand: [2, 9], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 2, timestamp: 1 }, config, rng);

    expect(result.success).toBe(true);
    expect(result.newState.fieldCard).toBe(2);
    expect(result.newState.players[0].hand).toEqual([9]);
  });
});

describe('applyMove - 捨てカード', () => {
  it('出せるカードがない場合に最小カードを捨てられる', () => {
    const rng = new SeededRng(4);
    const state = createBaseState({
      fieldCard: 14,
      players: [
        { hand: [1, 3, 5], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 1, timestamp: 1, isDiscard: true }, config, rng);

    expect(result.success).toBe(true);
    expect(result.newState.players[0].graveyard).toEqual([1]);
    expect(result.newState.trickCards).toHaveLength(0);
  });

  it('出せるカードがある場合に捨ては不可', () => {
    const rng = new SeededRng(5);
    const state = createBaseState({
      fieldCard: 5,
      players: [
        { hand: [3, 7, 10], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 3, timestamp: 1, isDiscard: true }, config, rng);

    expect(result.success).toBe(false);
    expect(result.message).toContain('cannot discard');
  });

  it('捨てカードはtrickCardsに追加されない', () => {
    const rng = new SeededRng(6);
    const state = createBaseState({
      fieldCard: 14,
      trickCards: [{ player: 1, card: 14, timestamp: 0 }],
      actionCount: 1,
      currentPlayer: 0,
      players: [
        { hand: [1, 3], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [3], cucumbers: 0, graveyard: [] },
        { hand: [4], cucumbers: 0, graveyard: [] },
      ],
    });

    const result = applyMove(state, { player: 0, card: 1, timestamp: 1, isDiscard: true }, config, rng);

    expect(result.success).toBe(true);
    expect(result.newState.trickCards).toEqual([{ player: 1, card: 14, timestamp: 0 }]);
  });
});

describe('トリック完了', () => {
  it('全員が行動したらトリック完了（actionCount）', () => {
    const rng = new SeededRng(7);
    let state = createBaseState({
      players: [
        { hand: [5], cucumbers: 0, graveyard: [] },
        { hand: [10], cucumbers: 0, graveyard: [] },
        { hand: [12], cucumbers: 0, graveyard: [] },
        { hand: [13], cucumbers: 0, graveyard: [] },
      ],
    });

    for (const card of [5, 10, 12, 13]) {
      const result = applyMove(state, { player: state.currentPlayer, card, timestamp: 1 }, config, rng);
      expect(result.success).toBe(true);
      state = result.newState;
    }

    expect(state.currentTrick).toBe(2);
    expect(state.actionCount).toBe(0);
    expect(state.phase).toBe('AwaitMove');
  });

  it('捨てカードもトリック完了カウントに含まれる', () => {
    const rng = new SeededRng(8);
    let state = createBaseState({
      players: [
        { hand: [14], cucumbers: 0, graveyard: [] },
        { hand: [15], cucumbers: 0, graveyard: [] },
        { hand: [2], cucumbers: 0, graveyard: [] },
        { hand: [1], cucumbers: 0, graveyard: [] },
      ],
    });

    const moves = [
      { card: 14, isDiscard: false },
      { card: 15, isDiscard: false },
      { card: 2, isDiscard: true },
      { card: 1, isDiscard: true },
    ];

    for (const move of moves) {
      const result = applyMove(
        state,
        { player: state.currentPlayer, card: move.card, timestamp: 1, isDiscard: move.isDiscard },
        config,
        rng
      );
      expect(result.success).toBe(true);
      state = result.newState;
    }

    expect(state.currentTrick).toBe(2);
    expect(state.actionCount).toBe(0);
  });

  it('トリック完了後にactionCountがリセットされる', () => {
    const rng = new SeededRng(9);
    const state = createBaseState({
      players: [
        { hand: [5], cucumbers: 0, graveyard: [] },
        { hand: [10], cucumbers: 0, graveyard: [] },
        { hand: [11], cucumbers: 0, graveyard: [] },
        { hand: [12], cucumbers: 0, graveyard: [] },
      ],
      trickCards: [
        { player: 0, card: 5, timestamp: 1 },
        { player: 1, card: 10, timestamp: 2 },
        { player: 2, card: 11, timestamp: 3 },
        { player: 3, card: 12, timestamp: 4 },
      ],
      actionCount: 4,
      fieldCard: 12,
    });

    const result = endTrick(state, config, rng);
    expect(result.success).toBe(true);
    expect(result.newState.actionCount).toBe(0);
  });

  it('勝者が次のリードプレイヤーになる', () => {
    const rng = new SeededRng(10);
    const state = createBaseState({
      players: [
        { hand: [1], cucumbers: 0, graveyard: [] },
        { hand: [1], cucumbers: 0, graveyard: [] },
        { hand: [1], cucumbers: 0, graveyard: [] },
        { hand: [1], cucumbers: 0, graveyard: [] },
      ],
      trickCards: [
        { player: 0, card: 5, timestamp: 1 },
        { player: 1, card: 10, timestamp: 2 },
        { player: 2, card: 3, timestamp: 3 },
        { player: 3, card: 8, timestamp: 4 },
      ],
      actionCount: 4,
      fieldCard: 8,
    });

    const result = endTrick(state, config, rng);

    expect(result.success).toBe(true);
    expect(result.newState.currentPlayer).toBe(1);
  });
});

describe('1ゲーム完走', () => {
  it('7トリック完了後にラウンドが終了する', () => {
    const rng = new SeededRng(42);
    const longConfig: GameConfig = { ...config, initialCards: 7, maxCucumbers: 999 };
    let state = createInitialState(longConfig, rng);

    for (let i = 0; i < longConfig.initialCards * longConfig.players; i++) {
      const player = state.currentPlayer;
      const legalMoves = getLegalMoves(state, player);
      const card = Math.min(...legalMoves);
      const isDiscard = state.fieldCard !== null && card < state.fieldCard;
      const result = applyMove(state, { player, card, isDiscard, timestamp: i }, longConfig, rng);
      expect(result.success).toBe(true);
      state = result.newState;
    }

    expect(state.currentRound).toBe(2);
  });

  it('全トリックで手札が1枚ずつ減る', () => {
    const rng = new SeededRng(99);
    let state = createInitialState(config, rng);

    for (let trick = 1; trick <= config.initialCards; trick++) {
      const before = state.players.map(player => player.hand.length);

      for (let turn = 0; turn < config.players; turn++) {
        const player = state.currentPlayer;
        const legalMoves = getLegalMoves(state, player);
        const card = Math.min(...legalMoves);
        const isDiscard = state.fieldCard !== null && card < state.fieldCard;
        const result = applyMove(
          state,
          { player, card, isDiscard, timestamp: trick * 10 + turn },
          config,
          rng
        );
        expect(result.success).toBe(true);
        state = result.newState;
      }

      const after = state.players.map(player => player.hand.length);
      for (let i = 0; i < config.players; i++) {
        expect(after[i]).toBe(before[i] - 1);
      }
    }
  });

  it('最終トリック後にきゅうりが正しく加算される', () => {
    const rng = new SeededRng(123);
    const longConfig: GameConfig = { ...config, maxCucumbers: 999 };
    let state = createInitialState(longConfig, rng);
    const beforeCucumbers = state.players.map(player => player.cucumbers);

    for (let i = 0; i < longConfig.initialCards * longConfig.players; i++) {
      const player = state.currentPlayer;
      const legalMoves = getLegalMoves(state, player);
      const card = Math.min(...legalMoves);
      const isDiscard = state.fieldCard !== null && card < state.fieldCard;
      const result = applyMove(state, { player, card, isDiscard, timestamp: i }, longConfig, rng);
      expect(result.success).toBe(true);
      state = result.newState;
    }

    const afterCucumbers = state.players.map(player => player.cucumbers);
    expect(afterCucumbers.some((value, index) => value > beforeCucumbers[index])).toBe(true);
  });
});
