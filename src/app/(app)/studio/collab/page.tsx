"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Payload = {
  liveModeratorRoles: Array<{
    sessionId: string;
    title: string;
    status: string;
    host: string | null;
  }>;
  myLiveMods: Array<{
    sessionId: string;
    sessionTitle: string;
    sessionStatus: string;
    user: {
      id: string;
      handle: string | null;
      displayName: string | null;
      name: string | null;
    };
  }>;
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    membersCount: number;
  }>;
  closeFriends: Array<{
    id: string;
    handle: string | null;
    displayName: string | null;
    name: string | null;
  }>;
  note: string;
};

export default function StudioCollabPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/collab")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setData(json);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudioShell
      title="Collaboration"
      subtitle="Live moderators, communities, and close friends."
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {data ? (
        <>
          <p className="mb-4 text-sm text-[var(--muted)]">{data.note}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <StudioPanel title="You're moderating">
              <ul className="space-y-2 text-sm">
                {data.liveModeratorRoles.map((m) => (
                  <li key={`${m.sessionId}-${m.host}`}>
                    <Link
                      href={`/live/${m.sessionId}`}
                      className="hover:underline"
                    >
                      {m.title}
                    </Link>{" "}
                    · {m.status} · host {m.host}
                  </li>
                ))}
                {!data.liveModeratorRoles.length ? (
                  <li className="text-[var(--muted)]">No mod roles</li>
                ) : null}
              </ul>
            </StudioPanel>
            <StudioPanel title="Your live moderators">
              <ul className="space-y-2 text-sm">
                {data.myLiveMods.map((m) => (
                  <li key={`${m.sessionId}-${m.user.id}`}>
                    @{m.user.handle || "user"} on {m.sessionTitle} ({m.sessionStatus})
                  </li>
                ))}
                {!data.myLiveMods.length ? (
                  <li className="text-[var(--muted)]">
                    Add moderators from a live room.
                  </li>
                ) : null}
              </ul>
            </StudioPanel>
            <StudioPanel title="Communities you own">
              <ul className="space-y-2 text-sm">
                {data.communities.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <Link
                      href={`/communities/${c.slug}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span>{c.membersCount} members</span>
                  </li>
                ))}
                {!data.communities.length ? (
                  <li className="text-[var(--muted)]">No communities yet</li>
                ) : null}
              </ul>
            </StudioPanel>
            <StudioPanel title="Close friends">
              <ul className="space-y-2 text-sm">
                {data.closeFriends.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={f.handle ? `/u/${f.handle}` : "#"}
                      className="hover:underline"
                    >
                      @{f.handle || "user"}
                    </Link>
                  </li>
                ))}
                {!data.closeFriends.length ? (
                  <li className="text-[var(--muted)]">
                    Manage close friends from your profile privacy tools.
                  </li>
                ) : null}
              </ul>
            </StudioPanel>
          </div>
        </>
      ) : null}
    </StudioShell>
  );
}
