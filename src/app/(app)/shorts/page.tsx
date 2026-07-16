"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { useGuest } from "@/components/auth/guest-provider";
import { saveBrowseState } from "@/lib/guest/browse-state";

export default function ShortsPage() {
  const { requireAuth } = useGuest();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    fetch("/api/shorts")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {});
  }, []);

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
    if (!root) return;
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

  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-5 font-[family-name:var(--font-display)] text-3xl">Shorts</h1>
      <div
        ref={containerRef}
        className="h-[78vh] snap-y snap-mandatory overflow-y-auto rounded-[2rem] bg-[var(--night)]"
      >
        {posts.map((post) => {
          const media = post.media?.[0];
          return (
            <article
              key={post.id}
              data-video-id={post.id}
              className="relative h-full snap-start"
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
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                <b>{post.author?.displayName ?? post.author?.name}</b>
                <p className="mt-2 text-sm">{post.body}</p>
                <div className="mt-4 flex gap-4 text-sm">
                  <button type="button" onClick={() => requireAuth()} className="flex items-center">
                    <Heart className="mr-1 inline size-4" />
                    {post.likeCount}
                  </button>
                  <button type="button" onClick={() => requireAuth()} className="flex items-center">
                    <MessageCircle className="mr-1 inline size-4" />
                    {post.commentCount}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {!posts.length ? (
          <p className="grid h-full place-items-center text-[var(--cloud)]">
            No shorts in your orbit yet.
          </p>
        ) : null}
      </div>
    </main>
  );
}
