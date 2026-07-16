"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-[var(--ink)]/35 p-5 backdrop-blur-sm" onMouseDown={onClose}><motion.section initial={{ y: 12, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: .98 }} onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-[2rem] border border-white/60 bg-[var(--cloud)] p-6 shadow-2xl"><header className="flex items-center justify-between"><h2 className="font-[family-name:var(--font-display)] text-2xl">{title}</h2><button onClick={onClose} aria-label="Close"><X className="size-5" /></button></header><div className="mt-5">{children}</div></motion.section></motion.div>}</AnimatePresence>;
}
