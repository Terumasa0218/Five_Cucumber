// CPUプレイヤーのコントローラー（難易度別実装）

import { SeededRng } from '../game-core/rng';
import { estimateRemainingCards, getCucumberCount, getLegalMoves } from '../game-core/rules';
import { GameState, GameView, SimulationResult } from '../game-core/types';
import { BaseController } from './base';

export class CpuController extends BaseController {
  private rng: SeededRng;
  private config: {
    level: 'easy' | 'normal' | 'hard';
    rollouts?: number;
    opponentNoise?: number;
    epsilon?: number;
  };

  constructor(playerIndex: number, level: 'easy' | 'normal' | 'hard', seed?: number) {
    super(playerIndex);
    this.rng = new SeededRng(seed);
    this.config = {
      level,
      rollouts: level === 'hard' ? 250 : 0,
      opponentNoise: 0.05,
      epsilon: level === 'easy' ? 0.8 : level === 'normal' ? 0.1 : 0.0
    };
  }

  async onYourTurn(view: GameView): Promise<number | null> {
    const legalMoves = getLegalMoves(view.state, this.playerIndex);
    if (legalMoves.length === 0) return null;

    // 思考演出のため少し待機
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (this.config.level) {
      case 'easy':
        return this.easyMove(view, legalMoves);
      case 'normal':
        return this.normalMove(view, legalMoves);
      case 'hard':
        return this.hardMove(view, legalMoves);
      default:
        return this.easyMove(view, legalMoves);
    }
  }

  private easyMove(view: GameView, legalMoves: number[]): number {
    // epsilon-greedy with trivial heuristic
    if (this.rng.next() < this.config.epsilon!) {
      return this.trivialHeuristic(view, legalMoves);
    } else {
      return this.rng.choice(legalMoves);
    }
  }

  private normalMove(view: GameView, legalMoves: number[]): number {
    const scores = legalMoves.map(move => this.scoreMoveNormal(view, move));
    const bestScore = Math.max(...scores);
    const bestMoves = legalMoves.filter((_, i) => scores[i] === bestScore);
    
    // epsilon-choose: 少しだけブレさせる
    if (this.rng.next() < this.config.epsilon!) {
      return this.rng.choice(bestMoves);
    } else {
      return this.rng.choice(legalMoves);
    }
  }

  private hardMove(view: GameView, legalMoves: number[]): number {
    if (this.config.rollouts! <= 0) {
      return this.normalMove(view, legalMoves);
    }

    const results = legalMoves.map(move => 
      this.mctsLikeRollout(view, move, this.config.rollouts!, this.config.opponentNoise!)
    );

    // 平均ペナルティ最小の手を選択
    const avgPenalties = results.map(result => result.avgPenalty);
    const minPenalty = Math.min(...avgPenalties);
    const bestMoves = legalMoves.filter((_, i) => avgPenalties[i] === minPenalty);

    return this.rng.choice(bestMoves);
  }

  private trivialHeuristic(view: GameView, legalMoves: number[]): number {
    const hand = view.state.players[this.playerIndex].hand;
    const minCard = Math.min(...hand);
    
    // 出せるなら「>=Mの中で最小」、出せなければ最小札
    if (view.state.fieldCard === null) {
      return Math.min(...legalMoves);
    }
    
    const playableCards = legalMoves.filter(card => card >= view.state.fieldCard!);
    if (playableCards.length > 0) {
      return Math.min(...playableCards);
    }
    
    return minCard;
  }

  private scoreMoveNormal(view: GameView, move: number): number {
    const hand = view.state.players[this.playerIndex].hand;
    const remainingCards = estimateRemainingCards(view.state.cardCounts);
    
    // 基本スコア
    let score = 0;
    
    // 1. 高札の価値（最後に残りやすい）
    const cucumberValue = getCucumberCount(move);
    score -= cucumberValue * 10;
    
    // 2. 手札のバランス
    const remainingHand = hand.filter(card => card !== move);
    if (remainingHand.length > 0) {
      const avgRemaining = remainingHand.reduce((sum, card) => sum + card, 0) / remainingHand.length;
      score += avgRemaining * 2; // 高いカードを残す
    }
    
    // 3. 場の状況
    if (view.state.fieldCard !== null) {
      if (move >= view.state.fieldCard) {
        score += 5; // 場のカード以上を出す
      } else {
        score -= 10; // 最小札を出すのは避ける
      }
    }
    
    // 4. 残りカードの考慮
    const remainingHighCards = remainingCards.filter(card => card >= 12).length;
    if (remainingHighCards <= 2 && move >= 12) {
      score -= 20; // 最後の高札は避ける
    }
    
    return score;
  }

