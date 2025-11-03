// ゲームルールの実装

import { GameConfig, GameState, Move } from './types';

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
  
  const maxCard = Math.max(...trickCards.map(tc => tc.card));
  const maxCardPlayers = trickCards.filter(tc => tc.card === maxCard);
  
  // 同値最大が複数の場合、最後に出した人が勝者
  return maxCardPlayers[maxCardPlayers.length - 1].player;
}

// 最終トリックのペナルティ計算
export function calculateFinalTrickPenalty(trickCards: Move[], _config: GameConfig): { winner: number; penalty: number } {
  if (trickCards.length === 0) return { winner: -1, penalty: 0 };
  
  const maxCard = Math.max(...trickCards.map(tc => tc.card));
  const hasOne = trickCards.some(tc => tc.card === 1);
  
  // 最大カードを出したプレイヤーの中で、最後に出した人が勝者
  const winners = trickCards.filter(tc => tc.card === maxCard);
  const winner = winners[winners.length - 1].player;
  
  let penalty = getCucumberCount(maxCard);
  if (hasOne) penalty *= 2;
  
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
  for (let num = 1; num <= 15; num++) {
    for (let i = 0; i < 4; i++) {
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
  const counts = new Array(16).fill(0); // 0は未使用
  for (let i = 1; i <= 15; i++) {
    counts[i] = 4;
  }
  return counts;
}

// カード枚数カウントを更新
export function updateCardCounts(counts: number[], playedCards: number[]): number[] {
  const newCounts = [...counts];
  for (const card of playedCards) {
    if (card >= 1 && card <= 15) {
      newCounts[card] = Math.max(0, newCounts[card] - 1);
    }
  }
  return newCounts;
}

// 残りカードを推定
export function estimateRemainingCards(counts: number[]): number[] {
  const remaining: number[] = [];
  for (let i = 1; i <= 15; i++) {
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
export function isTrickComplete(trickCards: Move[], players: number, _firstPlayer: number): boolean {
  return trickCards.length === players;
}

// 次のラウンドに進むかチェック
export function shouldStartNewRound(state: GameState): boolean {
  return state.players.some(player => player.hand.length === 0);
}
