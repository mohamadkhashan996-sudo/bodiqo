import { cn } from "@/lib/utils";

export function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  return src ? (
    <img
      src={src}
      alt={name ?? ""}
      className={cn(
        "size-10 rounded-[1.35rem] border border-[color:color-mix(in_srgb,var(--mist)_72%,transparent)] object-cover shadow-[var(--shadow-sm)]",
        className,
      )}
      loading="lazy"
    />
  ) : (
    <span
      aria-label={name ?? "User"}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-[1.35rem] border border-[color:color-mix(in_srgb,var(--mist)_56%,transparent)] bg-gradient-to-br from-[var(--ember)]/35 to-[var(--signal)]/20 font-[family-name:var(--font-display)] text-sm shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {name?.slice(0, 1).toUpperCase() ?? "R"}
    </span>
  );
}
