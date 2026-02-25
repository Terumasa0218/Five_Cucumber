// ゲームルールの実装

import { GameConfig, GameState, Move } from './types';

const MIN_CARD_NUMBER = 1;
const MAX_CARD_NUMBER = 15;
const CARDS_PER_NUMBER = 7;

export function getCucumberCount(cardNumber: number): number {
  if (cardNumber >= 2 && cardNumber <= 5) return 1;
  if (cardNumber >= 6 && cardNumber <= 9) return 2;
  if (cardNumber >= 10 && cardNumber <= 11) return 3;
  if (cardNumber >= 12 && cardNumber <= 14) return 4;
  if (cardNumber === 15) return 5;
  return 0;
}

export function getCucumberIcons(cardNumber: number): string {
  const count = getCucumberCount(cardNumber);
  return '🥒'.repeat(count);
}

// 合法手を計算
export function getLegalMoves(state: GameState, player: number): number[] {
  const hand = state.players[player].hand;
  if (hand.length === 0) return [];

  const minCard = Math.min(...hand);
  
  if (state.fieldCard === null) {
    // 最初のカードは何でも出せる
    return [...hand];
  }
  
  // 場のカード以上か、最小カードのみ
  const playableCards = hand.filter(card => card >= state.fieldCard!);
  if (playableCards.length > 0) {
    return playableCards;
  }
  
  return [minCard];
}

// トリックの勝者を決定
export function determineTrickWinner(trickCards: Move[]): number {
  if (trickCards.length === 0) return -1;

  let winnerIndex = 0;
  let highestValue = trickCards[0].card;

  for (let i = 1; i < trickCards.length; i++) {
    // 同値の場合は後から出したカードを勝者として上書きする
    if (trickCards[i].card >= highestValue) {
      highestValue = trickCards[i].card;
      winnerIndex = i;
    }
  }

  return trickCards[winnerIndex].player;
}

// 最終トリックのペナルティ計算
export function calculateFinalTrickPenalty(trickCards: Move[], _config: GameConfig): { winner: number; penalty: number } {
  if (trickCards.length === 0) return { winner: -1, penalty: 0 };

  const winner = determineTrickWinner(trickCards);
  const winnerCard = trickCards.find(tc => tc.player === winner)?.card ?? 0;

  const allPlayedOne = trickCards.every(tc => tc.card === 1);
  if (allPlayedOne) {
    return { winner, penalty: 0 };
  }

  const hasOneOnTable = trickCards.some(tc => tc.card === 1);
  let penalty = winnerCard;
  if (hasOneOnTable) {
    penalty *= 2;
  }

  return { winner, penalty };
}

// ゲーム終了判定
export function isGameOver(state: GameState, config: GameConfig): boolean {
  return state.players.some(player => player.cucumbers >= config.maxCucumbers);
}

// 脱落プレイヤーを取得
export function getGameOverPlayers(state: GameState, config: GameConfig): number[] {
  return state.players
    .map((player, index) => ({ index, cucumbers: player.cucumbers }))
    .filter(p => p.cucumbers >= config.maxCucumbers)
    .map(p => p.index);
}

// デッキを生成
export function createDeck(): number[] {
  const deck: number[] = [];
  for (let num = MIN_CARD_NUMBER; num <= MAX_CARD_NUMBER; num++) {
    for (let i = 0; i < CARDS_PER_NUMBER; i++) {
      deck.push(num);
    }
  }
  return deck;
}

// カードを配る
export function dealCards(deck: number[], players: number, cardsPerPlayer: number): number[][] {
  const hands: number[][] = [];
  let deckIndex = 0;
  
  for (let player = 0; player < players; player++) {
    hands[player] = [];
    for (let card = 0; card < cardsPerPlayer; card++) {
      if (deckIndex < deck.length) {
        hands[player].push(deck[deckIndex++]);
      }
    }
    hands[player].sort((a, b) => a - b);
  }
  
  return hands;
}

// カード枚数カウントを初期化
export function initializeCardCounts(): number[] {
  const counts = new Array(MAX_CARD_NUMBER + 1).fill(0); // 0は未使用
  for (let i = MIN_CARD_NUMBER; i <= MAX_CARD_NUMBER; i++) {
    counts[i] = CARDS_PER_NUMBER;
  }
  return counts;
}

// カード枚数カウントを更新
export function updateCardCounts(counts: number[], playedCards: number[]): number[] {
  const newCounts = [...counts];
  for (const card of playedCards) {
    if (card >= MIN_CARD_NUMBER && card <= MAX_CARD_NUMBER) {
      newCounts[card] = Math.max(0, newCounts[card] - 1);
    }
  }
  return newCounts;
}

// 残りカードを推定
export function estimateRemainingCards(counts: number[]): number[] {
  const remaining: number[] = [];
  for (let i = MIN_CARD_NUMBER; i <= MAX_CARD_NUMBER; i++) {
    for (let j = 0; j < counts[i]; j++) {
      remaining.push(i);
    }
  }
  return remaining;
}

// プレイヤー名を取得
export function getPlayerName(playerIndex: number): string {
  const names = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
  return names[playerIndex] || `Player ${playerIndex}`;
}

// トリックが完了しているかチェック
export function isTrickComplete(actionCount: number, players: number): boolean {
  return actionCount === players;
}

// 次のラウンドに進むかチェック
export function shouldStartNewRound(state: GameState): boolean {
  return state.players.some(player => player.hand.length === 0);
}
