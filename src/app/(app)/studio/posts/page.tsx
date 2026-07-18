"use client";

import { useCallback, useEffect, useState } from "react";

import { PostCard } from "@/components/feed/post-card";
import { StudioShell } from "@/components/studio/studio-shell";
import { Button } from "@/components/ui/button";
import { Card, Skeleton, StateBanner } from "@/components/ui/card";
import type { FeedPost } from "@/types/feed";

type Tab = "drafts" | "scheduled" | "archived";

export default function StudioPostsPage() {
  const [tab, setTab] = useState<Tab>("drafts");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts?mine=${next}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load posts");
        setPosts([]);
        return;
      }
      setPosts(data.posts ?? []);
    } catch {
      setError("Could not load posts");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  return (
    <StudioShell
      title="Drafts & archives"
      subtitle="Manage drafts, scheduled posts, and archives."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["drafts", "Drafts"],
            ["scheduled", "Scheduled"],
            ["archived", "Archived"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={tab === key ? "signal" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error ? (
        <div className="mb-4">
          <StateBanner tone="error">{error}</StateBanner>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
        </div>
      ) : !posts.length ? (
        <Card className="p-6 text-sm text-[var(--muted)]">
          No {tab} posts yet.
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="space-y-2">
              {tab === "archived" ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    onClick={async () => {
                      const res = await fetch(`/api/posts/${post.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ archive: false }),
                      });
                      if (res.ok) void load("archived");
                    }}
                  >
                    Unarchive
                  </Button>
                </div>
              ) : null}
              <PostCard
                post={post}
                onRemoved={() =>
                  setPosts((prev) => prev.filter((p) => p.id !== post.id))
                }
              />
            </div>
          ))}
        </div>
      )}
    </StudioShell>
  );
}
