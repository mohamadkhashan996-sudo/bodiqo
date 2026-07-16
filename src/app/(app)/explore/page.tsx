"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    followersCount: number;
    bio: string | null;
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

export default function ExplorePage() {
  const { t } = useExperience();
  const [reco, setReco] = useState<Reco | null>(null);
  const [trending, setTrending] = useState<Array<{ tag: string; predictedGrowth: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai?kind=recommend").then((r) => r.json()),
      fetch("/api/ai?kind=trending").then((r) => r.json()),
    ])
      .then(([r, tr]) => {
        setReco(r);
        setTrending(tr.predictions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition className="mx-auto max-w-6xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
        Discovery
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
        {t("explore", "title")}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        {t("explore", "subtitle")}
      </p>

      {loading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : null}

      {!loading && reco ? (
        <>
          <section className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {t("explore", "recommended")}
            </h2>
            <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reco.creators.slice(0, 6).map((user) => (
                <motion.div key={user.id} variants={staggerItem}>
                  <Link href={`/u/${user.handle}`}>
                    <Card interactive className="h-full">
                      <Avatar src={user.image} name={user.displayName ?? user.handle ?? "?"} />
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
              <Card>
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
              <Card>
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
