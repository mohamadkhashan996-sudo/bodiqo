"use client";

import { cn } from "@/lib/utils";

export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div
      className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--mist)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]"
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item}
          role="tab"
          aria-selected={item === value}
          onClick={() => onChange(item)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[.14em] uppercase transition",
            item === value
              ? "bg-[var(--ink)] text-[var(--cloud)] shadow-[var(--shadow-sm)]"
              : "text-[var(--muted)] hover:bg-[var(--mist)]/70 hover:text-[var(--ink)]",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
