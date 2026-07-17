"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

function isLocalPath(src: string) {
  return src.startsWith("/") && !src.startsWith("//");
}

/**
 * Feed/media image that optimizes local uploads and safely renders remote URLs.
 */
export function MediaImage({
  src,
  alt = "",
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 640px",
  fill = false,
  width,
  height,
}: {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  const local = isLocalPath(src);
  const imageClassName = cn(className);

  if (fill) {
    return (
      <Image
        src={src}
        fill
        alt={alt}
        className={imageClassName}
        priority={priority}
        sizes={sizes}
        unoptimized={!local}
      />
    );
  }

  return (
    <Image
      src={src}
      width={width ?? 1200}
      height={height ?? 900}
      alt={alt}
      className={imageClassName}
      priority={priority}
      sizes={sizes}
      unoptimized={!local}
    />
  );
}
