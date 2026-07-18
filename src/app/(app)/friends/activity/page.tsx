"use client";

import { useCallback } from "react";
import Link from "next/link";

import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import type { FeedPost } from "@/types/feed";

export default function FriendActivityPage() {
  const fetchPage = useCallback(async (cursor: string | null) => {
    const res = await fetch(
      `/api/social/friends?mode=activity${cursor ? `&cursor=${cursor}` : ""}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        items: [] as FeedPost[],
        nextCursor: null,
        error: data.error || "Unavailable",
      };
    }
    return {
      items: (data.posts ?? []) as FeedPost[],
      nextCursor: data.nextCursor ?? null,
    };
  }, []);

  const { items: posts, loading, loadingMore, error, sentinelRef } =
    useCursorFeed({
      resetKey: "friend-activity",
      fetchPage,
    });

  return (
    <PageTransition className="page-shell page-stack max-w-2xl">
      <div>
        <Link
          href="/home"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Home
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Friend activity
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Recent posts from people you’re friends with.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : null}

      {error ? <EmptyState title={error} /> : null}

      {!loading && !error && posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {loadingMore ? <Skeleton className="h-32" /> : null}
          <div ref={sentinelRef} className="h-4" />
        </div>
      ) : null}

      {!loading && !error && !posts.length ? (
        <EmptyState
          title="No friend posts yet"
          description="When your friends share something, it will show up here."
        />
      ) : null}
    </PageTransition>
  );
}
