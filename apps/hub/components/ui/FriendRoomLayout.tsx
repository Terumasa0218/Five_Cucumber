"use client";

import React from "react";
import { BackgroundFrame } from ".";

export type FriendRoomLayoutProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  badge?: { label: string; value: string };
  backgroundSrc?: string;
  className?: string;
};

export function FriendRoomLayout({
  title,
  description,
  eyebrow,
  children,
  footer,
  badge,
  backgroundSrc,
  className,
}: FriendRoomLayoutProps) {
  return (
    <BackgroundFrame src={backgroundSrc ?? "/images/home1.png"} priority objectPosition="center" className={className}>
      <div className="max-w-[960px] mx-auto flex flex-col gap-12">
        <header className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl p-10 flex flex-col gap-6">
          <div className="flex flex-col items-start gap-3">
            {badge ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 border border-white/20 px-4 py-2 text-sm font-semibold">
                <span className="opacity-80">{badge.label}</span>
                <span>{badge.value}</span>
              </span>
            ) : null}
            {eyebrow ? (
              <p className="text-white/60 text-[clamp(12px,1.4vw,14px)]">{eyebrow}</p>
            ) : null}
            <h1 className="font-heading text-[clamp(22px,4vw,36px)]">{title}</h1>
            {description ? (
              <p className="font-body text-[clamp(14px,1.6vw,18px)] text-white/80">{description}</p>
            ) : null}
          </div>
        </header>

        <section>{children}</section>

        {footer ? (
          <footer className="mt-auto flex flex-col sm:flex-row sm:justify-between gap-4">{footer}</footer>
        ) : null}
      </div>
    </BackgroundFrame>
  );
}


