// ゲームエンジン（状態遷移）

import { SeededRng } from './rng';
import {
  calculateFinalTrickPenalty,
  createDeck,
  dealCards,
  determineTrickWinner,
  getGameOverPlayers,
  getLegalMoves,
  initializeCardCounts,
  isGameOver,
  isTrickComplete,
  shouldStartNewRound,
  updateCardCounts,
} from './rules';
import { ActionResult, GameConfig, GamePhase, GameState, GameView, Move } from './types';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(player => ({
      ...player,
      hand: [...player.hand],
      graveyard: [...player.graveyard],
    })),
    sharedGraveyard: [...state.sharedGraveyard],
    trickCards: state.trickCards.map(trickCard => ({ ...trickCard })),
    gameOverPlayers: [...state.gameOverPlayers],
    remainingCards: [...state.remainingCards],
    cardCounts: [...state.cardCounts],
  };
}

export function createInitialState(config: GameConfig, rng: SeededRng): GameState {
  const deck = rng.shuffle(createDeck());
  const hands = dealCards(deck, config.players, config.initialCards);

  const players = hands.map(hand => ({
    hand,
    cucumbers: 0,
    graveyard: [],
  }));

  const firstPlayer = rng.nextInt(config.players);

  return {
    players,
    currentPlayer: firstPlayer,
    currentRound: 1,
    currentTrick: 1,
    fieldCard: null,
    sharedGraveyard: [],
    trickCards: [],
    firstPlayer,
    isGameOver: false,
    gameOverPlayers: [],
    remainingCards: deck.slice(config.players * config.initialCards),
    cardCounts: initializeCardCounts(),
    phase: 'AwaitMove' as GamePhase,
  };
}

export function applyMove(
  state: GameState,
  move: Move,
  config: GameConfig,
  rng: SeededRng
): ActionResult {
  const { player, card } = move;

  // フェーズチェック
  if (state.phase !== 'AwaitMove') {
    return { success: false, newState: state, message: 'Invalid phase for move' };
  }

  // バリデーション
  if (player !== state.currentPlayer) {
    return { success: false, newState: state, message: 'Not your turn' };
  }

  const legalMoves = getLegalMoves(state, player);
  if (!legalMoves.includes(card)) {
    return { success: false, newState: state, message: 'Illegal move' };
  }

  const playerHand = state.players[player].hand;
  const cardIndex = playerHand.indexOf(card);
  if (cardIndex === -1) {
    return { success: false, newState: state, message: 'Card not in hand' };
  }

  const minCard = Math.min(...playerHand);
  const hasLegalPlay =
    state.fieldCard === null ? true : playerHand.some(handCard => handCard >= state.fieldCard!);

  if (move.isDiscard) {
    if (state.fieldCard === null) {
      return { success: false, newState: state, message: 'Cannot discard on empty field' };
    }

    if (hasLegalPlay) {
      return {
        success: false,
        newState: state,
        message: 'Player has legal cards to play, cannot discard',
      };
    }

    if (card !== minCard) {
      return {
        success: false,
        newState: state,
        message: 'Discard must be the minimum card in hand',
      };
    }
  } else if (state.fieldCard !== null && card < state.fieldCard) {
    return { success: false, newState: state, message: `Card ${card} is not legal` };
  }

  // 新しい状態を作成
  const players = state.players.map((p, i) => {
    const base = {
      ...p,
      hand: [...p.hand],
      graveyard: [...p.graveyard],
    };

    if (i === player) {
      base.hand = p.hand.filter((_, idx) => idx !== cardIndex);
    }

    return base;
  });

  const sharedGraveyard = [...state.sharedGraveyard];

  let fieldCard = state.fieldCard;
  const isDiscard = move.isDiscard === true;

  // カードを場に出すか墓地に送るか
  if (!isDiscard) {
    fieldCard = card;
  } else {
    players[player].graveyard.push(card);
    sharedGraveyard.push(card);
  }

  const trickCards = isDiscard
    ? [...state.trickCards]
    : [...state.trickCards, { ...move, isDiscard: false }];

  const newState: GameState = {
    ...state,
    players,
    trickCards,
    sharedGraveyard,
    cardCounts: updateCardCounts(state.cardCounts, [card]),
    fieldCard,
    currentPlayer: (state.currentPlayer + 1) % config.players,
  };

  // トリックが完了したかチェック
  if (isTrickComplete(newState.trickCards, config.players, newState.firstPlayer)) {
    newState.phase = 'ResolvingTrick';
    return endTrick(newState, config, rng);
  }

  return { success: true, newState };
}

