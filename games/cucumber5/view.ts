import { Cucumber5Card, Cucumber5State, GameEvent, GameHandle } from '@five-cucumber/sdk';

export interface Cucumber5ViewOptions {
  players: { id: string; name: string; isCPU?: boolean }[];
  locale: string;
  onEvent: (e: GameEvent) => void;
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
export class Cucumber5View implements GameHandle {
  private element: HTMLElement;
  private state: Cucumber5State;
  private onEvent: (e: GameEvent) => void;
  private layout: CircularLayout | null = null;
  private animationFrame: number | null = null;
  private isDisposed = false;

  constructor(element: HTMLElement, options: Cucumber5ViewOptions) {
    this.element = element;
    this.onEvent = options.onEvent;
    
    // Initialize game state
    this.state = this.initializeState(options.players);
    
    this.setupView();
    this.startRenderLoop();
  }

  private initializeState(players: { id: string; name: string; isCPU?: boolean }[]): Cucumber5State {
    return {
      players: players.map((player, index) => ({
        id: player.id,
        name: player.name,
        isCPU: player.isCPU,
        hand: [],
        graveyard: [],
        cucumbers: 0
      })),
      currentPlayer: 0,
      fieldCard: null,
      sharedGraveyard: [],
      round: 1,
      trick: 1,
      trickCards: [],
      timeLeft: 30,
      phase: 'dealing',
      turn: 1,
      data: {}
    };
  }

  private setupView(): void {
    this.element.innerHTML = '';
    this.element.className = 'cucumber5-game';
    
    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.className = 'game-container';
    this.element.appendChild(gameContainer);

    // Create table
    const table = document.createElement('div');
    table.className = 'game-table';
    gameContainer.appendChild(table);

    // Create player seats
    this.createPlayerSeats(table);

    // Create center area
    this.createCenterArea(table);

    // Create player hand
    this.createPlayerHand(gameContainer);

    // Create HUD
    this.createHUD(gameContainer);

    // Add event listeners
    this.setupEventListeners();

    // Inject styles
    this.injectStyles();
  }

  private createPlayerSeats(table: HTMLElement): void {
    const seatsContainer = document.createElement('div');
    seatsContainer.className = 'seats-container';
    table.appendChild(seatsContainer);

    this.state.players.forEach((player, index) => {
      const seat = document.createElement('div');
      seat.className = `seat seat--player-${index}`;
      seat.innerHTML = `
        <div class="seat__info">
          <div class="seat__name">${player.name}</div>
          <div class="seat__cucumbers">🥒 ${player.cucumbers}</div>
          <div class="seat__cards">${player.hand.length} cards</div>
        </div>
        <div class="seat__hand-visual">
          ${player.hand.map(() => '<div class="seat__mini-card"></div>').join('')}
        </div>
        <div class="seat__graveyard">
          ${player.graveyard.map(card => `<div class="seat__graveyard-card">${card.number}</div>`).join('')}
        </div>
      `;
      seatsContainer.appendChild(seat);
    });
  }

  private createCenterArea(table: HTMLElement): void {
    const centerArea = document.createElement('div');
    centerArea.className = 'center-area';
    centerArea.innerHTML = `
      <div class="field-area">
        <div class="field-card">
          ${this.state.fieldCard ? `
            <div class="card">
              <div class="card__number">${this.state.fieldCard.number}</div>
              <div class="card__cucumbers">${'🥒'.repeat(this.state.fieldCard.cucumbers)}</div>
            </div>
          ` : '<div class="field-empty">No card</div>'}
        </div>
      </div>
      <div class="graveyard-area">
        <div class="graveyard-cards">
          ${this.state.sharedGraveyard.map(card => `
            <div class="graveyard-card">
              <div class="card__number">${card.number}</div>
              <div class="card__cucumbers">${'🥒'.repeat(card.cucumbers)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    table.appendChild(centerArea);
  }

  private createPlayerHand(container: HTMLElement): void {
    const playerHand = document.createElement('div');
    playerHand.className = 'player-hand';
    
    const player = this.state.players[0];
    if (player) {
      player.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'player-hand__card';
        cardElement.innerHTML = `
          <div class="player-hand__card-number">${card.number}</div>
          <div class="player-hand__card-cucumbers">${'🥒'.repeat(card.cucumbers)}</div>
        `;
        cardElement.addEventListener('click', () => this.onCardClick(card, index));
        playerHand.appendChild(cardElement);
      });
    }
    
