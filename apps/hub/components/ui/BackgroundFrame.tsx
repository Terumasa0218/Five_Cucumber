"use client";

import Image from "next/image";
import React from "react";

export type BackgroundFrameProps = {
  src?: string | null;
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
    <div className={mergeClassNames("background-frame", className)}>
      {src ? (
        <div className="background-frame__image">
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            priority={priority}
            style={{ objectFit: "cover", objectPosition }}
          />
        </div>
      ) : null}

      {children}
    </div>
  );
}


