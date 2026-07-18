"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Plus, Radio } from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useSocket } from "@/hooks/use-socket";
import { formatCount } from "@/lib/utils";

type LiveCard = {
  id: string;
  title: string;
  coverUrl?: string | null;
  viewerCount: number;
  host: {
    handle: string | null;
    displayName: string | null;
    name: string | null;
    image: string | null;
  };
};

export default function LiveDiscoverPage() {
  const { requireAuth } = useGuest();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState<LiveCard[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    void fetch("/api/live")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("live:started", refresh);
    socket.on("live:ended", refresh);
    return () => {
      socket.off("live:started", refresh);
      socket.off("live:ended", refresh);
    };
  }, [socket]);

  return (
    <PageTransition className="page-shell page-stack max-w-5xl">
      <PageHeader
        kicker="Broadcast"
        title="Live"
        description="Watch creators in real time — chat, send gifts, and join the moment."
        actions={
          <Button
            variant="signal"
            onClick={() => {
              if (!requireAuth()) return;
              window.location.href = "/live/go";
            }}
          >
            <Plus className="size-4" aria-hidden />
            Go live
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[9/14] rounded-[var(--radius-xl)]"
            />
          ))}
        </div>
      ) : null}

      {!loading && !sessions.length ? (
        <EmptyState
          title="No one is live yet"
          description="Be the first to start a stream."
          action={
            <Button
              variant="signal"
              onClick={() => {
                if (!requireAuth()) return;
                window.location.href = "/live/go";
              }}
            >
              Go live
            </Button>
          }
        />
      ) : null}

      {!loading && sessions.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sessions.map((s) => {
            const name =
              s.host.displayName ?? s.host.name ?? s.host.handle ?? "Creator";
            return (
              <Link
                key={s.id}
                href={`/live/${s.id}`}
                className="group relative aspect-[9/14] overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--night)] shadow-[var(--shadow-sm)]"
              >
                {s.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverUrl}
                    alt=""
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[var(--ink)] to-[var(--ember)]/40 p-4">
                    <Avatar
                      src={s.host.image}
                      name={name}
                      className="size-16"
                    />
                    <p className="text-center text-sm font-semibold text-white">
                      {name}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--ember)] px-2 py-1 text-[10px] font-bold text-white uppercase">
                  <Radio className="size-3" />
                  Live
                </span>
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Eye className="size-3" />
                  {formatCount(s.viewerCount)}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">
                    {s.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/70">
                    @{s.host.handle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </PageTransition>
  );
}
