"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { FeedPost } from "@/types/feed";

type CollectionMeta = {
  id: string;
  name: string;
  description?: string | null;
  itemCount: number;
  owner: {
    handle?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
};

export default function PublicCollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [collection, setCollection] = useState<CollectionMeta | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void fetch(`/api/collections/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Collection not found");
          return;
        }
        setCollection(data.collection ?? null);
        setPosts(data.posts ?? []);
      })
      .catch(() => setError("Collection not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const owner =
    collection?.owner.displayName ||
    collection?.owner.name ||
    (collection?.owner.handle ? `@${collection.owner.handle}` : "Member");

  return (
    <PageTransition className="page-shell page-stack max-w-3xl">
      {loading ? <Skeleton className="h-40 w-full rounded-[var(--radius-2xl)]" /> : null}
      {!loading && error ? (
        <EmptyState title="Collection unavailable" description={error} />
      ) : null}
      {!loading && collection ? (
        <>
          <PageHeader
            kicker="Public collection"
            title={collection.name}
            description={
              collection.description ||
              `Curated by ${owner} · ${collection.itemCount} items`
            }
            actions={
              collection.owner.handle ? (
                <Link
                  href={`/u/${collection.owner.handle}`}
                  className="text-sm font-semibold text-[var(--signal-deep)]"
                >
                  View profile
                </Link>
              ) : null
            }
          />
          {!posts.length ? (
            <EmptyState
              title="Empty collection"
              description="Nothing visible here yet."
            />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </PageTransition>
  );
}
