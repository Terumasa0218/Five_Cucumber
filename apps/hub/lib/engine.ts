export type GameAction = {
  type: string;
  [key: string]: unknown;
};

export type GameState = {
  turn: number;
  seats: string[];
  board?: unknown;
  [key: string]: unknown;
};

export function initGame(seats: string[], seed: string): GameState {
  return { turn: 0, seats, board: Array(9).fill(null), seed };
}

export function validate(state: GameState, action: GameAction, actorSeat: number): boolean {
  if (action.type !== 'place') return false;
  const index = typeof action.i === 'number' ? action.i : Number(action.i);
  if (!Number.isInteger(index)) return false;
  const board = Array.isArray(state.board) ? state.board : [];
  return board[index] == null && state.turn === actorSeat;
}

export function apply(state: GameState, action: GameAction): GameState {
  if (action.type === 'place') {
    const index = typeof action.i === 'number' ? action.i : Number(action.i);
    if (!Number.isInteger(index)) {
      return state;
    }
    const currentBoard = Array.isArray(state.board) ? [...state.board] : [];
    currentBoard[index] = state.turn;
    const nextTurn = (state.turn + 1) % state.seats.length;
    return { ...state, board: currentBoard, turn: nextTurn };
  }
  return state;
}

export function projectViewFor(state: GameState, _userId: string): GameState {
  // このゲームでは非公開情報が無い例
  return state;
}



