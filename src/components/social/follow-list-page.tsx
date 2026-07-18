"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";

import { VerificationBadge } from "@/components/brand/official-badge";
import { PageTransition } from "@/components/motion/primitives";
import {
  FollowButton,
  type FollowRelation,
} from "@/components/social/follow-button";
import { FriendButton } from "@/components/social/friend-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { useCursorFeed } from "@/hooks/use-cursor-feed";
import { useSocket } from "@/hooks/use-socket";

type Person = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
  bio?: string | null;
  relation?: FollowRelation | "self";
  isBestFriend?: boolean;
  isFriend?: boolean;
};

export default function FollowListPage({
  mode,
}: {
  mode: "followers" | "following" | "friends";
}) {
  const { handle } = useParams<{ handle: string }>();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const meHandle = session?.user?.handle;
  const isOwnFriends =
    mode === "friends" &&
    Boolean(meHandle) &&
    meHandle?.toLowerCase() === String(handle).toLowerCase();

  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<Person[] | null>(null);
  const [searching, setSearching] = useState(false);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const res = await fetch(
        `/api/users/${handle}/${mode}${cursor ? `?cursor=${cursor}` : ""}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          items: [] as Person[],
          nextCursor: null,
          error: data.error || "Unavailable",
        };
      }
      return {
        items: (data.users ?? []) as Person[],
        nextCursor: data.nextCursor ?? null,
      };
    },
    [handle, mode],
  );

  const {
    items: users,
    setItems,
    loading,
    loadingMore,
    error,
    sentinelRef,
    reload,
  } = useCursorFeed({
    resetKey: `${handle}:${mode}`,
    fetchPage,
  });

  useEffect(() => {
    if (!socket || !isOwnFriends) return;
    const onFriend = () => void reload();
    socket.on("friend:update", onFriend);
    return () => {
      socket.off("friend:update", onFriend);
    };
  }, [socket, isOwnFriends, reload]);

  useEffect(() => {
    if (!isOwnFriends) {
      setSearchHits(null);
      return;
    }
    const term = query.trim();
    if (term.length < 1) {
      setSearchHits(null);
      return;
    }
    const t = window.setTimeout(() => {
      setSearching(true);
      void fetch(
        `/api/social/friends?mode=search&q=${encodeURIComponent(term)}`,
      )
        .then((r) => r.json())
        .then((d) => setSearchHits((d.users ?? []) as Person[]))
        .catch(() => setSearchHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, isOwnFriends]);

  async function toggleBest(person: Person) {
    const action = person.isBestFriend ? "unbest" : "best";
    const res = await fetch(`/api/social/friends/${person.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    const nextBest = !person.isBestFriend;
    setItems((old) =>
      old.map((u) =>
        u.id === person.id ? { ...u, isBestFriend: nextBest } : u,
      ),
    );
    setSearchHits((old) =>
      old
        ? old.map((u) =>
            u.id === person.id ? { ...u, isBestFriend: nextBest } : u,
          )
        : old,
    );
  }

  async function removeFriend(person: Person) {
    if (!window.confirm(`Remove @${person.handle} as a friend?`)) return;
    const res = await fetch(`/api/social/friends/${person.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setItems((old) => old.filter((u) => u.id !== person.id));
    setSearchHits((old) =>
      old ? old.filter((u) => u.id !== person.id) : old,
    );
  }

  const [suggested, setSuggested] = useState<Person[]>([]);

  useEffect(() => {
    if (!isOwnFriends) return;
    void fetch("/api/social/friends?mode=suggested&limit=6")
      .then((r) => r.json())
      .then((d) => setSuggested((d.users ?? []) as Person[]))
      .catch(() => setSuggested([]));
  }, [isOwnFriends, users.length]);

  const displayUsers = searchHits ?? users;

  return (
    <PageTransition className="page-shell page-stack max-w-2xl">
      <div>
        <Link
          href={`/u/${handle}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← @{handle}
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight capitalize">
          {mode === "friends" ? "Friends" : mode}
        </h1>
        {mode === "friends" ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Friends are people you follow who follow you back.
            {isOwnFriends ? (
              <>
                {" "}
                <Link
                  href="/friends/activity"
                  className="font-semibold text-[var(--signal-deep)] hover:underline"
                >
                  Friend activity
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {isOwnFriends ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="min-h-11 flex-1 rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--signal)]"
            aria-label="Search friends"
          />
          <Link
            href="/settings/privacy"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] px-4 text-sm font-semibold hover:bg-[var(--mist)]"
          >
            Privacy
          </Link>
        </div>
      ) : null}

      {loading || searching ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : null}

      {error ? (
        <EmptyState title={error} description="This list may be private." />
      ) : null}

      {!loading && !searching && !error && displayUsers.length ? (
        <div className="space-y-3">
          {displayUsers.map((person) => (
            <div
              key={person.id}
              className="surface-panel-strong flex items-center gap-3 rounded-[var(--radius-xl)] p-4"
            >
              <Link
                href={`/u/${person.handle}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  src={person.image}
                  name={person.displayName ?? person.name}
                  className="size-12"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <b className="truncate">
                      {person.displayName ?? person.name}
                    </b>
                    {person.isBestFriend ? (
                      <Star className="size-3.5 fill-[var(--ember)] text-[var(--ember)]" />
                    ) : null}
                    <VerificationBadge
                      isOfficial={person.isOfficial}
                      isVerified={person.isVerified}
                      className="size-4"
                    />
                  </span>
                  <small className="block text-[var(--muted)]">
                    @{person.handle}
                  </small>
                  {person.bio ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--muted)]">
                      {person.bio}
                    </p>
                  ) : null}
                </span>
              </Link>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {isOwnFriends ? (
                  <>
                    <Button
                      type="button"
                      variant="quiet"
                      className="min-h-9 px-2 text-xs"
                      aria-label={
                        person.isBestFriend
                          ? "Remove best friend"
                          : "Mark best friend"
                      }
                      onClick={() => void toggleBest(person)}
                    >
                      <Star
                        className={`size-4 ${
                          person.isBestFriend
                            ? "fill-[var(--ember)] text-[var(--ember)]"
                            : ""
                        }`}
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-9 px-3 text-xs"
                      onClick={() => void removeFriend(person)}
                    >
                      Remove
                    </Button>
                  </>
                ) : person.handle && person.relation !== "self" ? (
                  <>
                    <FollowButton
                      handle={person.handle}
                      userId={person.id}
                      initialRelation={
                        (person.relation === "following" ||
                        person.relation === "requested"
                          ? person.relation
                          : "none") as FollowRelation
                      }
                    />
                    <FriendButton userId={person.id} />
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {!searchHits && loadingMore ? <Skeleton className="h-16" /> : null}
          {!searchHits ? <div ref={sentinelRef} className="h-4" /> : null}
        </div>
      ) : null}

      {!loading && !searching && !error && !displayUsers.length ? (
        <EmptyState
          title={
            searchHits
              ? "No matches"
              : mode === "followers"
                ? "No followers yet"
                : mode === "following"
                  ? "Not following anyone yet"
                  : "No friends yet"
          }
          description={
            mode === "friends" && !searchHits
              ? "Send a friend request from someone’s profile, or follow each other."
              : undefined
          }
        />
      ) : null}

      {isOwnFriends && suggested.length ? (
        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
            Suggested friends
          </h2>
          {suggested.map((person) => (
            <div
              key={person.id}
              className="surface-panel-strong flex items-center gap-3 rounded-[var(--radius-xl)] p-4"
            >
              <Link
                href={`/u/${person.handle}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  src={person.image}
                  name={person.displayName ?? person.name}
                  className="size-12"
                />
                <span className="min-w-0">
                  <b className="truncate block">
                    {person.displayName ?? person.name}
                  </b>
                  <small className="text-[var(--muted)]">@{person.handle}</small>
                </span>
              </Link>
              <FriendButton userId={person.id} />
            </div>
          ))}
        </div>
      ) : null}
    </PageTransition>
  );
}
