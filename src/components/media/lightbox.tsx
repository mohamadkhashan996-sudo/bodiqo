"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import {
  isTextEntryTarget,
  isTopDialog,
  useDialogFocus,
} from "@/hooks/use-dialog-focus";
import { cn } from "@/lib/utils";

export function MediaLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: Array<{ url: string; alt?: string }>;
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const reduce = useReducedMotion();
  const [zoom, setZoom] = useState(1);
  const current = items[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const { dialogId } = useDialogFocus({
    open: Boolean(current),
    onClose,
    containerRef: dialogRef,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTopDialog(dialogId) || isTextEntryTarget(e.target)) return;
      if (e.key === "ArrowRight")
        onIndexChange(Math.min(items.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogId, index, items.length, onIndexChange]);

  if (typeof document === "undefined" || !current) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        data-dialog-root=""
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
        tabIndex={-1}
      >
        <button
          type="button"
          className="on-dark-control absolute top-5 right-5"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        <motion.img
          key={current.url}
          src={current.url}
          alt={current.alt || ""}
          className={cn(
            "max-h-[min(85dvh,100%)] max-w-[min(92vw,100%)] rounded-2xl object-contain shadow-2xl",
          )}
          style={{ transform: `scale(${zoom})` }}
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => setZoom((z) => (z === 1 ? 1.6 : 1))}
          draggable={false}
        />
        <div className="absolute bottom-6 flex gap-3">
          <button
            type="button"
            className="on-dark-control px-4 py-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(Math.max(0, index - 1));
            }}
          >
            Prev
          </button>
          <button
            type="button"
            className="on-dark-control px-4 py-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => (z === 1 ? 1.6 : 1));
            }}
          >
            Zoom
          </button>
          <button
            type="button"
            className="on-dark-control px-4 py-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(Math.min(items.length - 1, index + 1));
            }}
          >
            Next
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
