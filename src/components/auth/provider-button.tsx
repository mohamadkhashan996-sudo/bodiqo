"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const icons: Record<string, ReactNode> = {
  email: (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
    </svg>
  ),
  phone: (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M10 5h4M11 18.5h2" />
    </svg>
  ),
};

export function AuthProviderButton({
  id,
  label,
  onClick,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-5 py-4 text-left shadow-[var(--shadow-sm)] transition",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:-translate-y-0.5 hover:border-[var(--ink)]/25 hover:shadow-[var(--shadow-md)]",
      )}
      aria-label={label}
    >
      <span className="grid size-11 place-items-center rounded-[1rem] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)]">
        {icons[id] ?? icons.email}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-[var(--ink)]">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-[var(--muted-strong)]">
            {hint}
          </span>
        ) : null}
      </span>
    </motion.button>
  );
}
