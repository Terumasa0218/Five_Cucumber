"use client";

import React from "react";

export type BattleHudProps = {
  round: number;
  trick: number;
  timer?: React.ReactNode;
  onInterrupt?: () => void;
  onExit?: () => void;
  className?: string;
};

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BattleHud({ round, trick, timer, onInterrupt, onExit, className }: BattleHudProps) {
  return (
    <header className={mergeClassNames("flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-sm", className)}>
      <div className="font-heading text-[clamp(18px,2.2vw,24px)]">
        第{round}回戦 / 第{trick}トリック
      </div>
      <div>{timer}</div>
      <div className="flex items-center gap-2">
        {onInterrupt ? (
          <button onClick={onInterrupt} className="inline-flex items-center gap-2 rounded-full bg-black/35 border border-white/10 px-5 py-2 text-sm font-semibold hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60">
            中断
          </button>
        ) : null}
        {onExit ? (
          <button onClick={onExit} className="inline-flex items-center gap-2 rounded-full bg-black/35 border border-white/10 px-5 py-2 text-sm font-semibold hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60">
            ホーム
          </button>
        ) : null}
      </div>
    </header>
  );
}


