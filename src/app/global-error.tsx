"use client";

import { useEffect } from "react";
import Link from "next/link";

import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--cloud,#F4F2EE)] text-[var(--ink,#12141A)]">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <BrandLockup href="/" />
          <h1 className="mt-10 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted,#6B6A66)]">
            Relune hit an unexpected error. You can try again or return home.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--mist,#D8D4CC)] px-5 text-sm"
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
