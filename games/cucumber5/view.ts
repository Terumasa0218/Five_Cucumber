import { Cucumber5Card, Cucumber5State, GameEvent } from '@five-cucumber/sdk';

export type Cucumber5ViewAction = {
  type: 'card:select';
  card: Cucumber5Card;
  cardIndex: number;
  playerIndex: number;
};

export interface Cucumber5ViewOptions {
  state: Cucumber5State;
  locale: string;
  onEvent: (e: GameEvent) => void;
  onRequestAction?: (action: Cucumber5ViewAction) => void;
}

/**
 * Circular layout calculator for 2-6 players
 */
export class CircularLayout {
  private containerWidth: number;
  private containerHeight: number;
  private safeMargin: number;

  constructor(containerWidth: number, containerHeight: number, safeMargin: number = 100) {
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
    this.safeMargin = safeMargin;
  }

  /**
   * Calculate seat positions for circular layout
   */
  calculateSeats(playerCount: number): Array<{
    x: number;
    y: number;
    angle: number;
  }> {
    const centerX = this.containerWidth / 2;
    const centerY = this.containerHeight / 2;
    const radius = Math.min(this.containerWidth, this.containerHeight) / 2 - this.safeMargin;
    
    const seats = [];
    for (let i = 0; i < playerCount; i++) {
      // Start from top (-90 degrees) and distribute evenly
      const angle = -90 + (i * 360 / playerCount);
      const radian = (angle * Math.PI) / 180;
      
      const x = centerX + radius * Math.cos(radian);
      const y = centerY + radius * Math.sin(radian);
      
      seats.push({ x, y, angle });
    }
    
    return seats;
  }

  /**
   * Calculate center positions for field and graveyard
   */
  calculateCenterPositions(): {
    field: { x: number; y: number };
    graveyard: { x: number; y: number };
  } {
    const centerX = this.containerWidth / 2;
    const centerY = this.containerHeight / 2;
    
    return {
      field: { x: centerX - 80, y: centerY },
      graveyard: { x: centerX + 80, y: centerY }
    };
  }

  /**
   * Calculate seat scale based on player count
   */
  calculateSeatScale(playerCount: number): number {
    return Math.max(0.76, Math.min(1, 4 / playerCount));
  }
}

/**
 * Cucumber5 Game View Implementation
 */
interface SeatElements {
  root: HTMLElement;
  name: HTMLElement;
  cucumbers: HTMLElement;
  cards: HTMLElement;
  handVisual: HTMLElement;
  graveyard: HTMLElement;
}

export class Cucumber5View {
  private element: HTMLElement;
  private state: Cucumber5State;
  private locale: string;
  private onEvent: (e: GameEvent) => void;
  private onRequestAction?: (action: Cucumber5ViewAction) => void;
  private layout: CircularLayout | null = null;
  private seatsContainer: HTMLElement | null = null;
  private seatElements: SeatElements[] = [];
  private fieldCardContainer: HTMLElement | null = null;
  private sharedGraveyardContainer: HTMLElement | null = null;
  private trickCardsContainer: HTMLElement | null = null;
  private playerHandElement: HTMLElement | null = null;
  private timerElement: HTMLElement | null = null;
  private roundElement: HTMLElement | null = null;
  private turnElement: HTMLElement | null = null;
  private phaseElement: HTMLElement | null = null;
  private orientationWarningElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private orientationMedia: MediaQueryList | null = null;
  private orientationListener: ((event: MediaQueryListEvent) => void) | null = null;
  private windowResizeHandler: (() => void) | null = null;
  private layoutFrame: number | null = null;
  private isPortraitOrientation = false;
  private disposed = false;

  constructor(element: HTMLElement, options: Cucumber5ViewOptions) {
    this.element = element;
    this.state = options.state;
    this.locale = options.locale;
    this.onEvent = options.onEvent;
    this.onRequestAction = options.onRequestAction;

    this.setupView();
    this.renderAll();
    this.setupLayoutListeners();
    this.setupOrientationHandling();
  }

