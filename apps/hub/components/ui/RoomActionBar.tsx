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
    <div className={mergeClassNames("room-action-bar", className)}>
      <div className="room-action-bar__actions">
        {secondary}
        {primary}
      </div>
      {hint ? <p className="room-action-bar__hint">{hint}</p> : null}
    </div>
  );
}


