"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const icons: Record<string, ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M6.6 14.3l-.9.7-2.5 1.9C4.8 19.7 8.1 22 12 22c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-6-4.4z" />
      <path fill="#4A90E2" d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.4 6 12.7 6 12s.2-1.4.5-2L3.2 7.1z" />
      <path fill="#FBBC05" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.3 3.2 7.1L6.5 9.7C7 7.9 9.2 6 12 6z" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.3.7 1 1.5 2.1 2.6 2 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7 1.8-1 2.5-2c.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.2-3.3zM14.3 6.3c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M18.2 2H21l-6.5 7.4L22 22h-6.8l-4.7-6.2L5.3 22H2.5l7-8L2 2h7l4.2 5.6L18.2 2zm-1.2 18h1.9L7.1 4H5.1l11.9 16z" />
    </svg>
  ),
  credentials: (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
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
        "group flex w-full items-center gap-4 rounded-2xl border border-[var(--mist)] bg-[var(--glass)] px-5 py-4 text-left backdrop-blur transition",
        disabled
          ? "cursor-not-allowed opacity-55"
          : "hover:border-[var(--ink)]/25 hover:shadow-[var(--shadow-lg)]",
      )}
      aria-label={label}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-white/70 dark:bg-white/10">
        {icons[id] ?? icons.credentials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-[var(--ink)]">
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-[var(--muted)]">{hint}</span>
        ) : null}
      </span>
    </motion.button>
  );
}
