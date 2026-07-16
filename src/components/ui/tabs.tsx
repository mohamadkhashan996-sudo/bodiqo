"use client";

import { cn } from "@/lib/utils";

export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="flex gap-1 overflow-x-auto border-b border-[var(--mist)]" role="tablist">{items.map((item) => <button key={item} role="tab" aria-selected={item === value} onClick={() => onChange(item)} className={cn("shrink-0 border-b-2 px-3 py-3 text-[11px] font-semibold tracking-[.12em] uppercase", item === value ? "border-[var(--signal)] text-[var(--ink)]" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]")}>{item}</button>)}</div>;
}
