"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const OPTIMIZABLE_HOSTS = new Set([
  "res.cloudinary.com",
  "utfs.io",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
]);

function isLocalPath(src: string) {
  return src.startsWith("/") && !src.startsWith("//");
}

function shouldOptimize(src: string) {
  if (isLocalPath(src)) return true;
  try {
    return OPTIMIZABLE_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

/**
 * Feed/media image that optimizes local uploads and known remote CDNs.
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
  const optimize = shouldOptimize(src);
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
        unoptimized={!optimize}
        loading={priority ? undefined : "lazy"}
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
      unoptimized={!optimize}
      loading={priority ? undefined : "lazy"}
    />
  );
}
