import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function ReluneMark({
  className,
  size = 36,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt="Relune"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority={priority}
    />
  );
}

export function BrandLockup({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 sm:gap-3",
        className,
      )}
    >
      <ReluneMark size={34} className="shrink-0" priority />
      <span className="truncate font-[family-name:var(--font-display)] text-base tracking-[0.22em] uppercase sm:text-xl sm:tracking-[0.28em]">
        Relune
      </span>
    </Link>
  );
}
