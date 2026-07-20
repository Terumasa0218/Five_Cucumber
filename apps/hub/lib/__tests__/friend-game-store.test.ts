import { describe, expect, it } from 'vitest';
import { createResolvedTrickSnapshot } from '../friendGameStore';
import type { GameConfig, GameState, Move } from '../game-core';

const config: GameConfig = {
  players: 4,
  turnSeconds: 15,
  maxCucumbers: 5,
  initialCards: 7,
  cpuLevel: 'normal',
  seed: 123,
};

function createState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: Array.from({ length: 4 }, () => ({
      hand: [],
      cucumbers: 0,
      graveyard: [],
    })),
    currentPlayer: 3,
    currentRound: 2,
    currentTrick: 4,
    fieldCard: 9,
    sharedGraveyard: [],
    trickCards: [
      { player: 0, card: 5, timestamp: 1 },
      { player: 1, card: 9, timestamp: 2 },
      { player: 2, card: 7, timestamp: 3 },
    ],
    actionCount: 3,
    firstPlayer: 0,
    isGameOver: false,
    gameOverPlayers: [],
    remainingCards: [],
    cardCounts: Array.from({ length: 16 }, () => 0),
    phase: 'AwaitMove',
    isFinalTrick: false,
    ...overrides,
  };
}

describe('friend game visual snapshots', () => {
  it('トリック完了時の場札と勝者を保持する', () => {
    const move: Move = { player: 3, card: 10, timestamp: 4 };

    expect(createResolvedTrickSnapshot(createState(), config, move, 1000)).toEqual({
      round: 2,
      trick: 4,
      cards: [
        { player: 0, card: 5, timestamp: 1 },
        { player: 1, card: 9, timestamp: 2 },
        { player: 2, card: 7, timestamp: 3 },
        { player: 3, card: 10, timestamp: 4 },
      ],
      winner: 3,
      completedAt: 1000,
    });
  });

  it('捨て札は場札の勝者判定に混ぜない', () => {
    const move: Move = { player: 3, card: 3, timestamp: 4, isDiscard: true };
    const resolved = createResolvedTrickSnapshot(createState(), config, move, 1000);

    expect(resolved?.cards).toHaveLength(3);
    expect(resolved?.winner).toBe(1);
  });

  it('トリック未完了なら表示用スナップショットを作らない', () => {
    const move: Move = { player: 2, card: 8, timestamp: 4 };

    expect(
      createResolvedTrickSnapshot(createState({ actionCount: 2 }), config, move, 1000)
    ).toBeNull();
  });
});
