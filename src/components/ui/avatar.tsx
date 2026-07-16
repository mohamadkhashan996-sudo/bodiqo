import { cn } from "@/lib/utils";

export function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  return src ? <img src={src} alt={name ?? ""} className={cn("size-10 rounded-2xl object-cover", className)} /> : <span aria-label={name ?? "User"} className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--ember)]/25 font-[family-name:var(--font-display)] text-sm", className)}>{name?.slice(0, 1).toUpperCase() ?? "C"}</span>;
}
