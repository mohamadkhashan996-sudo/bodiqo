"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(31,155,142,0.18),transparent_45%),radial-gradient(ellipse_at_90%_20%,rgba(217,138,78,0.16),transparent_40%),linear-gradient(180deg,var(--cloud),#ebe6dc)]" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-6xl items-end gap-12 px-5 pb-20 pt-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-8 md:pb-28">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="font-[family-name:var(--font-display)] text-6xl tracking-[0.28em] uppercase sm:text-7xl md:text-8xl"
            >
              Relune
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-xl text-3xl font-light leading-tight tracking-tight md:text-5xl"
            >
              Presence, beautifully shared.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)] md:text-lg"
            >
              A social platform for cinematic expression, real conversation, and
              communities that feel intimate at planetary scale.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                href="/sign-up"
                className="rounded-full bg-[var(--signal)] px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-white uppercase transition hover:bg-[var(--signal-deep)]"
              >
                Create account
              </Link>
              <Link
                href="/home"
                className="rounded-full border border-[var(--ink)]/15 px-7 py-3.5 text-[11px] font-semibold tracking-[0.2em] uppercase transition hover:border-[var(--signal)] hover:text-[var(--signal-deep)]"
              >
                Enter space
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[var(--night)] shadow-[0_40px_120px_var(--shadow)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(31,155,142,0.35),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(217,138,78,0.28),transparent_45%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/brand/mark.png"
                alt=""
                width={160}
                height={160}
                className="opacity-90 invert"
                priority
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-8">
              <p className="text-[11px] tracking-[0.24em] text-white/60 uppercase">
                Designed for presence
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">
                Slow scroll. Rich media. Circles that feel like rooms, not
                billboards.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <p className="text-[11px] tracking-[0.28em] text-[var(--signal)] uppercase">
          Why Relune
        </p>
        <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl md:text-5xl">
          Built as a global product from the first commit
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {[
            {
              title: "Cinematic feed",
              body: "Media-first storytelling with room to breathe — never a clone of existing apps.",
            },
            {
              title: "Circles",
              body: "Communities shaped like intentional rooms for people who share a craft or mood.",
            },
            {
              title: "Trust architecture",
              body: "Rate limits, audit trails, and account trust scoring prepared for real growth.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-[family-name:var(--font-display)] text-2xl">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
