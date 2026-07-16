"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = async (after?: string | null) => {
    if (after) setLoadingMore(true);
    const res = await fetch(`/api/bookmarks${after ? `?cursor=${after}` : ""}`);
    const data = await res.json();
    if (res.ok) {
      setPosts((old) => (after ? [...old, ...(data.posts ?? [])] : data.posts ?? []));
      setCursor(data.nextCursor ?? null);
    }
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor) void load(cursor);
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor]);

  return (
    <PageTransition className="page-shell page-stack max-w-3xl">
      <div>
        <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Saved posts
        </h1>
      </div>

      {loading ? <Skeleton className="h-72 rounded-[var(--radius-2xl)]" /> : null}
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
          title="No saved posts yet"
          description="Bookmark posts from your feed to revisit them here."
        />
      ) : null}
    </PageTransition>
  );
}
