"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

function isLocalPath(src: string) {
  return src.startsWith("/") && !src.startsWith("//");
}

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  const label = name?.trim() || "User";
  if (!src) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-[1.35rem] border-2 border-[var(--mist-strong)] bg-gradient-to-br from-[var(--ember)]/35 to-[var(--signal)]/20 font-[family-name:var(--font-display)] text-sm shadow-[var(--shadow-sm)]",
          className,
        )}
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  const shared = cn(
    "size-10 rounded-[1.35rem] border-2 border-[var(--mist-strong)] object-cover shadow-[var(--shadow-sm)]",
    className,
  );

  if (isLocalPath(src)) {
    return (
      <Image
        src={src}
        alt={label}
        width={80}
        height={80}
        className={shared}
        sizes="80px"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={label}
      width={80}
      height={80}
      className={shared}
      sizes="80px"
      unoptimized
    />
  );
}
