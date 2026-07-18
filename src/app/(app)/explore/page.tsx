"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

import { useExperience } from "@/components/experience-provider";
import { PostCard } from "@/components/feed/post-card";
import {
  PageTransition,
  Stagger,
  staggerItem,
} from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import type { FeedPost } from "@/types/feed";

type Creator = {
  id: string;
  handle: string | null;
  displayName: string | null;
  image: string | null;
  isVerified: boolean;
  followersCount?: number;
  bio?: string | null;
};

type CommunityHit = {
  id: string;
  slug: string;
  name: string;
  membersCount: number;
};

type RecoMeta = {
  creators: Creator[];
  videos: FeedPost[];
  communities: CommunityHit[];
  topics: Array<{ topic: string; score: number }>;
};

const emptyMeta: RecoMeta = {
  creators: [],
  videos: [],
  communities: [],
  topics: [],
};

function isApiError(value: unknown): value is { error: string } {
  return Boolean(value && typeof value === "object" && "error" in value);
}

async function loadSidebar(
  isMember: boolean,
  fresh = false,
): Promise<{
  meta: RecoMeta;
  trending: Array<{ tag: string; predictedGrowth: number }>;
}> {
  if (isMember) {
    const freshQ = fresh ? "&fresh=1" : "";
    const [recommendRes, trendingRes] = await Promise.all([
      fetch(`/api/ai?kind=recommend${freshQ}`),
      fetch("/api/ai?kind=trending"),
    ]);
    const recommend = await recommendRes.json().catch(() => ({}));
    const trending = await trendingRes.json().catch(() => ({}));

    if (recommendRes.ok && !isApiError(recommend)) {
      return {
        meta: {
          creators: Array.isArray(recommend.creators) ? recommend.creators : [],
          videos: Array.isArray(recommend.videos) ? recommend.videos : [],
          communities: Array.isArray(recommend.communities)
            ? recommend.communities
            : [],
          topics: Array.isArray(recommend.topics) ? recommend.topics : [],
        },
        trending: Array.isArray(trending.predictions)
          ? trending.predictions
          : [],
      };
    }
  }

  const [usersRes, communitiesRes] = await Promise.all([
    fetch("/api/explore?mode=users&limit=6"),
    fetch("/api/explore?mode=communities&limit=8"),
  ]);
  const users = await usersRes.json().catch(() => ({}));
  const communities = await communitiesRes.json().catch(() => ({}));
  return {
    meta: {
      creators: users.users ?? [],
      videos: [],
      communities: communities.communities ?? [],
      topics: [],
    },
    trending: [],
  };
}

export default function ExplorePage() {
  const { t } = useExperience();
  const { data: session, status } = useSession();
  const isMember = Boolean(session?.user);
  const [meta, setMeta] = useState<RecoMeta>(emptyMeta);
  const [trending, setTrending] = useState<
    Array<{ tag: string; predictedGrowth: number }>
  >([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedKey, setFeedKey] = useState("explore");

  const fetchPage = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams({ limit: "12" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/explore?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        items: [] as FeedPost[],
        nextCursor: null,
        error: "Failed to load",
      };
    }
    return {
      items: (data.posts ?? []) as FeedPost[],
      nextCursor: data.nextCursor ?? null,
    };
  }, []);

  const {
    items: posts,
    loading,
    loadingMore,
    sentinelRef,
  } = useCursorFeed({
    fetchPage,
    resetKey: feedKey,
  });

  const loadMeta = useCallback(
    async (fresh = false) => {
      setSidebarLoading(true);
      try {
        const next = await loadSidebar(isMember, fresh);
        setMeta(next.meta);
        setTrending(next.trending);
      } finally {
        setSidebarLoading(false);
      }
    },
    [isMember],
  );

  useEffect(() => {
    if (status === "loading") return;
    void loadMeta(false);
  }, [status, loadMeta]);

  async function refreshAll() {
    setRefreshing(true);
    try {
      await loadMeta(true);
      setFeedKey(`explore-${Date.now()}`);
    } finally {
      setRefreshing(false);
    }
  }

  const videos =
    meta.videos.length > 0
      ? meta.videos
      : posts.filter(
          (post) =>
            (post as { type?: string }).type === "VIDEO" ||
            (post as { type?: string }).type === "SHORT",
        );

  return (
    <PageTransition className="page-shell page-stack">
      <PageHeader
        kicker="Discovery"
        title={t("explore", "title")}
        description={t("explore", "subtitle")}
        actions={
          <Button
            type="button"
            variant="quiet"
            disabled={refreshing || status === "loading"}
            onClick={() => void refreshAll()}
          >
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {sidebarLoading || status === "loading" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("explore", "recommended")}
          </h2>
          {meta.creators.length ? (
            <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meta.creators.slice(0, 6).map((user) => (
                <motion.div key={user.id} variants={staggerItem}>
                  <Link href={`/u/${user.handle}`}>
                    <Card interactive className="h-full p-6">
                      <Avatar
                        src={user.image}
                        name={user.displayName ?? user.handle ?? "?"}
                        className="size-12"
                      />
                      <p className="mt-3 font-medium">
                        {user.displayName ?? user.handle}
                        {user.isVerified ? " ✓" : ""}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        @{user.handle}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                        {user.bio || `${user.followersCount ?? 0} followers`}
                      </p>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </Stagger>
          ) : (
            <EmptyState
              title="No creators to recommend yet"
              description="Public profiles will appear here as the community grows."
              className="mt-4"
            />
          )}
        </section>
      )}

      <section className="mt-12 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("explore", "trendingPosts")}
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
              <EmptyState title={t("empty", "feed")} className="mt-4" />
            ) : null}
            {loadingMore ? <Skeleton className="h-40" /> : null}
            <div ref={sentinelRef} className="h-4" aria-hidden />
          </div>
        </div>

        <aside className="space-y-6">
          {trending.length ? (
            <Card className="p-6">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                {t("explore", "trendingHashtags")}
              </h3>
              <ul className="mt-4 space-y-2 text-sm">
                {trending.map((h) => (
                  <li key={h.tag} className="flex justify-between gap-3">
                    <Link
                      href={`/hashtag/${encodeURIComponent(h.tag.replace(/^#/, ""))}`}
                      className="font-medium hover:text-[var(--signal-deep)]"
                    >
                      {h.tag.startsWith("#") ? h.tag : `#${h.tag}`}
                    </Link>
                    <span className="text-[var(--muted)]">
                      ↑{h.predictedGrowth}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-6">
            <h3 className="text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              {t("explore", "communities")}
            </h3>
            {meta.communities.length ? (
              <ul className="mt-4 space-y-3 text-sm">
                {meta.communities.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/communities/${c.slug}`}
                      className="font-medium hover:text-[var(--signal-deep)]"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {c.membersCount} members
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Public communities will show up here.
              </p>
            )}
          </Card>

          {meta.topics.length ? (
            <Card className="p-6">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                For you
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {meta.topics.map((topic) => (
                  <li key={topic.topic}>
                    <Link
                      href={`/search?q=${encodeURIComponent(topic.topic)}`}
                      className="rounded-full bg-[var(--mist)] px-3 py-1 text-xs font-medium hover:bg-[var(--mist-strong)]"
                    >
                      {topic.topic}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </section>

      {videos.length ? (
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            {t("explore", "trendingVideos")}
          </h2>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            {videos.slice(0, 8).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}
