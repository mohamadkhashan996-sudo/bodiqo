import type { Metadata } from "next";
import Link from "next/link";

import { PageTransition } from "@/components/motion/primitives";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageTransition className="page-shell mx-auto max-w-lg py-20 text-center">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">404</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-balance">
          This path isn’t here
        </h1>
        <p className="page-subtitle mx-auto mt-3 text-sm">
          The page may have moved, or the link is outdated. Explore Relune from
          home instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-5 text-sm font-semibold tracking-tight text-[var(--cloud-elevated)] shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-[var(--ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]"
          >
            Home
          </Link>
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-5 text-sm font-semibold tracking-tight shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[var(--cloud-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]"
          >
            Explore
          </Link>
        </div>
      </section>
    </PageTransition>
  );
}
