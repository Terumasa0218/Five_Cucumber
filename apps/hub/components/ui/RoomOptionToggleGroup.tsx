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
    type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
    const arrowKeys: ArrowKey[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!refs.current || refs.current.length === 0) return;
      if (!arrowKeys.some((key) => key === e.key)) return;
      const key = e.key as ArrowKey;
      e.preventDefault();
      const count = options.length;
      if (count === 0) return;
      const current = Math.max(0, selectedIndex);
      const delta = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
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
    <div className={mergeClassNames("option-toggle", className)}>
      <div id={id} role="radiogroup" aria-label={label} className="option-toggle__container">
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
                "option-toggle__button",
                isSelected ? "option-toggle__button--selected" : undefined
              )}
            >
              <span>{option.label}</span>
              {option.description ? (
                <span className="ml-2" style={{color: 'var(--antique-muted)'}}>{option.description}</span>
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


