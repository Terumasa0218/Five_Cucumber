'use client';


export interface GameTileProps {
  game: {
    id: string;
    name: string;
    description: string;
    icon: string;
    minPlayers: number;
    maxPlayers: number;
    supportsCPU: boolean;
    supportsOnline: boolean;
  };
  playerCount: number;
  onPlay: () => void;
}

export function GameTile({ game, playerCount, onPlay }: GameTileProps) {
  const isPlayable = playerCount >= game.minPlayers && playerCount <= game.maxPlayers;

  return (
    <div className={`game-tile ${!isPlayable ? 'game-tile--disabled' : ''}`}>
      <div className="game-tile__header">
        <div className="game-tile__icon">{game.icon}</div>
        <div className="game-tile__info">
          <h3 className="game-tile__name">{game.name}</h3>
          <p className="game-tile__description">{game.description}</p>
        </div>
      </div>

      <div className="game-tile__details">
        <div className="game-tile__players">
          <span className="game-tile__player-count">
            {game.minPlayers}-{game.maxPlayers}人
          </span>
        </div>

        <div className="game-tile__features">
          {game.supportsCPU && (
            <span className="game-tile__feature game-tile__feature--cpu">
              CPU
            </span>
          )}
          {game.supportsOnline && (
            <span className="game-tile__feature game-tile__feature--online">
              Online
            </span>
          )}
        </div>
      </div>

      <div className="game-tile__actions">
        <button
          className={`btn ${isPlayable ? 'btn--primary' : 'btn--disabled'}`}
          onClick={onPlay}
          disabled={!isPlayable}
        >
          {isPlayable ? 'プレイ' : 'Not available'}
        </button>
      </div>
    </div>
  );
}
