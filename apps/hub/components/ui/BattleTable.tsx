"use client";

import React from "react";

export interface PlayerSlot { id: string; name: string; cucumbers: number; you?: boolean; isActive?: boolean }
export interface BattleTableProps {
  players: PlayerSlot[];
  currentPlayerId?: string;
  fieldCards: string[];
  discardCards: string[];
  onCardSelect?: (card: string) => void;
  lockedCardId?: string | null;
  isSubmitting?: boolean;
  children?: React.ReactNode;
  className?: string;
}

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BattleTable({ players, currentPlayerId, fieldCards, discardCards, onCardSelect, lockedCardId, isSubmitting, children, className }: BattleTableProps) {
  return (
    <div className={mergeClassNames("relative flex-1 grid grid-rows-[auto_1fr_auto] gap-6", className)}>
      {/* Players */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className={mergeClassNames(
              "flex items-center gap-3 rounded-full backdrop-blur px-4 py-2",
              p.isActive ? "ring-4 ring-emerald-300" : undefined,
              p.you ? "order-last md:order-none" : undefined,
              "border border-white/15 bg-white/10"
            )}
          >
            <div className="grid place-items-center rounded-full bg-black/30 border border-white/10" style={{ width: "clamp(56px,8vw,80px)", height: "clamp(56px,8vw,80px)" }}>
              <span className="font-heading text-[clamp(14px,2vw,18px)]">{p.name.slice(0, 2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">{p.name}</span>
              <span className="text-white/80 text-sm">🥒 {p.cucumbers}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Center table */}
      <div className="bg-emerald-900/30 border border-emerald-200/20 rounded-[999px] aspect-[5/2] mx-auto w-full max-w-[960px] flex items-center justify-center">
        <div className="grid gap-3 justify-items-center">
          <div className="flex gap-3">
            {fieldCards.map((card) => {
              const disabled = !!lockedCardId || isSubmitting;
              const cardNode = (
                <div className="aspect-[3/4] w-[clamp(72px,8vw,104px)] rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="font-mono">{card}</span>
                </div>
              );
              return onCardSelect ? (
                <button
                  key={card}
                  disabled={disabled}
                  className={mergeClassNames(disabled ? "opacity-50 pointer-events-none" : undefined)}
                  onClick={() => onCardSelect(card)}
                >
                  {cardNode}
                </button>
              ) : (
                <div key={card}>{cardNode}</div>
              );
            })}
          </div>
          <div className="flex gap-3 opacity-80">
            {discardCards.map((card) => (
              <div key={card} className="aspect-[3/4] w-[clamp(56px,6vw,88px)] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm grid place-items-center">
                <span className="font-mono text-xs">{card}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Children for overlays/modals */}
      {children}
    </div>
  );
}


