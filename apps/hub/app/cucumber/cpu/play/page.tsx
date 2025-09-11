'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import './game.css';

interface GameConfig {
  players: number;
  turnSeconds: number | null;
  maxCucumbers: number;
  initialCards: number;
  cpuLevel: 'easy' | 'normal' | 'hard';
}

class CucumberGame {
  private config: GameConfig;
  private players: number;
  private maxPickles: number;
  private initialCards: number;
  private turnSeconds: number | null;
  private cpuLevel: 'easy' | 'normal' | 'hard';
  private currentRound: number;
  private currentTrick: number;
  private currentPlayer: number;
  private turnDeadline: number;
  private timer: NodeJS.Timeout | null;
  private timerStopped: boolean;
  
  private playerHands: number[][];
  private playerCucumbers: number[];
  private playerGraveyards: number[][];
  private fieldCard: number | null;
  private sharedGraveyard: number[];
  private trickCards: { player: number; card: number }[];
  private firstPlayer: number;
  
  private onUpdate: () => void;
  private onGameOver: (losers: { player: number; count: number }[]) => void;

  constructor(config: GameConfig, onUpdate: () => void, onGameOver: (losers: { player: number; count: number }[]) => void) {
    this.config = config;
    this.players = config.players;
    this.maxPickles = config.maxCucumbers;
    this.initialCards = config.initialCards;
    this.turnSeconds = config.turnSeconds;
    this.cpuLevel = config.cpuLevel;
    this.currentRound = 1;
    this.currentTrick = 1;
    this.currentPlayer = 0;
    this.turnDeadline = 0;
    this.timer = null;
    this.timerStopped = false;
    
    this.playerHands = Array(this.players).fill().map(() => []);
    this.playerCucumbers = Array(this.players).fill(0);
    this.playerGraveyards = Array(this.players).fill().map(() => []);
    this.fieldCard = null;
    this.sharedGraveyard = [];
    this.trickCards = [];
    this.firstPlayer = 0;
    
    this.onUpdate = onUpdate;
    this.onGameOver = onGameOver;
    
    this.initGame();
  }

  private initGame() {
    console.log('ゲーム初期化開始');
    try {
      this.createSeats();
      this.dealCards();
      this.firstPlayer = Math.floor(Math.random() * this.players);
      this.currentPlayer = this.firstPlayer;
      console.log('最初のプレイヤー:', this.currentPlayer);
      this.updateDisplay();
      this.startTimer();
      console.log('ゲーム初期化完了');
    } catch (error) {
      console.error('ゲーム初期化エラー:', error);
    }
  }

  private createSeats() {
    const seatsContainer = document.getElementById('seats');
    if (!seatsContainer) return;
    
    seatsContainer.innerHTML = '';
    
    const R = 40; // vw基準の半径
    const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
    
    for (let i = 0; i < this.players; i++) {
      const seat = document.createElement('div');
      seat.className = 'player-zone';
      seat.id = `player${i}`;
      
      const angle = (2 * Math.PI * i) / this.players - Math.PI / 2; // 上から時計回り
      const x = 50 + R * Math.cos(angle);
      const y = 50 + R * 0.6 * Math.sin(angle); // 楕円
      
      seat.style.left = `${x}%`;
      seat.style.top = `${y}%`;
      
      seat.innerHTML = `
        <div class="player-panel">
          <div class="player-info">
            <div class="player-name">${playerNames[i]}</div>
            <div class="player-stats">
              <div class="cucumber-count">🥒 <span id="cucumber${i}">0</span></div>
              <div class="cards-count">🃏 <span id="cards${i}">${this.initialCards}</span></div>
            </div>
          </div>
          <div class="player-hand-visual" id="playerHand${i}"></div>
          <div class="player-graveyard" id="graveyard${i}"></div>
        </div>
      `;
      
      seatsContainer.appendChild(seat);
    }
  }

