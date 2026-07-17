"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { StoriesRail } from "@/components/feed/stories-rail";
import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { FollowButton } from "@/components/social/follow-button";

import type { FeedPost, SuggestedUser } from "@/types/feed";

export function HomeFeed() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (after?: string | null) => {
    if (after) setLoadingMore(true);
    const res = await fetch(`/api/posts${after ? `?cursor=${after}` : ""}`);
    const data = await res.json();
    if (res.ok) {
      setPosts((old) => (after ? [...old, ...(data.posts ?? [])] : data.posts ?? []));
      setCursor(data.nextCursor ?? null);
    }
    setReady(true);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/social/suggested?limit=5")
      .then((r) => r.json())
      .then((d) => setSuggested(d.users ?? []))
      .catch(() => {});
  }, [load]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor) load(cursor);
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, load]);

  return (
    <PageTransition className="page-shell">
    <div className="grid gap-8 xl:grid-cols-[minmax(0,720px)_320px]">
      <section>
        <div className="glass-strong premium-ring hero-panel mb-7">
          <p className="text-[11px] font-semibold tracking-[.22em] text-[var(--signal)] uppercase">
            {session?.user ? "Your circle" : "Discover"}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
            {session?.user ? "Good to see you." : "Explore Relune."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            {session?.user
              ? "Your premium feed blends photos, videos, stories, and people worth following."
              : "Browse the public side of RELUNE with guest access to public posts, reels, profiles, and stories."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              "Elegant media-first browsing",
              "Smooth guest-to-member experience",
              "Privacy-first social architecture",
            ].map((item) => (
              <div key={item} className="kpi-chip px-4 py-3 text-sm text-[var(--muted)]">
                {item}
              </div>
            ))}
          </div>
        </div>
        <StoriesRail />
        {session?.user ? (
          <div className="mt-7">
            <PostComposer onCreated={(post) => setPosts((old) => [post, ...old])} />
          </div>
        ) : null}
        <div className="mt-6 space-y-4">
          {!ready ? (
            <div className="space-y-4">
              <Skeleton className="h-72 w-full rounded-[var(--radius-2xl)]" />
              <Skeleton className="h-80 w-full rounded-[var(--radius-2xl)]" />
            </div>
          ) : null}
          {posts.map((post) => (
            <PostCard post={post} key={post.id} />
          ))}
          {ready && !posts.length ? (
            <EmptyState
              title={session?.user ? "Your feed is quiet right now" : "No public posts yet"}
              description={
                session?.user
                  ? "Follow more creators or share the first moment that sets the tone."
                  : "Check back soon for public posts, photos, and videos."
              }
            />
          ) : null}
          {loadingMore ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-[var(--radius-xl)]" />
              <Skeleton className="h-48 w-full rounded-[var(--radius-xl)]" />
            </div>
          ) : null}
          <div ref={sentinel} className="h-4" />
        </div>
      </section>
      <aside className="hidden xl:block">
        <div className="sticky top-10 space-y-5">
          <div className="glass-strong rounded-[1.75rem] p-5 shadow-[var(--shadow-md)]">
          <p className="text-[11px] font-bold tracking-[.18em] text-[var(--muted)] uppercase">
            Worth meeting
          </p>
          <div className="mt-4 space-y-4">
            {suggested.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Link href={`/u/${user.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={user.image} name={user.displayName ?? user.name} className="size-9" />
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{user.displayName ?? user.name}</b>
                    <small className="text-[var(--muted)]">@{user.handle}</small>
                  </span>
                </Link>
                {user.handle ? (
                  <FollowButton handle={user.handle} className="min-h-8 px-2.5 text-[10px]" />
                ) : null}
              </div>
            ))}
          </div>
          <Link href="/explore" className="mt-5 block text-xs font-semibold text-[var(--signal)]">
            Explore the wider circle →
          </Link>
        </div>
          <div className="surface-panel rounded-[1.75rem] p-5">
            <p className="text-[11px] font-bold tracking-[.18em] text-[var(--muted)] uppercase">
              Public browsing
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Guests can watch reels, browse public profiles, and search public content.
              Restricted actions trigger a premium account prompt instead of dead ends.
            </p>
          </div>
        </div>
      </aside>
    </div>
    </PageTransition>
  );
}