    container.appendChild(playerHand);
  }

  private createHUD(container: HTMLElement): void {
    const hud = document.createElement('div');
    hud.className = 'game-hud';
    hud.innerHTML = `
      <div class="game-hud__left">
        <div class="round-indicator">
          第${this.state.round}回戦<br />
          第${this.state.trick}ラウンド
        </div>
        <div class="timer-display ${this.state.timeLeft <= 5 ? 'timer-display--warning' : ''}">
          TIME ${Math.max(0, this.state.timeLeft)}
        </div>
      </div>
      <div class="game-hud__center">
        <div class="game-title">🥒 ５本のきゅうり 🥒</div>
      </div>
      <div class="game-hud__right">
        <!-- Additional HUD elements -->
      </div>
    `;
    container.appendChild(hud);
  }

  private setupEventListeners(): void {
    // Add any necessary event listeners here
  }

  private onCardClick(card: Cucumber5Card, index: number): void {
    if (this.state.currentPlayer !== 0) return;
    
    // Emit card play event
    this.onEvent({
      type: 'card:play',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: { card, playerIndex: 0, cardIndex: index }
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.isDisposed) return;
      
      this.updateLayout();
      this.updateView();
      
      this.animationFrame = requestAnimationFrame(render);
    };
    
    render();
  }

  private updateLayout(): void {
    if (!this.layout) {
      const rect = this.element.getBoundingClientRect();
      this.layout = new CircularLayout(rect.width, rect.height);
    }
    
    const seats = this.layout.calculateSeats(this.state.players.length);
    const seatsContainer = this.element.querySelector('.seats-container');
    
    if (seatsContainer) {
      seats.forEach((seat, index) => {
        const seatElement = seatsContainer.children[index] as HTMLElement;
        if (seatElement) {
          seatElement.style.left = `${seat.x}px`;
          seatElement.style.top = `${seat.y}px`;
          seatElement.style.transform = `rotate(${seat.angle + 90}deg)`;
        }
      });
    }
  }

  private updateView(): void {
    // Update timer
    const timerElement = this.element.querySelector('.timer-display');
    if (timerElement) {
      timerElement.textContent = `TIME ${Math.max(0, this.state.timeLeft)}`;
      timerElement.className = `timer-display ${this.state.timeLeft <= 5 ? 'timer-display--warning' : ''}`;
    }

    // Update round indicator
    const roundElement = this.element.querySelector('.round-indicator');
    if (roundElement) {
      roundElement.innerHTML = `第${this.state.round}回戦<br />第${this.state.trick}ラウンド`;
    }

    // Update current player indicator
    this.state.players.forEach((player, index) => {
      const seatElement = this.element.querySelector(`.seat--player-${index}`);
      if (seatElement) {
        seatElement.classList.toggle('seat--current', this.state.currentPlayer === index);
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
    `;
    
    document.head.appendChild(style);
  }

  // GameHandle interface implementation
  start(seed?: number): void {
    this.onEvent({
      type: 'match:start',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: { seed, players: this.state.players.map(p => p.id) }
    });
  }

  pause(): void {
    // Implementation for pause
  }

  resume(): void {
    // Implementation for resume
  }

  dispose(): void {
    this.isDisposed = true;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.element.innerHTML = '';
  }

  getState(): any {
    return this.state;
  }

  sendAction(action: string, data?: any): void {
    this.onEvent({
      type: 'action',
      timestamp: Date.now(),
      gameId: 'cucumber5',
      data: { action, ...data }
    });
  }

  // Public methods for state updates
  updateState(newState: Partial<Cucumber5State>): void {
    this.state = { ...this.state, ...newState };
  }
}