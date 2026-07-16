"use client";
import { motion } from "framer-motion";

export function TypingIndicator({ name }: { name?: string }) {
  return <div className="flex items-center gap-2 px-2 py-3 text-xs text-[var(--muted)]"><div className="flex gap-1 rounded-full bg-white px-3 py-2 shadow-sm">{[0, 1, 2].map((dot) => <motion.span key={dot} animate={{ y: [0, -3, 0], opacity: [.35, 1, .35] }} transition={{ repeat: Infinity, duration: .7, delay: dot * .12 }} className="size-1.5 rounded-full bg-[var(--signal)]" />)}</div>{name ? `${name} is composing` : "Someone is composing"}</div>;
}