  private dealCards() {
    console.log('カード配布開始');
    const deck = [];
    for (let num = 1; num <= 15; num++) {
      for (let i = 0; i < 4; i++) {
        deck.push(num);
      }
    }
    
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    for (let player = 0; player < this.players; player++) {
      this.playerHands[player] = [];
      for (let card = 0; card < this.initialCards; card++) {
        this.playerHands[player].push(deck.pop()!);
      }
      this.playerHands[player].sort((a, b) => a - b);
    }
    
    console.log('プレイヤー手札:', this.playerHands);
  }

  private getCucumberCount(cardNumber: number): number {
    if (cardNumber >= 2 && cardNumber <= 5) return 1;
    if (cardNumber >= 6 && cardNumber <= 9) return 2;
    if (cardNumber >= 10 && cardNumber <= 11) return 3;
    if (cardNumber >= 12 && cardNumber <= 14) return 4;
    if (cardNumber === 15) return 5;
    return 0;
  }

  private getCucumberIcons(cardNumber: number): string {
    const count = this.getCucumberCount(cardNumber);
    return '🥒'.repeat(count);
  }

  private updateDisplay() {
    console.log('画面更新開始');
    try {
      const roundInfo = document.getElementById('roundInfo');
      if (roundInfo) {
        roundInfo.innerHTML = `第${this.currentRound}回戦<br><nobr>第${this.currentTrick}ラウンド</nobr>`;
      }
      
      for (let i = 0; i < this.players; i++) {
        const cucumberElement = document.getElementById(`cucumber${i}`);
        const cardsElement = document.getElementById(`cards${i}`);
        
        if (cucumberElement) cucumberElement.textContent = this.playerCucumbers[i].toString();
        if (cardsElement) cardsElement.textContent = this.playerHands[i].length.toString();
        
        const playerElement = document.getElementById(`player${i}`);
        if (playerElement) {
          if (i === this.currentPlayer) {
            playerElement.classList.add('current-turn');
          } else {
            playerElement.classList.remove('current-turn');
          }
        }

        const graveyardElement = document.getElementById(`graveyard${i}`);
        if (graveyardElement) {
          graveyardElement.innerHTML = '';
          const last = this.playerGraveyards[i].at(-1);
          if (last) {
            const cardElement = document.createElement('div');
            cardElement.className = 'graveyard-mini-card';
            cardElement.textContent = last.toString();
            graveyardElement.appendChild(cardElement);
          }
        }

        if (i !== 0) {
          const playerHandElement = document.getElementById(`playerHand${i}`);
          if (playerHandElement) {
            playerHandElement.innerHTML = '';
            for (let j = 0; j < this.playerHands[i].length; j++) {
              const cardElement = document.createElement('div');
              cardElement.className = 'mini-card';
              playerHandElement.appendChild(cardElement);
            }
          }
        }
      }

      this.updateFieldCard();
      this.updateGraveyard();
      this.updatePlayerHand();
      console.log('画面更新完了');
    } catch (error) {
      console.error('画面更新エラー:', error);
    }
  }

  private updateFieldCard() {
    const fieldCards = document.getElementById('fieldCards');
    if (fieldCards) {
      if (this.fieldCard !== null) {
        fieldCards.innerHTML = `
          <div class="card current-card">
            <div class="card-number">${this.fieldCard}</div>
            <div class="cucumber-icons">${this.getCucumberIcons(this.fieldCard)}</div>
          </div>
        `;
      } else {
        fieldCards.innerHTML = `
          <div class="card disabled">
            <div class="card-number">?</div>
          </div>
        `;
      }
    }
  }

  private updateGraveyard() {
    const graveyardCards = document.getElementById('graveyardCards');
    if (graveyardCards) {
      graveyardCards.innerHTML = '';
      const last = this.sharedGraveyard.at(-1);
      if (last) {
        const cardElement = document.createElement('div');
        cardElement.className = 'graveyard-card';
        cardElement.textContent = last.toString();
        graveyardCards.appendChild(cardElement);
      }
    }
  }

