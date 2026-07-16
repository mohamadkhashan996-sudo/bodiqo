"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const seen =
      typeof window !== "undefined" &&
      sessionStorage.getItem("relune_splash") === "1";
    if (seen) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => {
      sessionStorage.setItem("relune_splash", "1");
      setShow(false);
    }, reduce ? 400 : 1700);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_#faf8f4_0%,_var(--cloud)_70%)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-label="Loading Relune"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0.2 : 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/brand/mark.png"
              alt=""
              width={92}
              height={92}
              priority
              className="object-contain"
            />
          </motion.div>
          <motion.p
            className="mt-8 font-[family-name:var(--font-display)] text-3xl tracking-[0.32em] uppercase text-[var(--ink)]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Relune
          </motion.p>
          <motion.p
            className="mt-3 text-xs tracking-[0.18em] text-[var(--muted)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : 0.55 }}
          >
            Presence, beautifully shared.
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
