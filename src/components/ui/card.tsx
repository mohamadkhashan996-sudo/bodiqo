"use client";

import { cn } from "@/lib/utils";
import { HoverLift } from "@/components/motion/primitives";

export function Card({
  children,
  className,
  interactive = false,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  id?: string;
}) {
  const body = (
    <div
      id={id}
      className={cn(
        "surface-panel rounded-[var(--radius-xl)] p-5 backdrop-blur-xl transition-[transform,box-shadow,border-color,background-color] duration-[var(--duration)] ease-[var(--ease-out)]",
        className,
      )}
    >
      {children}
    </div>
  );
  return interactive ? <HoverLift>{body}</HoverLift> : body;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-subtle flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--mist)] px-6 py-16 text-center shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function StateBanner({
  tone = "success",
  children,
}: {
  tone?: "success" | "error" | "warning";
  children: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning)"
        : "var(--danger)";
  return (
    <div
      role="status"
      className="rounded-2xl border px-4 py-3 text-sm"
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {children}
    </div>
  );
}
