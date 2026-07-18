"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import type { FeedPost, HashtagSummary } from "@/types/feed";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const [hashtag, setHashtag] = useState<HashtagSummary | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const res = await fetch(
        `/api/hashtags/${encodeURIComponent(tag)}${cursor ? `?cursor=${cursor}` : ""}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          items: [] as FeedPost[],
          nextCursor: null,
          error: "Failed to load",
        };
      }
      if (!cursor) setHashtag(data.hashtag ?? null);
      return {
        items: (data.posts ?? []) as FeedPost[],
        nextCursor: data.nextCursor ?? null,
      };
    },
    [tag],
  );

  const {
    items: posts,
    loading,
    loadingMore,
    sentinelRef,
  } = useCursorFeed({
    resetKey: String(tag),
    fetchPage,
  });

  return (
    <PageTransition className="page-shell page-stack">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Hashtag</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          #{decodeURIComponent(tag)}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {hashtag
            ? `${hashtag.postCount.toLocaleString()} public posts`
            : "Loading topic activity…"}
        </p>
        <Link
          href="/trending"
          className="mt-4 inline-block text-sm font-semibold text-[var(--signal)]"
        >
          Browse trending topics →
        </Link>
      </section>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-72 rounded-[var(--radius-2xl)]" />
        </div>
      ) : null}

      {!loading && posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {loadingMore ? (
            <Skeleton className="h-48 rounded-[var(--radius-2xl)]" />
          ) : null}
          <div ref={sentinelRef} className="h-4" />
        </div>
      ) : null}

      {!loading && !posts.length ? (
        <EmptyState
          title="No posts for this hashtag yet"
          description="Be the first to start the conversation with this topic."
        />
      ) : null}
    </PageTransition>
  );
}