  private setupView(): void {
    this.element.innerHTML = '';
    this.element.className = 'cucumber5-game';

    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    this.element.appendChild(gameContainer);

    const table = document.createElement('div');
    table.className = 'game-table';
    gameContainer.appendChild(table);

    this.createPlayerSeats(table);
    this.createCenterArea(table);
    this.createPlayerHand(gameContainer);
    this.createHUD(gameContainer);
    this.createOrientationWarning();

    this.injectStyles();
  }

  private createPlayerSeats(table: HTMLElement): void {
    const seatsContainer = document.createElement('div');
    seatsContainer.className = 'seats-container';
    table.appendChild(seatsContainer);

    this.seatsContainer = seatsContainer;
    this.seatElements = [];

    this.state.players.forEach((_, index) => {
      const seatRefs = this.buildSeatElement(index);
      seatsContainer.appendChild(seatRefs.root);
      this.seatElements.push(seatRefs);
    });
  }

  private buildSeatElement(index: number): SeatElements {
    const seat = document.createElement('div');
    seat.className = `seat seat--player-${index}`;

    seat.innerHTML = `
      <div class="seat__info">
        <div class="seat__name"></div>
        <div class="seat__cucumbers"></div>
        <div class="seat__cards"></div>
      </div>
      <div class="seat__hand-visual"></div>
      <div class="seat__graveyard"></div>
    `;

    return {
      root: seat,
      name: seat.querySelector('.seat__name') as HTMLElement,
      cucumbers: seat.querySelector('.seat__cucumbers') as HTMLElement,
      cards: seat.querySelector('.seat__cards') as HTMLElement,
      handVisual: seat.querySelector('.seat__hand-visual') as HTMLElement,
      graveyard: seat.querySelector('.seat__graveyard') as HTMLElement
    };
  }

  private createCenterArea(table: HTMLElement): void {
    const centerArea = document.createElement('div');
    centerArea.className = 'center-area';

    const fieldArea = document.createElement('div');
    fieldArea.className = 'field-area';
    const fieldCard = document.createElement('div');
    fieldCard.className = 'field-card';
    fieldArea.appendChild(fieldCard);
    centerArea.appendChild(fieldArea);
    this.fieldCardContainer = fieldCard;

    const trickArea = document.createElement('div');
    trickArea.className = 'trick-area';
    const trickCards = document.createElement('div');
    trickCards.className = 'trick-cards';
    trickArea.appendChild(trickCards);
    centerArea.appendChild(trickArea);
    this.trickCardsContainer = trickCards;

    const graveyardArea = document.createElement('div');
    graveyardArea.className = 'graveyard-area';
    const graveyardCards = document.createElement('div');
    graveyardCards.className = 'graveyard-cards';
    graveyardArea.appendChild(graveyardCards);
    centerArea.appendChild(graveyardArea);
    this.sharedGraveyardContainer = graveyardCards;

    table.appendChild(centerArea);
  }

  private createPlayerHand(container: HTMLElement): void {
    const playerHand = document.createElement('div');
    playerHand.className = 'player-hand';
    container.appendChild(playerHand);
    this.playerHandElement = playerHand;
  }

  private createHUD(container: HTMLElement): void {
    const hud = document.createElement('div');
    hud.className = 'game-hud';
    hud.innerHTML = `
      <div class="game-hud__left">
        <div class="round-indicator"></div>
        <div class="timer-display"></div>
      </div>
      <div class="game-hud__center">
        <div class="game-title">🥒 ５本のきゅうり 🥒</div>
      </div>
      <div class="game-hud__right">
        <div class="hud-turn"></div>
        <div class="hud-phase"></div>
      </div>
    `;
    container.appendChild(hud);

    this.roundElement = hud.querySelector('.round-indicator') as HTMLElement;
    this.timerElement = hud.querySelector('.timer-display') as HTMLElement;
    this.turnElement = hud.querySelector('.hud-turn') as HTMLElement;
    this.phaseElement = hud.querySelector('.hud-phase') as HTMLElement;
  }

