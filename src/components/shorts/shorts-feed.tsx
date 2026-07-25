"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { ShortsUpload } from "@/components/shorts/shorts-upload";
import { ShareSheet } from "@/components/social/share-sheet";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { isInteractiveTarget, useDialogFocus } from "@/hooks/use-dialog-focus";
import { useSocket } from "@/hooks/use-socket";
import { saveBrowseState } from "@/lib/guest/browse-state";
import { appendUniqueById, formatCount } from "@/lib/utils";

const CommentsPanel = dynamic(
  () => import("@/components/feed/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false },
);

type ShortPost = {
  id: string;
  body?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  liked?: boolean;
  reaction?: string | null;
  bookmarked?: boolean;
  media?: Array<{ url: string; thumbUrl?: string | null }>;
  author?: {
    id?: string;
    handle?: string;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
};

/** How many neighbors keep a live <video src> (active ± N). */
const SRC_WINDOW = 1;
/** Prefetch the next page this many items before the end. */
const PREFETCH_FROM_END = 3;

function ShortSlide({
  post,
  index,
  active,
  mountSrc,
  preloadNext,
  muted,
  onVideoRef,
  onTogglePlay,
  onLike,
  onComment,
  onShare,
  onBookmark,
}: {
  post: ShortPost;
  index: number;
  active: boolean;
  mountSrc: boolean;
  preloadNext: boolean;
  muted: boolean;
  onVideoRef: (id: string, el: HTMLVideoElement | null) => void;
  onTogglePlay: (id: string) => void;
  onLike: (post: ShortPost) => void;
  onComment: (post: ShortPost) => void;
  onShare: (post: ShortPost) => void;
  onBookmark: (post: ShortPost) => void;
}) {
  const media = post.media?.[0];
  const liked = Boolean(post.liked);
  const src = media?.url;
  const poster = media?.thumbUrl || undefined;

  return (
    <article
      data-video-id={post.id}
      data-index={index}
      className="relative h-[100dvh] w-full shrink-0 snap-start snap-always [contain-intrinsic-size:100dvh] [content-visibility:auto]"
    >
      {/* Poster fallback when the video element is detached for performance */}
      {!mountSrc && poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {mountSrc && src ? (
        <video
          ref={(el) => onVideoRef(post.id, el)}
          src={src}
          poster={poster}
          muted={muted}
          loop
          playsInline
          // Active: full buffer. Immediate next: metadata/auto for seamless swipe.
          preload={active ? "auto" : preloadNext ? "auto" : "metadata"}
          className="absolute inset-0 h-full w-full object-cover"
          onClick={() => onTogglePlay(post.id)}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-3 pt-16 pb-[max(5.25rem,calc(4.25rem+env(safe-area-inset-bottom)))] text-white sm:px-4 lg:pb-6">
        <div className="min-w-0 flex-1">
          <Link
            href={`/u/${post.author?.handle}`}
            className="pointer-events-auto inline-flex items-center gap-3"
          >
            <Avatar
              src={post.author?.image}
              name={post.author?.displayName ?? post.author?.name}
              className="size-11 border-2 border-white/70"
            />
            <span className="min-w-0">
              <b className="block truncate text-sm tracking-wide">
                {post.author?.displayName ?? post.author?.name}
              </b>
              <span className="block truncate text-xs font-medium text-white/85">
                @{post.author?.handle ?? "relune"}
              </span>
            </span>
          </Link>
          {post.body ? (
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/95">
              {post.body}
            </p>
          ) : null}
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col items-center gap-3 pb-2">
          <button
            type="button"
            onClick={() => onLike(post)}
            className="grid size-12 place-items-center rounded-full bg-black/35 backdrop-blur-md"
            aria-label="Like"
          >
            <Heart
              className={`size-6 ${liked ? "text-[var(--ember)]" : "text-white"}`}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
          <span className="text-xs font-semibold">
            {formatCount(post.likeCount ?? 0)}
          </span>

          <button
            type="button"
            onClick={() => onComment(post)}
            className="grid size-12 place-items-center rounded-full bg-black/35 backdrop-blur-md"
            aria-label="Comments"
          >
            <MessageCircle className="size-6" />
          </button>
          <span className="text-xs font-semibold">
            {formatCount(post.commentCount ?? 0)}
          </span>

          <button
            type="button"
            onClick={() => onShare(post)}
            className="grid size-12 place-items-center rounded-full bg-black/35 backdrop-blur-md"
            aria-label="Share"
          >
            <Share2 className="size-6" />
          </button>
          <span className="text-xs font-semibold">
            {formatCount(post.shareCount ?? 0)}
          </span>

          <button
            type="button"
            onClick={() => onBookmark(post)}
            className="grid size-12 place-items-center rounded-full bg-black/35 backdrop-blur-md"
            aria-label="Save"
          >
            <Bookmark
              className="size-6"
              fill={post.bookmarked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </article>
  );
}

const MemoShortSlide = memo(ShortSlide);

export function ShortsFeed() {
  const { requireAuth } = useGuest();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [posts, setPosts] = useState<ShortPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [shareFor, setShareFor] = useState<ShortPost | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted] = useState(true);
  const commentsDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({
    open: Boolean(commentsFor),
    onClose: () => setCommentsFor(null),
    containerRef: commentsDialogRef,
  });
  const [mode, setMode] = useState<"forYou" | "following" | "latest">("forYou");
  const [feedMeta, setFeedMeta] = useState<{
    requiresAuth?: boolean;
    emptyFollowing?: boolean;
  }>({});
  const [likePendingId, setLikePendingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const pendingCreatedRef = useRef<ShortPost | null>(null);
  const loadingMoreRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const ratiosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const activeIndex = useMemo(() => {
    if (!activeId) return 0;
    const idx = posts.findIndex((p) => p.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [posts, activeId]);

  const load = useCallback(
    async (after?: string | null, replace = false) => {
      if (after) {
        if (loadingMoreRef.current) return;
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }
      const params = new URLSearchParams({ mode, limit: "12" });
      if (after) params.set("cursor", after);
      try {
        const res = await fetch(`/api/shorts?${params}`);
        const data = await res.json();
        if (res.ok) {
          const incoming = (data.posts ?? []) as ShortPost[];
          const pending = pendingCreatedRef.current;
          const merged =
            pending && (replace || !after)
              ? [pending, ...incoming.filter((p) => p.id !== pending.id)]
              : incoming;
          if (pending && (replace || !after)) pendingCreatedRef.current = null;
          if (replace || !after) {
            setFeedMeta({
              requiresAuth: Boolean(data.requiresAuth),
              emptyFollowing: Boolean(data.emptyFollowing),
            });
          }
          setPosts((old) => {
            if (replace || !after) return merged;
            return appendUniqueById(old, incoming);
          });
          setCursor(data.nextCursor ?? null);
          if (pending && (replace || !after)) setActiveId(pending.id);
          else if ((replace || !after) && merged[0] && !activeIdRef.current) {
            setActiveId(merged[0].id);
          }
        }
      } finally {
        setReady(true);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [mode],
  );

  useEffect(() => {
    setReady(false);
    setPosts([]);
    setCursor(null);
    setActiveId(null);
    setFeedMeta({});
    viewedRef.current.clear();
    ratiosRef.current.clear();
    void load(null, true);
  }, [load]);

  const playActive = useCallback(
    (id: string) => {
      for (const [vid, el] of videoRefs.current) {
        if (vid === id) {
          el.muted = muted;
          void el.play().catch(() => undefined);
        } else if (!el.paused) {
          el.pause();
        }
      }
    },
    [muted],
  );

  const pauseInactive = useCallback((id: string) => {
    const video = videoRefs.current.get(id);
    if (video && !video.paused) video.pause();
  }, []);

  // Visibility → single active video (highest intersection ratio wins)
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !posts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.videoId;
          if (!id) continue;
          if (entry.isIntersecting) {
            ratiosRef.current.set(id, entry.intersectionRatio);
          } else {
            ratiosRef.current.delete(id);
            pauseInactive(id);
          }
        }

        let bestId: string | null = null;
        let bestRatio = 0.55;
        for (const [id, ratio] of ratiosRef.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (!bestId) return;
        if (activeIdRef.current !== bestId) {
          setActiveId(bestId);
        }
        playActive(bestId);

        if (!viewedRef.current.has(bestId)) {
          viewedRef.current.add(bestId);
          void fetch(`/api/posts/${bestId}/view`, { method: "POST" }).catch(
            () => undefined,
          );
        }
      },
      {
        root,
        threshold: [0.25, 0.5, 0.65, 0.8, 0.95],
        rootMargin: "0px",
      },
    );

    for (const el of root.querySelectorAll("[data-video-id]")) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [posts, pauseInactive, playActive]);

  // Keep mute in sync + ensure only active plays after src remounts
  useEffect(() => {
    for (const [id, video] of videoRefs.current) {
      video.muted = muted;
      if (id === activeId) void video.play().catch(() => undefined);
      else video.pause();
    }
  }, [muted, activeId]);

  // Browser-level prefetch of the next clip's bytes
  useEffect(() => {
    const next = posts[activeIndex + 1]?.media?.[0]?.url;
    if (!next || next.startsWith("blob:")) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = next;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [posts, activeIndex]);

  // Prefetch next page before the user reaches the end
  useEffect(() => {
    if (!cursor || loadingMore) return;
    if (activeIndex >= Math.max(0, posts.length - PREFETCH_FROM_END)) {
      void load(cursor);
    }
  }, [activeIndex, posts.length, cursor, loadingMore, load]);

  // Persist browse position (throttled via rAF)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const id = activeIdRef.current;
        if (!id) return;
        const video = videoRefs.current.get(id);
        if (video) {
          saveBrowseState({ videoId: id, videoTime: video.currentTime });
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Keyboard: j/k or arrows to snap, m mute, space play/pause
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const root = containerRef.current;
      if (
        !root ||
        commentsFor ||
        e.defaultPrevented ||
        e.isComposing ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        isInteractiveTarget(e.target)
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        root.scrollBy({ top: root.clientHeight, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        root.scrollBy({ top: -root.clientHeight, behavior: "smooth" });
      } else if (e.key === "m") {
        setMuted((v) => !v);
      } else if (e.key === " ") {
        e.preventDefault();
        const id = activeIdRef.current;
        if (!id) return;
        const video = videoRefs.current.get(id);
        if (!video) return;
        if (video.paused) void video.play().catch(() => undefined);
        else video.pause();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commentsFor]);

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const onVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(id, el);
      el.muted = mutedRef.current;
    } else {
      videoRefs.current.delete(id);
    }
  }, []);

  const onTogglePlay = useCallback((id: string) => {
    const video = videoRefs.current.get(id);
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  // Real-time like counts for every Short currently in the feed
  const postIdsKey = posts.map((p) => p.id).join(",");
  useEffect(() => {
    if (!socket || !postIdsKey) return;
    const ids = postIdsKey.split(",").filter(Boolean);
    for (const postId of ids) {
      socket.emit("post:join", { postId });
    }
    const onLike = (payload: {
      postId: string;
      likeCount: number;
      liked: boolean;
      userId: string;
      reaction?: string | null;
    }) => {
      setPosts((old) =>
        old.map((p) => {
          if (p.id !== payload.postId) return p;
          const next = {
            ...p,
            likeCount: Math.max(0, payload.likeCount),
          };
          if (session?.user?.id && payload.userId === session.user.id) {
            next.liked = payload.liked;
            next.reaction = (payload.reaction as typeof next.reaction) ?? null;
          }
          return next;
        }),
      );
    };
    const onComment = (payload: {
      type: string;
      postId: string;
      commentCount?: number;
    }) => {
      if (typeof payload.commentCount !== "number") return;
      setPosts((old) =>
        old.map((p) =>
          p.id === payload.postId
            ? { ...p, commentCount: Math.max(0, payload.commentCount!) }
            : p,
        ),
      );
    };
    socket.on("post:like", onLike);
    socket.on("post:comment", onComment);
    return () => {
      for (const postId of ids) {
        socket.emit("post:leave", { postId });
      }
      socket.off("post:like", onLike);
      socket.off("post:comment", onComment);
    };
  }, [socket, postIdsKey, session?.user?.id]);

  const toggleLike = useCallback(
    async (post: ShortPost) => {
      if (!requireAuth() || likePendingId === post.id) return;
      const wasLiked = Boolean(post.liked);
      setLikePendingId(post.id);
      setPosts((old) =>
        old.map((p) =>
          p.id === post.id
            ? {
                ...p,
                liked: !wasLiked,
                likeCount: Math.max(
                  0,
                  (p.likeCount ?? 0) + (wasLiked ? -1 : 1),
                ),
              }
            : p,
        ),
      );
      try {
        const res = await fetch(`/api/posts/${post.id}/like`, {
          method: wasLiked ? "DELETE" : "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPosts((old) =>
            old.map((p) =>
              p.id === post.id
                ? {
                    ...p,
                    liked: wasLiked,
                    likeCount: Math.max(
                      0,
                      (p.likeCount ?? 0) + (wasLiked ? 1 : -1),
                    ),
                  }
                : p,
            ),
          );
          return;
        }
        setPosts((old) =>
          old.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  liked:
                    typeof data.liked === "boolean" ? data.liked : !wasLiked,
                  likeCount:
                    typeof data.likeCount === "number"
                      ? data.likeCount
                      : p.likeCount,
                }
              : p,
          ),
        );
      } catch {
        setPosts((old) =>
          old.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  liked: wasLiked,
                  likeCount: Math.max(
                    0,
                    (p.likeCount ?? 0) + (wasLiked ? 1 : -1),
                  ),
                }
              : p,
          ),
        );
      } finally {
        setLikePendingId(null);
      }
    },
    [requireAuth, likePendingId],
  );

  const toggleBookmark = useCallback(
    async (post: ShortPost) => {
      if (!requireAuth()) return;
      const saved = Boolean(post.bookmarked);
      const next = !saved;
      setPosts((old) =>
        old.map((p) => (p.id === post.id ? { ...p, bookmarked: next } : p)),
      );
      try {
        const bc = new BroadcastChannel("relune:bookmarks");
        bc.postMessage({ postId: post.id, bookmarked: next });
        bc.close();
      } catch {
        // ignore
      }
      const res = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: saved ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setPosts((old) =>
          old.map((p) => (p.id === post.id ? { ...p, bookmarked: saved } : p)),
        );
      }
    },
    [requireAuth],
  );

  const share = useCallback((post: ShortPost) => {
    setShareFor(post);
  }, []);

  const onComment = useCallback(
    (post: ShortPost) => {
      if (!requireAuth()) return;
      setCommentsFor(post.id);
    },
    [requireAuth],
  );

  return (
    <div className="fixed inset-0 z-[25] bg-black lg:left-[var(--app-sidebar-width)] lg:z-[35]">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-8 sm:gap-3 sm:px-4">
        <div className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max max-w-full items-center gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
            {(
              [
                ["forYou", "For you"],
                ["following", "Following"],
                ["latest", "Latest"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (value === "following" && !requireAuth()) return;
                  setMode(value);
                }}
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                  mode === value
                    ? "bg-white text-black"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
          <ShortsUpload
            onCreated={(post) => {
              const created = post as ShortPost;
              pendingCreatedRef.current = created;
              setPosts((old) => [
                created,
                ...old.filter((p) => p.id !== created.id),
              ]);
              setActiveId(created.id);
              if (mode !== "latest") {
                setMode("latest");
              } else {
                pendingCreatedRef.current = null;
                requestAnimationFrame(() => {
                  containerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                });
              }
            }}
          />
        </div>
      </div>

      {loadingMore ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[max(6rem,env(safe-area-inset-bottom))] z-30 flex justify-center"
          aria-live="polite"
        >
          <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md">
            Loading more…
          </span>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-y-contain scroll-smooth [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {!ready ? (
          <div className="grid h-full place-items-center px-6">
            <Skeleton className="h-[70dvh] w-full max-w-md rounded-3xl bg-white/10" />
          </div>
        ) : null}

        {posts.map((post, index) => {
          const distance = Math.abs(index - activeIndex);
          const mountSrc = distance <= SRC_WINDOW;
          const preloadNext = index === activeIndex + 1;
          return (
            <MemoShortSlide
              key={post.id}
              post={post}
              index={index}
              active={post.id === activeId}
              mountSrc={mountSrc}
              preloadNext={preloadNext}
              muted={muted}
              onVideoRef={onVideoRef}
              onTogglePlay={onTogglePlay}
              onLike={toggleLike}
              onComment={onComment}
              onShare={share}
              onBookmark={toggleBookmark}
            />
          );
        })}

        {ready && !posts.length ? (
          <div className="grid h-full place-items-center px-6">
            <EmptyState
              title={
                mode === "following"
                  ? feedMeta.requiresAuth
                    ? "Sign in to see Following"
                    : feedMeta.emptyFollowing
                      ? "Not following anyone yet"
                      : "No videos from people you follow"
                  : "No shorts yet"
              }
              description={
                mode === "following"
                  ? feedMeta.requiresAuth
                    ? "Create an account or sign in to watch Shorts from creators you follow."
                    : feedMeta.emptyFollowing
                      ? "Follow creators to fill this feed with their Shorts and videos."
                      : "When people you follow post Shorts, they’ll show up here."
                  : "Upload a vertical video to start the feed, or check back soon."
              }
              className="w-full max-w-sm border-2 border-white/20 bg-white/10 text-white"
            />
          </div>
        ) : null}

        {!cursor && ready && posts.length > 0 ? (
          <div className="grid h-[30dvh] place-items-center text-xs font-medium text-white/50">
            You’re all caught up
          </div>
        ) : null}
      </div>

      {commentsFor ? (
        <div
          data-dialog-root=""
          className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4 lg:left-[var(--app-sidebar-width)]"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCommentsFor(null);
          }}
        >
          <div
            ref={commentsDialogRef}
            className="flex max-h-[min(78dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-white/10 bg-[#121212] p-5 text-white shadow-2xl md:rounded-[var(--radius-2xl)]"
            role="dialog"
            aria-modal="true"
            aria-label="Comments"
            tabIndex={-1}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h2 className="font-semibold">Comments</h2>
              <button
                type="button"
                onClick={() => setCommentsFor(null)}
                className="grid size-10 place-items-center rounded-full bg-white/10"
                aria-label="Close comments"
              >
                <X className="size-4" />
              </button>
            </div>
            <CommentsPanel
              postId={commentsFor}
              postAuthorId={posts.find((p) => p.id === commentsFor)?.author?.id}
              variant="sheet"
              onCommentCountChange={(count) => {
                setPosts((old) =>
                  old.map((p) =>
                    p.id === commentsFor ? { ...p, commentCount: count } : p,
                  ),
                );
              }}
            />
          </div>
        </div>
      ) : null}

      <ShareSheet
        open={Boolean(shareFor)}
        onClose={() => setShareFor(null)}
        postId={shareFor?.id ?? ""}
        text={shareFor?.body}
        title="Share reel"
        onShared={(count) => {
          if (!shareFor) return;
          const id = shareFor.id;
          setPosts((old) =>
            old.map((p) =>
              p.id === id
                ? {
                    ...p,
                    shareCount:
                      typeof count === "number"
                        ? count
                        : (p.shareCount ?? 0) + 1,
                  }
                : p,
            ),
          );
        }}
      />
    </div>
  );
}
