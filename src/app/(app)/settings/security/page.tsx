"use client";

import Link from "next/link";
import { SecuritySettings } from "@/components/auth/security-settings";
import { PageTransition } from "@/components/motion/primitives";

export default function SecuritySettingsPage() {
  return (
    <PageTransition className="page-shell max-w-3xl">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Security
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Password, two-factor authentication, phone recovery, and trusted devices.
        </p>
      </div>
      <SecuritySettings />
    </PageTransition>
  );
}
