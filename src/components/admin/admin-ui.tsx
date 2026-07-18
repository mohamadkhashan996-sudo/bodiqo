"use client";

import { useCallback, useEffect, useState } from "react";

export function useAdminJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setData(json as T);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export async function adminPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Action failed");
  return json;
}

export async function adminPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Update failed");
  return json;
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-5 backdrop-blur">
      <p className="text-[10px] tracking-[0.18em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-[10px] tracking-[0.22em] text-[var(--muted)] uppercase">
        Relune Admin
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-semibold tracking-tight md:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export function SparkBars({
  series,
  label,
}: {
  series: Array<{ date: string; value: number }>;
  label?: string;
}) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div>
      {label ? (
        <p className="mb-3 text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
          {label}
        </p>
      ) : null}
      <div className="flex h-28 items-end gap-0.5">
        {series.map((point) => (
          <div
            key={point.date}
            className="group relative min-w-0 flex-1 rounded-t bg-[linear-gradient(180deg,var(--signal),color-mix(in_srgb,var(--ember)_70%,var(--signal)))] opacity-85 transition hover:opacity-100"
            style={{ height: `${Math.max(4, (point.value / max) * 100)}%` }}
            title={`${point.date}: ${point.value}`}
          />
        ))}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-5 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
