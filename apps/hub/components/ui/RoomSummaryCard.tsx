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
    <div className={mergeClassNames("backdrop-blur-sm bg-black/30 border border-white/10 rounded-3xl p-8 flex flex-col gap-8", className)}>
      <div className="flex items-start justify-between gap-4">
        <span className={mergeClassNames("inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold", banner.className)}>
          <span aria-hidden>{banner.emoji}</span>
          <span>
            {status === "waiting" ? "待機中" : status === "playing" ? "対戦中" : "終了"}
          </span>
        </span>
        {headerActions ? <div className="flex items-center gap-3">{headerActions}</div> : null}
      </div>

      <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 font-mono text-sm">
        <span className="opacity-80">ROOM CODE</span>
        <strong>{roomCode}</strong>
      </div>

      <div className="grid grid-cols-2 gap-4 text-white/80">
        <div className="flex items-center justify-between">
          <span>定員</span>
          <strong>{requiredPlayers}人</strong>
        </div>
        <div className="flex items-center justify-between">
          <span>参加者</span>
          <strong>{joinedPlayers}人</strong>
        </div>
        <div className="flex items-center justify-between">
          <span>制限時間</span>
          <strong>{limitSeconds === 0 ? "無制限" : `${limitSeconds}秒`}</strong>
        </div>
        <div className="flex items-center justify-between">
          <span>きゅうり上限</span>
          <strong>{maxCucumbers}本</strong>
        </div>
      </div>

      {children}
    </div>
  );
}


