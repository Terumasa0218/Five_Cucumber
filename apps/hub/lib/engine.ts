export type GameAction = { type: string; [k: string]: any };
export type GameState = { turn: number; seats: string[]; board?: any; [k: string]: any };

export function initGame(seats: string[], seed: string): GameState {
  return { turn: 0, seats, board: Array(9).fill(null), seed } as any;
}

export function validate(state: GameState, action: GameAction, actorSeat: number) {
  if (action.type !== 'place') return false;
  const i = action.i as number;
  return state.board?.[i] == null && state.turn === actorSeat;
}

export function apply(state: GameState, action: GameAction): GameState {
  if (action.type === 'place') {
    const i = action.i as number;
    const board = [...(state.board ?? [])];
    board[i] = state.turn;
    const turn = (state.turn + 1) % state.seats.length;
    return { ...state, board, turn };
  }
  return state;
}

export function projectViewFor(state: GameState, userId: string) {
  // このゲームでは非公開情報が無い例
  return state;
}



