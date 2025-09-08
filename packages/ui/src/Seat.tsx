import React from 'react';
import './theme.css';

export interface SeatProps {
  player: {
    id: string;
    name: string;
    isCPU?: boolean;
    isOnline?: boolean;
    avatar?: string;
  };
  position: {
    x: number;
    y: number;
    angle: number;
  };
  isActive?: boolean;
  isCurrentTurn?: boolean;
  stats?: {
    cucumbers?: number;
    cards?: number;
  };
  children?: React.ReactNode;
  className?: string;
}

export const Seat: React.FC<SeatProps> = ({
  player,
  position,
  isActive = false,
  isCurrentTurn = false,
  stats,
  children,
  className = ''
}) => {
  const seatStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: `rotate(${position.angle}deg)`,
    transformOrigin: 'center',
  };

  const contentStyle: React.CSSProperties = {
    transform: `rotate(${-position.angle}deg)`,
    transformOrigin: 'center',
  };

  return (
    <div 
      className={`seat ${className}`}
      style={seatStyle}
    >
      <div 
        className={`seat__content ${isCurrentTurn ? 'seat__content--active' : ''}`}
        style={contentStyle}
      >
        <div className="seat__panel">
          <div className="seat__info">
            <div className="seat__name">
              {player.name}
              {player.isCPU && <span className="seat__badge">CPU</span>}
              {!player.isOnline && <span className="seat__badge seat__badge--offline">離席</span>}
            </div>
            {stats && (
              <div className="seat__stats">
                {stats.cucumbers !== undefined && (
                  <div className="seat__stat">
                    🥒 {stats.cucumbers}
                  </div>
                )}
                {stats.cards !== undefined && (
                  <div className="seat__stat">
                    🃏 {stats.cards}
                  </div>
                )}
              </div>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

// CSS for seat styling
const seatStyles = `
.seat__content {
  transition: all 0.3s ease;
}

.seat__content--active {
  animation: glow-pulse 2s infinite alternate;
}

.seat__panel {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
  transition: all 0.4s ease;
  min-width: 200px;
}

.seat__content--active .seat__panel {
  border: 4px solid var(--card-yellow);
  box-shadow: 
    0 0 30px rgba(255, 190, 59, 0.8),
    0 6px 25px rgba(0, 0, 0, 0.4);
  background: linear-gradient(135deg, rgba(255, 190, 59, 0.25), rgba(255, 190, 59, 0.12));
}

.seat__info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.seat__name {
  color: var(--text-light);
  font-weight: bold;
  font-size: 1.1em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 8px;
}

.seat__badge {
  background: var(--card-blue);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7em;
  font-weight: normal;
}

.seat__badge--offline {
  background: var(--card-red);
}

.seat__stats {
  display: flex;
  gap: 12px;
  font-size: 0.9em;
}

.seat__stat {
  color: var(--card-red);
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
}

@keyframes glow-pulse {
  0% { 
    box-shadow: 0 0 30px rgba(255, 190, 59, 0.8), 0 6px 25px rgba(0, 0, 0, 0.4); 
  }
  100% { 
    box-shadow: 0 0 40px rgba(255, 190, 59, 1), 0 8px 30px rgba(0, 0, 0, 0.4); 
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = seatStyles;
  document.head.appendChild(styleSheet);
}
