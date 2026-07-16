"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { MediaLightbox } from "@/components/media/lightbox";
import { PostCard } from "@/components/feed/post-card";
import { useExperience } from "@/components/experience-provider";
import { useGuest } from "@/components/auth/guest-provider";

type ProfileVisibility = {
  isPrivate?: boolean;
  canViewContent?: boolean;
  canViewFollowers?: boolean;
  canViewFollowing?: boolean;
  followStatus?: "none" | "following" | "requested";
};

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { t } = useExperience();
  const { requireAuth } = useGuest();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [visibility, setVisibility] = useState<ProfileVisibility>({});
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([]);
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("Posts");
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/users/${handle}`)
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        setVisibility((d.user?.visibility as ProfileVisibility) ?? {});
      })
      .catch(() => setUser(null));
    fetch(`/api/posts?author=${handle}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts ?? []);
        setLocked(Boolean(d.locked));
      })
      .catch(() => setPosts([]));
  }, [handle]);

  const media = useMemo(
    () =>
      posts
        .flatMap((p) =>
          ((p.media as Array<{ url: string }> | undefined) ?? []).map((m) => ({
            url: m.url,
            alt: String(p.body ?? ""),
          })),
        )
        .filter((m) => m.url),
    [posts],
  );

  const videos = posts.filter((p) => p.type === "VIDEO" || p.type === "SHORT");

  async function social(action: string) {
    if (!requireAuth()) return;
    const followStatus = visibility.followStatus ?? "none";
    const method =
      action === "follow" && followStatus === "following" ? "DELETE" : "POST";
    const res = await fetch(`/api/users/${handle}/${action}`, { method });
    if (res.ok && action === "follow") {
      const next =
        followStatus === "following"
          ? "none"
          : visibility.isPrivate
            ? "requested"
            : "following";
      setVisibility((v) => ({ ...v, followStatus: next }));
      if (next === "following") {
        fetch(`/api/posts?author=${handle}`)
          .then((r) => r.json())
          .then((d) => {
            setPosts(d.posts ?? []);
            setLocked(Boolean(d.locked));
          })
          .catch(() => {});
      }
    }
  }

  const followLabel =
    visibility.followStatus === "following"
      ? t("common", "following")
      : visibility.followStatus === "requested"
        ? "Requested"
        : t("common", "follow");

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-52 w-full rounded-[2rem]" />
        <Skeleton className="h-40 w-full rounded-[2rem]" />
      </div>
    );
  }

  const displayName = String(user.displayName ?? user.name ?? handle);
  const cover = user.coverImage as string | undefined;

  return (
    <PageTransition className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--mist)] bg-[var(--glass)] backdrop-blur-xl">
        <motion.div
          className="relative h-56 bg-gradient-to-br from-[var(--signal)]/70 via-[var(--ember)]/45 to-[var(--mist)]"
          style={
            cover
              ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--cloud)]/80 to-transparent" />
        </motion.div>
        <div className="px-6 pb-8">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <Avatar
              src={user.image as string | null}
              name={displayName}
              className="size-28 rounded-[1.75rem] border-4 border-[var(--cloud)] shadow-xl"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void social("follow")}>
                {followLabel}
              </Button>
              <details className="relative">
                <summary className="list-none rounded-full border border-[var(--mist)] bg-[var(--glass)] p-2.5">
                  <MoreHorizontal className="size-4" />
                </summary>
                <div className="absolute end-0 z-10 mt-2 w-40 rounded-2xl border border-[var(--mist)] bg-[var(--cloud)] p-2 text-sm shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireAuth()) return;
                      void social("mute");
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-start hover:bg-[var(--mist)]"
                  >
                    Mute
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireAuth()) return;
                      void social("block");
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-start hover:bg-[var(--mist)]"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireAuth()) return;
                      void fetch("/api/social/report", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          targetType: "USER",
                          targetId: user.id,
                          reason: "Other",
                        }),
                      });
                    }}
                    className="block w-full rounded-xl px-3 py-2 text-start text-[var(--danger)] hover:bg-[var(--mist)]"
                  >
                    {t("common", "report")}
                  </button>
                </div>
              </details>
            </div>
          </div>

          <h1 className="mt-5 flex items-center gap-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            {displayName}
            {user.isVerified ? <BadgeCheck className="size-5 text-[var(--signal)]" /> : null}
          </h1>
          <p className="text-[var(--muted)]">@{String(user.handle)}</p>
          {user.bio ? <p className="mt-4 max-w-xl text-sm leading-6">{String(user.bio)}</p> : null}

          <div className="mt-6 grid grid-cols-3 gap-3 sm:flex sm:gap-8">
            {[
              [visibility.canViewFollowers ? user.followersCount : "—", t("profile", "followers")],
              [visibility.canViewFollowing ? user.followingCount : "—", t("profile", "following")],
              [visibility.canViewContent ? user.postsCount : "—", t("profile", "posts")],
            ].map(([value, label]) => (
              <div key={String(label)} className="rounded-2xl bg-white/40 px-4 py-3 text-center dark:bg-white/5">
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold">{String(value ?? 0)}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{String(label)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Tabs
              items={["Posts", "Media", "Videos", "About"]}
              value={tab}
              onChange={setTab}
            />
            <div className="mt-6">
              {locked ? (
                <EmptyState
                  title="This account is private"
                  description="Follow this account to see their photos, videos, and reels."
                />
              ) : null}
              {!locked && tab === "Posts" ? (
                posts.length ? (
                  <div className="grid gap-4">
                    {posts.map((post) => (
                      <PostCard key={String(post.id)} post={post as never} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t("empty", "feed")} />
                )
              ) : null}

              {!locked && tab === "Media" ? (
                media.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {media.map((m, i) => (
                      <button
                        key={`${m.url}-${i}`}
                        type="button"
                        className="aspect-square overflow-hidden rounded-2xl"
                        onClick={() => setLightbox(i)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt="" className="size-full object-cover transition hover:scale-105" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No media yet" />
                )
              ) : null}

              {!locked && tab === "Videos" ? (
                videos.length ? (
                  <div className="grid gap-4">
                    {videos.map((post) => (
                      <PostCard key={String(post.id)} post={post as never} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No videos yet" />
                )
              ) : null}

              {tab === "About" ? (
                <Card>
                  <p className="text-sm text-[var(--muted)]">
                    {user.website ? String(user.website) : "No links shared yet."}
                  </p>
                  {user.city || user.country ? (
                    <p className="mt-3 text-sm">
                      {[String(user.city ?? ""), String(user.country ?? "")]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {lightbox !== null ? (
        <MediaLightbox
          items={media}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      ) : null}
    </PageTransition>
  );
}
