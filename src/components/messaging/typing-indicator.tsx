"use client";
import { motion } from "framer-motion";

export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-3 text-xs font-medium text-[var(--muted-strong)]">
      <div className="flex gap-1 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-sm)]">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: dot * 0.12 }}
            className="size-1.5 rounded-full bg-[var(--signal-deep)]"
          />
        ))}
      </div>
      {name ? `${name} is composing` : "Someone is composing"}
    </div>
  );
}
