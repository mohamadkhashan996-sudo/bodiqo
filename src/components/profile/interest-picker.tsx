"use client";

import type { InterestItem } from "@/types/feed";

export function InterestPicker({
  interests,
  chosen,
  onChange,
  disabled = false,
}: {
  interests: InterestItem[];
  chosen: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: string) {
    if (disabled) return;
    onChange(
      chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id],
    );
  }

  if (!interests.length) {
    return (
      <p className="text-sm text-[var(--muted)]">No interests available yet.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((interest) => (
        <button
          key={interest.id}
          type="button"
          disabled={disabled}
          onClick={() => toggle(interest.id)}
          className={`rounded-full px-4 py-2 text-sm transition disabled:opacity-60 ${
            chosen.includes(interest.id)
              ? "bg-[var(--signal)] text-white shadow-[var(--shadow-sm)]"
              : "surface-panel text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          {interest.name}
        </button>
      ))}
    </div>
  );
}

export function InterestChips({
  interests,
}: {
  interests: Array<{ id?: string; name: string }>;
}) {
  if (!interests.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {interests.map((interest, index) => (
        <span
          key={interest.id ?? `${interest.name}-${index}`}
          className="rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)]"
        >
          {interest.name}
        </span>
      ))}
    </div>
  );
}
