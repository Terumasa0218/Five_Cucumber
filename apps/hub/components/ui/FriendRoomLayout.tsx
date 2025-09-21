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
      <div className="friend-room">
        <header className="friend-room__header">
          <div className="flex flex-col items-start gap-3">
            {badge ? (
              <span className="friend-room__badge">
                <span className="opacity-80">{badge.label}</span>
                <span>{badge.value}</span>
              </span>
            ) : null}
            {eyebrow ? (
              <p className="friend-room__eyebrow">{eyebrow}</p>
            ) : null}
            <h1 className="friend-room__title">{title}</h1>
            {description ? (
              <p className="friend-room__description">{description}</p>
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


