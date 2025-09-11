// 墓地コンポーネント

import { GameState } from '@/lib/game-core/types';

interface GraveyardProps {
  state: GameState;
  className?: string;
}

export function Graveyard({ state, className = '' }: GraveyardProps) {
  const lastCard = state.sharedGraveyard[state.sharedGraveyard.length - 1];

  return (
    <div className={`graveyard-area ${className}`}>
      <div className="graveyard-title">墓地</div>
      <div className="graveyard-cards" id="graveyardCards">
        {lastCard && (
          <div className="graveyard-card">
            {lastCard}
          </div>
        )}
      </div>
    </div>
  );
}
