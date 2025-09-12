// 楕円卓レイアウト用テーブルコンポーネント

import { useEffect } from 'react';
import { GameConfig, GameState } from '@/lib/game-core/types';
import { layoutSeatsEllipse } from '@/lib/layoutEllipse';

interface EllipseTableProps {
  state: GameState;
  config: GameConfig;
  currentPlayerIndex: number;
  onCardClick?: (card: number) => void;
  className?: string;
}

export function EllipseTable({ state, config, currentPlayerIndex, onCardClick, className = '' }: EllipseTableProps) {
  const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
  const mySeatIndex = 0; // プレイヤーは常に0番

  // 楕円配置の更新
  useEffect(() => {
    const seatsEl = document.getElementById("seats");
    if (!seatsEl) return;

    const update = () => layoutSeatsEllipse(seatsEl, config.players, mySeatIndex);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(seatsEl);
    window.addEventListener("orientationchange", update);
    
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", update);
    };
  }, [config.players, mySeatIndex]);

  return (
    <>
      {/* 内側楕円：場と墓地 */}
      <section id="oval-inner" className="layer-field panel-soft">
        <div id="field" aria-label="場のカード">
          {state.fieldCard !== null ? (
            <div className="card current-card">
              <div className="card-number">{state.fieldCard}</div>
            </div>
          ) : (
            <div className="card disabled">
              <div className="card-number">?</div>
            </div>
          )}
        </div>
        <div id="grave" aria-label="墓地">
          {state.sharedGraveyard.length > 0 && (
            <div className="graveyard-card">
              {state.sharedGraveyard[state.sharedGraveyard.length - 1]}
            </div>
          )}
        </div>
      </section>

      {/* 楕円座席（外枠と内枠の間の帯） */}
      <section id="seats" className={`players-${config.players}`}>
        {state.players.map((player, i) => (
          <div
            key={i}
            className="seat"
            data-active={state.currentPlayer === i}
          >
            <div className="content">
              <div className="player-name">{playerNames[i]}</div>
              <div className="player-stats">
                <div className="cucumber-count">
                  🥒 <span>{player.cucumbers}</span>
                </div>
                <div className="cards-count">
                  🃏 <span>{player.hand.length}</span>
                </div>
              </div>
              {i !== 0 && (
                <div className="player-hand-visual">
                  {player.hand.map((_, cardIndex) => (
                    <div key={cardIndex} className="mini-card" />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* 自分の手札と名前（下辺） */}
      <section id="hand-dock" aria-label="自分の手札">
        <div className="me-name">{playerNames[0]}</div>
        <div className="hand">
          {state.players[0]?.hand.map((card, index) => (
            <div
              key={`${card}-${index}`}
              className="card is-legal"
              onClick={() => onCardClick?.(card)}
            >
              <div className="card-number">{card}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
