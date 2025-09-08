import { GameModule } from '@five-cucumber/sdk';

class GameLoader {
  private loadedGames = new Map<string, GameModule>();

  async load(gameId: string): Promise<GameModule> {
    // Check if already loaded
    if (this.loadedGames.has(gameId)) {
      return this.loadedGames.get(gameId)!;
    }

    // Dynamic import based on game ID
    let gameModule: GameModule;
    
    switch (gameId) {
      case 'cucumber5':
        // Temporary mock for deployment
        gameModule = {
          meta: {
            id: 'cucumber5',
            name: 'Five Cucumbers',
            description: 'A card game where you try not to collect 5 cucumbers',
            minPlayers: 2,
            maxPlayers: 6,
            supportsCPU: true,
            supportsOnline: true,
            icon: '🥒'
          },
          mount: (element: HTMLElement, options: any, onEvent: any) => {
            element.innerHTML = '<div style="padding: 20px; text-align: center;"><h2>🥒 Five Cucumbers</h2><p>Game not implemented yet</p></div>';
            return {
              start: () => {},
              pause: () => {},
              resume: () => {},
              dispose: () => {},
              getState: () => ({ currentPlayer: 0, phase: 'waiting', round: 1, turn: 1, data: {} }),
              sendAction: () => {}
            };
          }
        };
        break;
      default:
        throw new Error(`Unknown game: ${gameId}`);
    }

    // Cache the loaded module
    this.loadedGames.set(gameId, gameModule);
    
    return gameModule;
  }

  async preload(gameId: string): Promise<void> {
    try {
      await this.load(gameId);
    } catch (error) {
      console.warn(`Failed to preload game ${gameId}:`, error);
    }
  }

  async preloadAll(): Promise<void> {
    const gameIds = ['cucumber5'];
    await Promise.all(gameIds.map(id => this.preload(id)));
  }
}

export const gameLoader = new GameLoader();
