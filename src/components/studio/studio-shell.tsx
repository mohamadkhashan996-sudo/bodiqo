"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { PageTransition } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export const STUDIO_NAV: Array<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/studio", label: "Dashboard", exact: true },
  { href: "/studio/analytics", label: "Analytics" },
  { href: "/studio/followers", label: "Followers" },
  { href: "/studio/subscribers", label: "Supporters" },
  { href: "/studio/scheduler", label: "Scheduler" },
  { href: "/studio/videos", label: "Videos" },
  { href: "/studio/content", label: "Content" },
  { href: "/studio/posts", label: "Drafts" },
  { href: "/studio/monetization", label: "Monetization" },
  { href: "/studio/copyright", label: "Copyright" },
  { href: "/studio/music", label: "Music" },
  { href: "/studio/verification", label: "Verification" },
  { href: "/studio/collab", label: "Collab" },
  { href: "/studio/reports", label: "Reports" },
];

export function StudioShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <PageTransition className="section-shell max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-[var(--muted)] uppercase">
            Creator Studio
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions}
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {STUDIO_NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--surface)]"
                  : "border-[var(--mist-strong)] text-[var(--muted)] hover:text-[var(--ink)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </PageTransition>
  );
}

export function StudioStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--mist-strong)] bg-[var(--surface)] p-4">
      <p className="text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function StudioPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-2xl)] border border-[var(--mist-strong)] bg-[var(--surface)] p-5",
        className,
      )}
    >
      <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StudioSpark({
  series,
}: {
  series: Array<{ date: string; value: number }>;
}) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="flex h-24 items-end gap-0.5">
      {series.map((point) => (
        <div
          key={point.date}
          className="min-w-0 flex-1 rounded-t bg-[color-mix(in_srgb,var(--signal)_85%,var(--ember))] opacity-85"
          style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
          title={`${point.date}: ${point.value}`}
        />
      ))}
    </div>
  );
}

export function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}
