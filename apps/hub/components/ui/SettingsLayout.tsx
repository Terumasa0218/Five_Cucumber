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
      <div className="settings-layout">
        <header className="settings-layout__header">
          <h1 className="settings-layout__title">{title}</h1>
          {description ? (
            <p className="settings-layout__description">{description}</p>
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


