"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PostCard } from "@/components/feed/post-card";
import { PostComposer } from "@/components/feed/post-composer";
import { StoriesRail } from "@/components/feed/stories-rail";
import { Avatar } from "@/components/ui/avatar";

export function HomeFeed() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async (after?: string | null) => {
    const res = await fetch(`/api/posts${after ? `?cursor=${after}` : ""}`);
    const data = await res.json();
    if (res.ok) {
      setPosts((old) => (after ? [...old, ...(data.posts ?? [])] : data.posts ?? []));
      setCursor(data.nextCursor ?? null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/explore?mode=users&limit=5")
      .then((r) => r.json())
      .then((d) => setSuggested(d.users ?? []))
      .catch(() => {});
  }, [load]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && cursor) load(cursor);
    });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, load]);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,680px)_260px]">
      <section>
        <div className="mb-7">
          <p className="text-[11px] font-semibold tracking-[.22em] text-[var(--signal)] uppercase">
            {session?.user ? "Your circle" : "Discover"}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {session?.user ? "Good to see you." : "Explore Relune."}
          </h1>
        </div>
        <StoriesRail />
        {session?.user ? (
          <div className="mt-7">
            <PostComposer onCreated={(post) => setPosts((old) => [post, ...old])} />
          </div>
        ) : null}
        <div className="mt-6 space-y-4">
          {posts.map((post) => (
            <PostCard post={post} key={post.id} />
          ))}
          {ready && !posts.length ? (
            <p className="rounded-3xl border border-dashed border-[var(--mist)] p-8 text-center text-sm text-[var(--muted)]">
              {session?.user
                ? "Your feed is waiting for its first shared thought."
                : "No public posts yet. Check back soon."}
            </p>
          ) : null}
          <div ref={sentinel} className="h-4" />
        </div>
      </section>
      <aside className="hidden xl:block">
        <div className="sticky top-10 rounded-[1.75rem] border border-white/70 bg-white/45 p-5 backdrop-blur-sm">
          <p className="text-[11px] font-bold tracking-[.18em] text-[var(--muted)] uppercase">
            Worth meeting
          </p>
          <div className="mt-4 space-y-4">
            {suggested.map((user) => (
              <Link href={`/u/${user.handle}`} key={user.id} className="flex items-center gap-3">
                <Avatar src={user.image} name={user.displayName ?? user.name} className="size-9" />
                <span className="min-w-0">
                  <b className="block truncate text-sm">{user.displayName ?? user.name}</b>
                  <small className="text-[var(--muted)]">@{user.handle}</small>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/explore" className="mt-5 block text-xs font-semibold text-[var(--signal)]">
            Explore the wider circle →
          </Link>
        </div>
      </aside>
    </div>
  );
}
