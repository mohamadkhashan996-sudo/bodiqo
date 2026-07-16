"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-[var(--night)]/55 p-4 backdrop-blur-md md:p-6"
          onMouseDown={onClose}
        >
          <motion.section
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="surface-panel-strong w-full max-w-lg rounded-[var(--radius-2xl)] p-5 backdrop-blur-2xl md:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="kicker">RELUNE</p>
                <h2
                  id="modal-title"
                  className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-[1.75rem]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="icon-button size-10 shrink-0"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="mt-5">{children}</div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
