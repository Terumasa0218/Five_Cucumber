"use client";

import Image from "next/image";
import React from "react";

export type BackgroundFrameProps = {
  src: string;
  priority?: boolean;
  objectPosition?: string;
  children: React.ReactNode;
  className?: string;
};

function mergeClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BackgroundFrame({
  src,
  priority,
  objectPosition,
  children,
  className,
}: BackgroundFrameProps) {
  return (
        <div
          className={mergeClassNames(
            "relative min-h-[100svh] flex flex-col font-body",
            className
          )}
        >
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        priority={priority}
        style={{ objectFit: "cover", objectPosition }}
      />

        {/* Gradient overlays */}
        <div className="pointer-events-none isolate absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,240,230,0.1)_0%,rgba(200,168,90,0.15)_68%,rgba(43,43,43,0.2)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(245,240,230,0.12)_0%,rgba(0,0,0,0)_22%,rgba(0,0,0,0)_78%,rgba(245,240,230,0.12)_100%)]" />
        </div>

      {/* Safe Area */}
      <div className="relative z-10 pb-[clamp(64px,10vh,128px)] pt-[clamp(64px,10vh,128px)] pr-[clamp(20px,6vw,96px)] pl-[clamp(20px,6vw,96px)] w-full">
        {children}
      </div>
    </div>
  );
}