  private createOrientationWarning(): void {
    const warning = document.createElement('div');
    warning.className = 'orientation-warning';
    warning.innerHTML = `
      <div class="orientation-warning__content">
        <div class="orientation-warning__icon">📱</div>
        <div class="orientation-warning__text">
          <p>端末を横向きにしてください</p>
          <p>Please rotate your device</p>
        </div>
      </div>
    `;
    this.element.appendChild(warning);
    this.orientationWarningElement = warning;
  }

  private renderAll(): void {
    if (this.disposed) return;

    this.ensureSeatElements();
    this.renderSeats();
    this.renderFieldCard();
    this.renderSharedGraveyard();
    this.renderTrickCards();
    this.renderPlayerHand();
    this.renderHUD();
    this.scheduleLayoutRefresh();
  }

  setState(state: Cucumber5State): void {
    if (this.disposed) return;
    this.state = state;
    this.renderAll();
  }

  patchState(partial: Partial<Cucumber5State>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...partial };
    this.renderAll();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.layoutFrame !== null) {
      cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.windowResizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.windowResizeHandler);
      this.windowResizeHandler = null;
    }

    if (this.orientationMedia && this.orientationListener) {
      if (typeof this.orientationMedia.removeEventListener === 'function') {
        this.orientationMedia.removeEventListener('change', this.orientationListener);
      } else if (typeof this.orientationMedia.removeListener === 'function') {
        this.orientationMedia.removeListener(this.orientationListener);
      }
    }

    this.orientationMedia = null;
    this.orientationListener = null;
    this.seatElements = [];
    this.element.innerHTML = '';
  }

  private ensureSeatElements(): void {
    if (!this.seatsContainer) return;

    if (this.seatElements.length === this.state.players.length) {
      return;
    }

    this.seatsContainer.innerHTML = '';
    this.seatElements = [];

    this.state.players.forEach((_, index) => {
      const seat = this.buildSeatElement(index);
      this.seatsContainer!.appendChild(seat.root);
      this.seatElements.push(seat);
    });
  }

  private renderSeats(): void {
    this.state.players.forEach((player, index) => {
      const seat = this.seatElements[index];
      if (!seat) return;

      seat.name.textContent = player.name;
      seat.cucumbers.textContent = `🥒 ${player.cucumbers}`;
      seat.cards.textContent = `手札: ${player.hand.length}枚`;

      seat.handVisual.innerHTML = new Array(player.hand.length)
        .fill(null)
        .map(() => '<div class="seat__mini-card"></div>')
        .join('');

      seat.graveyard.innerHTML = player.graveyard
        .map(card => `<div class="seat__graveyard-card">${card.number}</div>`)
        .join('');

      seat.root.classList.toggle('seat--current', this.state.currentPlayer === index);
    });
  }

  private renderFieldCard(): void {
    if (!this.fieldCardContainer) return;

    this.fieldCardContainer.innerHTML = '';

    if (!this.state.fieldCard) {
      const empty = document.createElement('div');
      empty.className = 'field-empty';
      empty.textContent = 'No card';
      this.fieldCardContainer.appendChild(empty);
      return;
    }

    const cardElement = this.createCardElement(this.state.fieldCard);
    this.fieldCardContainer.appendChild(cardElement);
  }

  private renderSharedGraveyard(): void {
    if (!this.sharedGraveyardContainer) return;

    this.sharedGraveyardContainer.innerHTML = '';

    this.state.sharedGraveyard.forEach(card => {
      const graveCard = document.createElement('div');
      graveCard.className = 'graveyard-card';

      const number = document.createElement('div');
      number.className = 'card__number';
      number.textContent = `${card.number}`;

      const cucumbers = document.createElement('div');
      cucumbers.className = 'card__cucumbers';
      cucumbers.textContent = '🥒'.repeat(card.cucumbers);

      graveCard.appendChild(number);
      graveCard.appendChild(cucumbers);

      this.sharedGraveyardContainer!.appendChild(graveCard);
    });
  }

  private renderTrickCards(): void {
    if (!this.trickCardsContainer) return;

    this.trickCardsContainer.innerHTML = '';

    this.state.trickCards.forEach(({ player, card }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'trick-card';

      const label = document.createElement('div');
      label.className = 'trick-card__player';
      label.textContent = this.state.players[player]?.name ?? `P${player + 1}`;

      const cardElement = this.createCardElement(card);

      wrapper.appendChild(label);
      wrapper.appendChild(cardElement);

      this.trickCardsContainer!.appendChild(wrapper);
    });
  }

  private renderPlayerHand(): void {
    if (!this.playerHandElement) return;

    this.playerHandElement.innerHTML = '';

    const player = this.state.players[0];
    if (!player) return;

    player.hand.forEach((card, index) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'player-hand__card';

      const number = document.createElement('div');
      number.className = 'player-hand__card-number';
      number.textContent = `${card.number}`;

      const cucumbers = document.createElement('div');
      cucumbers.className = 'player-hand__card-cucumbers';
      cucumbers.textContent = '🥒'.repeat(card.cucumbers);

      cardElement.appendChild(number);
      cardElement.appendChild(cucumbers);

      if (this.state.currentPlayer === 0) {
        cardElement.classList.add('player-hand__card--active');
        cardElement.addEventListener('click', () => this.handleCardClick(card, index, 0));
      } else {
        cardElement.classList.add('player-hand__card--disabled');
      }

      this.playerHandElement!.appendChild(cardElement);
    });
  }

  private renderHUD(): void {
    if (this.timerElement) {
      this.timerElement.textContent = `TIME ${Math.max(0, this.state.timeLeft)}`;
      this.timerElement.className = `timer-display ${this.state.timeLeft <= 5 ? 'timer-display--warning' : ''}`;
    }

    if (this.roundElement) {
      this.roundElement.innerHTML = `第${this.state.round}回戦<br />第${this.state.trick}ラウンド`;
    }

    if (this.turnElement) {
      this.turnElement.textContent = `ターン: ${this.state.turn}`;
    }

    if (this.phaseElement) {
      this.phaseElement.textContent = `フェーズ: ${this.translatePhase(this.state.phase)}`;
    }
  }

  private createCardElement(card: Cucumber5Card): HTMLElement {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';

    const number = document.createElement('div');
    number.className = 'card__number';
    number.textContent = `${card.number}`;

    const cucumbers = document.createElement('div');
    cucumbers.className = 'card__cucumbers';
    cucumbers.textContent = '🥒'.repeat(card.cucumbers);

    cardElement.appendChild(number);
    cardElement.appendChild(cucumbers);

    return cardElement;
  }

  private translatePhase(phase: Cucumber5State['phase']): string {
    switch (phase) {
      case 'dealing':
        return '配札';
      case 'playing':
        return '進行中';
      case 'trick_end':
        return 'トリック精算';
      case 'round_end':
        return 'ラウンド終了';
      case 'game_over':
        return '終了';
      default:
        return phase ?? '';
    }
  }

  private scheduleLayoutRefresh(): void {
    if (typeof window === 'undefined') return;
    if (this.layoutFrame !== null) return;

    this.layoutFrame = window.requestAnimationFrame(() => {
      this.layoutFrame = null;
      this.refreshLayout();
    });
  }

  private refreshLayout(): void {
    if (!this.seatsContainer || this.disposed) return;

    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.layout = new CircularLayout(rect.width, rect.height);
    const seats = this.layout.calculateSeats(this.state.players.length);
    const scale = this.layout.calculateSeatScale(this.state.players.length);

    seats.forEach((seatPosition, index) => {
      const seat = this.seatElements[index];
      if (!seat) return;

      seat.root.style.left = `${seatPosition.x}px`;
      seat.root.style.top = `${seatPosition.y}px`;
      seat.root.style.transform = `translate(-50%, -50%) rotate(${seatPosition.angle + 90}deg) scale(${scale})`;
    });
  }

  private setupLayoutListeners(): void {
    if (typeof window === 'undefined') return;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayoutRefresh());
      this.resizeObserver.observe(this.element);
    } else {
      this.windowResizeHandler = () => this.scheduleLayoutRefresh();
      window.addEventListener('resize', this.windowResizeHandler);
    }
  }

  private setupOrientationHandling(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    this.orientationMedia = window.matchMedia('(orientation: portrait)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = (event as MediaQueryList).matches;
      this.toggleOrientationWarning(matches);
      this.scheduleLayoutRefresh();
    };

    this.orientationListener = (event: MediaQueryListEvent) => handleChange(event);

    if (typeof this.orientationMedia.addEventListener === 'function') {
      this.orientationMedia.addEventListener('change', this.orientationListener);
    } else if (typeof this.orientationMedia.addListener === 'function') {
      this.orientationMedia.addListener(this.orientationListener);
    }

    handleChange(this.orientationMedia);
  }

  private toggleOrientationWarning(show: boolean): void {
    if (!this.orientationWarningElement) return;

    if (show) {
      this.orientationWarningElement.classList.add('orientation-warning--visible');
    } else {
      this.orientationWarningElement.classList.remove('orientation-warning--visible');
    }

    if (this.isPortraitOrientation !== show) {
      this.isPortraitOrientation = show;
      this.onEvent({
        type: 'ui:orientation',
        timestamp: Date.now(),
        gameId: 'cucumber5',
        data: { portrait: show }
      });
    }
  }

  private handleCardClick(card: Cucumber5Card, index: number, playerIndex: number): void {
    if (this.onRequestAction) {
      this.onRequestAction({
        type: 'card:select',
        card,
        cardIndex: index,
        playerIndex
      });
    }

    this.onEvent({
      type: 'ui:card_select',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: {
        playerIndex,
        cardIndex: index,
        cardNumber: card.number
      }
    });
  }

  private injectStyles(): void {
    if (document.getElementById('cucumber5-styles')) return;

    const style = document.createElement('style');
    style.id = 'cucumber5-styles';
    style.textContent = `
      .cucumber5-game {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: 
          radial-gradient(ellipse at center, rgba(58, 134, 125, 0.92) 0%, rgba(45, 105, 98, 0.95) 100%),
          linear-gradient(135deg, #2a6b5d 0%, #1f4a42 50%, #152e2a 100%);
      }

      .game-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .game-table {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .seats-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .seat {
        position: absolute;
        width: 120px;
        height: 80px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
        border-radius: 15px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        transform-origin: center;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }

      .seat--current {
        border-color: #ffd700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      }

      .seat__info {
        padding: 8px;
        text-align: center;
        color: white;
        font-size: 12px;
      }

      .seat__name {
        font-weight: bold;
        margin-bottom: 4px;
      }

      .seat__cucumbers, .seat__cards {
        font-size: 10px;
        opacity: 0.8;
      }

      .center-area {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        gap: 40px;
        align-items: center;
      }

      .field-area, .graveyard-area {
        width: 100px;
        height: 140px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
        border-radius: 10px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .field-empty {
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }

      .card {
        background: linear-gradient(135deg, #fff, #f0f0f0);
        border-radius: 8px;
        padding: 8px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .card__number {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
      }

      .card__cucumbers {
        font-size: 12px;
        color: #666;
      }

      .player-hand {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 15px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
        border-radius: 15px 15px 0 0;
        backdrop-filter: blur(15px);
        box-shadow: 0 -6px 25px rgba(0, 0, 0, 0.4);
        border: 3px solid rgba(255, 255, 255, 0.4);
        max-width: 90vw;
        overflow-x: auto;
      }

      .player-hand__card {
        width: 65px;
        height: 90px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(5px);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 240, 240, 0.8));
        color: #333;
        flex-shrink: 0;
      }

      .player-hand__card--disabled {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
        transform: none !important;
      }

      .player-hand__card--active {
        cursor: pointer;
      }

      .player-hand__card:hover {
        transform: translateY(-8px) scale(1.05);
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
      }

      .player-hand__card-number {
        font-size: 1.6em;
        margin-bottom: 2px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
      }

      .player-hand__card-cucumbers {
        font-size: 0.6em;
        line-height: 1.1;
        text-align: center;
      }

      .game-hud {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 80px;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        padding: 12px;
        z-index: 10;
      }

      .game-hud__left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .game-hud__center {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .game-hud__right {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 15px;
      }

      .hud-turn,
      .hud-phase {
        color: white;
        font-weight: 600;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
      }

      .round-indicator {
        background: linear-gradient(135deg, #0a6b5d, #0a6b5d);
        color: white;
        padding: 10px 18px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 0.9em;
        border: 3px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
        min-width: 120px;
        text-align: center;
        line-height: 1.2;
        white-space: nowrap;
      }

      .timer-display {
        background: linear-gradient(135deg, #e6a82d, #e6a82d);
        color: #2d2d2d;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: bold;
        font-size: 1em;
        border: 3px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
      }

      .timer-display--warning {
        background: linear-gradient(135deg, #e03d4f, #e03d4f);
        color: white;
        animation: pulse-warning 0.8s infinite;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
      }

      .game-title {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08));
        color: white;
        padding: 15px 30px;
        border-radius: 30px;
        font-size: 1.8em;
        font-weight: bold;
        text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4);
        border: 3px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(10px);
      }

      @keyframes pulse-warning {
        0%, 100% { 
          transform: scale(1); 
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4); 
        }
        50% { 
          transform: scale(1.08); 
          box-shadow: 0 8px 30px rgba(247, 70, 95, 0.6); 
        }
      }

      .seat__hand-visual {
        display: flex;
        gap: 3px;
        max-width: 90px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 4px;
      }

      .seat__mini-card {
        width: 14px;
        height: 20px;
        background: linear-gradient(135deg, #2a7dd1, #2a7dd1);
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }

      .seat__graveyard {
        display: flex;
        gap: 2px;
        flex-wrap: wrap;
        max-width: 70px;
        justify-content: center;
        margin-top: 4px;
      }

      .seat__graveyard-card {
        width: 12px;
        height: 18px;
        background: linear-gradient(135deg, #666, #555);
        color: white;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.5em;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .graveyard-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
        align-items: center;
        max-width: 100px;
        max-height: 120px;
        overflow: hidden;
      }

      .graveyard-card {
        width: 20px;
        height: 28px;
        background: linear-gradient(135deg, #666, #555);
        border-radius: 3px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .graveyard-card .card__number {
        font-size: 8px;
        margin-bottom: 1px;
      }

      .graveyard-card .card__cucumbers {
        font-size: 6px;
      }

      .trick-area {
        width: 140px;
        min-height: 150px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
        border-radius: 10px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px;
        gap: 10px;
      }

      .trick-cards {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        align-items: center;
      }

      .trick-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .trick-card__player {
        font-size: 0.7em;
        color: rgba(255, 255, 255, 0.75);
      }

      .orientation-warning {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        display: none;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        z-index: 200;
        pointer-events: none;
      }

      .orientation-warning--visible {
        display: flex;
        pointer-events: all;
      }

      .orientation-warning__content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        font-weight: bold;
        font-size: 1.2em;
      }

      .orientation-warning__icon {
        font-size: 2.6em;
      }
    `;
    
    document.head.appendChild(style);
  }
}