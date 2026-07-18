"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { VerificationBadge } from "@/components/brand/official-badge";
import { PageTransition } from "@/components/motion/primitives";
import {
  FollowButton,
  type FollowRelation,
} from "@/components/social/follow-button";
import { FriendButton } from "@/components/social/friend-button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { useCursorFeed } from "@/hooks/use-cursor-feed";

type Person = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
  relation?: FollowRelation | "self";
};

export default function MutualFriendsPage() {
  const { handle } = useParams<{ handle: string }>();

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const res = await fetch(
        `/api/users/${handle}/mutual-friends${cursor ? `?cursor=${cursor}` : ""}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          items: [] as Person[],
          nextCursor: null,
          error: data.error || "Unavailable",
        };
      }
      return {
        items: (data.users ?? []) as Person[],
        nextCursor: data.nextCursor ?? null,
      };
    },
    [handle],
  );

  const { items: users, loading, loadingMore, error, sentinelRef } =
    useCursorFeed({
      resetKey: `mutual:${handle}`,
      fetchPage,
    });

  return (
    <PageTransition className="page-shell page-stack max-w-2xl">
      <div>
        <Link
          href={`/u/${handle}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← @{handle}
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Mutual friends
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          People you’re both friends with.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      {error ? (
        <EmptyState title={error} description="This list may be private." />
      ) : null}

      {!loading && !error && users.length ? (
        <div className="space-y-3">
          {users.map((person) => (
            <div
              key={person.id}
              className="surface-panel-strong flex items-center gap-3 rounded-[var(--radius-xl)] p-4"
            >
              <Link
                href={`/u/${person.handle}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  src={person.image}
                  name={person.displayName ?? person.name}
                  className="size-12"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <b className="truncate">
                      {person.displayName ?? person.name}
                    </b>
                    <VerificationBadge
                      isOfficial={person.isOfficial}
                      isVerified={person.isVerified}
                      className="size-4"
                    />
                  </span>
                  <small className="block text-[var(--muted)]">
                    @{person.handle}
                  </small>
                </span>
              </Link>
              {person.handle && person.relation !== "self" ? (
                <div className="flex shrink-0 gap-2">
                  <FollowButton
                    handle={person.handle}
                    userId={person.id}
                    initialRelation="following"
                  />
                  <FriendButton userId={person.id} initialRelation="friends" />
                </div>
              ) : null}
            </div>
          ))}
          {loadingMore ? <Skeleton className="h-16" /> : null}
          <div ref={sentinelRef} className="h-4" />
        </div>
      ) : null}

      {!loading && !error && !users.length ? (
        <EmptyState
          title="No mutual friends"
          description="When you share friends with this person, they’ll show up here."
        />
      ) : null}
    </PageTransition>
  );
}
