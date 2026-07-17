"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import type { FeedPost, HashtagSummary } from "@/types/feed";

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const [hashtag, setHashtag] = useState<HashtagSummary | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (after?: string | null) => {
    if (after) setLoadingMore(true);
    const res = await fetch(
      `/api/hashtags/${encodeURIComponent(tag)}${after ? `?cursor=${after}` : ""}`,
    );
    const data = await res.json();
    if (res.ok) {
      setHashtag(data.hashtag);
      setPosts((old) => (after ? [...old, ...(data.posts ?? [])] : data.posts ?? []));
      setCursor(data.nextCursor ?? null);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [tag]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor) void load(cursor);
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, load]);

  return (
    <PageTransition className="page-shell page-stack">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Hashtag</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          #{decodeURIComponent(tag)}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {hashtag ? `${hashtag.postCount.toLocaleString()} public posts` : "Loading topic activity…"}
        </p>
        <Link href="/trending" className="mt-4 inline-block text-sm font-semibold text-[var(--signal)]">
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
          {loadingMore ? <Skeleton className="h-48 rounded-[var(--radius-2xl)]" /> : null}
          <div ref={sentinel} className="h-4" />
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
