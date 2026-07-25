"use client";

import { useId, useRef } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { saveBrowseState } from "@/lib/guest/browse-state";
import { safeCallbackUrl } from "@/lib/guest/paths";

type AuthGateModalProps = {
  open: boolean;
  onClose: () => void;
  callbackUrl?: string;
};

export function AuthGateModal({
  open,
  onClose,
  callbackUrl,
}: AuthGateModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  useDialogFocus({ open, onClose, containerRef: panelRef });
  const next = safeCallbackUrl(
    callbackUrl ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/home"),
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-relune-auth-gate=""
      data-dialog-root=""
      className="fixed inset-0 z-[var(--z-auth-gate)] grid place-items-center bg-[var(--ink)]/45 p-5 backdrop-blur-md"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="surface-panel-strong premium-ring relative max-h-[min(90dvh,36rem)] w-full max-w-md overflow-y-auto rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-xl)] sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-[var(--signal)]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-[var(--ember)]/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--signal-deep)]/40 bg-[var(--signal-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--signal-deep)] uppercase">
            <Sparkles className="size-3.5" />
            Join Relune
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="icon-button -me-2 -mt-2 size-10 shrink-0"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <h2
          id={titleId}
          className="relative mt-5 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight"
        >
          Create an account or sign in to continue.
        </h2>
        <p className="relative mt-3 text-sm leading-6 text-[var(--muted-strong)]">
          Like, comment, follow, save, and share your own moments with the
          community. You can keep browsing public pages as a guest.
        </p>
        <div className="relative mt-8 flex flex-col gap-3">
          <Link
            href={`/sign-in?callbackUrl=${encodeURIComponent(next)}`}
            onClick={() => saveBrowseState()}
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] text-sm font-semibold tracking-[0.14em] text-[var(--cloud-elevated)] uppercase shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-[var(--ink-soft)]"
          >
            Sign In
          </Link>
          <Link
            href={`/sign-up?callbackUrl=${encodeURIComponent(next)}`}
            onClick={() => saveBrowseState()}
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] text-sm font-semibold tracking-[0.14em] text-[var(--ink)] uppercase shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[var(--cloud-elevated)]"
          >
            Create Account
          </Link>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="h-11 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--cloud-elevated)]"
          >
            Continue Browsing
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
