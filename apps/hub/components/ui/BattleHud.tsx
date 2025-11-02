"use client";

import React from "react";

export type BattleHudProps = {
  round: number;
  trick: number;
  timer?: React.ReactNode;
  onExit?: () => void;
  className?: string;
};

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BattleHud({ round, trick, timer, onExit, className }: BattleHudProps) {
  return (
    <header className={mergeClassNames("flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/30 px-6 py-4 backdrop-blur-sm", className)}>
      <div className="font-heading text-[clamp(18px,2.2vw,24px)]">
        第{round}回戦 / 第{trick}トリック
      </div>
      <div>{timer}</div>
      {onExit ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onExit} className="fc-button fc-button--secondary">
            ホーム
          </button>
        </div>
      ) : null}
    </header>
  );
}


