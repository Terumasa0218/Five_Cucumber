import { Cucumber5Card, Cucumber5Player, Cucumber5State } from '@five-cucumber/sdk';
import { Cucumber5Rules } from './rules';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface CPUStrategy {
  selectCard(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card;
}

/**
 * Easy CPU - mostly random with basic avoidance
 */
export class EasyCPU implements CPUStrategy {
  selectCard(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card {
    // 70% random, 30% avoid high cards
    if (Math.random() < 0.3 && playableCards.length > 1) {
      // Avoid highest cards
      const sortedCards = [...playableCards].sort((a, b) => a.number - b.number);
      const avoidHigh = sortedCards.slice(0, Math.ceil(sortedCards.length * 0.7));
      return avoidHigh[Math.floor(Math.random() * avoidHigh.length)];
    }
    
    // Random selection
    return playableCards[Math.floor(Math.random() * playableCards.length)];
  }
}

/**
 * Normal CPU - balanced strategy
 */
export class NormalCPU implements CPUStrategy {
  selectCard(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card {
    const isFinalTrick = this.isFinalTrick(player, state);
    
    if (isFinalTrick) {
      // In final trick, try to avoid being highest
      return this.selectForFinalTrick(playableCards, state);
    }
    
    // Regular trick strategy
    return this.selectForRegularTrick(player, state, playableCards);
  }

  private isFinalTrick(player: Cucumber5Player, state: Cucumber5State): boolean {
    const isLastCardInHand = player.hand.length === 1;
    const isKnownLastTrick = state.trick >= 7;
    return isLastCardInHand || isKnownLastTrick;
  }

  private selectForFinalTrick(
    playableCards: Cucumber5Card[],
    state: Cucumber5State
  ): Cucumber5Card {
    // Avoid high cards in final trick
    const sortedCards = [...playableCards].sort((a, b) => a.number - b.number);
    
    // Prefer lower cards, but not too low
    const lowCards = sortedCards.slice(0, Math.ceil(sortedCards.length * 0.6));
    if (lowCards.length > 0) {
      return lowCards[Math.floor(Math.random() * lowCards.length)];
    }
    
    return sortedCards[0];
  }

  private selectForRegularTrick(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card {
    // If we can win the trick, consider it
    if (state.fieldCard) {
      const winningCards = playableCards.filter(card => card.number > state.fieldCard!.number);
      if (winningCards.length > 0 && Math.random() < 0.4) {
        // 40% chance to try winning
        const sortedWinning = winningCards.sort((a, b) => a.number - b.number);
        return sortedWinning[0]; // Choose lowest winning card
      }
    }
    
    // Otherwise, balanced selection
    const sortedCards = [...playableCards].sort((a, b) => a.number - b.number);
    const middleCards = sortedCards.slice(
      Math.floor(sortedCards.length * 0.2),
      Math.ceil(sortedCards.length * 0.8)
    );
    
    if (middleCards.length > 0) {
      return middleCards[Math.floor(Math.random() * middleCards.length)];
    }
    
    return sortedCards[Math.floor(sortedCards.length / 2)];
  }
}

/**
 * Hard CPU - advanced strategy
 */
export class HardCPU implements CPUStrategy {
  selectCard(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card {
    const isFinalTrick = this.isFinalTrick(player, state);
    
    if (isFinalTrick) {
      return this.selectForFinalTrick(playableCards, state);
    }
    
    return this.selectForRegularTrick(player, state, playableCards);
  }

  private isFinalTrick(player: Cucumber5Player, state: Cucumber5State): boolean {
    const isLastCardInHand = player.hand.length === 1;
    const isKnownLastTrick = state.trick >= 7;
    return isLastCardInHand || isKnownLastTrick;
  }

  private selectForFinalTrick(
    playableCards: Cucumber5Card[],
    state: Cucumber5State
  ): Cucumber5Card {
    // Advanced final trick strategy
    const sortedCards = [...playableCards].sort((a, b) => a.number - b.number);
    
    // Count cards already played in this trick
    const playedNumbers = state.trickCards.map(tc => tc.card.number);
    const maxPlayed = playedNumbers.length > 0 ? Math.max(...playedNumbers) : 0;
    
    // If we can avoid being highest, do it
    const safeCards = sortedCards.filter(card => card.number < maxPlayed);
    if (safeCards.length > 0) {
      return safeCards[safeCards.length - 1]; // Highest safe card
    }
    
    // If we must be highest, choose the lowest possible
    return sortedCards[0];
  }

  private selectForRegularTrick(
    player: Cucumber5Player,
    state: Cucumber5State,
    playableCards: Cucumber5Card[]
  ): Cucumber5Card {
    // Advanced regular trick strategy
    const sortedCards = [...playableCards].sort((a, b) => a.number - b.number);
    const lowCards = sortedCards.slice(0, Math.max(1, Math.ceil(sortedCards.length * 0.5)));
    
    // 1. If we can win cheaply, do it
    if (state.fieldCard) {
      const winningCards = playableCards.filter(card => card.number > state.fieldCard!.number);
      if (winningCards.length > 0) {
        const sortedWinning = winningCards.sort((a, b) => a.number - b.number);
        const cheapWin = sortedWinning[0];
        
        // Only win if it's a cheap card or we have few cards left
        if (cheapWin.number <= 8 || player.hand.length <= 3) {
          return cheapWin;
        }
      }
    }
    
    // 2. Consider opponent hand sizes and cucumber counts
    const playerIndex = state.players.findIndex(p => p.id === player.id);
    const opponents = state.players.filter((p, i) => i !== playerIndex && !p.isCPU);
    const weakOpponents = opponents.filter(p => p.cucumbers >= 3);
    const laterTrick = player.hand.length <= 4;

    if (weakOpponents.length > 0 && laterTrick && state.fieldCard) {
      // In later tricks, take controlled wins while still preserving highest cards.
      const winningCards = sortedCards.filter(card => card.number > state.fieldCard!.number);
      const preferredWinningCards = winningCards.filter(card => card.number <= 10);
      if (preferredWinningCards.length > 0) {
        return preferredWinningCards[0];
      }
      if (winningCards.length > 0 && lowCards.length > 0) {
        return winningCards[0];
      }
    }

    // 3. Default: preserve high cards for flexible late-game control.
    if (state.fieldCard) {
      const winningCards = sortedCards.filter(card => card.number > state.fieldCard!.number);
      if (winningCards.length > 0) {
        return winningCards[0];
      }
    }

    return lowCards[Math.floor(Math.random() * lowCards.length)] ?? sortedCards[0];
  }
}

/**
 * CPU Player Manager
 */
export class CPUManager {
  private strategies: Map<Difficulty, CPUStrategy> = new Map();

  constructor() {
    this.strategies.set('easy', new EasyCPU());
    this.strategies.set('normal', new NormalCPU());
    this.strategies.set('hard', new HardCPU());
  }

  /**
   * Get CPU action for a player
   */
  getCPUAction(
    player: Cucumber5Player,
    state: Cucumber5State,
    difficulty: Difficulty = 'normal'
  ): Cucumber5Card | null {
    if (!player.isCPU) {
      return null;
    }

    const strategy = this.strategies.get(difficulty);
    if (!strategy) {
      throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    const playableCards = Cucumber5Rules.getPlayableCards(player, state.fieldCard);
    if (playableCards.length === 0) {
      return null;
    }

    return strategy.selectCard(player, state, playableCards);
  }

  /**
   * Simulate thinking time for CPU
   */
  getThinkingTime(difficulty: Difficulty): number {
    const baseTime = {
      easy: 500,
      normal: 1000,
      hard: 1500
    };
    
    // Add some randomness
    const randomFactor = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
    return Math.floor(baseTime[difficulty] * randomFactor);
  }
}

// Export singleton instance
export const cpuManager = new CPUManager();
