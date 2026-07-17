"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { CommentsPanel } from "@/components/feed/comments-panel";
import { ShortsUpload } from "@/components/shorts/shorts-upload";
import { saveBrowseState } from "@/lib/guest/browse-state";

type ShortPost = {
  id: string;
  body?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  liked?: boolean;
  bookmarked?: boolean;
  media?: Array<{ url: string }>;
  author?: {
    handle?: string;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ShortsFeed() {
  const { requireAuth } = useGuest();
  const [posts, setPosts] = useState<ShortPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted] = useState(true);
  const [mode, setMode] = useState<"forYou" | "latest">("forYou");
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (after?: string | null, replace = false) => {
      if (after) setLoadingMore(true);
      const params = new URLSearchParams({ mode });
      if (after) params.set("cursor", after);
      const res = await fetch(`/api/shorts?${params}`);
      const data = await res.json();
      if (res.ok) {
        setPosts((old) =>
          replace || !after
            ? (data.posts ?? [])
            : [...old, ...(data.posts ?? [])],
        );
        setCursor(data.nextCursor ?? null);
      }
      setReady(true);
      setLoadingMore(false);
    },
    [mode],
  );

  useEffect(() => {
    setReady(false);
    setPosts([]);
    setCursor(null);
    viewedRef.current.clear();
    void load(null, true);
  }, [load]);

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.videoId;
      const video = id ? videoRefs.current.get(id) : null;
      if (!video || !id) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
        setActiveId(id);
        void video.play().catch(() => {});
        if (!viewedRef.current.has(id)) {
          viewedRef.current.add(id);
          void fetch(`/api/posts/${id}/view`, { method: "POST" }).catch(
            () => {},
          );
        }
      } else {
        video.pause();
      }
    }
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !posts.length) return;
    const observer = new IntersectionObserver(onIntersect, {
      root,
      threshold: [0.65],
    });
    for (const el of root.querySelectorAll("[data-video-id]")) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [posts, onIntersect]);

  useEffect(() => {
    for (const video of videoRefs.current.values()) {
      video.muted = muted;
    }
  }, [muted, posts]);

  useEffect(() => {
    const onScroll = () => {
      if (!activeId) return;
      const video = videoRefs.current.get(activeId);
      if (video) {
        saveBrowseState({ videoId: activeId, videoTime: video.currentTime });
      }
    };
    const el = containerRef.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => el?.removeEventListener("scroll", onScroll);
  }, [activeId]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor && !loadingMore) void load(cursor);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, load, loadingMore]);

  // Keyboard swipe: ArrowUp / ArrowDown / Space mute toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const root = containerRef.current;
      if (!root || commentsFor) return;
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
        if (!activeId) return;
        const video = videoRefs.current.get(activeId);
        if (!video) return;
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, commentsFor]);

  async function toggleLike(post: ShortPost) {
    if (!requireAuth()) return;
    const liked = Boolean(post.liked);
    const res = await fetch(`/api/posts/${post.id}/like`, {
      method: liked ? "DELETE" : "POST",
    });
    if (!res.ok) return;
    setPosts((old) =>
      old.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked: !liked,
              likeCount: (p.likeCount ?? 0) + (liked ? -1 : 1),
            }
          : p,
      ),
    );
  }

  async function toggleBookmark(post: ShortPost) {
    if (!requireAuth()) return;
    const saved = Boolean(post.bookmarked);
    const res = await fetch(`/api/posts/${post.id}/bookmark`, {
      method: saved ? "DELETE" : "POST",
    });
    if (!res.ok) return;
    setPosts((old) =>
      old.map((p) => (p.id === post.id ? { ...p, bookmarked: !saved } : p)),
    );
  }

  async function share(post: ShortPost) {
    const url = `${location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Relune Short",
          text: post.body || undefined,
          url,
        });
      } else {
        await navigator.clipboard?.writeText(url);
      }
    } catch {
      /* user cancelled share sheet */
    }
    const res = await fetch(`/api/posts/${post.id}/share`, { method: "POST" });
    if (!res.ok) return;
    setPosts((old) =>
      old.map((p) =>
        p.id === post.id
          ? { ...p, shareCount: (p.shareCount ?? 0) + 1 }
          : p,
      ),
    );
  }

  return (
    <div className="fixed inset-0 z-[35] bg-black lg:left-[17.5rem]">
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full bg-black/35 p-1 backdrop-blur-md">
          {(
            [
              ["forYou", "For you"],
              ["latest", "Latest"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                mode === value
                  ? "bg-white text-black"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
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
              setPosts((old) => [post as ShortPost, ...old]);
              setMode("latest");
              requestAnimationFrame(() => {
                containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              });
            }}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth pb-[max(4.75rem,env(safe-area-inset-bottom))] lg:pb-0"
        style={{ scrollbarWidth: "none" }}
      >
        {!ready ? (
          <div className="grid h-full place-items-center px-6">
            <Skeleton className="h-[70dvh] w-full max-w-md rounded-3xl bg-white/10" />
          </div>
        ) : null}

        {posts.map((post) => {
          const media = post.media?.[0];
          const liked = Boolean(post.liked);
          return (
            <article
              key={post.id}
              data-video-id={post.id}
              className="relative h-[100dvh] w-full shrink-0 snap-start snap-always"
            >
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current.set(post.id, el);
                    el.muted = muted;
                  } else videoRefs.current.delete(post.id);
                }}
                src={media?.url}
                muted={muted}
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover"
                onClick={() => {
                  const video = videoRefs.current.get(post.id);
                  if (!video) return;
                  if (video.paused) void video.play().catch(() => {});
                  else video.pause();
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/25" />

              <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16 text-white lg:pb-6">
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
                    onClick={() => void toggleLike(post)}
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
                    onClick={() => {
                      if (!requireAuth()) return;
                      setCommentsFor(post.id);
                    }}
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
                    onClick={() => void share(post)}
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
                    onClick={() => void toggleBookmark(post)}
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
        })}

        {loadingMore ? (
          <div className="grid h-full place-items-center">
            <Skeleton className="h-24 w-24 rounded-full bg-white/10" />
          </div>
        ) : null}
        <div ref={loadMoreRef} className="h-2 shrink-0" />

        {ready && !posts.length ? (
          <div className="grid h-full place-items-center px-6">
            <EmptyState
              title="No shorts yet"
              description="Upload a vertical video to start the feed, or check back soon."
              className="w-full max-w-sm border-2 border-white/20 bg-white/10 text-white"
            />
          </div>
        ) : null}
      </div>

      {commentsFor ? (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4 lg:left-[17.5rem]">
          <div className="surface-panel-strong max-h-[78vh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] p-5 md:rounded-[var(--radius-2xl)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Comments</h2>
              <button
                type="button"
                onClick={() => setCommentsFor(null)}
                className="icon-button h-10 w-10"
              >
                <X className="size-4" />
              </button>
            </div>
            <CommentsPanel postId={commentsFor} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
