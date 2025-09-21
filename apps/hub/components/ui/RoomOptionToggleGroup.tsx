"use client";

import { useEffect, useMemo, useRef } from "react";

export type RoomOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

export interface RoomOptionToggleGroupProps<T extends string | number> {
  id: string;
  label: string;
  options: RoomOption<T>[];
  value: T;
  onChange: (next: T) => void;
  srHint?: string;
  className?: string;
}

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function RoomOptionToggleGroup<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
  srHint,
  className,
}: RoomOptionToggleGroupProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!refs.current || refs.current.length === 0) return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;
      if (!keys.includes(e.key as any)) return;
      e.preventDefault();
      const count = options.length;
      if (count === 0) return;
      const current = Math.max(0, selectedIndex);
      const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
      const nextIndex = (current + delta + count) % count;
      const next = options[nextIndex];
      if (next) {
        onChange(next.value);
        refs.current[nextIndex]?.focus();
      }
    };
    const container = document.getElementById(id);
    container?.addEventListener("keydown", handleKeyDown);
    return () => container?.removeEventListener("keydown", handleKeyDown);
  }, [id, onChange, options, selectedIndex]);

  return (
    <div className={mergeClassNames("flex flex-wrap gap-2", className)}>
      <div id={id} role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
        {options.map((option, idx) => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              ref={(el) => { refs.current[idx] = el; }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={mergeClassNames(
                "inline-flex h-12 min-w-[72px] items-center justify-center rounded-full px-5 text-[clamp(13px,1.6vw,16px)] font-medium transition",
                isSelected
                  ? "bg-emerald-500/90 text-emerald-950 border border-white/40 shadow-[0_12px_30px_rgba(16,185,129,0.25)]"
                  : "bg-white/10 border border-white/15 hover:bg-white/16 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              )}
            >
              <span>{option.label}</span>
              {option.description ? (
                <span className="ml-2 text-white/60">{option.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite">
        {srHint || ""}
      </span>
    </div>
  );
}