export function endTrick(state: GameState, config: GameConfig, rng: SeededRng): ActionResult {
  const newState = cloneState(state);

  // 勝者を決定
  const winner = determineTrickWinner(newState.trickCards);
  newState.currentPlayer = winner;
  newState.firstPlayer = winner;

  // 最終トリックかチェック
  if (shouldStartNewRound(newState)) {
    newState.phase = 'RoundEnd';
    return finalRound(newState, config, rng);
  }

  // 次のトリックに進む
  newState.currentTrick++;
  newState.fieldCard = null;
  newState.trickCards = [];
  newState.phase = 'AwaitMove';

  return { success: true, newState };
}

export function finalRound(state: GameState, config: GameConfig, rng: SeededRng): ActionResult {
  const newState = cloneState(state);

  // 最終トリックのペナルティを計算
  const { winner, penalty } = calculateFinalTrickPenalty(newState.trickCards, config);

  if (winner >= 0) {
    newState.players[winner].cucumbers += penalty;
  }

  // ゲーム終了チェック
  if (isGameOver(newState, config)) {
    newState.isGameOver = true;
    newState.gameOverPlayers = getGameOverPlayers(newState, config);
    newState.phase = 'GameEnd';
    return { success: true, newState };
  }

  // 次のラウンドに進む
  return startNewRound(newState, config, rng);
}

export function startNewRound(state: GameState, config: GameConfig, rng: SeededRng): ActionResult {
  const newState = cloneState(state);

  // 新しいデッキを作成
  const deck = rng.shuffle(createDeck());
  const hands = dealCards(deck, config.players, config.initialCards);

  // プレイヤー状態をリセット
  newState.players = hands.map((hand, i) => ({
    hand,
    cucumbers: newState.players[i].cucumbers,
    graveyard: [],
  }));

  newState.currentRound++;
  newState.currentTrick = 1;
  newState.fieldCard = null;
  newState.sharedGraveyard = [];
  newState.trickCards = [];
  newState.firstPlayer = rng.nextInt(config.players);
  newState.currentPlayer = newState.firstPlayer;
  newState.remainingCards = deck.slice(config.players * config.initialCards);
  newState.cardCounts = initializeCardCounts();
  newState.phase = 'AwaitMove';

  return { success: true, newState };
}

export function createGameView(
  state: GameState,
  config: GameConfig,
  playerIndex: number
): GameView {
  return {
    state,
    config,
    legalMoves: getLegalMoves(state, playerIndex),
    isMyTurn: state.currentPlayer === playerIndex,
    playerIndex,
  };
}

export function isPlayerTurn(state: GameState, playerIndex: number): boolean {
  return state.currentPlayer === playerIndex;
}

export function getCurrentPlayer(state: GameState): number {
  return state.currentPlayer;
}

export function getPlayerHand(state: GameState, playerIndex: number): number[] {
  return state.players[playerIndex]?.hand || [];
}

export function getPlayerCucumbers(state: GameState, playerIndex: number): number {
  return state.players[playerIndex]?.cucumbers || 0;
}

export function getFieldCard(state: GameState): number | null {
  return state.fieldCard;
}

export function getTrickCards(state: GameState): Move[] {
  return state.trickCards;
}

export function getSharedGraveyard(state: GameState): number[] {
  return state.sharedGraveyard;
}

export function getPlayerGraveyard(state: GameState, playerIndex: number): number[] {
  return state.players[playerIndex]?.graveyard || [];
}

/**
 * 実効ターン時間を計算（最小ペース制御）
 */
export function getEffectiveTurnSeconds(config: GameConfig): number | null {
  if (config.turnSeconds === null) return null;

  const minTurnMs = config.minTurnMs || 500;
  const minTurnSeconds = minTurnMs / 1000;

  return Math.max(minTurnSeconds, config.turnSeconds);
}

/**
 * 最小解決時間を取得
 */
export function getMinResolveMs(config: GameConfig): number {
  return config.minResolveMs || 600;
}
