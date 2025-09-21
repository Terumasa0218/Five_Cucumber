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
            "background-frame",
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
        <div className="background-frame__overlay">
          <div className="background-frame__overlay--radial" />
          <div className="background-frame__overlay--linear" />
        </div>

      {/* Safe Area */}
      <div className="background-frame__safe-area">
        {children}
      </div>
    </div>
  );
}


