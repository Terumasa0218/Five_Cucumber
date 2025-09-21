// 楕円卓レイアウト用テーブルコンポーネント

import { GameConfig, GameState } from '@/lib/game-core/types';
import { layoutSeatsEllipse } from '@/lib/layoutEllipse';
import { useEffect } from 'react';

interface EllipseTableProps {
  state: GameState;
  config: GameConfig;
  currentPlayerIndex: number;
  onCardClick?: (card: number) => void;
  className?: string;
  showAllHands?: boolean; // デバッグ用：全員の手札を表示
  isSubmitting?: boolean; // 送信中フラグ
  lockedCardId?: number | null; // ロックされたカードID
  names?: string[]; // 座席ごとの表示名（任意）
  mySeatIndex?: number; // 自分の座席インデックス（フレンド対戦用）
}

export function EllipseTable({ state, config, currentPlayerIndex, onCardClick, className = '', showAllHands = false, isSubmitting = false, lockedCardId = null, names, mySeatIndex = 0 }: EllipseTableProps) {
  const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];
  
  // デバッグログ（開発時のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EllipseTable Debug]', {
        currentPlayerIndex,
        stateCurrentPlayer: state.currentPlayer,
        phase: state.phase,
        mySeatIndex,
        isMyTurn: currentPlayerIndex === mySeatIndex
      });
    }
  }, [currentPlayerIndex, state.currentPlayer, state.phase]);
  
  // フレンド対戦の場合は mySeatIndex を基準に自分の表示名を決める
  const getPlayerName = (index: number) => {
    if (names && names[index]) return names[index];
    if (index === mySeatIndex) return 'あなた';
    return playerNames[index] || `プレイヤー${index + 1}`;
  };

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
              <div className="cucumber-icons">
                {state.fieldCard >= 2 && state.fieldCard <= 5 && '🥒'}
                {state.fieldCard >= 6 && state.fieldCard <= 9 && '🥒🥒'}
                {state.fieldCard >= 10 && state.fieldCard <= 11 && '🥒🥒🥒'}
                {state.fieldCard >= 12 && state.fieldCard <= 14 && '🥒🥒🥒🥒'}
                {state.fieldCard === 15 && '🥒🥒🥒🥒🥒'}
              </div>
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
        {state.players.map((player, i) => {
          const isTurn = i === currentPlayerIndex;
          
          return (
            <div
              key={i}
              className={`seat ${isTurn ? 'turn' : ''}`}
              data-active={state.currentPlayer === i}
            >
            <div className="content">
              <div className="player-name">{getPlayerName(i)}</div>
              <div className="player-stats">
                <div className="cucumber-count">
                  🥒 <span>{player.cucumbers}</span>
                </div>
                <div className="cards-count">
                  🃏 <span>{player.hand.length}</span>
                </div>
              </div>
              {i !== mySeatIndex && (
                <div className="player-hand-visual">
                  {showAllHands ? (
                    // デバッグモード：実際のカード値を表示
                    player.hand.map((card, cardIndex) => (
                      <div key={cardIndex} className="debug-card" title={`カード${card}`}>
                        {card}
                      </div>
                    ))
                  ) : (
                    // 通常モード：裏面のカードを表示
                    player.hand.map((_, cardIndex) => (
                      <div key={cardIndex} className="mini-card" />
                    ))
                  )}
                </div>
              )}
            </div>
            </div>
          );
        })}
      </section>

      {/* 自分の手札と名前（下辺） */}
      <section id="hand-dock" aria-label="自分の手札">
        <div className="me-name">{getPlayerName(mySeatIndex)}</div>
        <div className="hand">
          {state.players[mySeatIndex]?.hand.map((card, index) => {
            const isPlayable = state.fieldCard === null || card >= state.fieldCard;
            const isMinCard = card === Math.min(...state.players[mySeatIndex].hand);
            const isDiscard = !isPlayable && isMinCard;
            const isMyTurn = currentPlayerIndex === mySeatIndex;
            
            // カードが送信中またはロックされているかチェック
            const isCardLocked = lockedCardId === card;
            const isAllLocked = isSubmitting || className?.includes('cards-locked');
            const isDisabled = !isMyTurn || isAllLocked || isCardLocked || state.phase !== 'AwaitMove';
            
            const handleCardClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (isDisabled || isSubmitting || !isMyTurn) return;
              onCardClick?.(card);
            };
            
            return (
              <div
                key={`${card}-${index}`}
                className={`card ${
                  isCardLocked ? 'disabled locked' :
                  isDisabled ? 'disabled' :
                  isPlayable ? 'playable' : 
                  isDiscard ? 'discard' : 'disabled'
                }`}
                onClick={handleCardClick}
                onPointerDown={handleCardClick}
                style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
                aria-disabled={isDisabled}
              >
                <div className="card-number">{card}</div>
                <div className="cucumber-icons">
                  {card >= 2 && card <= 5 && '🥒'}
                  {card >= 6 && card <= 9 && '🥒🥒'}
                  {card >= 10 && card <= 11 && '🥒🥒🥒'}
                  {card >= 12 && card <= 14 && '🥒🥒🥒🥒'}
                  {card === 15 && '🥒🥒🥒🥒🥒'}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
