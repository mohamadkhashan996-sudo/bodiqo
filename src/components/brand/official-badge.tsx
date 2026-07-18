import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Unique platform badge — visually distinct from standard verification */
export function OfficialBadge({
  className,
  title = "Official Relune account",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--signal)] via-[#1a8f82] to-[var(--ember)] p-[2px] shadow-[0_0_12px_rgba(31,155,142,0.45)]",
        className,
      )}
      title={title}
      aria-label={title}
      role="img"
    >
      <span className="flex size-[1.15em] min-w-[1.15em] items-center justify-center rounded-full bg-[var(--ink)] text-[0.55em] leading-none font-black tracking-tighter text-[var(--cloud)]">
        R
      </span>
    </span>
  );
}

export function VerificationBadge({
  isOfficial,
  isVerified,
  className,
}: {
  isOfficial?: boolean;
  isVerified?: boolean;
  className?: string;
}) {
  if (isOfficial) return <OfficialBadge className={className} />;
  if (!isVerified) return null;
  return (
    <BadgeCheck
      className={cn("size-4 text-[var(--signal)]", className)}
      aria-label="Verified"
    />
  );
}
