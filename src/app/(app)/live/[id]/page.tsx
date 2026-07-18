"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const LiveRoom = dynamic(
  () => import("@/components/live/live-room").then((m) => m.LiveRoom),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[100dvh] place-items-center bg-black text-sm text-white/70">
        Joining live…
      </div>
    ),
  },
);

export default function LiveWatchPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="fixed inset-0 z-[calc(var(--z-nav)+1)] bg-black lg:left-[var(--app-sidebar-width)]">
      <LiveRoom sessionId={id} />
    </div>
  );
}
