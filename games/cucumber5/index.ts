import { Cucumber5Card, Cucumber5Player, Cucumber5State, GameEvent, GameHandle, GameMeta, GameModule, GameOptions } from '@five-cucumber/sdk';
import { cpuManager, Difficulty } from './cpu';
import { Cucumber5Rules } from './rules';
import { Cucumber5View } from './view';

/**
 * Cucumber5 Game Module
 */
export class Cucumber5GameModule implements GameModule {
  meta: GameMeta = {
    id: 'cucumber5',
    name: '５本のきゅうり',
    minPlayers: 2,
    maxPlayers: 6,
    supportsOnline: true,
    supportsCPU: true,
    icon: '🥒',
    theme: 'antique',
    description: 'きゅうりを5本集めないようにするカードゲーム',
    rules: '数字の大きいカードがトリックを取ります。最終トリックで最大値を出すときゅうり2本！'
  };

  private gameState: Cucumber5State | null = null;
  private gameHandle: Cucumber5GameHandle | null = null;
  private onEvent: ((event: GameEvent) => void) | null = null;

  mount(
    element: HTMLElement,
    options: GameOptions,
    onEvent: (event: GameEvent) => void
  ): GameHandle {
    this.onEvent = onEvent;
    this.gameHandle = new Cucumber5GameHandle(element, options, onEvent);
    return this.gameHandle;
  }
}

/**
 * Cucumber5 Game Handle
 */
class Cucumber5GameHandle implements GameHandle {
  private element: HTMLElement;
  private options: GameOptions;
  private onEvent: (event: GameEvent) => void;
  private state: Cucumber5State;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private unmountView: (() => void) | null = null;

  constructor(
    element: HTMLElement,
    options: GameOptions,
    onEvent: (event: GameEvent) => void
  ) {
    this.element = element;
    this.options = options;
    this.onEvent = onEvent;
    this.state = this.initializeGame();
    this.mountView();
  }

  start(seed?: number): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.state = this.initializeGame(seed);
    this.updateView();
    this.startTimer();

    this.onEvent({
      type: 'match:start',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: {
        players: this.state.players.map(p => p.id),
        options: this.options
      }
    });

