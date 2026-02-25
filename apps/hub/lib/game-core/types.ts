// ゲームコアの型定義

export interface Card {
  value: number; // 1-15
  id: string; // 一意ID
}

export interface Move {
  player: number;
  card: number;
  timestamp: number;
  isDiscard?: boolean;
}

export interface Trick {
  cards: Move[];
  winner: number | null;
  isComplete: boolean;
}

export interface PlayerState {
  hand: number[];
  cucumbers: number;
  graveyard: number[];
}

export type GamePhase = 'AwaitMove' | 'ResolvingTrick' | 'RoundEnd' | 'GameEnd';

export interface GameState {
  players: PlayerState[];
  currentPlayer: number;
  currentRound: number;
  currentTrick: number;
  fieldCard: number | null;
  sharedGraveyard: number[];
  trickCards: Move[];
  firstPlayer: number;
  isGameOver: boolean;
  gameOverPlayers: number[];
  remainingCards: number[]; // デッキの残り
  cardCounts: number[]; // 各カードの残り枚数 [0,4,4,4,...,4] (0は未使用)
  phase: GamePhase; // フェーズ制御
}

export interface GameConfig {
  players: number;
  turnSeconds: number | null;
  maxCucumbers: number;
  initialCards: number;
  cpuLevel: 'easy' | 'normal' | 'hard';
  seed?: number; // 乱数シード
  minTurnMs?: number; // 最小ターン時間（ミリ秒）
  minResolveMs?: number; // 最小解決時間（ミリ秒）
}

export interface GameView {
  state: GameState;
  config: GameConfig;
  legalMoves: number[];
  isMyTurn: boolean;
  playerIndex: number;
}

export interface ActionResult {
  success: boolean;
  newState: GameState;
  message?: string;
}

export interface SimulationResult {
  finalCucumbers: number[];
  winner: number | null;
  penalty: number;
}

export interface CpuConfig {
  level: 'easy' | 'normal' | 'hard';
  rollouts?: number;
  opponentNoise?: number;
  epsilon?: number;
}

export interface PlayerController {
  onYourTurn(view: GameView): Promise<number | null>;
  onGameStart?(config: GameConfig): void;
  onGameEnd?(result: SimulationResult): void;
  onTrickEnd?(trick: Trick): void;
}

export interface GameSnapshot {
  state: GameState;
  config: GameConfig;
  timestamp: number;
  version: string;
}
