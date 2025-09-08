import { Cucumber5Card, Cucumber5Player, Cucumber5State, Cucumber5Action } from '@five-cucumber/sdk';

/**
 * Game rules and logic for Five Cucumbers
 * Fixed known bugs from legacy implementation
 */

export class Cucumber5Rules {
  private static readonly MAX_PICKLES = 5;
  private static readonly INITIAL_CARDS = 7;
  private static readonly DECK_SIZE = 15;
  private static readonly CARDS_PER_NUMBER = 7;

  /**
   * Create a shuffled deck
   */
  static createDeck(seed?: number): Cucumber5Card[] {
    const deck: Cucumber5Card[] = [];
    
    // Create deck: 7 cards each of numbers 1-15
    for (let num = 1; num <= this.DECK_SIZE; num++) {
      for (let i = 0; i < this.CARDS_PER_NUMBER; i++) {
        deck.push({
          number: num,
          cucumbers: this.getCucumberCount(num)
        });
      }
    }
    
    // Shuffle with optional seed
    if (seed !== undefined) {
      this.seededShuffle(deck, seed);
    } else {
      this.shuffle(deck);
    }
    
    return deck;
  }

  /**
   * Deal cards to players
   */
  static dealCards(deck: Cucumber5Card[], playerCount: number): Cucumber5Card[][] {
    const hands: Cucumber5Card[][] = [];
    
    for (let player = 0; player < playerCount; player++) {
      hands[player] = [];
      for (let card = 0; card < this.INITIAL_CARDS; card++) {
        const cardIndex = player * this.INITIAL_CARDS + card;
        if (cardIndex < deck.length) {
          hands[player].push(deck[cardIndex]);
        }
      }
      // Sort hand by number
      hands[player].sort((a, b) => a.number - b.number);
    }
    
    return hands;
  }

  /**
   * Get cucumber count for a card number
   */
  static getCucumberCount(cardNumber: number): number {
    if (cardNumber >= 2 && cardNumber <= 5) return 1;
    if (cardNumber >= 6 && cardNumber <= 9) return 2;
    if (cardNumber >= 10 && cardNumber <= 11) return 3;
    if (cardNumber >= 12 && cardNumber <= 14) return 4;
    if (cardNumber === 15) return 5;
    return 0;
  }

  /**
   * Check if a card can be played
   */
  static canPlayCard(
    player: Cucumber5Player,
    card: Cucumber5Card,
    fieldCard: Cucumber5Card | null
  ): boolean {
    const hand = player.hand;
    const minCard = Math.min(...hand.map(c => c.number));

    // Can play if field is empty or card is higher than field card
    if (fieldCard === null || card.number >= fieldCard.number) {
      return true;
    }
    
    // Can only discard minimum card if field card is higher
    return card.number === minCard;
  }

  /**
   * Get playable cards for a player
   */
  static getPlayableCards(
    player: Cucumber5Player,
    fieldCard: Cucumber5Card | null
  ): Cucumber5Card[] {
    const hand = player.hand;
    const minCard = Math.min(...hand.map(c => c.number));

    if (fieldCard === null) {
      return [...hand];
    }

    const playableCards = hand.filter(card => card.number >= fieldCard!.number);
    
    if (playableCards.length > 0) {
      return playableCards;
    } else {
      return hand.filter(card => card.number === minCard);
    }
  }

  /**
   * Process a trick and determine winner
   */
  static processTrick(trickCards: Array<{ player: number; card: Cucumber5Card }>): {
    winner: number;
    maxCard: Cucumber5Card;
  } {
    if (trickCards.length === 0) {
      throw new Error('No cards in trick');
    }

    // Find maximum card number
    const maxCardNumber = Math.max(...trickCards.map(tc => tc.card.number));
    
    // Get all players who played the maximum card
    const maxCardPlayers = trickCards.filter(tc => tc.card.number === maxCardNumber);
    
    // If multiple players have max card, last one wins (tie-breaker rule)
    const winner = maxCardPlayers[maxCardPlayers.length - 1].player;
    const maxCard = maxCardPlayers[maxCardPlayers.length - 1].card;

    return { winner, maxCard };
  }

  /**
   * Process final trick and award cucumbers
   */
  static processFinalTrick(
    trickCards: Array<{ player: number; card: Cucumber5Card }>,
    players: Cucumber5Player[]
  ): {
    cucumberAwards: Array<{ player: number; cucumbers: number }>;
    hasOne: boolean;
  } {
    const finalCards = trickCards.map(tc => tc.card);
    
    // Check if all cards are 1s (special case)
    if (finalCards.every(card => card.number === 1)) {
      return { cucumberAwards: [], hasOne: false };
    }

    // Find maximum card - FIXED: Use spread operator correctly
    const maxCardNumber = Math.max(...finalCards.map(card => card.number));
    const hasOne = finalCards.some(card => card.number === 1);
    
    // Get losers (players with max card)
    const losers = trickCards.filter(tc => tc.card.number === maxCardNumber);
    
    const cucumberAwards = losers.map(loser => {
      let cucumbers = this.getCucumberCount(maxCardNumber);
      
      // Double cucumbers if someone played a 1
      if (hasOne) {
        cucumbers *= 2;
      }
      
      return {
        player: loser.player,
        cucumbers
      };
    });

    return { cucumberAwards, hasOne };
  }

  /**
   * Check if game is over
   */
  static isGameOver(players: Cucumber5Player[]): {
    isOver: boolean;
    losers: number[];
  } {
    const losers = players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.cucumbers >= this.MAX_PICKLES)
      .map(({ index }) => index);

    return {
      isOver: losers.length > 0,
      losers
    };
  }

  /**
   * Get game statistics
   */
  static getGameStats(players: Cucumber5Player[]): {
    totalCucumbers: number;
    averageCucumbers: number;
    closestToLosing: number;
    safestPlayer: number;
  } {
    const totalCucumbers = players.reduce((sum, player) => sum + player.cucumbers, 0);
    const averageCucumbers = totalCucumbers / players.length;
    
    const closestToLosing = Math.max(...players.map(p => p.cucumbers));
    const safestPlayer = Math.min(...players.map(p => p.cucumbers));

    return {
      totalCucumbers,
      averageCucumbers,
      closestToLosing,
      safestPlayer
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Seeded shuffle for reproducible games
   */
  private static seededShuffle<T>(array: T[], seed: number): void {
    let currentSeed = seed;
    
    for (let i = array.length - 1; i > 0; i--) {
      // Simple linear congruential generator
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      const j = Math.floor((currentSeed / 4294967296) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
