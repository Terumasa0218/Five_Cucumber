import { GameAction, GameState } from './types';

// 初期化：座席配列とseedを受け取り、決定的な初期状態を返す
export function initGame(seats: string[], seed: string): GameState {
  // ここはデモ実装（三目並べ風）。実ゲームに合わせて置換OK
  const board = Array(9).fill(null);
  return { turn: 0, seats, board };
}

// 合法判定
export function validate(state: GameState, action: GameAction, actorSeat: number): boolean {
  if (action.type !== 'place') return false;
  const i = action.i as number;
  if (typeof i !== 'number' || i < 0 || i >= (state.board?.length ?? 0)) return false;
  return state.board?.[i] == null && state.turn === actorSeat;
}

// 適用（新インスタンスを返す）
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

// プレイヤー毎のview（非公開を隠す）
export function projectViewFor(state: GameState, userId: string): any {
  const clone = JSON.parse(JSON.stringify(state));
  if (clone.hands) {
    for (const k of Object.keys(clone.hands)) {
      if (k !== userId) clone.hands[k] = { count: clone.hands[k].length ?? 0 };
    }
  }
  return clone;
}


