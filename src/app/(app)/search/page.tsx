"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, Hash, Search, Users } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { PostCard } from "@/components/feed/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/motion/primitives";
import { FollowButton } from "@/components/social/follow-button";
import { VerificationBadge } from "@/components/brand/official-badge";
import type { FeedPost } from "@/types/feed";

type SearchUser = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  bio?: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
  isPrivate?: boolean;
  followersCount?: number;
  relation?: "none" | "following" | "requested";
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{
    users?: SearchUser[];
    posts?: FeedPost[];
    hashtags?: Array<{ id?: string; tag?: string; name?: string; postCount?: number }>;
    trending?: Array<{ id?: string; tag?: string; name?: string; postCount?: number }>;
  }>({});
  const [suggested, setSuggested] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState("People");

  useEffect(() => {
    fetch("/api/social/suggested?limit=8")
      .then((r) => r.json())
      .then((d) => setSuggested(d.users ?? []))
      .catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      setData(
        await fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) =>
          r.json(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  const users = data.users ?? [];
  const posts = data.posts ?? [];
  const tags = useMemo(
    () => data.hashtags ?? data.trending ?? [],
    [data],
  );

  return (
    <PageTransition className="section-shell px-5 md:px-8">
      <div className="glass-strong premium-ring overflow-hidden rounded-[2rem] p-6 md:p-8">
        <p className="kicker">Search the network</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
          Find people and conversations.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Search creators by name or username, then follow the ones worth meeting.
        </p>
        <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, posts, or #ideas"
            className="flex-1"
          />
          <Button type="submit" className="px-6">
            <Search className="size-4" />
            Search
          </Button>
        </form>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { Icon: Users, title: "People", body: "Find creators and official accounts." },
            { Icon: Compass, title: "Posts", body: "Surface public photos, videos, and reels." },
            { Icon: Hash, title: "Hashtags", body: "Follow topics shaping the conversation." },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <Icon className="size-5 text-[var(--signal)]" />
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {!searched && suggested.length ? (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Suggested for you</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {suggested.map((u) => (
              <Card key={u.id} className="flex items-center gap-4 p-5">
                <Link href={`/u/${u.handle}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar src={u.image} name={u.displayName ?? u.name} className="size-14" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <b className="block truncate text-base">{u.displayName ?? u.name}</b>
                      <VerificationBadge
                        isOfficial={u.isOfficial}
                        isVerified={u.isVerified}
                        className="size-4"
                      />
                    </span>
                    <small className="block text-sm text-[var(--muted)]">@{u.handle}</small>
                  </span>
                </Link>
                {u.handle ? <FollowButton handle={u.handle} /> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {searched ? (
        <div className="mt-8">
          <Tabs items={["People", "Posts", "Hashtags"]} value={tab} onChange={setTab} />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : null}

      {!loading && searched ? (
        <div className="mt-6 space-y-4">
          {tab === "People" ? (
            users.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {users.map((u) => (
                  <Card key={u.id} className="flex items-center gap-4 p-5">
                    <Link
                      href={`/u/${u.handle}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <Avatar
                        src={u.image}
                        name={u.displayName ?? u.name}
                        className="size-14"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <b className="block truncate text-base">
                            {u.displayName ?? u.name}
                          </b>
                          <VerificationBadge
                            isOfficial={u.isOfficial}
                            isVerified={u.isVerified}
                            className="size-4"
                          />
                        </span>
                        <small className="block text-sm text-[var(--muted)]">
                          @{u.handle}
                          {u.isPrivate ? " · Private" : ""}
                        </small>
                      </span>
                    </Link>
                    {u.handle ? (
                      <FollowButton
                        handle={u.handle}
                        initialRelation={u.relation ?? "none"}
                      />
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No people found"
                description="Try a handle, creator name, or official account."
              />
            )
          ) : null}

          {tab === "Posts" ? (
            posts.length ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <EmptyState
                title="No public posts found"
                description="Search for broader keywords or trending topics."
              />
            )
          ) : null}

          {tab === "Hashtags" ? (
            tags.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {tags.map((t) => (
                  <Link
                    key={t.id ?? t.tag}
                    href={`/hashtag/${encodeURIComponent(t.tag ?? t.name ?? "")}`}
                  >
                    <Card interactive className="p-5">
                      <p className="font-semibold text-[var(--ink)]">#{t.tag ?? t.name}</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {(t.postCount ?? 0).toLocaleString()} public posts
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No hashtags found"
                description="Try searching for a broader interest or trending phrase."
              />
            )
          ) : null}
        </div>
      ) : null}
    </PageTransition>
  );
}
