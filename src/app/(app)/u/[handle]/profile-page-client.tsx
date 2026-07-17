"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, MapPin, MessageCircle, MoreHorizontal, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { MediaLightbox } from "@/components/media/lightbox";
import { PostCard } from "@/components/feed/post-card";
import { useExperience } from "@/components/experience-provider";
import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { ReportDialog } from "@/components/social/report-dialog";
import { InterestChips } from "@/components/profile/interest-picker";
import { ProfileHighlights } from "@/components/profile/highlights";
import { sanitizeHttpUrl } from "@/lib/security";

type ProfileVisibility = {
  isPrivate?: boolean;
  canViewContent?: boolean;
  canViewFollowers?: boolean;
  canViewFollowing?: boolean;
  followStatus?: "none" | "following" | "requested";
  isMuted?: boolean;
  isBlockedByMe?: boolean;
};

export default function ProfilePageClient() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useExperience();
  const { requireAuth } = useGuest();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [visibility, setVisibility] = useState<ProfileVisibility>({});
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([]);
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("Posts");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setUser(null);
    fetch(`/api/users/${handle}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.user) {
          setNotFound(true);
          setUser(null);
          return;
        }
        setUser(d.user);
        setVisibility((d.user?.visibility as ProfileVisibility) ?? {});
      })
      .catch(() => {
        setNotFound(true);
        setUser(null);
      });
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
    if (!requireAuth()) return false;
    const followStatus = visibility.followStatus ?? "none";
    if (action === "follow") {
      const method =
        followStatus === "following" || followStatus === "requested"
          ? "DELETE"
          : "POST";
      const res = await fetch(`/api/users/${handle}/follow`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return false;
      const next =
        method === "DELETE"
          ? "none"
          : data.follow?.status === "requested"
            ? "requested"
            : "following";
      setVisibility((v) => ({ ...v, followStatus: next }));
      setUser((prev) => {
        if (!prev || typeof prev.followersCount !== "number") return prev;
        let delta = 0;
        if (followStatus === "following" && next === "none") delta = -1;
        if (followStatus !== "following" && next === "following") delta = 1;
        if (!delta) return prev;
        return { ...prev, followersCount: Math.max(0, prev.followersCount + delta) };
      });
      if (next === "following" || next === "none") {
        fetch(`/api/posts?author=${handle}`)
          .then((r) => r.json())
          .then((d) => {
            setPosts(d.posts ?? []);
            setLocked(Boolean(d.locked));
          })
          .catch(() => {});
      }
      return true;
    }

    if (action === "mute") {
      const muted = Boolean(visibility.isMuted);
      const res = await fetch(`/api/users/${handle}/mute`, {
        method: muted ? "DELETE" : "POST",
      });
      if (!res.ok) return false;
      setVisibility((v) => ({ ...v, isMuted: !muted }));
      return true;
    }

    if (action === "block") {
      const blocked = Boolean(visibility.isBlockedByMe);
      if (
        !blocked &&
        !window.confirm(
          `Block @${handle}? They won’t be able to follow or message you.`,
        )
      ) {
        return false;
      }
      const res = await fetch(`/api/users/${handle}/block`, {
        method: blocked ? "DELETE" : "POST",
      });
      if (!res.ok) return false;
      if (blocked) {
        setVisibility((v) => ({
          ...v,
          isBlockedByMe: false,
          followStatus: "none",
        }));
        router.refresh();
        fetch(`/api/users/${handle}`)
          .then(async (r) => {
            const d = await r.json();
            if (r.ok && d.user) {
              setUser(d.user);
              setVisibility((d.user?.visibility as ProfileVisibility) ?? {});
            }
          })
          .catch(() => {});
        fetch(`/api/posts?author=${handle}`)
          .then((r) => r.json())
          .then((d) => {
            setPosts(d.posts ?? []);
            setLocked(Boolean(d.locked));
          })
          .catch(() => {});
      } else {
        setNotFound(true);
        setUser(null);
        setPosts([]);
      }
      return true;
    }

    const res = await fetch(`/api/users/${handle}/${action}`, {
      method: "POST",
    });
    return res.ok;
  }

  const followLabel =
    visibility.followStatus === "following"
      ? t("common", "following")
      : visibility.followStatus === "requested"
        ? "Requested"
        : t("common", "follow");

  const isOwner =
    Boolean(session?.user?.handle) &&
    session!.user.handle!.toLowerCase() === String(handle).toLowerCase();

  async function startMessage() {
    if (!requireAuth()) return;
    const userId = user?.id as string | undefined;
    if (!userId) return;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DIRECT", userId }),
    });
    const data = await res.json();
    if (res.ok && data.conversation?.id) {
      router.push(`/messages/${data.conversation.id}`);
    }
  }

  if (notFound) {
    return (
      <PageTransition className="section-shell max-w-3xl">
        <EmptyState
          title="Profile not found"
          description="That username doesn’t exist or isn’t available."
        />
        <div className="mt-6 text-center">
          <Link href="/explore" className="text-sm text-[var(--signal-deep)] hover:underline">
            Explore Relune
          </Link>
        </div>
      </PageTransition>
    );
  }

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
  const isPrivateAccount = Boolean(visibility.isPrivate);
  const joined = user.createdAt
    ? new Date(String(user.createdAt)).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const interests = (user.interests as Array<{ id?: string; name: string }> | undefined) ?? [];
  const location = [String(user.city ?? ""), String(user.country ?? "")]
    .filter(Boolean)
    .join(", ");

  return (
    <PageTransition className="section-shell max-w-5xl">
      <div className="glass-strong premium-ring overflow-hidden rounded-[2rem]">
        {user.isOfficial ? (
          <div className="border-b border-[var(--signal)]/20 bg-gradient-to-r from-[var(--signal)]/10 via-transparent to-[var(--ember)]/10 px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--signal)]">
            Official RELUNE Platform Account
          </div>
        ) : null}
        <motion.div
          className="relative h-56 bg-gradient-to-br from-[var(--signal)]/70 via-[var(--ember)]/45 to-[var(--mist)]"
          style={
            cover
              ? {
                  backgroundImage: `url(${cover})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
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
              className="size-28 rounded-[1.75rem] border-4 border-[var(--cloud)] shadow-[var(--shadow-lg)]"
            />
            <div className="flex gap-2">
              {isOwner ? (
                <Button variant="outline" onClick={() => router.push("/settings/profile")}>
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => void social("follow")}>
                    {followLabel}
                  </Button>
                  <Button variant="quiet" onClick={() => void startMessage()}>
                    <MessageCircle className="size-4" />
                    Message
                  </Button>
                </>
              )}
              <details className="relative">
                <summary className="list-none rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-2.5">
                  <MoreHorizontal className="size-4" />
                </summary>
                <div className="absolute end-0 z-10 mt-2 w-40 rounded-[1.25rem] border-2 border-[var(--mist-strong)] bg-[var(--cloud)] p-2 text-sm shadow-xl">
                  {isOwner ? (
                    <Link
                      href="/settings/privacy"
                      className="block rounded-xl px-3 py-2 hover:bg-[var(--mist)]"
                    >
                      Privacy settings
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAuth()) return;
                          void social("mute");
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-start hover:bg-[var(--mist)]"
                      >
                        {visibility.isMuted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAuth()) return;
                          void social("block");
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-start hover:bg-[var(--mist)]"
                      >
                        {visibility.isBlockedByMe ? "Unblock" : "Block"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireAuth()) return;
                          setReportOpen(true);
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-start text-[var(--danger)] hover:bg-[var(--mist)]"
                      >
                        {t("common", "report")}
                      </button>
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>

          <h1 className="mt-5 flex flex-wrap items-center gap-2 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            {displayName}
            {user.isVerified || user.isOfficial ? (
              <VerificationBadge
                isOfficial={Boolean(user.isOfficial)}
                isVerified={Boolean(user.isVerified)}
                className="size-5"
              />
            ) : null}
            {isPrivateAccount ? (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                <Lock className="size-3" />
                Private
              </span>
            ) : null}
          </h1>
          <p className="text-[var(--muted)]">@{String(user.handle)}</p>
          {user.bio ? (
            <p className="mt-4 max-w-xl whitespace-pre-wrap text-sm leading-6">
              {String(user.bio)}
            </p>
          ) : null}

          {interests.length ? (
            <div className="mt-4">
              <InterestChips interests={interests} />
            </div>
          ) : null}

          {location || user.website ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              {location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {location}
                </span>
              ) : null}
              {sanitizeHttpUrl(
                typeof user.website === "string" ? user.website : null,
              ) ? (
                <a
                  href={
                    sanitizeHttpUrl(
                      typeof user.website === "string" ? user.website : null,
                    )!
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--signal-deep)] hover:underline"
                >
                  {sanitizeHttpUrl(
                    typeof user.website === "string" ? user.website : null,
                  )!.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          ) : null}

          {!isOwner &&
          typeof user.mutualFriendsCount === "number" &&
          user.mutualFriendsCount > 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {user.mutualFriendsCount} mutual friend
              {user.mutualFriendsCount === 1 ? "" : "s"}
            </p>
          ) : null}

          {user.isOfficial ? (
            <div className="mt-5 rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--signal)]">
                Platform identity
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                This is the permanent official RELUNE platform account for announcements,
                safety guidance, feature launches, and maintenance updates.
              </p>
            </div>
          ) : null}

          <ProfileHighlights handle={handle} isOwner={isOwner} />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              {
                value: visibility.canViewFollowers ? user.followersCount : "—",
                label: t("profile", "followers"),
                href: visibility.canViewFollowers ? `/u/${handle}/followers` : null,
              },
              {
                value: visibility.canViewFollowing ? user.followingCount : "—",
                label: t("profile", "following"),
                href: visibility.canViewFollowing ? `/u/${handle}/following` : null,
              },
              {
                value: visibility.canViewFollowers ? user.friendsCount : "—",
                label: "Friends",
                href: visibility.canViewFollowers ? `/u/${handle}/friends` : null,
              },
              {
                value: visibility.canViewContent ? user.postsCount : "—",
                label: t("profile", "posts"),
                href: null,
              },
            ].map(({ value, label, href }) => {
              const inner = (
                <>
                  <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                    {String(value ?? 0)}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {String(label)}
                  </p>
                </>
              );
              return href ? (
                <Link
                  key={String(label)}
                  href={href}
                  className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-4 text-center shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={String(label)}
                  className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-4 text-center shadow-[var(--shadow-sm)]"
                >
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <Tabs
              items={["Posts", "Media", "Videos", "About"]}
              value={tab}
              onChange={setTab}
            />
            <div className="mt-6">
              {locked && tab !== "About" ? (
                <EmptyState
                  title="This account is private"
                  description="Follow this account and wait for approval to see their posts and media."
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
                        <img
                          src={m.url}
                          alt=""
                          className="size-full object-cover transition hover:scale-105"
                        />
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
                <Card className="space-y-4">
                  {user.bio ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Bio
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {String(user.bio)}
                      </p>
                    </div>
                  ) : null}
                  {sanitizeHttpUrl(
                    typeof user.website === "string" ? user.website : null,
                  ) ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Website
                      </p>
                      <a
                        href={
                          sanitizeHttpUrl(
                            typeof user.website === "string"
                              ? user.website
                              : null,
                          )!
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-[var(--signal-deep)] hover:underline"
                      >
                        {sanitizeHttpUrl(
                          typeof user.website === "string"
                            ? user.website
                            : null,
                        )}
                      </a>
                    </div>
                  ) : null}
                  {user.city || user.country ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Location
                      </p>
                      <p className="mt-2 text-sm">
                        {[String(user.city ?? ""), String(user.country ?? "")]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}
                  {joined ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Joined
                      </p>
                      <p className="mt-2 text-sm">{joined}</p>
                    </div>
                  ) : null}
                  {interests.length ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Interests
                      </p>
                      <div className="mt-3">
                        <InterestChips interests={interests} />
                      </div>
                    </div>
                  ) : null}
                  {!user.bio &&
                  !user.website &&
                  !user.city &&
                  !user.country &&
                  !joined &&
                  !interests.length ? (
                    <p className="text-sm text-[var(--muted)]">No profile details yet.</p>
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

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="USER"
        targetId={String(user.id)}
        title={`Report @${String(user.handle)}`}
      />
    </PageTransition>
  );
}
