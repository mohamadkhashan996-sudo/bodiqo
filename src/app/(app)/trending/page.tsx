"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Hash } from "lucide-react";
import { PostCard } from "@/components/feed/post-card";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import type { FeedPost, HashtagSummary } from "@/types/feed";

export default function TrendingPage() {
  const [hashtags, setHashtags] = useState<HashtagSummary[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (after?: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (after) setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "12" });
      if (after) params.set("cursor", after);
      const res = await fetch(`/api/trending?${params}`);
      const data = await res.json();
      if (res.ok) {
        if (!after) setHashtags(data.hashtags ?? []);
        setPosts((old) =>
          after ? [...old, ...(data.posts ?? [])] : (data.posts ?? []),
        );
        setCursor(data.nextCursor ?? null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor && !loadingRef.current) {
        void load(cursor);
      }
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, load]);

  return (
    <PageTransition className="page-shell page-stack">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Trending now</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          What RELUNE is talking about.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Ranked by engagement and freshness over the last two weeks — with
          infinite scroll.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
            <Hash className="size-5 text-[var(--signal)]" />
            Hashtags
          </h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : hashtags.length ? (
            <div className="mt-4 space-y-3">
              {hashtags.map((tag) => (
                <Link key={tag.id} href={`/hashtag/${tag.tag}`}>
                  <Card interactive className="p-4">
                    <p className="font-semibold">#{tag.tag}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {tag.postCount.toLocaleString()} posts
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No trending hashtags yet" className="mt-4" />
          )}
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
            <Flame className="size-5 text-[var(--ember)]" />
            Rising posts
          </h2>
          {loading ? (
            <div className="mt-4 space-y-4">
              <Skeleton className="h-72 rounded-[var(--radius-2xl)]" />
            </div>
          ) : posts.length ? (
            <div className="mt-4 space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {loadingMore ? (
                <Skeleton className="h-48 rounded-[var(--radius-xl)]" />
              ) : null}
              <div ref={sentinel} className="h-4" />
            </div>
          ) : (
            <EmptyState title="No trending posts yet" className="mt-4" />
          )}
        </section>
      </div>
    </PageTransition>
  );
}
