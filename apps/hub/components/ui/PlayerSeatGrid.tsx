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
    <div className={mergeClassNames("flex flex-col gap-3", className)}>
      <div className="sr-only" aria-live="polite">{`空席は${emptyCount}席です`}</div>
      <div className={mergeClassNames("grid gap-3", gridCols)}>
        {seats.map((seat, index) => {
          const isEmpty = !seat.nickname;
          return (
            <div
              key={index}
              className={mergeClassNames(
                "rounded-2xl p-4 border",
                isEmpty ? "bg-white/6 border-dashed border-white/20" : "bg-white/12 border-white/25",
                seat.isYou ? "ring-2 ring-emerald-300" : undefined
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{isEmpty ? "空き" : seat.nickname}</span>
                <div className="flex items-center gap-2">
                  {seat.isHost ? (
                    <span className="rounded-full bg-white/12 border border-white/20 px-2 py-1 text-xs font-semibold">ホスト</span>
                  ) : null}
                  {seat.isYou ? (
                    <span className="rounded-full bg-emerald-400/20 border border-emerald-300/40 px-2 py-1 text-xs font-semibold">あなた</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


