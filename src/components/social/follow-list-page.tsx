"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { VerificationBadge } from "@/components/brand/official-badge";
import {
  FollowButton,
  type FollowRelation,
} from "@/components/social/follow-button";

type Person = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
  bio?: string | null;
  relation?: FollowRelation;
};

export default function FollowListPage({ mode }: { mode: "followers" | "following" }) {
  const { handle } = useParams<{ handle: string }>();
  const [users, setUsers] = useState<Person[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  async function load(after?: string | null) {
    if (after) setLoadingMore(true);
    const res = await fetch(
      `/api/users/${handle}/${mode}${after ? `?cursor=${after}` : ""}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Unavailable");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    setUsers((old) => (after ? [...old, ...(data.users ?? [])] : data.users ?? []));
    setCursor(data.nextCursor ?? null);
    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, mode]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor) void load(cursor);
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, handle, mode]);

  return (
    <PageTransition className="page-shell page-stack max-w-2xl">
      <div>
        <Link href={`/u/${handle}`} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← @{handle}
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight capitalize">
          {mode}
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      {error ? <EmptyState title={error} description="This list may be private." /> : null}

      {!loading && !error && users.length ? (
        <div className="space-y-3">
          {users.map((person) => (
            <div
              key={person.id}
              className="surface-panel-strong flex items-center gap-3 rounded-[var(--radius-xl)] p-4"
            >
              <Link href={`/u/${person.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={person.image}
                  name={person.displayName ?? person.name}
                  className="size-12"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <b className="truncate">{person.displayName ?? person.name}</b>
                    <VerificationBadge
                      isOfficial={person.isOfficial}
                      isVerified={person.isVerified}
                      className="size-4"
                    />
                  </span>
                  <small className="block text-[var(--muted)]">@{person.handle}</small>
                  {person.bio ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">{person.bio}</p>
                  ) : null}
                </span>
              </Link>
              {person.handle && person.relation !== "self" ? (
                <FollowButton
                  handle={person.handle}
                  initialRelation={person.relation ?? "none"}
                />
              ) : null}
            </div>
          ))}
          {loadingMore ? <Skeleton className="h-16" /> : null}
          <div ref={sentinel} className="h-4" />
        </div>
      ) : null}

      {!loading && !error && !users.length ? (
        <EmptyState
          title={mode === "followers" ? "No followers yet" : "Not following anyone yet"}
        />
      ) : null}
    </PageTransition>
  );
}
