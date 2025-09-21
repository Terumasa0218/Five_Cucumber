"use client";

import React from "react";

export interface RoomActionBarProps {
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
  hint?: string;
  className?: string;
}

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function RoomActionBar({ primary, secondary, hint, className }: RoomActionBarProps) {
  return (
    <div className={mergeClassNames("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex gap-3">
        {secondary}
        {primary}
      </div>
      {hint ? <p className="text-white/70 text-sm">{hint}</p> : null}
    </div>
  );
}


