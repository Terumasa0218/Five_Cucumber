"use client";

import React from "react";

export type GameFooterProps = {
  children?: React.ReactNode;
  className?: string;
};

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function GameFooter({ children, className }: GameFooterProps) {
  if (!children) return null;
  return (
    <footer className={mergeClassNames("flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/25 px-6 py-4 backdrop-blur-sm", className)}>
      {children}
    </footer>
  );
}


