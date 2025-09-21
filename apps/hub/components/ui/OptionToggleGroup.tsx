"use client";

import { useEffect, useMemo, useRef } from "react";

export type Option<T extends string | number> = { value: T; label: string; description?: string; disabled?: boolean };

export interface OptionToggleGroupProps<T extends string | number> {
  id: string;
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  layout?: "wrap" | "list";
  className?: string;
  srHint?: string;
}

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function OptionToggleGroup<T extends string | number>({
  id,
  label,
  options,
  value,
  onChange,
  layout = "wrap",
  className,
  srHint,
}: OptionToggleGroupProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;
      if (!keys.includes(e.key as any)) return;
      e.preventDefault();
      const count = options.length;
      if (count === 0) return;
      const current = Math.max(0, selectedIndex);
      const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
      const nextIndex = (current + delta + count) % count;
      const next = options[nextIndex];
      if (next && !next.disabled) {
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
              onClick={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              className={mergeClassNames(
                "option-toggle__button",
                option.disabled ? "option-toggle__button--disabled" : undefined,
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
      <span className="sr-only" aria-live="polite">{srHint || ""}</span>
    </div>
  );
}


