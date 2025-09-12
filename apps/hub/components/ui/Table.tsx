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
  const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
  
  // プレイヤー数に応じて半径を調整
  const Rvw = Math.max(28, 44 - config.players * 3); // 2..6人で 38→26 くらいに

  return (
    <div className={`seats-container players-${config.players} ${className}`}>
      {state.players.map((player, i) => {
        const baseAngle = -Math.PI / 2; // 12時開始
        const angle = baseAngle + (2 * Math.PI * i) / config.players;
        const x = 50 + Rvw * Math.cos(angle);
        const y = 50 + Rvw * 0.62 * Math.sin(angle); // 楕円

        return (
          <div
            key={i}
            id={`player${i}`}
            className="player-zone"
            data-active={state.currentPlayer === i}
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            <div className={`player-panel ${i === currentPlayerIndex ? 'current-turn' : ''}`}>
              <div className="turn-badge" hidden={state.currentPlayer !== i}>
                {i === 0 ? 'あなたの番' : `${playerNames[i]}の番`}
              </div>
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
