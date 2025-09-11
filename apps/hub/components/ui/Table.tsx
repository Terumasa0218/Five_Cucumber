// ゲームテーブルコンポーネント

import { GameConfig, GameState } from '@/lib/game-core/types';

interface TableProps {
  state: GameState;
  config: GameConfig;
  currentPlayerIndex: number;
  onCardClick?: (card: number) => void;
  className?: string;
}

export function Table({ state, config, currentPlayerIndex, onCardClick, className = '' }: TableProps) {
  const R = 40; // vw基準の半径
  const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];

  return (
    <div className={`seats-container ${className}`}>
      {state.players.map((player, i) => {
        const angle = (2 * Math.PI * i) / config.players - Math.PI / 2; // 上から時計回り
        const x = 50 + R * Math.cos(angle);
        const y = 50 + R * 0.6 * Math.sin(angle); // 楕円

        return (
          <div
            key={i}
            id={`player${i}`}
            className="player-zone"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            <div className={`player-panel ${i === currentPlayerIndex ? 'current-turn' : ''}`}>
              <div className="player-info">
                <div className="player-name">{playerNames[i]}</div>
                <div className="player-stats">
                  <div className="cucumber-count">
                    🥒 <span id={`cucumber${i}`}>{player.cucumbers}</span>
                  </div>
                  <div className="cards-count">
                    🃏 <span id={`cards${i}`}>{player.hand.length}</span>
                  </div>
                </div>
              </div>
              <div className="player-hand-visual" id={`playerHand${i}`}>
                {i !== 0 && player.hand.map((_, cardIndex) => (
                  <div key={cardIndex} className="mini-card" />
                ))}
              </div>
              <div className="player-graveyard" id={`graveyard${i}`}>
                {player.graveyard.length > 0 && (
                  <div className="graveyard-mini-card">
                    {player.graveyard[player.graveyard.length - 1]}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