  private updatePlayerHand() {
    console.log('プレイヤー手札更新開始');
    const playerHand = document.getElementById('playerHand');
    if (!playerHand) {
      console.error('playerHand要素が見つかりません');
      return;
    }
    
    playerHand.innerHTML = '';
    
    const hand = this.playerHands[0];
    console.log('プレイヤー0の手札:', hand);
    
    if (hand.length === 0) {
      console.log('手札が空です');
      return;
    }
    
    const minCard = Math.min(...hand);
    console.log('最小カード:', minCard);
    
    const fragment = document.createDocumentFragment();
    
    hand.forEach((card, index) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'card';
      cardElement.innerHTML = `
        <div class="card-number">${card}</div>
        <div class="cucumber-icons">${this.getCucumberIcons(card)}</div>
      `;
      
      if (this.currentPlayer === 0) {
        if (this.fieldCard === null || card >= this.fieldCard) {
          cardElement.classList.add('playable');
        } else if (card === minCard) {
          cardElement.classList.add('discard');
        } else {
          cardElement.classList.add('disabled');
        }
        
        cardElement.addEventListener('click', () => {
          console.log('カードクリック:', card);
          this.playCard(0, card);
        });
      } else {
        cardElement.classList.add('disabled');
      }

      fragment.appendChild(cardElement);
    });
    
