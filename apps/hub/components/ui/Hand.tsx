// プレイヤー手札コンポーネント

import { getCucumberIcons, getLegalMoves } from '@/lib/game-core/rules';
import { GameState } from '@/lib/game-core/types';
import { useEffect, useState } from 'react';

interface HandProps {
  state: GameState;
  playerIndex: number;
  onCardClick?: (card: number) => void;
  className?: string;
}

export function Hand({ state, playerIndex, onCardClick, className = '' }: HandProps) {
  const hand = state.players[playerIndex]?.hand || [];
  const legalMoves = getLegalMoves(state, playerIndex);
  const isMyTurn = state.currentPlayer === playerIndex;
  const [locked, setLocked] = useState(false);

  // 手番が進む or 新しいトリック開始でロック解除
  useEffect(() => {
    setLocked(false);
  }, [state.currentPlayer, state.currentTrick]);

  const getCardClassName = (card: number): string => {
    if (!isMyTurn || locked) return 'card is-disabled';
    
    if (legalMoves.includes(card)) {
      if (state.fieldCard === null || card >= state.fieldCard) {
        return 'card is-legal';
      } else {
        return 'card is-legal discard';
      }
    }
    
    return 'card is-disabled';
  };

  const handleCardClick = (card: number) => {
    if (!isMyTurn || locked || !legalMoves.includes(card) || !onCardClick) return;
    
    setLocked(true);
    onCardClick(card);
  };

  return (
    <div className={`player-hand ${locked ? 'is-locked' : ''} ${className}`} id="playerHand">
      {hand.map((card, index) => (
        <div
          key={`${card}-${index}`}
          className={getCardClassName(card)}
          onClick={() => handleCardClick(card)}
        >
          <div className="card-number">{card}</div>
          <div className="cucumber-icons">{getCucumberIcons(card)}</div>
        </div>
      ))}
    </div>
  );
}
