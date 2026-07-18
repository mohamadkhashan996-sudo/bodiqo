"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper so the marketing Server Component can lazy-load the
 * reel preview with `ssr: false` (not allowed directly in Server Components).
 */
export const LandingPhonePreview = dynamic(
  () =>
    import("@/components/marketing/phone-reel-preview").then(
      (m) => m.PhoneReelPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="mx-auto aspect-[9/19] w-full max-w-[min(21.5rem,100%)] rounded-[2.5rem] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
      />
    ),
  },
);
