"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionCounts,
  type ReactionKey,
  topReactionTypes,
  totalReactions,
} from "@/lib/reactions";

type Props = {
  reaction: ReactionKey | null;
  reactionCounts: ReactionCounts;
  likeCount: number;
  pending?: boolean;
  burstKey?: number;
  onReact: (type: ReactionKey) => void;
  onToggle: () => void;
  className?: string;
};

export function ReactionButton({
  reaction,
  reactionCounts,
  likeCount,
  pending,
  burstKey = 0,
  onReact,
  onToggle,
  className = "",
}: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef<number | null>(null);
  const toolbarId = useId();
  const top = topReactionTypes(reactionCounts, 3);
  const total = Math.max(totalReactions(reactionCounts), likeCount);
  const active = reaction ? REACTION_META[reaction] : null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function clearLongPress() {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {top.length > 0 ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-2 py-0.5 text-sm shadow-[var(--shadow-sm)]"
          aria-label={`${total} reactions`}
        >
          {top.map(({ type }) => (
            <span key={type} className="leading-none" aria-hidden>
              {REACTION_META[type].emoji}
            </span>
          ))}
          <span className="ml-1 text-xs font-semibold text-[var(--muted-strong)] tabular-nums">
            {total}
          </span>
        </span>
      ) : null}

      <div className="relative">
        {open ? (
          <div
            id={toolbarId}
            role="toolbar"
            aria-label="Choose reaction"
            onKeyDown={(event) => {
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not([disabled])",
                ),
              ];
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                triggerRef.current?.focus();
              } else if (
                event.key === "ArrowRight" ||
                event.key === "ArrowDown"
              ) {
                event.preventDefault();
                buttons[(index + 1) % buttons.length]?.focus();
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
              }
            }}
            className="absolute bottom-[calc(100%+0.5rem)] left-0 z-20 flex gap-0.5 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
          >
            {REACTION_TYPES.map((type) => {
              const meta = REACTION_META[type];
              const selected = reaction === type;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={pending}
                  title={meta.label}
                  aria-label={meta.label}
                  aria-pressed={selected}
                  className={`grid size-9 place-items-center rounded-full text-lg transition-transform hover:scale-125 motion-reduce:hover:scale-100 ${
                    selected
                      ? "bg-[var(--signal-soft)] ring-2 ring-[var(--signal-deep)]"
                      : "hover:bg-[var(--mist)]"
                  }`}
                  onClick={() => {
                    onReact(type);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden>{meta.emoji}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <motion.button
          ref={triggerRef}
          type="button"
          disabled={pending}
          aria-label={active ? `${active.label} — tap to undo` : "React"}
          aria-pressed={Boolean(reaction)}
          aria-expanded={open}
          aria-controls={open ? toolbarId : undefined}
          className={`icon-button relative min-h-11 gap-1.5 overflow-visible px-3.5 text-sm ${
            reaction
              ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]"
              : ""
          }`}
          style={active ? { color: active.color } : undefined}
          onClick={() => onToggle()}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            setOpen(true);
            window.requestAnimationFrame(() => {
              const buttons =
                rootRef.current?.querySelectorAll<HTMLButtonElement>(
                  `#${CSS.escape(toolbarId)} button:not([disabled])`,
                );
              const target =
                event.key === "ArrowUp"
                  ? buttons?.[buttons.length - 1]
                  : buttons?.[0];
              target?.focus();
            });
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          onTouchStart={() => {
            clearLongPress();
            longPressRef.current = window.setTimeout(() => {
              setOpen(true);
              longPressRef.current = null;
            }, 420);
          }}
          onTouchEnd={clearLongPress}
          onTouchCancel={clearLongPress}
          animate={
            reduceMotion || !burstKey ? undefined : { scale: [1, 1.28, 1] }
          }
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <span className="text-base leading-none" aria-hidden>
            {active ? active.emoji : "👍"}
          </span>
          {!top.length ? (
            <span className="text-sm font-semibold text-current tabular-nums">
              {total}
            </span>
          ) : null}
        </motion.button>
      </div>
    </div>
  );
}
