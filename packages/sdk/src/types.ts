export type GameId = 'cucumber5' | string;

export interface GameMeta {
  id: GameId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  supportsOnline: boolean;
  supportsCPU: boolean;
  icon?: string;
  theme?: string;
  description?: string;
  rules?: string;
}

export interface Player {
  id: string;
  name: string;
  isCPU?: boolean;
  isOnline?: boolean;
  avatar?: string;
}

export interface GameOptions {
  players: Player[];
  locale: string;
  seed?: number;
  difficulty?: 'easy' | 'normal' | 'hard';
  timeLimit?: number;
}

export interface GameEvent {
  type: string;
  timestamp: number;
  gameId: GameId;
  data?: any;
}

export interface MatchStartEvent extends GameEvent {
  type: 'match:start';
  players: string[];
  options: GameOptions;
}

export interface MatchEndEvent extends GameEvent {
  type: 'match:end';
  winnerIds: string[];
  scores: Record<string, number>;
  duration: number;
  reason: 'completed' | 'abandoned' | 'error';
}

export interface TickEvent extends GameEvent {
  type: 'tick';
  fps: number;
  frameTime: number;
}

export interface ErrorEvent extends GameEvent {
  type: 'error';
  message: string;
  code?: string;
  stack?: string;
}

export interface GameState {
  currentPlayer: number;
  phase: 'waiting' | 'playing' | 'paused' | 'ended';
  round: number;
  turn: number;
  timeLeft?: number;
  data: Record<string, any>;
}

export interface GameHandle {
  start(seed?: number): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  getState(): GameState;
  sendAction(action: string, data?: any): void;
}

export interface GameModule {
  meta: GameMeta;
  mount(
    element: HTMLElement,
    options: GameOptions,
    onEvent: (event: GameEvent) => void
  ): GameHandle;
}

export type GameEventCallback = (event: GameEvent) => void;

// Game-specific types for cucumber5
export interface Cucumber5Card {
  number: number;
  cucumbers: number;
}

export interface Cucumber5Player {
  id: string;
  name: string;
  hand: Cucumber5Card[];
  cucumbers: number;
  graveyard: Cucumber5Card[];
  isCPU?: boolean;
}

export interface Cucumber5State {
  players: Cucumber5Player[];
  currentPlayer: number;
  fieldCard: Cucumber5Card | null;
  sharedGraveyard: Cucumber5Card[];
  round: number;
  trick: number;
  trickCards: Array<{ player: number; card: Cucumber5Card }>;
  timeLeft: number;
  phase: 'dealing' | 'playing' | 'trick_end' | 'round_end' | 'game_over';
  // GameState interface compatibility
  turn: number;
  data: Record<string, any>;
}

export interface Cucumber5Action {
  type: 'play_card' | 'discard_card' | 'end_turn';
  card?: Cucumber5Card;
  player: number;
}
