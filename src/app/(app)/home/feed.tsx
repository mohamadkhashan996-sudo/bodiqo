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
import { Tabs } from "@/components/ui/tabs";
import { FollowButton } from "@/components/social/follow-button";

import type { FeedPost, SuggestedUser } from "@/types/feed";

type FeedTab = "Home" | "Following" | "Latest" | "For you";

const TAB_MODE: Record<FeedTab, string> = {
  Home: "home",
  Following: "following",
  Latest: "latest",
  "For you": "foryou",
};

export function HomeFeed() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<FeedTab>("Home");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (after?: string | null, mode = TAB_MODE[tab]) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (after) setLoadingMore(true);
      else setReady(false);
      try {
        const params = new URLSearchParams({ mode });
        if (after) params.set("cursor", after);
        const res = await fetch(`/api/posts?${params}`);
        const data = await res.json();
        if (res.ok) {
          setPosts((old) =>
            after ? [...old, ...(data.posts ?? [])] : (data.posts ?? []),
          );
          setCursor(data.nextCursor ?? null);
        }
      } finally {
        setReady(true);
        setLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [tab],
  );

  useEffect(() => {
    setPosts([]);
    setCursor(null);
    void load(null, TAB_MODE[tab]);
  }, [tab, load]);

  useEffect(() => {
    fetch("/api/social/suggested?limit=5")
      .then((r) => r.json())
      .then((d) => setSuggested(d.users ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor && !loadingRef.current) {
        void load(cursor);
      }
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, load]);

  const emptyCopy =
    tab === "Following"
      ? {
          title: "No posts from people you follow",
          description: "Follow creators to fill this feed with their updates.",
        }
      : tab === "For you"
        ? {
            title: "No recommendations yet",
            description:
              "Like posts and pick interests so Relune can personalize this feed.",
          }
        : {
            title: session?.user ? "Your feed is quiet right now" : "No public posts yet",
            description: session?.user
              ? "Follow more creators or share the first moment that sets the tone."
              : "Check back soon for public posts, photos, and videos.",
          };

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
              Home, following, latest, and AI-ranked picks — with infinite scroll
              and smart ranking on discovery feeds.
            </p>
          </div>
          <StoriesRail />
          {session?.user ? (
            <div className="mt-7">
              <PostComposer
                onCreated={(post) => {
                  if (tab === "Home" || tab === "Latest" || tab === "Following") {
                    setPosts((old) => [post, ...old]);
                  }
                }}
              />
            </div>
          ) : null}
          <div className="mt-6">
            <Tabs
              items={["Home", "Following", "Latest", "For you"]}
              value={tab}
              onChange={(value) => setTab(value as FeedTab)}
            />
          </div>
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
                title={emptyCopy.title}
                description={emptyCopy.description}
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
                    <Link
                      href={`/u/${user.handle}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Avatar
                        src={user.image}
                        name={user.displayName ?? user.name}
                        className="size-9"
                      />
                      <span className="min-w-0">
                        <b className="block truncate text-sm">
                          {user.displayName ?? user.name}
                        </b>
                        <small className="text-[var(--muted)]">@{user.handle}</small>
                      </span>
                    </Link>
                    {user.handle ? (
                      <FollowButton
                        handle={user.handle}
                        className="min-h-8 px-2.5 text-[10px]"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <Link
                href="/trending"
                className="mt-5 block text-xs font-semibold text-[var(--signal)]"
              >
                See what&apos;s trending →
              </Link>
              <Link
                href="/explore"
                className="mt-2 block text-xs font-semibold text-[var(--signal)]"
              >
                Explore AI recommendations →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </PageTransition>
  );
}
