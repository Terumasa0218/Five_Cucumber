export * from './types';
import { GameEvent, GameModule, Player } from './types';

// Game module registry
export class GameRegistry {
  private static games = new Map<string, GameModule>();

  static register(game: GameModule): void {
    this.games.set(game.meta.id, game);
  }

  static get(gameId: string): GameModule | undefined {
    return this.games.get(gameId);
  }

  static list(): GameModule[] {
    return Array.from(this.games.values());
  }

  static async load(gameId: string): Promise<GameModule> {
    const game = this.get(gameId);
    if (!game) {
      throw new Error(`Game module '${gameId}' not found`);
    }
    return game;
  }
}

// Utility functions
export function createGameEvent(
  type: string,
  gameId: string,
  data?: any
): GameEvent {
  return {
    type,
    timestamp: Date.now(),
    gameId,
    data
  };
}

export function createPlayer(
  id: string,
  name: string,
  options: Partial<Player> = {}
): Player {
  return {
    id,
    name,
    isCPU: false,
    isOnline: true,
    ...options
  };
}

export function createCPUPlayer(
  id: string,
  name: string,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): Player {
  return {
    id,
    name,
    isCPU: true,
    isOnline: false,
    avatar: `cpu-${difficulty}`
  };
}
