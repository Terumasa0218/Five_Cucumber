// プレイヤー手札コンポーネント

import { getCucumberIcons, getLegalMoves } from '@/lib/game-core/rules';
import { GameState } from '@/lib/game-core/types';

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

  const getCardClassName = (card: number): string => {
    if (!isMyTurn) return 'card disabled';
    
    if (legalMoves.includes(card)) {
      if (state.fieldCard === null || card >= state.fieldCard) {
        return 'card playable';
      } else {
        return 'card discard';
      }
    }
    
    return 'card disabled';
  };

  const handleCardClick = (card: number) => {
    if (isMyTurn && legalMoves.includes(card) && onCardClick) {
      onCardClick(card);
    }
  };

  return (
    <div className={`player-hand ${className}`} id="playerHand">
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
