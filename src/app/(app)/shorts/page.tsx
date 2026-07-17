"use client";

import dynamic from "next/dynamic";

const ShortsFeed = dynamic(
  () => import("@/components/shorts/shorts-feed").then((m) => m.ShortsFeed),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[100dvh] place-items-center bg-black text-sm text-white/70">
        Loading Shorts…
      </div>
    ),
  },
);

export default function ShortsPage() {
  return <ShortsFeed />;
}
