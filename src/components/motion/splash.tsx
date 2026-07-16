"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const seen =
      typeof window !== "undefined" &&
      sessionStorage.getItem("cirqua_splash") === "1";
    if (seen) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => {
      sessionStorage.setItem("cirqua_splash", "1");
      setShow(false);
    }, 1600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--cloud)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/brand/mark.png"
              alt=""
              width={88}
              height={88}
              priority
              className="object-contain"
            />
          </motion.div>
          <motion.p
            className="mt-8 font-[family-name:var(--font-display)] text-3xl tracking-[0.35em] uppercase"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Cirqua
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
