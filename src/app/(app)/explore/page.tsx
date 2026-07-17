"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { PostCard } from "@/components/feed/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition, Stagger, staggerItem } from "@/components/motion/primitives";
import { useExperience } from "@/components/experience-provider";

type Reco = {
  creators: Array<{
    id: string;
    handle: string | null;
    displayName: string | null;
    image: string | null;
    isVerified: boolean;
    followersCount?: number;
    bio?: string | null;
  }>;
  posts: Array<Record<string, unknown>>;
  videos: Array<Record<string, unknown>>;
  communities: Array<{
    id: string;
    slug: string;
    name: string;
    membersCount: number;
  }>;
  topics: Array<{ topic: string; score: number }>;
};

const emptyReco: Reco = {
  creators: [],
  posts: [],
  videos: [],
  communities: [],
  topics: [],
};

function isApiError(value: unknown): value is { error: string } {
  return Boolean(value && typeof value === "object" && "error" in value);
}

function normalizeReco(data: unknown): Reco {
  if (!data || typeof data !== "object" || isApiError(data)) return emptyReco;

  const payload = data as Partial<Reco>;
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const videos = Array.isArray(payload.videos)
    ? payload.videos
    : posts.filter(
        (post) =>
          (post as { type?: string }).type === "VIDEO" ||
          (post as { type?: string }).type === "SHORT",
      );

  return {
    creators: Array.isArray(payload.creators) ? payload.creators : [],
    posts,
    videos,
    communities: Array.isArray(payload.communities) ? payload.communities : [],
    topics: Array.isArray(payload.topics) ? payload.topics : [],
  };
}

async function loadGuestExplore(): Promise<Reco> {
  const [exploreRes, usersRes] = await Promise.all([
    fetch("/api/explore?limit=20"),
    fetch("/api/explore?mode=users&limit=6"),
  ]);
  const explore = await exploreRes.json();
  const users = await usersRes.json();

  return normalizeReco({
    creators: users.users ?? [],
    posts: explore.posts ?? [],
    communities: [],
    topics: [],
  });
}

async function loadMemberExplore(): Promise<{ reco: Reco; trending: Array<{ tag: string; predictedGrowth: number }> }> {
  const [recommendRes, trendingRes] = await Promise.all([
    fetch("/api/ai?kind=recommend"),
    fetch("/api/ai?kind=trending"),
  ]);
  const recommend = await recommendRes.json();
  const trending = await trendingRes.json();

  if (!recommendRes.ok || isApiError(recommend)) {
    return { reco: await loadGuestExplore(), trending: [] };
  }

  return {
    reco: normalizeReco(recommend),
    trending: Array.isArray(trending.predictions) ? trending.predictions : [],
  };
}

export default function ExplorePage() {
  const { t } = useExperience();
  const { data: session, status } = useSession();
  const [reco, setReco] = useState<Reco>(emptyReco);
  const [trending, setTrending] = useState<Array<{ tag: string; predictedGrowth: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    setLoading(true);
    const load = session?.user
      ? loadMemberExplore().then(({ reco: nextReco, trending: nextTrending }) => {
          setReco(nextReco);
          setTrending(nextTrending);
        })
      : loadGuestExplore().then((nextReco) => {
          setReco(nextReco);
          setTrending([]);
        });

    void load.finally(() => setLoading(false));
  }, [session?.user, status]);

  return (
    <PageTransition className="section-shell">
      <div className="glass-strong premium-ring rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6 md:p-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
        Discovery
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl md:text-5xl">
        {t("explore", "title")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        {t("explore", "subtitle")}
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          "Public posts and videos surfaced for discovery",
          "Creators, communities, and hashtags in one space",
          "Smooth loading states and premium editorial rhythm",
        ].map((item) => (
          <div key={item} className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-[var(--shadow-sm)]">
            {item}
          </div>
        ))}
      </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : null}

      {!loading ? (
        <>
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {t("explore", "recommended")}
            </h2>
            {reco.creators.length ? (
            <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reco.creators.slice(0, 6).map((user) => (
                <motion.div key={user.id} variants={staggerItem}>
                  <Link href={`/u/${user.handle}`}>
                    <Card interactive className="h-full p-6">
                      <Avatar src={user.image} name={user.displayName ?? user.handle ?? "?"} className="size-12" />
                      <p className="mt-3 font-medium">
                        {user.displayName ?? user.handle}
                        {user.isVerified ? " ✓" : ""}
                      </p>
                      <p className="text-xs text-[var(--muted)]">@{user.handle}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                        {user.bio || `${user.followersCount} followers`}
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

          <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_280px]">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {t("explore", "trendingPosts")}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reco.posts.slice(0, 6).map((post) => (
                  <PostCard key={String(post.id)} post={post as never} />
                ))}
              </div>
              {!reco.posts.length ? (
                <EmptyState title={t("empty", "feed")} className="mt-4" />
              ) : null}
            </div>
            <aside className="space-y-6">
              <Card className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {t("explore", "trendingHashtags")}
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {trending.map((h) => (
                    <li key={h.tag} className="flex justify-between gap-3">
                      <span>{h.tag}</span>
                      <span className="text-[var(--muted)]">↑{h.predictedGrowth}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {t("explore", "communities")}
                </h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {reco.communities.map((c) => (
                    <li key={c.id}>
                      <Link href={`/communities/${c.slug}`} className="font-medium hover:text-[var(--signal-deep)]">
                        {c.name}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{c.membersCount} members</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </aside>
          </section>

          {reco.videos.length ? (
            <section className="mt-12">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                {t("explore", "trendingVideos")}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reco.videos.map((post) => (
                  <PostCard key={String(post.id)} post={post as never} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </PageTransition>
  );
}