  private mctsLikeRollout(view: GameView, move: number, rollouts: number, opponentNoise: number): { avgPenalty: number } {
    let totalPenalty = 0;
    
    for (let i = 0; i < rollouts; i++) {
      const result = this.simulateGame(view, move, opponentNoise);
      totalPenalty += result.penalty;
    }
    
    return { avgPenalty: totalPenalty / rollouts };
  }

  private simulateGame(view: GameView, initialMove: number, opponentNoise: number): SimulationResult {
    // 簡易シミュレーション（高速化のため）
    const state = JSON.parse(JSON.stringify(view.state)) as GameState;
    const hand = state.players[this.playerIndex].hand;
    const moveIndex = hand.indexOf(initialMove);
    
    if (moveIndex === -1) {
      return { finalCucumbers: [], winner: -1, penalty: 0 };
    }
    
    // 初期手を適用
    hand.splice(moveIndex, 1);
    state.trickCards.push({ player: this.playerIndex, card: initialMove, timestamp: Date.now() });
    
    if (state.fieldCard === null || initialMove >= state.fieldCard) {
      state.fieldCard = initialMove;
    } else {
      state.players[this.playerIndex].graveyard.push(initialMove);
      state.sharedGraveyard.push(initialMove);
    }
    
    // 残りのゲームをシミュレーション
    let currentPlayer = (this.playerIndex + 1) % state.players.length;
    let trickCount = 0;
    
    while (trickCount < 7 && !state.players.some(p => p.hand.length === 0)) {
      if (currentPlayer === this.playerIndex) {
        // 自分のターン（既に手を出したのでスキップ）
        currentPlayer = (currentPlayer + 1) % state.players.length;
        continue;
      }
      
      const cpuHand = state.players[currentPlayer].hand;
      if (cpuHand.length === 0) break;
      
      // CPUの手を選択（normal相当 + noise）
      const legalMoves = getLegalMoves(state, currentPlayer);
      let selectedMove: number;
      
      if (this.rng.next() < opponentNoise) {
        // ノイズ: ランダム選択
        selectedMove = this.rng.choice(legalMoves);
      } else {
        // normal相当の評価
        const scores = legalMoves.map(move => this.scoreMoveNormal({ state, config: view.config, legalMoves: [], isMyTurn: true, playerIndex: currentPlayer }, move));
        const bestScore = Math.max(...scores);
        const bestMoves = legalMoves.filter((_, i) => scores[i] === bestScore);
        selectedMove = this.rng.choice(bestMoves);
      }
      
      // 手を適用
      const cardIndex = cpuHand.indexOf(selectedMove);
      cpuHand.splice(cardIndex, 1);
      state.trickCards.push({ player: currentPlayer, card: selectedMove, timestamp: Date.now() });
      
      if (state.fieldCard === null || selectedMove >= state.fieldCard) {
        state.fieldCard = selectedMove;
      } else {
        state.players[currentPlayer].graveyard.push(selectedMove);
        state.sharedGraveyard.push(selectedMove);
      }
      
      currentPlayer = (currentPlayer + 1) % state.players.length;
      
      // トリック完了チェック
      if (state.trickCards.length === state.players.length) {
        const maxCard = Math.max(...state.trickCards.map(tc => tc.card));
        const winners = state.trickCards.filter(tc => tc.card === maxCard);
        const winner = winners[winners.length - 1].player;
        
        state.currentPlayer = winner;
        state.firstPlayer = winner;
        state.currentTrick++;
        state.fieldCard = null;
        state.trickCards = [];
        currentPlayer = winner;
        trickCount++;
      }
    }
    
    // 最終トリックのペナルティ計算
    if (state.trickCards.length > 0) {
      const maxCard = Math.max(...state.trickCards.map(tc => tc.card));
      const hasOne = state.trickCards.some(tc => tc.card === 1);
      const winners = state.trickCards.filter(tc => tc.card === maxCard);
      const winner = winners[winners.length - 1].player;
      
      let penalty = getCucumberCount(maxCard);
      if (hasOne) penalty *= 2;
      
      if (winner === this.playerIndex) {
        return { 
          finalCucumbers: state.players.map(p => p.cucumbers), 
          winner, 
          penalty 
        };
      }
    }
    
    return { 
      finalCucumbers: state.players.map(p => p.cucumbers), 
      winner: -1, 
      penalty: 0 
    };
  }
}
