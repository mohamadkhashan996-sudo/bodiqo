import Link from "next/link";
import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/primitives";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageTransition className="page-shell mx-auto max-w-lg py-20 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        This path isn’t here
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        The page may have moved, or the link is outdated. Explore Relune from
        home instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--ink)] px-5 text-sm text-[var(--cloud)]"
        >
          Home
        </Link>
        <Link
          href="/explore"
          className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--mist-strong)] px-5 text-sm"
        >
          Explore
        </Link>
      </div>
    </PageTransition>
  );
}
