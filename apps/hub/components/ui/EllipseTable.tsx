// 楕円卓レイアウト用テーブルコンポーネント

import { GameConfig, GameState, Move } from '@/lib/game-core/types';
import { layoutSeatsEllipse } from '@/lib/layoutEllipse';
import { CSSProperties, useEffect } from 'react';

interface EllipseTableProps {
  state: GameState;
  config: GameConfig;
  currentPlayerIndex: number | null;
  onCardClick?: (card: number) => void;
  className?: string;
  showAllHands?: boolean; // デバッグ用：全員の手札を表示
  isSubmitting?: boolean; // 送信中フラグ
  lockedCardId?: number | null; // ロックされたカードID
  names?: string[]; // 座席ごとの表示名（任意）
  mySeatIndex?: number; // 自分の座席インデックス（フレンド対戦用）
  trickCards?: Move[];
  latestPlayedCardKey?: string | null;
  trickWinner?: number | null;
  trickWinnerText?: string | null;
  isFinalTrickMode?: boolean;
  showdownMode?: boolean;
  finalTrickSelectedPlayers?: number[];
  finalTrickOpenedPlayers?: number[];
  finalTrickStatusText?: string | null;
}

export function EllipseTable({
  state,
  config,
  currentPlayerIndex,
  onCardClick,
  className = '',
  showAllHands = false,
  isSubmitting = false,
  lockedCardId = null,
  names,
  mySeatIndex = 0,
  trickCards = [],
  latestPlayedCardKey = null,
  trickWinner = null,
  trickWinnerText = null,
  isFinalTrickMode = false,
  showdownMode = false,
  finalTrickSelectedPlayers = [],
  finalTrickOpenedPlayers = [],
  finalTrickStatusText = null,
}: EllipseTableProps) {
  const playerNames = ['あなた', 'CPU-A', 'CPU-B', 'CPU-C', 'CPU-D', 'CPU-E'];

  // デバッグログ（開発時のみ）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EllipseTable Debug]', {
        currentPlayerIndex,
        stateCurrentPlayer: state.currentPlayer,
        phase: state.phase,
        mySeatIndex,
        isMyTurn: currentPlayerIndex === mySeatIndex,
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
    const seatsEl = document.getElementById('seats');
    if (!seatsEl) return;

    const update = () => layoutSeatsEllipse(seatsEl, config.players, mySeatIndex);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(seatsEl);
    window.addEventListener('orientationchange', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, [config.players, mySeatIndex]);

  const rootClassName = ['ellipse-table', 'layer-field', className].filter(Boolean).join(' ');
  const visibleTrickCards = trickCards.filter(move => !move.isDiscard);
  const lastPlayedTrickCard = visibleTrickCards[visibleTrickCards.length - 1] ?? null;
  const showdownCards = visibleTrickCards.map(trickCard => ({
    ...trickCard,
    playerName: getPlayerName(trickCard.player),
  }));

  return (
    <div className={rootClassName}>
      <div className="ellipse-table-inner">
        {/* 中央の場と墓地 */}
        <div className="ellipse-table__center">
          <div id="field" className="ellipse-table__field" aria-label="場のカード">
            {showdownMode && showdownCards.length > 0 ? (
              <div className="showdown-cards-row" aria-live="polite">
                {showdownCards.map((showdownCard, index) => (
                  <div key={`${showdownCard.player}-${showdownCard.timestamp}-${index}`} className="showdown-card-item">
                    <div className="card game-card current-card showdown-card">
                      <div className="card-number">{showdownCard.card}</div>
                      <div className="cucumber-icons">
                        {showdownCard.card >= 2 && showdownCard.card <= 5 && '🥒'}
                        {showdownCard.card >= 6 && showdownCard.card <= 9 && '🥒🥒'}
                        {showdownCard.card >= 10 && showdownCard.card <= 11 && '🥒🥒🥒'}
                        {showdownCard.card >= 12 && showdownCard.card <= 14 && '🥒🥒🥒🥒'}
                        {showdownCard.card === 15 && '🥒🥒🥒🥒🥒'}
                      </div>
                    </div>
                    <div className="showdown-player-name">{showdownCard.playerName}</div>
                  </div>
                ))}
              </div>
            ) : visibleTrickCards.length > 0 ? (
              <div className="trick-cards-queue" aria-live="polite">
                {visibleTrickCards.map((trickCard, index) => {
                  const cardKey = `${trickCard.player}-${trickCard.timestamp}`;
                  const isLatestPlayed = latestPlayedCardKey === cardKey;
                  const isWinnerCard = trickWinner !== null && trickCard.player === trickWinner;
                  const seed = trickCard.card * 7 + index * 13;
                  const rotate = (seed % 11) - 5;
                  const offsetX = (seed % 21) - 10;
                  const offsetY = ((seed * 3) % 15) - 7;

                  return (
                    <div
                      key={cardKey}
                      className={[
                        'trick-card-entry',
                        isLatestPlayed ? 'card-play-to-center' : '',
                        isWinnerCard ? 'winner' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        {
                          '--offset-x': `${offsetX}px`,
                          '--offset-y': `${offsetY}px`,
                          '--rotate': `${rotate}deg`,
                          zIndex: index + 1,
                        } as CSSProperties
                      }
                    >
                      <div
                        className={[
                          'card game-card current-card',
                          isFinalTrickMode && finalTrickOpenedPlayers.includes(trickCard.player)
                            ? 'card-flip'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {isFinalTrickMode && !finalTrickOpenedPlayers.includes(trickCard.player) ? (
                          <div className="card-back">選択済み</div>
                        ) : (
                          <>
                            <div className="card-number">{trickCard.card}</div>
                            <div className="cucumber-icons">
                              {trickCard.card >= 2 && trickCard.card <= 5 && '🥒'}
                              {trickCard.card >= 6 && trickCard.card <= 9 && '🥒🥒'}
                              {trickCard.card >= 10 && trickCard.card <= 11 && '🥒🥒🥒'}
                              {trickCard.card >= 12 && trickCard.card <= 14 && '🥒🥒🥒🥒'}
                              {trickCard.card === 15 && '🥒🥒🥒🥒🥒'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {lastPlayedTrickCard ? (
                  <div className="trick-last-player-label">
                    {getPlayerName(lastPlayedTrickCard.player)}
                  </div>
                ) : null}
              </div>
            ) : state.fieldCard !== null ? (
              <div className="card game-card current-card">
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
              <div className="card game-card disabled">
                <div className="card-number">?</div>
              </div>
            )}
            {finalTrickStatusText ? (
              <div className="trick-winner-banner">{finalTrickStatusText}</div>
            ) : trickWinnerText ? (
              <div className="trick-winner-banner">{trickWinnerText}</div>
            ) : null}
          </div>
          <div id="grave" className="ellipse-table__grave" aria-label="墓地">
            {state.sharedGraveyard.length > 0 && (
              <div className="graveyard-card">
                {state.sharedGraveyard[state.sharedGraveyard.length - 1]}
              </div>
            )}
          </div>
        </div>

        {/* 楕円座席（外枠と内枠の間の帯） */}
        <section id="seats" className={`players-${config.players}`}>
          {state.players.map((player, i) => {
            const isTurn = !isFinalTrickMode && currentPlayerIndex !== null && i === currentPlayerIndex;

            return (
              <div
                key={i}
                className={`seat player-seat ${isTurn ? 'turn active-turn' : ''}`}
                data-active={state.currentPlayer === i}
              >
                <div className="content player-info">
                  <div className="player-name">{getPlayerName(i)}</div>
                  <div className="player-stats">
                    <div className="cucumber-count">
                      🥒 <span>{player.cucumbers}</span>
                    </div>
                    <div className="cards-count">
                      🃏 <span>{player.hand.length}</span>
                    </div>
                  </div>
                  {isFinalTrickMode && finalTrickSelectedPlayers.includes(i) ? (
                    <div className="final-selected-badge">選択済み</div>
                  ) : null}
                  {i !== mySeatIndex && (
                    <div className="player-hand-visual">
                      {showAllHands
                        ? // デバッグモード：実際のカード値を表示
                          player.hand.map((card, cardIndex) => (
                            <div key={cardIndex} className="debug-card" title={`カード${card}`}>
                              {card}
                            </div>
                          ))
                        : // 通常モード：裏面のカードを表示
                          player.hand.map((_, cardIndex) => (
                            <div key={cardIndex} className="mini-card" />
                          ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* 自分の手札と名前（下辺） */}
        <section id="hand-dock" className="ellipse-table__hand" aria-label="自分の手札">
          <div className="me-name">{getPlayerName(mySeatIndex)}</div>
          <div className="hand">
            {(() => {
              const myHand = state.players[mySeatIndex]?.hand ?? [];
              const highestOnTable = state.fieldCard;
              const minCard = myHand.length > 0 ? Math.min(...myHand) : null;

              return myHand.map((card, index) => {
                const isPlayable = highestOnTable === null || card >= highestOnTable;
                const isMinCard = minCard !== null && card === minCard;
                const isDiscard = highestOnTable !== null && isMinCard && !isPlayable;
                const isIllegalWhileLegalExists = !isPlayable && !isMinCard;
                const isMyTurn = currentPlayerIndex === mySeatIndex;

                // カードが送信中またはロックされているかチェック
                const isCardLocked = lockedCardId === card;
                const isAllLocked = isSubmitting || className?.includes('cards-locked');
                const isDisabled =
                  isFinalTrickMode ||
                  !isMyTurn ||
                  isAllLocked ||
                  isCardLocked ||
                  state.phase !== 'AwaitMove' ||
                  isIllegalWhileLegalExists;

                const handleCardClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  if (isDisabled || isSubmitting || !isMyTurn) return;
                  onCardClick?.(card);
                };

                return (
                  <div
                    key={`${card}-${index}`}
                    className={`card game-card ${
                      isCardLocked
                        ? 'disabled locked'
                        : isDisabled
                          ? 'disabled'
                          : isPlayable
                            ? 'playable'
                            : isDiscard
                              ? 'discard'
                              : 'disabled'
                    }`}
                    onClick={handleCardClick}
                    onPointerDown={handleCardClick}
                    style={{ pointerEvents: isDisabled ? 'none' : 'auto' }}
                    data-card={card}
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
                    {isDiscard ? <div className="discard-tag">捨てる</div> : null}
                  </div>
                );
              });
            })()}
          </div>
        </section>
      </div>
    </div>
  );
}
