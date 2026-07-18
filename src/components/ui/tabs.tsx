"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  items,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filters",
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const selected = item === value;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-[background-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]",
              selected
                ? "bg-[var(--ink)] text-[var(--cloud)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted-strong)] hover:bg-[var(--mist)]/70 hover:text-[var(--ink)]",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
