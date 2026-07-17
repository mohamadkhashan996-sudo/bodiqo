"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/motion/primitives";
import { reportClientError } from "@/components/observability/client-error-reporter";

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
      <p className="kicker">Relune</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        This page stumbled
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Something went wrong while loading this view. Your data is safe — try
        again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/home"
          className="inline-flex min-h-11 items-center rounded-full border-2 border-[var(--mist-strong)] px-5 text-sm"
        >
          Go home
        </Link>
      </div>
    </PageTransition>
  );
}
