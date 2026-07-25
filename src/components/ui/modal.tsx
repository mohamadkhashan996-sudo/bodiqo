"use client";

import { type RefObject, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { useDialogFocus } from "@/hooks/use-dialog-focus";

export function Modal({
  open,
  title,
  onClose,
  children,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { restoreFocus } = useDialogFocus({
    open,
    onClose,
    containerRef: panelRef,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (returnFocusRef?.current?.isConnected) {
          returnFocusRef.current.focus({ preventScroll: true });
        } else {
          restoreFocus();
        }
      }}
    >
      {open ? (
        <motion.div
          data-dialog-root=""
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-[var(--night)]/58 p-[max(0.75rem,env(safe-area-inset-top))] px-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={panelRef}
            initial={reduceMotion ? false : { y: 18, scale: 0.975 }}
            animate={{ y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 12, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
            }
            onClick={(event) => event.stopPropagation()}
            className="surface-panel-strong premium-ring relative max-h-[min(calc(100dvh-2rem),40rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-xl)] backdrop-blur-2xl md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="kicker">Relune</p>
                <h2
                  id={titleId}
                  className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight text-balance md:text-[1.75rem]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="icon-button size-10 shrink-0"
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>
            <div className="mt-5">{children}</div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
