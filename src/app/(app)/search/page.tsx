"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clapperboard,
  Compass,
  Hash,
  History,
  Search,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { FormEvent } from "react";

import { VerificationBadge } from "@/components/brand/official-badge";
import { PostCard } from "@/components/feed/post-card";
import { PageTransition } from "@/components/motion/primitives";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
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

type CommunityHit = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  membersCount?: number;
  postsCount?: number;
};

type TagHit = {
  id?: string;
  tag?: string;
  name?: string;
  postCount?: number;
};

type SearchData = {
  users?: SearchUser[];
  posts?: FeedPost[];
  videos?: FeedPost[];
  communities?: CommunityHit[];
  hashtags?: TagHit[];
  trending?: TagHit[];
  recent?: Array<{ id: string; query: string }>;
};

const TABS = [
  "All",
  "People",
  "Posts",
  "Videos",
  "Communities",
  "Hashtags",
] as const;

const TAB_TO_TYPE: Record<(typeof TABS)[number], string> = {
  All: "all",
  People: "users",
  Posts: "posts",
  Videos: "videos",
  Communities: "communities",
  Hashtags: "hashtags",
};

type SuggestData = {
  users?: SearchUser[];
  hashtags?: TagHit[];
  recent?: Array<{ id: string; query: string }>;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData>({});
  const [suggested, setSuggested] = useState<SearchUser[]>([]);
  const [suggest, setSuggest] = useState<SuggestData>({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  useEffect(() => {
    void Promise.all([
      fetch("/api/social/suggested?limit=8")
        .then((r) => r.json())
        .then((d) => setSuggested(d.users ?? [])),
      fetch("/api/search")
        .then((r) => r.json())
        .then((d) =>
          setData((prev) => ({
            ...prev,
            trending: d.trending ?? [],
            recent: d.recent ?? [],
          })),
        ),
    ]).catch(() => {});
  }, []);

  async function runSearch(
    q: string,
    opts?: { record?: boolean; type?: string },
  ) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    setShowSuggest(false);
    try {
      const type = opts?.type ?? TAB_TO_TYPE[tab];
      const record = opts?.record === false ? "0" : "1";
      const result = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&type=${type}&record=${record}`,
      ).then((r) => r.json());
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await runSearch(query, { record: true });
  }

  async function clearHistory() {
    await fetch("/api/search", { method: "DELETE" });
    setData((prev) => ({ ...prev, recent: [] }));
    setSuggest((prev) => ({ ...prev, recent: [] }));
  }

  // Autocomplete while typing (does not write history).
  useEffect(() => {
    const q = query.trim();
    if (searched || q.length < 1) {
      if (q.length < 1) setSuggest({});
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setSuggest(d);
          setShowSuggest(true);
        })
        .catch(() => undefined);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query, searched]);

  // Live search with debounce while typing after first submit (no history spam).
  // Also re-runs when the type tab changes.
  useEffect(() => {
    if (!searched) return;
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      void runSearch(q, { record: false });
    }, 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, searched]);

  const users = data.users ?? [];
  const posts = data.posts ?? [];
  const videos = data.videos ?? [];
  const communities = data.communities ?? [];
  const tags = useMemo(() => data.hashtags ?? data.trending ?? [], [data]);
  const recent = data.recent ?? [];
  const trending = data.trending ?? [];
  const suggestUsers = suggest.users ?? [];
  const suggestTags = suggest.hashtags ?? [];
  const suggestRecent = suggest.recent ?? [];
  const hasSuggest =
    showSuggest &&
    !searched &&
    (suggestUsers.length > 0 ||
      suggestTags.length > 0 ||
      suggestRecent.length > 0);

  const totals = {
    People: users.length,
    Posts: posts.length,
    Videos: videos.length,
    Communities: communities.length,
    Hashtags: tags.length,
  };
  const allEmpty =
    searched &&
    !loading &&
    !users.length &&
    !posts.length &&
    !videos.length &&
    !communities.length &&
    !tags.length;

  function show(section: (typeof TABS)[number]) {
    return tab === "All" || tab === section;
  }

  return (
    <PageTransition className="section-shell">
      <div className="glass-strong premium-ring overflow-hidden rounded-[1.5rem] p-4 sm:rounded-[2rem] sm:p-6 md:p-8">
        <p className="kicker">Search the network</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl md:text-5xl">
          Find people, posts, videos, and communities.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Ranked results across creators, public posts, reels, communities, and
          hashtags.
        </p>
        <form
          onSubmit={submit}
          className="relative mt-8 flex flex-col gap-3 sm:flex-row"
          role="search"
        >
          <div className="relative min-w-0 flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (!searched && query.trim()) setShowSuggest(true);
              }}
              placeholder="Search people, posts, videos, communities, or #topics"
              className="w-full"
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-label="Search Relune"
              aria-autocomplete="list"
              aria-expanded={hasSuggest}
              aria-controls={hasSuggest ? "search-suggestions" : undefined}
            />
            {hasSuggest ? (
              <div
                id="search-suggestions"
                role="listbox"
                aria-label="Search suggestions"
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 max-h-80 overflow-auto rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]"
              >
                {suggestRecent.length ? (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                      Recent
                    </p>
                    {suggestRecent.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--mist)]"
                        onClick={() => {
                          setQuery(row.query);
                          void runSearch(row.query, { record: true });
                        }}
                      >
                        <History className="size-3.5 shrink-0 text-[var(--muted)]" />
                        {row.query}
                      </button>
                    ))}
                  </div>
                ) : null}
                {suggestUsers.length ? (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                      People
                    </p>
                    {suggestUsers.map((user) => (
                      <Link
                        key={user.id}
                        href={`/u/${user.handle}`}
                        role="option"
                        aria-selected="false"
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--mist)]"
                        onClick={() => setShowSuggest(false)}
                      >
                        <Avatar
                          src={user.image}
                          name={user.displayName ?? user.name}
                          className="size-7"
                        />
                        <span className="min-w-0 truncate font-semibold">
                          {user.displayName ?? user.name}
                        </span>
                        <span className="truncate text-[var(--muted)]">
                          @{user.handle}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {suggestTags.length ? (
                  <div>
                    <p className="px-2 py-1 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                      Hashtags
                    </p>
                    {suggestTags.map((tag) => {
                      const name = tag.tag ?? tag.name ?? "";
                      return (
                        <Link
                          key={tag.id ?? name}
                          href={`/hashtag/${encodeURIComponent(name)}`}
                          role="option"
                          aria-selected="false"
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--mist)]"
                          onClick={() => setShowSuggest(false)}
                        >
                          <Hash className="size-3.5 text-[var(--signal)]" />#
                          {name}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <Button type="submit" className="px-6">
            <Search className="size-4" />
            Search
          </Button>
        </form>
        <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {[
            { Icon: Users, title: "People" },
            { Icon: Compass, title: "Posts" },
            { Icon: Clapperboard, title: "Videos" },
            { Icon: UsersRound, title: "Communities" },
            { Icon: Hash, title: "Hashtags" },
          ].map(({ Icon, title }) => (
            <div
              key={title}
              className="min-w-0 rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <Icon className="size-5 text-[var(--signal)]" />
              <p className="mt-3 text-sm font-semibold">{title}</p>
            </div>
          ))}
        </div>
      </div>

      {!searched ? (
        <div className="mt-8 space-y-8">
          {recent.length ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl">
                  <History className="size-5 text-[var(--signal)]" />
                  Recent
                </h2>
                <button
                  type="button"
                  onClick={() => void clearHistory()}
                  className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setQuery(row.query);
                      void runSearch(row.query, { record: true });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2 text-sm"
                  >
                    <History className="size-3.5 text-[var(--muted)]" />
                    {row.query}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {trending.length ? (
            <section>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Trending hashtags
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {trending.map((t) => (
                  <Link
                    key={t.id ?? t.tag}
                    href={`/hashtag/${encodeURIComponent(t.tag ?? t.name ?? "")}`}
                  >
                    <Card interactive className="p-4">
                      <p className="font-semibold">#{t.tag ?? t.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {(t.postCount ?? 0).toLocaleString()} posts
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {suggested.length ? (
            <section>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Suggested for you
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {suggested.map((u) => (
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
                        </small>
                      </span>
                    </Link>
                    {u.handle ? (
                      <FollowButton handle={u.handle} userId={u.id} />
                    ) : null}
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {searched ? (
        <div className="mt-8">
          <Tabs
            items={[...TABS]}
            value={tab}
            onChange={(value) => setTab(value as (typeof TABS)[number])}
          />
          {tab === "All" && !loading ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              {Object.entries(totals)
                .map(([k, v]) => `${v} ${k.toLowerCase()}`)
                .join(" · ")}
            </p>
          ) : null}
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
        <div className="mt-6 space-y-10">
          {allEmpty ? (
            <EmptyState
              title="No results"
              description="Try a broader keyword, a creator handle, or a #topic."
              action={
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => {
                    setQuery("");
                    setSearched(false);
                  }}
                >
                  <X className="size-4" />
                  Clear search
                </Button>
              }
            />
          ) : null}

          {show("People") && users.length ? (
            <section>
              {tab === "All" ? (
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">
                  People
                </h2>
              ) : null}
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
                          {typeof u.followersCount === "number"
                            ? ` · ${u.followersCount.toLocaleString()} followers`
                            : ""}
                          {u.isPrivate ? " · Private" : ""}
                        </small>
                      </span>
                    </Link>
                    {u.handle ? (
                      <FollowButton
                        handle={u.handle}
                        userId={u.id}
                        initialRelation={u.relation ?? "none"}
                      />
                    ) : null}
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {show("People") && tab === "People" && !users.length ? (
            <EmptyState title="No people found" />
          ) : null}

          {show("Posts") && posts.length ? (
            <section>
              {tab === "All" ? (
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">
                  Posts
                </h2>
              ) : null}
              <div className="space-y-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          ) : null}

          {show("Posts") && tab === "Posts" && !posts.length ? (
            <EmptyState title="No posts found" />
          ) : null}

          {show("Videos") && videos.length ? (
            <section>
              {tab === "All" ? (
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">
                  Videos
                </h2>
              ) : null}
              <div className="space-y-4">
                {videos.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          ) : null}

          {show("Videos") && tab === "Videos" && !videos.length ? (
            <EmptyState title="No videos found" />
          ) : null}

          {show("Communities") && communities.length ? (
            <section>
              {tab === "All" ? (
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">
                  Communities
                </h2>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {communities.map((c) => (
                  <Link key={c.id} href={`/communities/${c.slug}`}>
                    <Card interactive className="flex items-center gap-4 p-5">
                      <Avatar
                        src={c.image}
                        name={c.name}
                        className="size-14 rounded-[1rem]"
                      />
                      <span className="min-w-0">
                        <b className="block truncate">{c.name}</b>
                        <small className="mt-1 block truncate text-sm text-[var(--muted)]">
                          {c.category ? `${c.category} · ` : ""}
                          {(c.membersCount ?? 0).toLocaleString()} members
                        </small>
                        {c.description ? (
                          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-strong)]">
                            {c.description}
                          </p>
                        ) : null}
                      </span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {show("Communities") &&
          tab === "Communities" &&
          !communities.length ? (
            <EmptyState title="No communities found" />
          ) : null}

          {show("Hashtags") && tags.length ? (
            <section>
              {tab === "All" ? (
                <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl">
                  Hashtags
                </h2>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {tags.map((t) => (
                  <Link
                    key={t.id ?? t.tag}
                    href={`/hashtag/${encodeURIComponent(t.tag ?? t.name ?? "")}`}
                  >
                    <Card interactive className="p-5">
                      <p className="font-semibold text-[var(--ink)]">
                        #{t.tag ?? t.name}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {(t.postCount ?? 0).toLocaleString()} public posts
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {show("Hashtags") && tab === "Hashtags" && !tags.length ? (
            <EmptyState title="No hashtags found" />
          ) : null}
        </div>
      ) : null}
    </PageTransition>
  );
}