    playerHand.appendChild(fragment);
    console.log('プレイヤー手札更新完了。カード数:', hand.length);
  }

  private canPlayCard(player: number, card: number): boolean {
    const hand = this.playerHands[player];
    const minCard = Math.min(...hand);

    if (this.fieldCard === null || card >= this.fieldCard) {
      return true;
    }
    
    return card === minCard;
  }

  public playCard(player: number, card: number) {
    if (player !== this.currentPlayer) return;
    if (this.currentPlayer === 0 && !this.canPlayCard(player, card)) return;

    const hand = this.playerHands[player];
    const cardIndex = hand.indexOf(card);
    if (cardIndex === -1) return;

    hand.splice(cardIndex, 1);
    this.trickCards.push({ player, card });

    if (this.fieldCard === null || card >= this.fieldCard) {
      this.animateCardToField(player, card, () => {
        this.fieldCard = card;
        this.updateDisplay();
        setTimeout(() => {
          this.nextPlayer();
        }, 2000);
      });
    } else {
      this.animateCardToGraveyard(player, card, () => {
        this.playerGraveyards[player].push(card);
        this.sharedGraveyard.push(card);
        this.updateDisplay();
        setTimeout(() => {
          this.nextPlayer();
        }, 2000);
      });
    }
  }

  private nextPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.players;
    
    if (this.currentPlayer === this.firstPlayer) {
      this.endTrick();
    } else {
      this.updateDisplay();
      this.resetTimer();
      
      if (this.currentPlayer !== 0) {
        setTimeout(() => this.cpuPlay(), 1000);
      }
    }
  }

  private cpuPlay() {
    if (this.currentPlayer === 0) return;

    const hand = this.playerHands[this.currentPlayer];
    if (hand.length === 0) return;

    let playableCards: number[] = [];
    const minCard = Math.min(...hand);

    if (this.fieldCard === null) {
      playableCards = [...hand];
    } else {
      playableCards = hand.filter(card => card >= this.fieldCard!);
    }

    let selectedCard: number;
    switch (this.cpuLevel) {
      case "easy":
        if (playableCards.length > 0) {
          selectedCard = playableCards[Math.floor(Math.random() * playableCards.length)];
        } else {
          selectedCard = minCard;
        }
        break;
      case "normal":
        if (playableCards.length > 0) {
          // 中庸値を優先（高すぎず低すぎない）
          const sorted = playableCards.sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          selectedCard = sorted[mid];
        } else {
          selectedCard = minCard;
        }
        break;
      case "hard":
        if (playableCards.length > 0) {
          // 最後のトリックに高値が残らないよう管理
          const remainingCards = this.playerHands.flat();
          const highCards = remainingCards.filter(c => c >= 12);
          if (highCards.length <= 2 && playableCards.some(c => c >= 12)) {
            selectedCard = Math.min(...playableCards.filter(c => c >= 12));
          } else {
            selectedCard = playableCards[Math.floor(Math.random() * playableCards.length)];
          }
        } else {
          selectedCard = minCard;
        }
        break;
      default:
        selectedCard = minCard;
    }

    this.playCard(this.currentPlayer, selectedCard);
  }

  private endTrick() {
    if (this.playerHands.some(hand => hand.length === 0)) {
      setTimeout(() => {
        this.finalRound();
      }, 1500);
    } else {
      let maxCard = Math.max(...this.trickCards.map(tc => tc.card));
      
      let maxCardPlayers = this.trickCards.filter(tc => tc.card === maxCard);
      
      let winner: number;
      if (maxCardPlayers.length > 1) {
        winner = maxCardPlayers[maxCardPlayers.length - 1].player;
        console.log(`複数人が最大カード${maxCard}を出しました。最後に出したプレイヤー${winner}が勝利`);
      } else {
        winner = maxCardPlayers[0].player;
        console.log(`プレイヤー${winner}が最大カード${maxCard}で勝利`);
      }
      
      this.firstPlayer = winner;
      this.currentPlayer = winner;
      this.currentTrick++;
      this.fieldCard = null;
      this.trickCards = [];
      
      setTimeout(() => {
        this.updateDisplay();
        this.resetTimer();
        
        if (this.currentPlayer !== 0) {
          setTimeout(() => this.cpuPlay(), 1000);
        }
      }, 1500);
    }
  }

  private showCucumberResult(messages: string[], callback: () => void) {
    this.stopTimer();
    
    const cucumberResult = document.createElement('div');
    cucumberResult.className = 'trick-result';
    cucumberResult.innerHTML = `
      <div class="trick-result-title">🥒 きゅうり獲得 🥒</div>
      <div style="font-size: 1.2em; margin: 20px 0;">
        ${messages.map(msg => `<div style="margin: 10px 0; color: #f7465f; font-weight: bold;">${msg}</div>`).join('')}
      </div>
    `;
    
    document.body.appendChild(cucumberResult);
    
    setTimeout(() => {
      document.body.removeChild(cucumberResult);
      callback();
    }, 3000);
  }

  private finalRound() {
    const finalCards = this.trickCards.map(tc => tc.card);
    const maxCard = Math.max(...finalCards);
    const hasOne = finalCards.includes(1);
    
    if (finalCards.every(card => card === 1)) {
      this.nextRound();
      return;
    }

    // 最大カードを出したプレイヤーの中で、最後に出した人が勝者
    const winners = this.trickCards.filter(tc => tc.card === maxCard);
    const winner = winners[winners.length - 1].player;
    
    const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
    let cucumbers = this.getCucumberCount(maxCard);
    if (hasOne) cucumbers *= 2;
    
    this.playerCucumbers[winner] += cucumbers;
    const cucumberMessages = [`${playerNames[winner]} きゅうり${cucumbers}本獲得`];

    this.showCucumberResult(cucumberMessages, () => {
      const gameOverPlayers = this.playerCucumbers
        .map((count, index) => ({ player: index, count }))
        .filter(p => p.count >= this.maxPickles);

      if (gameOverPlayers.length > 0) {
        this.onGameOver(gameOverPlayers);
      } else {
        this.nextRound();
      }
    });
  }

  private nextRound() {
    this.currentRound++;
    this.currentTrick = 1;
    this.fieldCard = null;
    this.sharedGraveyard = [];
    this.playerGraveyards = Array(this.players).fill().map(() => []);
    this.trickCards = [];
    
    this.dealCards();
    this.firstPlayer = Math.floor(Math.random() * this.players);
    this.currentPlayer = this.firstPlayer;
    
    this.updateDisplay();
    this.resetTimer();
    
    if (this.currentPlayer !== 0) {
      setTimeout(() => this.cpuPlay(), 1500);
    }
  }

  private startTimer() {
    if (this.turnSeconds === null) return; // 無制限の場合はタイマーなし
    
    this.turnDeadline = performance.now() + this.turnSeconds * 1000;
    this.timerStopped = false;
    this.updateTimer();
    this.timer = setInterval(() => {
      if (this.timerStopped) return;
      
      const leftMs = this.turnDeadline - performance.now();
      const s = Math.max(0, Math.ceil(leftMs / 1000));
      this.updateTimer(s);
      
      if (s <= 0) {
        this.stopTimer();
        if (this.currentPlayer === 0) {
          this.autoPlayCard();
        } else {
          this.cpuPlay();
        }
      }
    }, 200);
  }

  private resetTimer() {
    this.stopTimer();
    this.startTimer();
  }

  private stopTimer() {
    this.timerStopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private updateTimer(timeLeft: number | null = null) {
    const timerElement = document.getElementById('timeLeft');
    const timerDisplay = document.getElementById('timerDisplay');
    
    if (this.turnSeconds === null) {
      if (timerElement) timerElement.textContent = '∞';
      if (timerDisplay) timerDisplay.classList.remove('warning');
      return;
    }
    
    if (timeLeft === null) {
      const leftMs = this.turnDeadline - performance.now();
      timeLeft = Math.max(0, Math.ceil(leftMs / 1000));
    }
    
    if (timerElement) {
      if (timeLeft <= 0) {
        timerElement.textContent = '0';
        if (timerDisplay) timerDisplay.classList.add('warning');
      } else {
        timerElement.textContent = timeLeft.toString();
        if (timerDisplay) {
          if (timeLeft <= 5) {
            timerDisplay.classList.add('warning');
          } else {
            timerDisplay.classList.remove('warning');
          }
        }
      }
    }
  }

  private autoPlayCard() {
    if (this.currentPlayer !== 0) return;
    
    const hand = this.playerHands[0];
    if (hand.length === 0) return;

    let playableCards: number[] = [];
    const minCard = Math.min(...hand);

    if (this.fieldCard === null) {
      playableCards = [...hand];
    } else {
      playableCards = hand.filter(card => card >= this.fieldCard!);
    }

    let selectedCard: number;
    if (playableCards.length > 0) {
      selectedCard = playableCards[0];
    } else {
      selectedCard = minCard;
    }

    this.playCard(0, selectedCard);
  }

  private animateCardToGraveyard(player: number, card: number, callback: () => void) {
    const graveyardArea = document.querySelector('.graveyard-area');
    
    if (!graveyardArea) {
      console.error('Graveyard area not found');
      callback();
      return;
    }

    const graveyardRect = graveyardArea.getBoundingClientRect();
    let startX: number, startY: number;

    if (player === 0) {
      const handCards = document.querySelectorAll('#playerHand .card');
      let cardElement: Element | null = null;
      
      handCards.forEach(cardEl => {
        const cardNumber = parseInt(cardEl.querySelector('.card-number')?.textContent || '0');
        if (cardNumber === card) {
          cardElement = cardEl;
        }
      });

      if (cardElement) {
        const cardRect = cardElement.getBoundingClientRect();
        startX = cardRect.left;
        startY = cardRect.top;
      } else {
        const playerHandArea = document.getElementById('playerHand');
        const handRect = playerHandArea?.getBoundingClientRect();
        if (handRect) {
          startX = handRect.left + handRect.width / 2 - 32.5;
          startY = handRect.top + handRect.height / 2 - 45;
        } else {
          startX = graveyardRect.left + graveyardRect.width / 2 - 32.5;
          startY = graveyardRect.top + graveyardRect.height / 2 - 45;
        }
      }
    } else {
      const playerElement = document.getElementById(`player${player}`);
      if (playerElement) {
        const playerRect = playerElement.getBoundingClientRect();
        startX = playerRect.left + playerRect.width / 2 - 32.5;
        startY = playerRect.top + playerRect.height / 2 - 45;
      } else {
        startX = graveyardRect.left + graveyardRect.width / 2 - 32.5;
        startY = graveyardRect.top + graveyardRect.height / 2 - 45;
      }
    }

    const endX = graveyardRect.left + graveyardRect.width / 2 - 32.5;
    const endY = graveyardRect.top + graveyardRect.height / 2 - 45;

    const animCard = document.createElement('div');
    animCard.className = 'card card-animation';
    animCard.innerHTML = `
      <div class="card-number">${card}</div>
      <div class="cucumber-icons">${this.getCucumberIcons(card)}</div>
    `;

    animCard.style.position = 'fixed';
    animCard.style.left = startX + 'px';
    animCard.style.top = startY + 'px';
    animCard.style.width = '65px';
    animCard.style.height = '90px';
    animCard.style.zIndex = '1000';
    animCard.style.pointerEvents = 'none';
    animCard.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    animCard.style.background = 'linear-gradient(135deg, #f7465f, #e03d4f)';
    animCard.style.color = 'white';
    animCard.style.border = '2px solid rgba(255, 255, 255, 0.4)';

    document.body.appendChild(animCard);

    requestAnimationFrame(() => {
      animCard.style.left = endX + 'px';
      animCard.style.top = endY + 'px';
      animCard.style.transform = 'scale(0.8)';
      animCard.style.boxShadow = '0 15px 40px rgba(247, 70, 95, 0.6)';
    });

    setTimeout(() => {
      if (document.body.contains(animCard)) {
        document.body.removeChild(animCard);
      }
      callback();
    }, 800);
  }

  private animateCardToField(player: number, card: number, callback: () => void) {
    const fieldArea = document.querySelector('.field-area');
    
    if (!fieldArea) {
      console.error('Field area not found');
      callback();
      return;
    }

    const fieldRect = fieldArea.getBoundingClientRect();
    let startX: number, startY: number;

    if (player === 0) {
      const handCards = document.querySelectorAll('#playerHand .card');
      let cardElement: Element | null = null;
      
      handCards.forEach(cardEl => {
        const cardNumber = parseInt(cardEl.querySelector('.card-number')?.textContent || '0');
        if (cardNumber === card) {
          cardElement = cardEl;
        }
      });

      if (cardElement) {
        const cardRect = cardElement.getBoundingClientRect();
        startX = cardRect.left;
        startY = cardRect.top;
      } else {
        const playerHandArea = document.getElementById('playerHand');
        const handRect = playerHandArea?.getBoundingClientRect();
        if (handRect) {
          startX = handRect.left + handRect.width / 2 - 32.5;
          startY = handRect.top + handRect.height / 2 - 45;
        } else {
          startX = fieldRect.left + fieldRect.width / 2 - 32.5;
          startY = fieldRect.top + fieldRect.height / 2 - 45;
        }
      }
    } else {
      const playerElement = document.getElementById(`player${player}`);
      if (playerElement) {
        const playerRect = playerElement.getBoundingClientRect();
        startX = playerRect.left + playerRect.width / 2 - 32.5;
        startY = playerRect.top + playerRect.height / 2 - 45;
      } else {
        startX = fieldRect.left + fieldRect.width / 2 - 32.5;
        startY = fieldRect.top + fieldRect.height / 2 - 45;
      }
    }

    const endX = fieldRect.left + fieldRect.width / 2 - 32.5;
    const endY = fieldRect.top + fieldRect.height / 2 - 45;

    const animCard = document.createElement('div');
    animCard.className = 'card card-animation';
    animCard.innerHTML = `
      <div class="card-number">${card}</div>
      <div class="cucumber-icons">${this.getCucumberIcons(card)}</div>
    `;

    animCard.style.position = 'fixed';
    animCard.style.left = startX + 'px';
    animCard.style.top = startY + 'px';
    animCard.style.width = '65px';
    animCard.style.height = '90px';
    animCard.style.zIndex = '1000';
    animCard.style.pointerEvents = 'none';
    animCard.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    if (this.fieldCard === null || card >= this.fieldCard) {
      animCard.style.background = 'linear-gradient(135deg, #3199ff, #2a7dd1)';
      animCard.style.color = 'white';
      animCard.style.border = '3px solid #ffbe3b';
    } else {
      animCard.style.background = 'linear-gradient(135deg, #f7465f, #e03d4f)';
      animCard.style.color = 'white';
      animCard.style.border = '2px solid rgba(255, 255, 255, 0.4)';
    }

    document.body.appendChild(animCard);

    requestAnimationFrame(() => {
      animCard.style.left = endX + 'px';
      animCard.style.top = endY + 'px';
      animCard.style.transform = 'scale(1.1)';
      animCard.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.4)';
    });

    setTimeout(() => {
      if (document.body.contains(animCard)) {
        document.body.removeChild(animCard);
      }
      callback();
    }, 800);
  }

  public destroy() {
    this.stopTimer();
  }
}

