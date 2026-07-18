"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Clapperboard, Flame, Hash, Search, Users } from "lucide-react";

import { VerificationBadge } from "@/components/brand/official-badge";
import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import type { FeedPost } from "@/types/feed";

type HashtagHit = {
  id: string;
  tag: string;
  postCount: number;
  recentCount?: number;
};

type TrendingUser = {
  id: string;
  handle: string | null;
  displayName: string | null;
  name: string | null;
  image: string | null;
  isVerified?: boolean;
  followersCount?: number;
  trendScore?: number;
};

type TrendingSearch = {
  query: string;
  count: number;
};

const TABS = ["Posts", "Videos"] as const;

export default function TrendingPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Posts");
  const [hashtags, setHashtags] = useState<HashtagHit[]>([]);
  const [users, setUsers] = useState<TrendingUser[]>([]);
  const [searches, setSearches] = useState<TrendingSearch[]>([]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const params = new URLSearchParams({
        limit: "12",
        media: tab === "Videos" ? "video" : "all",
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/trending?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          items: [] as FeedPost[],
          nextCursor: null,
          error: "Failed to load",
        };
      }
      if (!cursor) {
        setHashtags(data.hashtags ?? []);
        setUsers(data.users ?? []);
        setSearches(data.searches ?? []);
      }
      return {
        items: (data.posts ?? []) as FeedPost[],
        nextCursor: data.nextCursor ?? null,
      };
    },
    [tab],
  );

  const {
    items: posts,
    loading,
    loadingMore,
    sentinelRef,
  } = useCursorFeed({
    fetchPage,
    resetKey: tab,
  });

  return (
    <PageTransition className="page-shell page-stack">
      <PageHeader
        kicker="Trending now"
        title="What Relune is talking about."
        description="Global ranking by engagement and freshness over the last two weeks — with windowed hashtags, creators, and popular searches."
      />

      <Tabs
        aria-label="Trending media"
        items={[...TABS]}
        value={tab}
        onChange={(value) => {
          if (TABS.includes(value as (typeof TABS)[number])) {
            setTab(value as (typeof TABS)[number]);
          }
        }}
      />

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="space-y-8">
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
                        {(tag.recentCount ?? tag.postCount).toLocaleString()}{" "}
                        posts this week
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No trending hashtags yet" className="mt-4" />
            )}
          </section>

          {users.length ? (
            <section>
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
                <Users className="size-5 text-[var(--signal)]" />
                Creators
              </h2>
              <div className="mt-4 space-y-3">
                {users.map((user) => (
                  <Link key={user.id} href={`/u/${user.handle}`}>
                    <Card interactive className="flex items-center gap-3 p-4">
                      <Avatar
                        src={user.image}
                        name={user.displayName ?? user.name ?? user.handle}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.displayName ?? user.name}
                          <VerificationBadge
                            isVerified={user.isVerified}
                            className="ml-1 inline-block align-middle"
                          />
                        </p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          @{user.handle}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {searches.length ? (
            <section>
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
                <Search className="size-5 text-[var(--signal)]" />
                Searches
              </h2>
              <ul className="mt-4 space-y-2">
                {searches.map((row) => (
                  <li key={row.query}>
                    <Link
                      href={`/search?q=${encodeURIComponent(row.query)}`}
                      className="flex items-center justify-between rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] px-4 py-3 text-sm hover:bg-[var(--surface)]"
                    >
                      <span className="font-medium">{row.query}</span>
                      <span className="text-xs text-[var(--muted)]">
                        {row.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <section>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
            {tab === "Videos" ? (
              <Clapperboard className="size-5 text-[var(--ember)]" />
            ) : (
              <Flame className="size-5 text-[var(--ember)]" />
            )}
            {tab === "Videos" ? "Hot videos" : "Hot posts"}
          </h2>
          <div className="mt-4 space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : null}
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {!loading && !posts.length ? (
              <EmptyState
                title={
                  tab === "Videos"
                    ? "No trending videos yet"
                    : "No trending posts yet"
                }
              />
            ) : null}
            {loadingMore ? <Skeleton className="h-40" /> : null}
            <div ref={sentinelRef} className="h-4" />
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
