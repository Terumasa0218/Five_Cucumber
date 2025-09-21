"use client";

import React from "react";
import { BackgroundFrame } from ".";

export type SettingsLayoutProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  backgroundSrc?: string;
  objectPosition?: string;
};

export function SettingsLayout({
  title,
  description,
  children,
  footer,
  className,
  backgroundSrc,
  objectPosition = "center",
}: SettingsLayoutProps) {
  return (
    <BackgroundFrame
      src={backgroundSrc ?? "/images/home1.png"}
      objectPosition={objectPosition}
      priority
      className={className}
    >
      <div className="max-w-[960px] mx-auto flex flex-col gap-12">
        <header className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl p-10">
          <h1 className="font-heading text-[clamp(22px,4vw,36px)]">{title}</h1>
          {description ? (
            <p className="mt-3 text-white/80 text-[clamp(14px,1.6vw,18px)]">{description}</p>
          ) : null}
        </header>

        <section>{children}</section>

        {footer ? (
          <footer className="mt-auto flex flex-col sm:flex-row sm:justify-between gap-4">{footer}</footer>
        ) : null}
      </div>
    </BackgroundFrame>
  );
}


