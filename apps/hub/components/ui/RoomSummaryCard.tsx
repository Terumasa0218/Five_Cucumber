"use client";

import React from "react";

export interface RoomSummaryCardProps {
  roomCode: string;
  status: "waiting" | "playing" | "finished";
  requiredPlayers: number;
  joinedPlayers: number;
  limitSeconds: number;
  maxCucumbers: number;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function RoomSummaryCard({
  roomCode,
  status,
  requiredPlayers,
  joinedPlayers,
  limitSeconds,
  maxCucumbers,
  headerActions,
  children,
  className,
}: RoomSummaryCardProps) {
  const banner = (() => {
    if (status === "playing") {
      return { emoji: "🎮", className: "bg-sky-500/15 text-sky-200" };
    }
    if (status === "finished") {
      return { emoji: "🏁", className: "bg-rose-500/15 text-rose-200" };
    }
    return { emoji: "⏳", className: "bg-emerald-500/15 text-emerald-200" };
  })();

  return (
    <div className={mergeClassNames("room-summary-card", className)}>
      <div className="room-summary-card__header">
        <span className={mergeClassNames("room-summary-card__status", `room-summary-card__status--${status}`)}>
          <span aria-hidden>{banner.emoji}</span>
          <span>
            {status === "waiting" ? "待機中" : status === "playing" ? "対戦中" : "終了"}
          </span>
        </span>
        {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
      </div>

      <div className="room-summary-card__code">
        <span className="opacity-80">ROOM CODE</span>
        <strong>{roomCode}</strong>
      </div>

      <div className="room-summary-card__info">
        <div className="room-summary-card__info-item">
          <span>定員</span>
          <strong className="room-summary-card__info-value">{requiredPlayers}人</strong>
        </div>
        <div className="room-summary-card__info-item">
          <span>参加者</span>
          <strong className="room-summary-card__info-value">{joinedPlayers}人</strong>
        </div>
        <div className="room-summary-card__info-item">
          <span>制限時間</span>
          <strong className="room-summary-card__info-value">{limitSeconds === 0 ? "無制限" : `${limitSeconds}秒`}</strong>
        </div>
        <div className="room-summary-card__info-item">
          <span>きゅうり上限</span>
          <strong className="room-summary-card__info-value">{maxCucumbers}本</strong>
        </div>
      </div>

      {children}
    </div>
  );
}


