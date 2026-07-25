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
  function moveWithKeyboard(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;

    event.preventDefault();
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    onChange(items[next]!);
    tabs?.[next]?.focus();
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const selected = item === value;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item)}
            onKeyDown={(event) => moveWithKeyboard(event, index)}
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
