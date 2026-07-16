"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Play, Bookmark, Share2, Sparkles, X } from "lucide-react";
import { useGuest } from "@/components/auth/guest-provider";
import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { CommentsPanel } from "@/components/feed/comments-panel";
import { saveBrowseState } from "@/lib/guest/browse-state";

type ShortPost = {
  id: string;
  body?: string;
  likeCount?: number;
  commentCount?: number;
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

export default function ShortsPage() {
  const { requireAuth } = useGuest();
  const [posts, setPosts] = useState<ShortPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (after?: string | null) => {
    if (after) setLoadingMore(true);
    const res = await fetch(`/api/shorts${after ? `?cursor=${after}` : ""}`);
    const data = await res.json();
    if (res.ok) {
      setPosts((old) => (after ? [...old, ...(data.posts ?? [])] : data.posts ?? []));
      setCursor(data.nextCursor ?? null);
    }
    setReady(true);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.videoId;
      const video = id ? videoRefs.current.get(id) : null;
      if (!video || !id) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        setActiveId(id);
        void video.play().catch(() => {});
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
      threshold: [0.6],
    });
    for (const el of root.querySelectorAll("[data-video-id]")) observer.observe(el);
    return () => observer.disconnect();
  }, [posts, onIntersect]);

  useEffect(() => {
    const onScroll = () => {
      if (!activeId) return;
      const video = videoRefs.current.get(activeId);
      if (video) saveBrowseState({ videoId: activeId, videoTime: video.currentTime });
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
    if (navigator.share) {
      await navigator.share({ title: "RELUNE", text: post.body, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  return (
    <PageTransition className="page-shell">
      <div className="page-stack">
        <section className="glass-strong premium-ring hero-panel">
          <p className="kicker">RELUNE Shorts</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
                Vertical stories with premium pacing.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] md:text-base">
                Scroll through public reels, immersive videos, and creator moments with a cleaner,
                cinema-style viewer.
              </p>
            </div>
            <div className="flex gap-3 text-xs text-[var(--muted)]">
              <div className="kpi-chip px-4 py-3">
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <Play className="size-4 text-[var(--signal)]" />
                  Autoplay viewer
                </span>
              </div>
              <div className="kpi-chip px-4 py-3">
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--ink)]">
                  <Sparkles className="size-4 text-[var(--ember)]" />
                  Like & comment
                </span>
              </div>
            </div>
          </div>
        </section>
        <div
          ref={containerRef}
          className="surface-panel-strong mx-auto h-[76vh] w-full max-w-md snap-y snap-mandatory overflow-y-auto rounded-[var(--radius-2xl)] bg-[var(--night)] p-2 shadow-[var(--shadow-xl)]"
        >
          {!ready ? (
            <div className="space-y-3 p-1">
              <Skeleton className="h-[72vh] w-full rounded-[calc(var(--radius-2xl)-0.35rem)]" />
            </div>
          ) : null}
          {posts.map((post) => {
            const media = post.media?.[0];
            const liked = Boolean(post.liked);
            return (
              <article
                key={post.id}
                data-video-id={post.id}
                className="relative h-full snap-start overflow-hidden rounded-[calc(var(--radius-2xl)-0.35rem)]"
              >
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(post.id, el);
                    else videoRefs.current.delete(post.id);
                  }}
                  data-video-id={post.id}
                  src={media?.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 text-white">
                  <div className="min-w-0 flex-1">
                    <Link href={`/u/${post.author?.handle}`} className="inline-flex items-center gap-3">
                      <Avatar
                        src={post.author?.image}
                        name={post.author?.displayName ?? post.author?.name}
                        className="size-11 border-white/15"
                      />
                      <span className="min-w-0">
                        <b className="block truncate text-sm tracking-wide">
                          {post.author?.displayName ?? post.author?.name}
                        </b>
                        <span className="block truncate text-xs text-white/70">
                          @{post.author?.handle ?? "relune"}
                        </span>
                      </span>
                    </Link>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/88">{post.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleLike(post)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition ${
                        liked ? "bg-[var(--signal)] text-white" : "bg-white/12 text-white hover:bg-white/18"
                      }`}
                    >
                      <Heart className="size-5" fill={liked ? "currentColor" : "none"} />
                    </button>
                    <span className="text-center text-xs font-semibold text-white/80">
                      {post.likeCount ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireAuth()) return;
                        setCommentsFor(post.id);
                      }}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md transition hover:bg-white/18"
                    >
                      <MessageCircle className="size-5" />
                    </button>
                    <span className="text-center text-xs font-semibold text-white/80">
                      {post.commentCount ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleBookmark(post)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition ${
                        post.bookmarked
                          ? "bg-[var(--signal)] text-white"
                          : "bg-white/12 text-white hover:bg-white/18"
                      }`}
                      aria-label="Save"
                    >
                      <Bookmark
                        className="size-5"
                        fill={post.bookmarked ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => void share(post)}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-md transition hover:bg-white/18"
                    >
                      <Share2 className="size-5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {loadingMore ? (
            <div className="p-2">
              <Skeleton className="h-[72vh] w-full rounded-[calc(var(--radius-2xl)-0.35rem)]" />
            </div>
          ) : null}
          <div ref={loadMoreRef} className="h-2" />
          {ready && !posts.length ? (
            <div className="grid h-full place-items-center p-4">
              <EmptyState
                title="No shorts in your orbit yet"
                description="Fresh creator videos will appear here as soon as they are published."
                className="w-full border-white/12 bg-white/6 text-[var(--cloud)]"
              />
            </div>
          ) : null}
        </div>
      </div>

      {commentsFor ? (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="surface-panel-strong max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-2xl)] p-5">
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
    </PageTransition>
  );
}
