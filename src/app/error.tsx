"use client";

import { useEffect } from "react";
import Link from "next/link";

import { PageTransition } from "@/components/motion/primitives";
import { reportClientError } from "@/components/observability/client-error-reporter";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <PageTransition className="page-shell mx-auto max-w-lg py-20 text-center">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Relune</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-balance">
          This page stumbled
        </h1>
        <p className="page-subtitle mx-auto mt-3 text-sm">
          Something went wrong while loading this view. Your data is safe — try
          again in a moment.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/home"
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-5 text-sm font-semibold tracking-tight text-[var(--ink)] shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-[var(--cloud-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]"
          >
            Go home
          </Link>
        </div>
      </section>
    </PageTransition>
  );
}
