"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGame = initGame;
exports.validate = validate;
exports.apply = apply;
exports.projectViewFor = projectViewFor;
// 初期化：座席配列とseedを受け取り、決定的な初期状態を返す
function initGame(seats, seed) {
    // ここはデモ実装（三目並べ風）。実ゲームに合わせて置換OK
    const board = Array(9).fill(null);
    return { turn: 0, seats, board };
}
// 合法判定
function validate(state, action, actorSeat) {
    var _a, _b, _c;
    if (action.type !== 'place')
        return false;
    const i = action.i;
    if (typeof i !== 'number' || i < 0 || i >= ((_b = (_a = state.board) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0))
        return false;
    return ((_c = state.board) === null || _c === void 0 ? void 0 : _c[i]) == null && state.turn === actorSeat;
}
// 適用（新インスタンスを返す）
function apply(state, action) {
    var _a;
    if (action.type === 'place') {
        const i = action.i;
        const board = [...((_a = state.board) !== null && _a !== void 0 ? _a : [])];
        board[i] = state.turn;
        const turn = (state.turn + 1) % state.seats.length;
        return Object.assign(Object.assign({}, state), { board, turn });
    }
    return state;
}
// プレイヤー毎のview（非公開を隠す）
function projectViewFor(state, userId) {
    var _a;
    const clone = JSON.parse(JSON.stringify(state));
    if (clone.hands) {
        for (const k of Object.keys(clone.hands)) {
            if (k !== userId)
                clone.hands[k] = { count: (_a = clone.hands[k].length) !== null && _a !== void 0 ? _a : 0 };
        }
    }
    return clone;
}
//# sourceMappingURL=engine.js.map