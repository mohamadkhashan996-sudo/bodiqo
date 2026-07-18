"use client";

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Clapperboard,
  FolderPlus,
  Globe2,
  Lock,
  Play,
  Search,
  Trash2,
} from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { usePostBookmark } from "@/hooks/use-post-bookmark";
import { appendUniqueById } from "@/lib/utils";
import { type FeedPost, isVideoPost } from "@/types/feed";

const SaveToCollectionSheet = dynamic(
  () =>
    import("@/components/social/save-to-collection-sheet").then(
      (m) => m.SaveToCollectionSheet,
    ),
  { ssr: false },
);

type Filter = "all" | "videos" | "posts";
type Sort = "newest" | "oldest";

type Collection = {
  id: string;
  name: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  itemCount: number;
};

function coverFor(post: FeedPost) {
  const media = post.media?.[0];
  if (!media) return null;
  return media.thumbUrl || media.url;
}

function SavedVideoTile({
  post,
  onUnsave,
}: {
  post: FeedPost;
  onUnsave: (id: string) => void;
}) {
  const { pending, remove } = usePostBookmark(post.id, true, (bookmarked) => {
    if (!bookmarked) onUnsave(post.id);
  });
  const cover = coverFor(post);
  const href = `/post/${post.id}`;

  async function unsave(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await remove();
  }

  return (
    <Link
      href={href}
      className="group relative aspect-[9/14] overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--night)] shadow-[var(--shadow-sm)]"
    >
      {cover ? (
        <MediaImage
          src={cover}
          alt=""
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 33vw, 180px"
        />
      ) : (
        <div className="grid h-full place-items-center bg-[var(--ink)]/80 text-white/70">
          <Clapperboard className="size-8" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <span className="absolute top-2 left-2 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
        <Play className="size-3.5 fill-current" />
      </span>
      <button
        type="button"
        onClick={(e) => void unsave(e)}
        disabled={pending}
        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-black/45 text-[var(--signal)] backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
        aria-label="Remove from saved"
      >
        <Bookmark className="size-4" fill="currentColor" />
      </button>
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="line-clamp-2 text-xs leading-snug font-semibold text-white">
          {post.body?.trim() || `@${post.author?.handle ?? "creator"}`}
        </p>
      </div>
    </Link>
  );
}

export default function SavedPage() {
  const { status } = useSession();
  const { requireAuth } = useGuest();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unavailableCount, setUnavailableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);
  const [movePostId, setMovePostId] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadCollections = useCallback(async () => {
    const res = await fetch("/api/bookmarks/collections");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setCollections(data.collections ?? []);
  }, []);

  const load = useCallback(
    async (after?: string | null) => {
      if (after) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: "24",
          filter,
          sort,
        });
        if (after) params.set("cursor", after);
        if (debouncedQ) params.set("q", debouncedQ);
        if (collectionId) params.set("collectionId", collectionId);
        const res = await fetch(`/api/bookmarks?${params}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401) requireAuth();
          return;
        }
        const incoming = (data.posts ?? []) as FeedPost[];
        setPosts((old) => (after ? appendUniqueById(old, incoming) : incoming));
        setCursor(data.nextCursor ?? null);
        setUnavailableCount(Number(data.unavailableCount ?? 0));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, sort, debouncedQ, collectionId, requireAuth],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      requireAuth();
      return;
    }
    if (status !== "authenticated") return;
    void loadCollections();
  }, [status, requireAuth, loadCollections]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setPosts([]);
    setCursor(null);
    void load(null);
  }, [status, filter, sort, debouncedQ, collectionId, load]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void load(cursor);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, load]);

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bookmarks/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, visibility: "PRIVATE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.collection) {
        setCollections((old) => [data.collection, ...old]);
        setNewCollectionName("");
        setCollectionId(data.collection.id);
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleVisibility(c: Collection) {
    const next = c.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    const res = await fetch(`/api/bookmarks/collections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (!res.ok) return;
    setCollections((old) =>
      old.map((row) =>
        row.id === c.id ? { ...row, visibility: next } : row,
      ),
    );
  }

  async function removeCollection(c: Collection) {
    if (!window.confirm(`Delete collection “${c.name}”? Saves stay in All.`)) {
      return;
    }
    const res = await fetch(`/api/bookmarks/collections/${c.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setCollections((old) => old.filter((row) => row.id !== c.id));
    if (collectionId === c.id) setCollectionId(null);
  }

  function removePost(id: string) {
    setPosts((old) => old.filter((p) => p.id !== id));
  }

  const videoPosts = posts.filter(isVideoPost);
  const textPosts = posts.filter((p) => !isVideoPost(p));
  const showVideos = filter === "all" || filter === "videos";
  const showPosts = filter === "all" || filter === "posts";
  const activeCollection = collections.find((c) => c.id === collectionId);

  return (
    <PageTransition className="page-shell page-stack max-w-4xl">
      <PageHeader
        kicker="Library"
        title="Saved"
        description="Organize bookmarks into private or public collections. Search and sync across tabs."
        actions={
          <Link
            href="/shorts"
            className="text-sm font-semibold text-[var(--signal-deep)] underline-offset-4 hover:underline"
          >
            Browse Shorts →
          </Link>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 80))}
          placeholder="Search saved posts and creators"
          className="pl-10"
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Collections
          </h2>
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs sm:flex-none">
            <Input
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value.slice(0, 80))}
              placeholder="New folder"
              className="min-h-10"
            />
            <button
              type="button"
              disabled={!newCollectionName.trim() || creating}
              onClick={() => void createCollection()}
              className="icon-button size-10 shrink-0"
              aria-label="Create collection"
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCollectionId(null)}
            className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${
              !collectionId
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cloud)]"
                : "border-[var(--mist-strong)] text-[var(--ink)]"
            }`}
          >
            All
          </button>
          {collections.map((c) => (
            <div key={c.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setCollectionId(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold ${
                  collectionId === c.id
                    ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]"
                    : "border-[var(--mist-strong)] text-[var(--ink)]"
                }`}
              >
                {c.visibility === "PUBLIC" ? (
                  <Globe2 className="size-3" />
                ) : (
                  <Lock className="size-3" />
                )}
                {c.name}
                <span className="tabular-nums opacity-70">{c.itemCount}</span>
              </button>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--mist)]"
                title={
                  c.visibility === "PUBLIC" ? "Make private" : "Make public"
                }
                onClick={() => void toggleVisibility(c)}
              >
                {c.visibility === "PUBLIC" ? (
                  <Lock className="size-3" />
                ) : (
                  <Globe2 className="size-3" />
                )}
              </button>
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--mist)]"
                aria-label={`Delete ${c.name}`}
                onClick={() => void removeCollection(c)}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
        {activeCollection?.visibility === "PUBLIC" &&
        activeCollection ? (
          <p className="text-xs text-[var(--muted-strong)]">
            Public link:{" "}
            <Link
              href={`/collections/${activeCollection.id}`}
              className="font-semibold text-[var(--signal-deep)] underline-offset-2 hover:underline"
            >
              /collections/{activeCollection.id}
            </Link>
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          aria-label="Saved filters"
          items={["All", "Videos", "Posts"]}
          value={
            filter === "videos"
              ? "Videos"
              : filter === "posts"
                ? "Posts"
                : "All"
          }
          onChange={(label) => {
            if (label === "Videos") setFilter("videos");
            else if (label === "Posts") setFilter("posts");
            else setFilter("all");
          }}
        />
        <button
          type="button"
          className="text-xs font-semibold text-[var(--muted-strong)]"
          onClick={() =>
            setSort((s) => (s === "newest" ? "oldest" : "newest"))
          }
        >
          Sort: {sort === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      {unavailableCount > 0 ? (
        <p className="text-xs text-[var(--muted)]">
          {unavailableCount} saved item
          {unavailableCount === 1 ? "" : "s"} hidden — no longer visible to you.
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[9/14] rounded-[var(--radius-xl)]"
            />
          ))}
        </div>
      ) : null}

      {!loading && !posts.length ? (
        <EmptyState
          title={debouncedQ ? "No matches" : "Nothing saved yet"}
          description={
            debouncedQ
              ? "Try a different search."
              : "Tap bookmark on a post or Short — then organize into collections."
          }
          action={
            <button
              type="button"
              className="text-sm font-semibold text-[var(--signal-deep)]"
              onClick={() => router.push("/shorts")}
            >
              Find videos to save
            </button>
          }
        />
      ) : null}

      {!loading && posts.length ? (
        <div className="space-y-8">
          {showVideos && (filter === "videos" ? posts : videoPosts).length ? (
            <section className="space-y-3">
              {filter === "all" ? (
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Videos
                </h2>
              ) : null}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {(filter === "videos" ? posts : videoPosts).map((post) => (
                  <SavedVideoTile
                    key={post.id}
                    post={post}
                    onUnsave={removePost}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showPosts && (filter === "posts" ? posts : textPosts).length ? (
            <section className="space-y-3">
              {filter === "all" ? (
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Posts
                </h2>
              ) : null}
              <div className="mx-auto max-w-3xl space-y-4">
                {(filter === "posts" ? posts : textPosts).map((post) => (
                  <div key={post.id} className="relative">
                    <PostCard
                      post={{ ...post, bookmarked: true }}
                      onBookmarkChange={(bookmarked) => {
                        if (!bookmarked) removePost(post.id);
                      }}
                    />
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-[var(--signal-deep)]"
                      onClick={() => setMovePostId(post.id)}
                    >
                      Move to collection
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {loadingMore ? (
            <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
          ) : null}
          <div ref={sentinel} className="h-4" />
        </div>
      ) : null}

      <SaveToCollectionSheet
        open={Boolean(movePostId)}
        onClose={() => setMovePostId(null)}
        postId={movePostId ?? ""}
        onSaved={() => {
          void loadCollections();
          if (collectionId) void load(null);
        }}
      />
    </PageTransition>
  );
}
