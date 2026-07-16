"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.post) setPost(data.post);
        else setError(data.error || "Post not found");
      })
      .catch(() => setError("Post not found"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <PageTransition className="page-shell max-w-3xl">
      {loading ? <Skeleton className="h-96 w-full rounded-[var(--radius-2xl)]" /> : null}
      {!loading && post ? <PostCard post={post} /> : null}
      {!loading && !post ? (
        <EmptyState title="Post unavailable" description={error ?? "This post may be private or removed."} />
      ) : null}
    </PageTransition>
  );
}
