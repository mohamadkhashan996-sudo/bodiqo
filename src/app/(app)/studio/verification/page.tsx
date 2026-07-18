"use client";

import Link from "next/link";

import { StudioPanel, StudioShell } from "@/components/studio/studio-shell";

export default function StudioVerificationPage() {
  return (
    <StudioShell
      title="Creator verification"
      subtitle="Request or check Relune verification for your creator profile."
    >
      <StudioPanel title="Verification center">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Verification is handled in Settings. Submit a Creator request with
          evidence links; staff review in the admin verification queue.
        </p>
        <Link
          href="/settings/verification"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[var(--signal-deep)] bg-[var(--signal-deep)] px-5 text-sm font-semibold text-white"
        >
          Open verification settings
        </Link>
      </StudioPanel>
    </StudioShell>
  );
}
