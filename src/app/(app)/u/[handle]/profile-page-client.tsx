"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clapperboard,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
} from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { useExperience } from "@/components/experience-provider";
import { PostCard } from "@/components/feed/post-card";
import { MediaLightbox } from "@/components/media/lightbox";
import { PageTransition } from "@/components/motion/primitives";
import { ProfileHighlights } from "@/components/profile/highlights";
import { InterestChips } from "@/components/profile/interest-picker";
import {
  FriendButton,
  type FriendRelation,
} from "@/components/social/friend-button";
import { ReportDialog } from "@/components/social/report-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { Tabs } from "@/components/ui/tabs";
import { useSocket } from "@/hooks/use-socket";
import { sanitizeHttpUrl } from "@/lib/security";
import { formatCount, uniqueById } from "@/lib/utils";
import type { FeedPost, PublicProfile } from "@/types/feed";

type ProfileVisibility = NonNullable<PublicProfile["visibility"]>;

function videoCover(post: FeedPost) {
  const media = post.media?.[0];
  if (!media) return null;
  return media.thumbUrl || media.url;
}

export default function ProfilePageClient() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useExperience();
  const { requireAuth } = useGuest();
  const { socket } = useSocket();
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [visibility, setVisibility] = useState<ProfileVisibility>({});
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [videos, setVideos] = useState<FeedPost[]>([]);
  const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState("Posts");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    setNotFound(false);
    setUser(null);
    setPosts([]);
    setVideos([]);
    void fetch(`/api/users/${handle}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.user) {
          setNotFound(true);
          setUser(null);
          return;
        }
        setUser(d.user as PublicProfile);
        setVisibility((d.user?.visibility as ProfileVisibility) ?? {});
      })
      .catch(() => {
        setNotFound(true);
        setUser(null);
      });

    void fetch(`/api/posts?author=${handle}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(uniqueById((d.posts ?? []) as FeedPost[]));
        setLocked(Boolean(d.locked));
      })
      .catch(() => setPosts([]));

    void fetch(`/api/posts?author=${handle}&types=SHORT,VIDEO&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.locked) setVideos(uniqueById((d.posts ?? []) as FeedPost[]));
      })
      .catch(() => setVideos([]));
  }, [handle]);

  useEffect(() => {
    if (!socket || !user?.id || !session?.user?.id) return;
    const me = session.user.id;
    const onFollow = (payload: {
      actorId: string;
      targetId: string;
      status: "following" | "requested" | "none";
    }) => {
      if (payload.actorId === me && payload.targetId === user.id) {
        setVisibility((v) => ({ ...v, followStatus: payload.status }));
        return;
      }
      // Live follower count when others follow/unfollow this profile
      if (payload.targetId !== user.id) return;
      if (payload.status === "following") {
        setUser((prev) =>
          prev && typeof prev.followersCount === "number"
            ? {
                ...prev,
                followersCount: Math.max(0, prev.followersCount + 1),
              }
            : prev,
        );
      } else if (payload.status === "none") {
        setUser((prev) =>
          prev && typeof prev.followersCount === "number"
            ? {
                ...prev,
                followersCount: Math.max(0, prev.followersCount - 1),
              }
            : prev,
        );
      }
    };
    socket.on("follow:update", onFollow);
    return () => {
      socket.off("follow:update", onFollow);
    };
  }, [socket, user?.id, session?.user?.id]);

  const media = useMemo(
    () =>
      posts
        .flatMap((p) =>
          (p.media ?? [])
            .filter((m) => m.kind !== "VIDEO" && m.url)
            .map((m) => ({
              url: m.thumbUrl || m.url,
              alt: String(p.body ?? ""),
            })),
        )
        .filter((m) => m.url),
    [posts],
  );

  const displayVideos = useMemo(() => {
    if (videos.length) return videos;
    return posts.filter((p) => p.type === "VIDEO" || p.type === "SHORT");
  }, [videos, posts]);

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
        return {
          ...prev,
          followersCount: Math.max(0, prev.followersCount + delta),
        };
      });
      if (next === "following" || next === "none") {
        void fetch(`/api/posts?author=${handle}&limit=50`)
          .then((r) => r.json())
          .then((d) => {
            setPosts(uniqueById((d.posts ?? []) as FeedPost[]));
            setLocked(Boolean(d.locked));
          })
          .catch(() => {});
        void fetch(`/api/posts?author=${handle}&types=SHORT,VIDEO&limit=50`)
          .then((r) => r.json())
          .then((d) => {
            if (!d.locked) setVideos(uniqueById((d.posts ?? []) as FeedPost[]));
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
        void fetch(`/api/users/${handle}`)
          .then(async (r) => {
            const d = await r.json();
            if (r.ok && d.user) {
              setUser(d.user as PublicProfile);
              setVisibility((d.user?.visibility as ProfileVisibility) ?? {});
            }
          })
          .catch(() => {});
        void fetch(`/api/posts?author=${handle}&limit=50`)
          .then((r) => r.json())
          .then((d) => {
            setPosts(uniqueById((d.posts ?? []) as FeedPost[]));
            setLocked(Boolean(d.locked));
          })
          .catch(() => {});
      } else {
        setNotFound(true);
        setUser(null);
        setPosts([]);
        setVideos([]);
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
    const userId = user?.id;
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
          <Link
            href="/explore"
            className="text-sm text-[var(--signal-deep)] hover:underline"
          >
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
  const cover = user.coverImage ?? undefined;
  const isPrivateAccount = Boolean(visibility.isPrivate);
  const joined = user.createdAt
    ? new Date(String(user.createdAt)).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;
  const interests = user.interests ?? [];
  const location = [user.city ?? "", user.country ?? ""]
    .filter(Boolean)
    .join(", ");
  const safeWebsite = sanitizeHttpUrl(user.website ?? null);
  const languages = Array.isArray(user.languages) ? user.languages : [];
  const socialEntries = Object.entries(user.socialLinks ?? {})
    .map(([key, value]) => [key, sanitizeHttpUrl(value)] as const)
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
  const socialLabels: Record<string, string> = {
    instagram: "Instagram",
    x: "X",
    youtube: "YouTube",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    github: "GitHub",
    facebook: "Facebook",
  };

  const stats = [
    {
      value: visibility.canViewFollowers ? user.followersCount : null,
      label: t("profile", "followers"),
      href: visibility.canViewFollowers ? `/u/${handle}/followers` : null,
    },
    {
      value: visibility.canViewFollowing ? user.followingCount : null,
      label: t("profile", "following"),
      href: visibility.canViewFollowing ? `/u/${handle}/following` : null,
    },
    {
      value: visibility.canViewContent ? user.likesCount : null,
      label: t("profile", "likes"),
      href: null,
    },
    {
      value: visibility.canViewContent
        ? (user.videosCount ?? displayVideos.length)
        : null,
      label: t("profile", "videos"),
      href: null,
      onClick: () => setTab("Videos"),
    },
  ] as const;

  return (
    <PageTransition className="section-shell max-w-5xl">
      <div className="glass-strong premium-ring overflow-hidden rounded-[2rem]">
        {user.isOfficial ? (
          <div className="border-b border-[var(--signal)]/20 bg-gradient-to-r from-[var(--signal)]/10 via-transparent to-[var(--ember)]/10 px-6 py-3 text-center text-[11px] font-semibold tracking-[0.22em] text-[var(--signal)] uppercase">
            Official Relune Platform Account
          </div>
        ) : null}
        <motion.div
          className="relative h-40 bg-gradient-to-br from-[var(--signal)]/70 via-[var(--ember)]/45 to-[var(--mist)] sm:h-52 md:h-56"
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
          {isOwner ? (
            <button
              type="button"
              onClick={() => router.push("/settings/profile")}
              className="absolute end-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md"
            >
              <Pencil className="size-3.5" />
              Edit cover
            </button>
          ) : null}
        </motion.div>
        <div className="px-4 pb-8 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <button
              type="button"
              className="rounded-[1.75rem]"
              onClick={() => {
                if (isOwner) router.push("/settings/profile");
              }}
              aria-label={isOwner ? "Edit avatar" : undefined}
            >
              <Avatar
                src={user.image}
                name={displayName}
                className="size-24 rounded-[1.75rem] border-4 border-[var(--cloud)] shadow-[var(--shadow-lg)] sm:size-28"
              />
            </button>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              {isOwner ? (
                <Button
                  variant="outline"
                  onClick={() => router.push("/settings/profile")}
                >
                  <Pencil className="size-4" />
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => void social("follow")}
                  >
                    {followLabel}
                  </Button>
                  <FriendButton
                    userId={user.id}
                    initialRelation={
                      (user.friendRelation as FriendRelation | undefined) ??
                      (user.isFriend ? "friends" : "none")
                    }
                    onChange={(next) => {
                      setUser((prev) =>
                        prev
                          ? {
                              ...prev,
                              isFriend: next === "friends",
                              friendRelation: next === "self" ? "none" : next,
                            }
                          : prev,
                      );
                    }}
                  />
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
                <div className="absolute end-0 z-10 mt-2 w-44 rounded-[1.25rem] border-2 border-[var(--mist-strong)] bg-[var(--cloud)] p-2 text-sm shadow-xl">
                  {isOwner ? (
                    <>
                      <Link
                        href="/settings/profile"
                        className="block rounded-xl px-3 py-2 hover:bg-[var(--mist)]"
                      >
                        Edit profile
                      </Link>
                      <Link
                        href="/settings/privacy"
                        className="block rounded-xl px-3 py-2 hover:bg-[var(--mist)]"
                      >
                        Privacy settings
                      </Link>
                    </>
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

          <h1 className="mt-5 flex min-w-0 flex-wrap items-center gap-2 font-[family-name:var(--font-display)] text-2xl tracking-tight break-words sm:text-3xl md:text-4xl">
            <span className="min-w-0 break-words">{displayName}</span>
            {user.isVerified || user.isOfficial ? (
              <VerificationBadge
                isOfficial={Boolean(user.isOfficial)}
                isVerified={Boolean(user.isVerified)}
                className="size-5"
              />
            ) : null}
            {isPrivateAccount ? (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                <Lock className="size-3" />
                Private
              </span>
            ) : null}
          </h1>
          <p className="text-[var(--muted)]">@{String(user.handle)}</p>
          {user.bio ? (
            <p className="mt-4 max-w-xl text-sm leading-6 break-words whitespace-pre-wrap">
              {user.bio}
            </p>
          ) : isOwner ? (
            <button
              type="button"
              onClick={() => router.push("/settings/profile")}
              className="mt-4 text-sm font-semibold text-[var(--signal-deep)] hover:underline"
            >
              Add a bio
            </button>
          ) : null}

          {interests.length ? (
            <div className="mt-4">
              <InterestChips interests={interests} />
            </div>
          ) : null}

          {location || safeWebsite || languages.length || socialEntries.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]">
              {location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {location}
                </span>
              ) : null}
              {languages.length ? (
                <span className="text-[var(--muted-strong)]">
                  {languages.join(" · ")}
                </span>
              ) : null}
              {safeWebsite ? (
                <a
                  href={safeWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--signal-deep)] hover:underline"
                >
                  {safeWebsite.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {socialEntries.map(([key, href]) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--signal-deep)] hover:underline"
                >
                  {socialLabels[key] ?? key}
                </a>
              ))}
            </div>
          ) : null}

          {!isOwner &&
          typeof user.mutualFriendsCount === "number" &&
          user.mutualFriendsCount > 0 ? (
            <Link
              href={`/u/${handle}/mutual-friends`}
              className="mt-3 inline-block text-sm text-[var(--muted)] hover:text-[var(--signal-deep)] hover:underline"
            >
              {user.mutualFriendsCount} mutual friend
              {user.mutualFriendsCount === 1 ? "" : "s"}
            </Link>
          ) : null}

          {visibility.canViewFriends &&
          typeof user.friendsCount === "number" ? (
            <Link
              href={`/u/${handle}/friends`}
              className="mt-2 inline-block text-sm font-semibold text-[var(--signal-deep)] hover:underline"
            >
              {formatCount(user.friendsCount)} friends
            </Link>
          ) : null}

          {user.isOfficial ? (
            <div className="mt-5 rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--signal)] uppercase">
                Platform identity
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                This is the permanent official Relune platform account for
                announcements, safety guidance, feature launches, and
                maintenance updates.
              </p>
            </div>
          ) : null}

          <ProfileHighlights handle={handle} isOwner={isOwner} />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map(({ value, label, href, ...rest }) => {
              const onClick = "onClick" in rest ? rest.onClick : undefined;
              const display =
                value == null ? "—" : formatCount(Number(value) || 0);
              const inner = (
                <>
                  <p className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
                    {display}
                  </p>
                  <p className="text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
                    {label}
                  </p>
                </>
              );
              if (href) {
                return (
                  <Link
                    key={label}
                    href={href}
                    className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-4 text-center shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5"
                  >
                    {inner}
                  </Link>
                );
              }
              if (onClick) {
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-4 text-center shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5"
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <div
                  key={label}
                  className="rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-4 text-center shadow-[var(--shadow-sm)]"
                >
                  {inner}
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <Tabs
              items={["Posts", "Videos", "Media", "About"]}
              value={tab}
              onChange={setTab}
            />
            <div className="mt-6">
              {locked && tab !== "About" ? (
                <EmptyState
                  title="This account is private"
                  description="Follow this account and wait for approval to see their posts and videos."
                />
              ) : null}

              {!locked && tab === "Posts" ? (
                posts.length ? (
                  <div className="grid gap-4">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={t("empty", "feed")}
                    description={
                      isOwner
                        ? "Share your first post or upload a Short."
                        : undefined
                    }
                    action={
                      isOwner ? (
                        <Link
                          href="/shorts"
                          className="text-sm font-semibold text-[var(--signal-deep)]"
                        >
                          Upload a video
                        </Link>
                      ) : undefined
                    }
                  />
                )
              ) : null}

              {!locked && tab === "Videos" ? (
                displayVideos.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {displayVideos.map((post) => {
                      const coverUrl = videoCover(post);
                      return (
                        <Link
                          key={post.id}
                          href={`/post/${post.id}`}
                          className="group relative aspect-[9/14] overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--night)] shadow-[var(--shadow-sm)]"
                        >
                          {coverUrl ? (
                            <MediaImage
                              src={coverUrl}
                              alt=""
                              fill
                              className="object-cover transition duration-300 group-hover:scale-[1.03]"
                              sizes="(max-width: 768px) 33vw, 180px"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-white/60">
                              <Clapperboard className="size-8" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                          <span className="absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                            <Play className="size-3.5 fill-current" />
                          </span>
                          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-2.5 text-xs font-semibold text-white">
                            <Heart className="size-3.5" />
                            {formatCount(post.likeCount ?? 0)}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title="No videos yet"
                    description={
                      isOwner
                        ? "Upload Shorts to build your creator library."
                        : undefined
                    }
                    action={
                      isOwner ? (
                        <Link
                          href="/shorts"
                          className="text-sm font-semibold text-[var(--signal-deep)]"
                        >
                          Go to Shorts
                        </Link>
                      ) : undefined
                    }
                  />
                )
              ) : null}

              {!locked && tab === "Media" ? (
                media.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {media.map((m, i) => (
                      <button
                        key={`${m.url}-${i}`}
                        type="button"
                        className="relative aspect-square overflow-hidden rounded-2xl border-2 border-[var(--mist-strong)]"
                        onClick={() => setLightbox(i)}
                      >
                        <MediaImage
                          src={m.url}
                          alt=""
                          fill
                          className="object-cover transition hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 220px"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No media yet" />
                )
              ) : null}

              {tab === "About" ? (
                <Card className="space-y-4">
                  {user.bio ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Bio
                      </p>
                      <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">
                        {user.bio}
                      </p>
                    </div>
                  ) : null}
                  {safeWebsite ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Website
                      </p>
                      <a
                        href={safeWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-[var(--signal-deep)] hover:underline"
                      >
                        {safeWebsite}
                      </a>
                    </div>
                  ) : null}
                  {user.city || user.country ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Location
                      </p>
                      <p className="mt-2 text-sm">
                        {[user.city ?? "", user.country ?? ""]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  ) : null}
                  {languages.length ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Languages
                      </p>
                      <p className="mt-2 text-sm">{languages.join(", ")}</p>
                    </div>
                  ) : null}
                  {socialEntries.length ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Social
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {socialEntries.map(([key, href]) => (
                          <a
                            key={key}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--signal-deep)] hover:underline"
                          >
                            {socialLabels[key] ?? key}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {joined ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Joined
                      </p>
                      <p className="mt-2 text-sm">{joined}</p>
                    </div>
                  ) : null}
                  {visibility.canViewContent ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] px-3 py-3">
                        <p className="text-lg font-semibold tabular-nums">
                          {formatCount(user.postsCount ?? 0)}
                        </p>
                        <p className="text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
                          Posts
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] px-3 py-3">
                        <p className="text-lg font-semibold tabular-nums">
                          {formatCount(
                            user.videosCount ?? displayVideos.length,
                          )}
                        </p>
                        <p className="text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
                          Videos
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] bg-[var(--surface)] px-3 py-3">
                        <p className="text-lg font-semibold tabular-nums">
                          {formatCount(user.likesCount ?? 0)}
                        </p>
                        <p className="text-[10px] tracking-[0.14em] text-[var(--muted)] uppercase">
                          Likes
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {interests.length ? (
                    <div>
                      <p className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
                        Interests
                      </p>
                      <div className="mt-3">
                        <InterestChips interests={interests} />
                      </div>
                    </div>
                  ) : null}
                  {!user.bio &&
                  !safeWebsite &&
                  !user.city &&
                  !user.country &&
                  !languages.length &&
                  !socialEntries.length &&
                  !joined &&
                  !interests.length ? (
                    <p className="text-sm text-[var(--muted)]">
                      No profile details yet.
                      {isOwner ? (
                        <>
                          {" "}
                          <Link
                            href="/settings/profile"
                            className="font-semibold text-[var(--signal-deep)] hover:underline"
                          >
                            Edit profile
                          </Link>
                        </>
                      ) : null}
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
