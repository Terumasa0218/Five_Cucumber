import { Cucumber5Card, Cucumber5Player, Cucumber5State, GameEvent, GameHandle, GameMeta, GameModule, GameOptions } from '@five-cucumber/sdk';
import { cpuManager, Difficulty } from './cpu';
import { Cucumber5Rules } from './rules';
import { Cucumber5View, Cucumber5ViewAction } from './view';

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
  private view: Cucumber5View | null = null;

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
    if (this.view) {
      this.view.dispose();
      this.view = null;
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
    this.view = new Cucumber5View(this.element, {
      state: this.state,
      locale: this.options.locale,
      onEvent: this.onEvent,
      onRequestAction: this.handleViewAction
    });
  }

  private handleViewAction = (action: Cucumber5ViewAction): void => {
    if (!this.isRunning) return;

    switch (action.type) {
      case 'card:select':
        this.handleCardClick(action.card, action.playerIndex, action.cardIndex);
        break;
      default:
        break;
    }
  };

  private updateView(): void {
    this.view?.setState(this.state);
  }

  private patchView(partial: Partial<Cucumber5State>): void {
    this.view?.patchState(partial);
  }

  private handleCardClick(card: Cucumber5Card, playerIndex: number, cardIndex: number): void {
    if (!this.isRunning) return;
    if (playerIndex !== this.state.currentPlayer) return;

    const player = this.state.players[playerIndex];
    if (!player) return;

    const playableCards = Cucumber5Rules.getPlayableCards(player, this.state.fieldCard);
    const isPlayable = playableCards.some(c => this.isSameCard(c, card));

    if (!isPlayable) return;

    if (
      cardIndex < 0 ||
      cardIndex >= player.hand.length ||
      !this.isSameCard(player.hand[cardIndex], card)
    ) {
      cardIndex = player.hand.findIndex(c => this.isSameCard(c, card));
      if (cardIndex === -1) return;
    }

    const selectedCard = player.hand[cardIndex];

    if (this.state.fieldCard === null || selectedCard.number >= (this.state.fieldCard?.number ?? 0)) {
      this.playCard(selectedCard, cardIndex);
    } else {
      this.discardCard(selectedCard, cardIndex);
    }
  }

  private playCard(card: Cucumber5Card, handIndex?: number): void {
    const player = this.state.players[this.state.currentPlayer];
    if (!player) return;

    const index = typeof handIndex === 'number' ? handIndex : player.hand.findIndex(c => this.isSameCard(c, card));
    if (index === -1) return;

    const [playedCard] = player.hand.splice(index, 1);

    this.state.trickCards.push({
      player: this.state.currentPlayer,
      card: playedCard
    });

    this.state.fieldCard = playedCard;

    this.updateView();
    this.recordAction('play_card', { card: playedCard.number });

    setTimeout(() => {
      this.nextPlayer();
    }, 2000);
  }

  private discardCard(card: Cucumber5Card, handIndex?: number): void {
    const player = this.state.players[this.state.currentPlayer];
    if (!player) return;

    const index = typeof handIndex === 'number' ? handIndex : player.hand.findIndex(c => this.isSameCard(c, card));
    if (index === -1) return;

    const [discardedCard] = player.hand.splice(index, 1);

    player.graveyard.push(discardedCard);
    this.state.sharedGraveyard.push(discardedCard);
    this.state.trickCards.push({
      player: this.state.currentPlayer,
      card: discardedCard
    });

    this.updateView();
    this.recordAction('discard_card', { card: discardedCard.number });

    setTimeout(() => {
      this.nextPlayer();
    }, 2000);
  }

  private nextPlayer(): void {
    this.state.currentPlayer = (this.state.currentPlayer + 1) % this.state.players.length;
    
    if (this.state.trickCards.length === this.state.players.length) {
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
      if (!action) return;

      const handIndex = player.hand.findIndex(c => this.isSameCard(c, action));
      if (handIndex === -1) return;

      const targetCard = player.hand[handIndex];

      if (this.state.fieldCard === null || targetCard.number >= (this.state.fieldCard?.number ?? 0)) {
        this.playCard(targetCard, handIndex);
      } else {
        this.discardCard(targetCard, handIndex);
      }
    }, thinkingTime);
  }

  private startTimer(): void {
    this.stopTimer();
    this.state.timeLeft = 15;
    this.patchView({ timeLeft: this.state.timeLeft });
    
    this.timer = setInterval(() => {
      if (!this.isRunning) return;
      
      this.state.timeLeft--;
      this.patchView({ timeLeft: this.state.timeLeft });
      
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
      const card = playableCards[0];
      const handIndex = player.hand.findIndex(c => this.isSameCard(c, card));
      if (handIndex === -1) return;

      const targetCard = player.hand[handIndex];

      if (this.state.fieldCard === null || targetCard.number >= (this.state.fieldCard?.number ?? 0)) {
        this.playCard(targetCard, handIndex);
      } else {
        this.discardCard(targetCard, handIndex);
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

  private isSameCard(a: Cucumber5Card, b: Cucumber5Card): boolean {
    const suitMatches = 'suit' in a && 'suit' in b ? (a as any).suit === (b as any).suit : true;
    const idMatches = 'id' in a && 'id' in b ? (a as any).id === (b as any).id : true;

    return a.number === b.number && a.cucumbers === b.cucumbers && suitMatches && idMatches;
  }
}

// Export the game module
export const cucumber5GameModule = new Cucumber5GameModule();
export default cucumber5GameModule;
