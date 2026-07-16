"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { saveBrowseState } from "@/lib/guest/browse-state";
import { safeCallbackUrl } from "@/lib/guest/paths";

type AuthGateModalProps = {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
};

export function AuthGateModal({ open, onClose, callbackUrl }: AuthGateModalProps) {
  const next = safeCallbackUrl(callbackUrl ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/home"));

  function persistBrowse() {
    saveBrowseState();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-[var(--ink)]/45 p-5 backdrop-blur-md"
          onMouseDown={onClose}
          role="presentation"
        >
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-b from-[var(--cloud)] to-[var(--cloud)]/95 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-gate-title"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-[var(--signal)]/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-[var(--ember)]/20 blur-3xl" />
            <button
              type="button"
              onClick={onClose}
              className="absolute end-5 top-5 rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--signal)]/25 bg-[var(--signal)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
                <Sparkles className="size-3.5" />
                Join Relune
              </span>
              <h2
                id="auth-gate-title"
                className="mt-5 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight"
              >
                Create an account or sign in to continue.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Like, comment, follow, save, and share your own moments with the community.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href={`/sign-in?callbackUrl=${encodeURIComponent(next)}`}
                  onClick={persistBrowse}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--ink)] text-sm font-semibold text-[var(--cloud)] shadow-lg transition hover:opacity-90"
                >
                  Sign In
                </Link>
                <Link
                  href={`/sign-up?callbackUrl=${encodeURIComponent(next)}`}
                  onClick={persistBrowse}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--mist)] bg-white/60 text-sm font-semibold transition hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Create Account
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