export default function CpuPlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameRef = useRef<CucumberGame | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState<{ player: number; count: number }[]>([]);

  useEffect(() => {
    document.title = 'CPU対戦 | Five Cucumber';
    
    // URLパラメータから設定を取得
    const config: GameConfig = {
      players: parseInt(searchParams.get('players') || '4'),
      turnSeconds: parseInt(searchParams.get('turnSeconds') || '15') || null,
      maxCucumbers: parseInt(searchParams.get('maxCucumbers') || '6'),
      initialCards: 7,
      cpuLevel: (searchParams.get('cpuLevel') as 'easy' | 'normal' | 'hard') || 'normal'
    };

    console.log('ゲーム設定:', config);

    const handleUpdate = () => {
      // 必要に応じて追加の更新処理
    };

    const handleGameOver = (losers: { player: number; count: number }[]) => {
      setGameOverData(losers);
      setGameOver(true);
    };

    gameRef.current = new CucumberGame(config, handleUpdate, handleGameOver);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
      }
    };
  }, [searchParams]);

  const handleRestart = () => {
    setGameOver(false);
    setGameOverData([]);
    router.push('/cucumber/cpu/settings');
  };

  const handleBackToHome = () => {
    router.push('/home');
  };

  return (
    <div className="game-root">
      <div className="game-container">
        <div className="hud-left">
          <div className="round-indicator" id="roundInfo">ROUND 1/1</div>
          <div className="timer-display" id="timerDisplay">
            TIME <span id="timeLeft">15</span>
          </div>
        </div>
        
        <div className="hud-center">
          <div className="game-title">🥒 ５本のきゅうり 🥒</div>
        </div>
        
        <div className="hud-right">
          <button
            onClick={handleBackToHome}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ホーム
          </button>
        </div>

        <div id="seats" className="seats-container"></div>

        <div className="center-area">
          <div className="field-area">
            <div className="field-title">場のカード</div>
            <div className="field-cards" id="fieldCards">
              <div className="card disabled">
                <div className="card-number">?</div>
              </div>
            </div>
          </div>

          <div className="graveyard-area">
            <div className="graveyard-title">墓地</div>
            <div className="graveyard-cards" id="graveyardCards"></div>
          </div>
        </div>

        <div className="player-hand" id="playerHand"></div>
      </div>

      {gameOver && (
        <div className="game-over">
          <div className="game-over-content">
            <div className="game-over-title">
              {gameOverData.map(l => ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'][l.player]).join('、')} お漬物！！
            </div>
            <div>
              <p>ゲーム終了です</p>
              <p>最終結果:</p>
              {gameOverData.map((l, i) => (
                <p key={i}>
                  {['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'][l.player]}: {l.count}本
                </p>
              ))}
            </div>
            <button className="restart-btn" onClick={handleRestart}>
              もう一度プレイ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
