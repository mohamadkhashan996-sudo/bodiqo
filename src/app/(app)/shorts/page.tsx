"use client";

import dynamic from "next/dynamic";

const ShortsFeed = dynamic(
  () => import("@/components/shorts/shorts-feed").then((m) => m.ShortsFeed),
  {
    ssr: false,
    loading: () => (
      <div
        className="grid min-h-[100dvh] place-items-center bg-[var(--night)]"
        aria-busy="true"
        aria-label="Loading Shorts"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="skeleton size-14 rounded-[var(--radius-lg)] bg-white/10" />
          <p className="text-sm font-medium tracking-tight text-white/75">
            Loading Shorts…
          </p>
        </div>
      </div>
    ),
  },
);

export default function ShortsPage() {
  return <ShortsFeed />;
}
