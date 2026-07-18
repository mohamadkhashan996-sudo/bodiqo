"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  // Start hidden to avoid SSR/client hydration mismatch and accidental click traps
  // after the splash was already dismissed in this session.
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    if (sessionStorage.getItem("relune_splash") === "1") return;
    setShow(true);
    const hideMs = mq.matches ? 200 : 700;
    const fadeMs = mq.matches ? 150 : 320;
    const hide = window.setTimeout(() => {
      sessionStorage.setItem("relune_splash", "1");
      setVisible(false);
    }, hideMs);
    const unmount = window.setTimeout(() => {
      setShow(false);
    }, hideMs + fadeMs);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(unmount);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_#faf8f4_0%,_var(--cloud)_70%)] transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: reduce ? "200ms" : "450ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: visible ? "auto" : "none",
      }}
      role="status"
      aria-label="Loading Relune"
      aria-live="polite"
    >
      <div
        className="transition-all"
        style={{
          opacity: visible ? 1 : 0.85,
          transform: visible ? "scale(1)" : "scale(0.98)",
          transitionDuration: reduce ? "200ms" : "600ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Image
          src="/brand/mark.png"
          alt=""
          width={92}
          height={92}
          priority
          className="object-contain"
        />
      </div>
      <p
        className="mt-8 font-[family-name:var(--font-display)] text-3xl tracking-[0.32em] text-[var(--ink)] uppercase"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: `opacity ${reduce ? 200 : 400}ms ease, transform ${reduce ? 200 : 400}ms ease`,
        }}
      >
        Relune
      </p>
      <p
        className="mt-3 text-xs tracking-[0.18em] text-[var(--muted)]"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${reduce ? 150 : 300}ms ease`,
        }}
      >
        Presence, beautifully shared.
      </p>
    </div>
  );
}
