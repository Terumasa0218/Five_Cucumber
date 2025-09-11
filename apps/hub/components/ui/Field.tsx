// 場のカードコンポーネント

import { getCucumberIcons } from '@/lib/game-core/rules';
import { GameState } from '@/lib/game-core/types';

interface FieldProps {
  state: GameState;
  className?: string;
}

export function Field({ state, className = '' }: FieldProps) {
  return (
    <div className={`field-area ${className}`}>
      <div className="field-title">場のカード</div>
      <div className="field-cards" id="fieldCards">
        {state.fieldCard !== null ? (
          <div className="card current-card">
            <div className="card-number">{state.fieldCard}</div>
            <div className="cucumber-icons">{getCucumberIcons(state.fieldCard)}</div>
          </div>
        ) : (
          <div className="card disabled">
            <div className="card-number">?</div>
          </div>
        )}
      </div>
    </div>
  );
}
