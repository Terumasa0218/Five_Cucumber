"use client";


export interface PlayerSeat { nickname: string | null; isHost?: boolean; isYou?: boolean }
export interface PlayerSeatGridProps { seats: PlayerSeat[]; columns?: number; className?: string }

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function PlayerSeatGrid({ seats, columns, className }: PlayerSeatGridProps) {
  const gridCols = columns ? `grid-cols-${columns}` : "grid-cols-2 sm:grid-cols-3";
  const emptyCount = seats.filter((s) => !s.nickname).length;
  return (
    <div className={mergeClassNames("player-seat-grid", className)}>
      <div className="sr-only" aria-live="polite">{`空席は${emptyCount}席です`}</div>
      <div className="player-seat-grid__container">
        {seats.map((seat, index) => {
          const isEmpty = !seat.nickname;
          return (
            <div
              key={index}
              className={mergeClassNames(
                "player-seat-grid__seat",
                isEmpty ? "player-seat-grid__seat--empty" : "player-seat-grid__seat--occupied",
                seat.isYou ? "player-seat-grid__seat--you" : undefined
              )}
            >
              <span className="player-seat-grid__name">{isEmpty ? "空き" : seat.nickname}</span>
              <div className="player-seat-grid__badges">
                {seat.isHost ? (
                  <span className="player-seat-grid__badge player-seat-grid__badge--host">ホスト</span>
                ) : null}
                {seat.isYou ? (
                  <span className="player-seat-grid__badge player-seat-grid__badge--you">あなた</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