    // Start first turn
    if (this.state.currentPlayer !== 0) {
      this.scheduleCPUAction();
    }
  }

  pause(): void {
    this.isRunning = false;
    this.stopTimer();
  }

  resume(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startTimer();
    }
  }

  dispose(): void {
    this.isRunning = false;
    this.stopTimer();
    if (this.unmountView) {
      this.unmountView();
    }
  }

  getState(): any {
    return { ...this.state };
  }

  sendAction(action: string, data?: any): void {
    if (!this.isRunning) return;

    switch (action) {
      case 'play_card':
        this.playCard(data.card);
        break;
      case 'discard_card':
        this.discardCard(data.card);
        break;
      case 'end_turn':
        this.nextPlayer();
        break;
    }
  }

  private initializeGame(seed?: number): Cucumber5State {
    const deck = Cucumber5Rules.createDeck(seed);
    const hands = Cucumber5Rules.dealCards(deck, this.options.players.length);

    const players: Cucumber5Player[] = this.options.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      hand: hands[index] || [],
      cucumbers: 0,
      graveyard: [],
      isCPU: player.isCPU
    }));

    return {
      players,
      currentPlayer: 0,
      fieldCard: null,
      sharedGraveyard: [],
      round: 1,
      trick: 1,
      trickCards: [],
      timeLeft: 15,
      phase: 'playing',
      turn: 1,
      data: {}
    };
  }

  private mountView(): void {
    const view = new Cucumber5View(this.element, {
      players: this.options.players,
      locale: this.options.locale,
      onEvent: this.onEvent
    });
    
    this.unmountView = () => view.dispose();
  }

  private updateView(): void {
    if (this.unmountView) {
      this.unmountView();
    }
    this.mountView();
  }

  private handleCardClick(card: Cucumber5Card): void {
    if (this.state.currentPlayer !== 0 || !this.isRunning) return;

    const player = this.state.players[0];
    const playableCards = Cucumber5Rules.getPlayableCards(player, this.state.fieldCard);
    
    if (playableCards.some(c => c.number === card.number)) {
      if (this.state.fieldCard === null || card.number >= this.state.fieldCard.number) {
        this.playCard(card);
      } else {
        this.discardCard(card);
      }
    }
  }

  private playCard(card: Cucumber5Card): void {
    const player = this.state.players[this.state.currentPlayer];
    const cardIndex = player.hand.findIndex(c => c.number === card.number);
    
    if (cardIndex === -1) return;

    // Remove card from hand
    player.hand.splice(cardIndex, 1);
    
    // Add to trick
    this.state.trickCards.push({
      player: this.state.currentPlayer,
      card
    });

    // Update field card
    this.state.fieldCard = card;

    this.updateView();
    this.recordAction('play_card', { card: card.number });

    // Wait before next player
    setTimeout(() => {
      this.nextPlayer();
    }, 2000);
  }

  private discardCard(card: Cucumber5Card): void {
    const player = this.state.players[this.state.currentPlayer];
    const cardIndex = player.hand.findIndex(c => c.number === card.number);
    
    if (cardIndex === -1) return;

    // Remove card from hand
    player.hand.splice(cardIndex, 1);
    
    // Add to graveyards
    player.graveyard.push(card);
    this.state.sharedGraveyard.push(card);

    this.updateView();
    this.recordAction('discard_card', { card: card.number });

    // Wait before next player
    setTimeout(() => {
      this.nextPlayer();
    }, 2000);
  }

  private nextPlayer(): void {
    this.state.currentPlayer = (this.state.currentPlayer + 1) % this.state.players.length;
    
    if (this.state.currentPlayer === 0) {
      this.endTrick();
    } else {
      this.resetTimer();
      this.scheduleCPUAction();
    }
  }

  private endTrick(): void {
    if (this.state.players[0].hand.length === 0) {
      this.finalRound();
      return;
    }

    const { winner, maxCard } = Cucumber5Rules.processTrick(this.state.trickCards);
    
    this.state.currentPlayer = winner;
    this.state.trick++;
    this.state.turn++;
    this.state.fieldCard = null;
    this.state.trickCards = [];

    this.updateView();
    this.resetTimer();

    if (this.state.currentPlayer !== 0) {
      this.scheduleCPUAction();
    }
  }

  private finalRound(): void {
    const { cucumberAwards, hasOne } = Cucumber5Rules.processFinalTrick(
      this.state.trickCards,
      this.state.players
    );

    // Award cucumbers
    cucumberAwards.forEach(({ player, cucumbers }) => {
      this.state.players[player].cucumbers += cucumbers;
    });

    this.recordAction('cucumber_award', { awards: cucumberAwards });

    // Check game over
    const { isOver, losers } = Cucumber5Rules.isGameOver(this.state.players);
    
    if (isOver) {
      this.endGame(losers);
    } else {
      this.nextRound();
    }
  }

  private nextRound(): void {
    this.state.round++;
    this.state.trick = 1;
    this.state.turn = 1;
    this.state.fieldCard = null;
    this.state.sharedGraveyard = [];
    this.state.trickCards = [];
    this.state.data = {};

    // Deal new cards
    const deck = Cucumber5Rules.createDeck();
    const hands = Cucumber5Rules.dealCards(deck, this.state.players.length);
    
    this.state.players.forEach((player, index) => {
      player.hand = hands[index] || [];
      player.graveyard = [];
    });

    this.state.currentPlayer = Math.floor(Math.random() * this.state.players.length);
    this.updateView();
    this.resetTimer();

    if (this.state.currentPlayer !== 0) {
      this.scheduleCPUAction();
    }
  }

  private endGame(losers: number[]): void {
    this.isRunning = false;
    this.stopTimer();
    this.state.phase = 'game_over';

    const scores = this.state.players.reduce((acc, player, index) => {
      acc[player.id] = player.cucumbers;
      return acc;
    }, {} as Record<string, number>);

    this.onEvent({
      type: 'match:end',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: {
        winnerIds: this.state.players
          .filter((_, index) => !losers.includes(index))
          .map(p => p.id),
        scores,
        duration: Date.now() - (this.state as any).startTime || 0,
        reason: 'completed'
      }
    });

    this.updateView();
  }

  private scheduleCPUAction(): void {
    if (!this.isRunning || this.state.currentPlayer === 0) return;

    const player = this.state.players[this.state.currentPlayer];
    if (!player.isCPU) return;

    const difficulty = (this.options.difficulty || 'normal') as Difficulty;
    const thinkingTime = cpuManager.getThinkingTime(difficulty);

    setTimeout(() => {
      if (!this.isRunning) return;

      const action = cpuManager.getCPUAction(player, this.state, difficulty);
      if (action) {
        if (this.state.fieldCard === null || action.number >= this.state.fieldCard.number) {
          this.playCard(action);
        } else {
          this.discardCard(action);
        }
      }
    }, thinkingTime);
  }

  private startTimer(): void {
    this.stopTimer();
    this.state.timeLeft = 15;
    
    this.timer = setInterval(() => {
      if (!this.isRunning) return;
      
      this.state.timeLeft--;
      
      if (this.state.timeLeft <= 0) {
        this.stopTimer();
        this.autoPlay();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private resetTimer(): void {
    this.startTimer();
  }

  private autoPlay(): void {
    if (this.state.currentPlayer !== 0) return;

    const player = this.state.players[0];
    const playableCards = Cucumber5Rules.getPlayableCards(player, this.state.fieldCard);
    
    if (playableCards.length > 0) {
      const card = playableCards[0]; // Play first available card
      if (this.state.fieldCard === null || card.number >= this.state.fieldCard.number) {
        this.playCard(card);
      } else {
        this.discardCard(card);
      }
    }
  }

  private recordAction(type: string, data?: any): void {
    this.onEvent({
      type: 'game_action',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: { action: type, ...data }
    });
  }
}

// Export the game module
export const cucumber5GameModule = new Cucumber5GameModule();
export default cucumber5GameModule;
