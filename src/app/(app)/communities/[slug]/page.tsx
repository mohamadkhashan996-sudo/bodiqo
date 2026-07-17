"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Image as ImageIcon,
  Lock,
  Pin,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { Textarea } from "@/components/ui/input";
import { useGuest } from "@/components/auth/guest-provider";

type MemberUser = {
  id: string;
  name: string | null;
  displayName: string | null;
  handle: string | null;
  image: string | null;
};

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  status: string;
  user: MemberUser;
};

type Post = {
  id: string;
  body: string;
  mediaUrl: string | null;
  isPinned: boolean;
  isAnnouncement: boolean;
  createdAt: string;
  author: MemberUser;
};

type Community = {
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  image: string | null;
  coverImage: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  membersCount: number;
  postsCount: number;
  locked?: boolean;
  members: Member[];
  posts: Post[];
};

type Membership = {
  id: string;
  userId: string;
  status: string;
  role: Member["role"];
} | null;

function displayName(user: MemberUser) {
  return user.displayName || user.name || user.handle || "Member";
}

export default function CommunityPage() {
  const { requireAuth } = useGuest();
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [membership, setMembership] = useState<Membership>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [canModerate, setCanModerate] = useState(false);
  const [requests, setRequests] = useState<Member[]>([]);
  const [body, setBody] = useState("");
  const [rulesDraft, setRulesDraft] = useState("");
  const [editingRules, setEditingRules] = useState(false);
  const [pinPost, setPinPost] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joined = membership?.status === "JOINED";
  const pending = membership?.status === "PENDING";
  const isStaff =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "MODERATOR";
  const canManageSettings =
    membership?.role === "OWNER" || membership?.role === "ADMIN";

  const load = useCallback(async () => {
    const data = await fetch(`/api/communities/${slug}`).then((r) => r.json());
    setCommunity(data.community ?? null);
    setMembership(data.membership ?? null);
    setPendingCount(data.pendingCount ?? 0);
    setCanModerate(Boolean(data.canModerate));
    setRulesDraft(data.community?.rules ?? "");
  }, [slug]);

  const loadRequests = useCallback(async () => {
    if (!canModerate) {
      setRequests([]);
      return;
    }
    const data = await fetch(`/api/communities/${slug}/requests`).then((r) =>
      r.json(),
    );
    setRequests(data.requests ?? []);
  }, [canModerate, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function toggleMembership() {
    if (!requireAuth()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/communities/${slug}/join`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not update membership");
      return;
    }
    await load();
  }

  async function resolveRequest(memberId: string, action: "approve" | "reject") {
    if (!requireAuth()) return;
    const res = await fetch(`/api/communities/${slug}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update request");
      return;
    }
    await Promise.all([load(), loadRequests()]);
  }

  async function setRole(
    userId: string,
    role: "ADMIN" | "MODERATOR" | "MEMBER",
  ) {
    if (!requireAuth()) return;
    const res = await fetch(`/api/communities/${slug}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update role");
      return;
    }
    await load();
  }

  async function saveRules() {
    if (!requireAuth()) return;
    setBusy(true);
    const res = await fetch(`/api/communities/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: rulesDraft || null }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save rules");
      return;
    }
    setEditingRules(false);
    await load();
  }

  async function post(event: FormEvent) {
    event.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, isPinned: pinPost || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not publish");
      return;
    }
    setBody("");
    setPinPost(false);
    await load();
  }

  async function removePost(postId: string) {
    if (!requireAuth()) return;
    const res = await fetch(`/api/communities/${slug}/posts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete post");
      return;
    }
    await load();
  }

  if (!community) {
    return (
      <div className="p-10 text-center text-[var(--muted)]">
        Finding this space…
      </div>
    );
  }

  const joinLabel = joined
    ? "Leave space"
    : pending
      ? "Cancel request"
      : community.visibility === "PRIVATE"
        ? "Request to join"
        : "Join space";

  return (
    <PageTransition className="page-shell page-stack">
      <section className="overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--ink)] text-white shadow-[var(--shadow-xl)]">
        {community.coverImage ? (
          <MediaImage
            src={community.coverImage}
            alt={`${community.name} cover`}
            width={1600}
            height={440}
            sizes="100vw"
            className="h-44 w-full object-cover opacity-65"
          />
        ) : null}
        <div className="p-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-[var(--ember)]">
                {community.visibility === "PRIVATE" ? (
                  <>
                    <Lock className="size-3.5" /> Private community
                  </>
                ) : (
                  "Public community"
                )}
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
                {community.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
                {community.description}
              </p>
            </div>
            <Button onClick={() => void toggleMembership()} variant="signal" disabled={busy}>
              {joinLabel}
            </Button>
          </div>
          <p className="mt-6 text-xs font-medium text-white/85">
            {community.membersCount} members · {community.postsCount} posts
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
          </p>
          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </section>

      {community.locked ? (
        <Card className="p-8 text-center">
          <Lock className="mx-auto size-8 text-[var(--muted)]" />
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
            This community is private
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {pending
              ? "Your join request is waiting on a moderator."
              : "Request to join to see the feed, members, and rules."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <main className="space-y-4">
            {canModerate && requests.length > 0 ? (
              <Card className="space-y-3 p-5">
                <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
                  <Shield className="size-4" /> Join requests
                </h2>
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={req.user.image}
                        name={displayName(req.user)}
                        className="size-9"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {displayName(req.user)}
                        </p>
                        {req.user.handle ? (
                          <p className="text-xs text-[var(--muted)]">
                            @{req.user.handle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => void resolveRequest(req.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => void resolveRequest(req.id, "reject")}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            ) : null}

            {joined ? (
              <Card className="p-4">
                <form onSubmit={(e) => void post(e)}>
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={`Share with ${community.name}…`}
                    className="min-h-32 border-0 bg-transparent p-0 text-[var(--ink)] shadow-none placeholder:text-[var(--placeholder)]"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button disabled={busy || !body.trim()}>Publish</Button>
                    {isStaff ? (
                      <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <input
                          type="checkbox"
                          checked={pinPost}
                          onChange={(e) => setPinPost(e.target.checked)}
                        />
                        Pin to top
                      </label>
                    ) : null}
                  </div>
                </form>
              </Card>
            ) : null}

            {community.posts.length ? (
              community.posts.map((postItem) => (
                <Card key={postItem.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={postItem.author.image}
                        name={displayName(postItem.author)}
                        className="size-9"
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {postItem.author.handle ? (
                            <Link
                              href={`/u/${postItem.author.handle}`}
                              className="hover:underline"
                            >
                              {displayName(postItem.author)}
                            </Link>
                          ) : (
                            displayName(postItem.author)
                          )}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {new Date(postItem.createdAt).toLocaleString()}
                          {postItem.isPinned ? " · Pinned" : ""}
                          {postItem.isAnnouncement ? " · Announcement" : ""}
                        </p>
                      </div>
                    </div>
                    {(postItem.author.id === membership?.userId || isStaff) &&
                    joined ? (
                      <button
                        type="button"
                        aria-label="Delete post"
                        className="text-[var(--muted)] hover:text-[var(--danger)]"
                        onClick={() => void removePost(postItem.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                  {postItem.isPinned ? (
                    <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--signal)]">
                      <Pin className="size-3.5" /> Pinned
                    </p>
                  ) : null}
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
                    {postItem.body}
                  </p>
                  {postItem.mediaUrl ? (
                    <MediaImage
                      src={postItem.mediaUrl}
                      alt="Community post media"
                      className="mt-4 h-auto w-full rounded-[var(--radius-xl)]"
                    />
                  ) : null}
                </Card>
              ))
            ) : (
              <EmptyState
                title="No community posts yet"
                description="When members start sharing, the conversation will begin here."
              />
            )}
          </main>

          <aside className="space-y-4">
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
                <Users className="size-4" /> People
              </h2>
              <div className="mt-3 space-y-3">
                {community.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        src={member.user.image}
                        name={displayName(member.user)}
                        className="size-8"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {member.user.handle ? (
                            <Link
                              href={`/u/${member.user.handle}`}
                              className="hover:underline"
                            >
                              {displayName(member.user)}
                            </Link>
                          ) : (
                            displayName(member.user)
                          )}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          {member.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {canManageSettings &&
                    member.role !== "OWNER" &&
                    member.user.id !== membership?.userId ? (
                      <select
                        className="max-w-[7.5rem] rounded-lg border border-[var(--mist-strong)] bg-[var(--surface)] px-1.5 py-1 text-[10px]"
                        value={member.role}
                        onChange={(e) =>
                          void setRole(
                            member.user.id,
                            e.target.value as "ADMIN" | "MODERATOR" | "MEMBER",
                          )
                        }
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  House rules
                </h2>
                {canManageSettings ? (
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => setEditingRules((v) => !v)}
                  >
                    {editingRules ? "Cancel" : "Edit"}
                  </Button>
                ) : null}
              </div>
              {editingRules ? (
                <div className="mt-3 space-y-3">
                  <Textarea
                    value={rulesDraft}
                    onChange={(e) => setRulesDraft(e.target.value)}
                    rows={6}
                  />
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveRules()}
                  >
                    Save rules
                  </Button>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                  {community.rules ?? "Bring curiosity. Leave room for others."}
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
                <ImageIcon className="size-4" aria-hidden />
                Media gallery
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {community.posts
                  .filter((postItem) => postItem.mediaUrl)
                  .slice(0, 6)
                  .map((postItem) => (
                    <MediaImage
                      key={postItem.id}
                      src={postItem.mediaUrl!}
                      alt=""
                      width={240}
                      height={240}
                      sizes="96px"
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
              </div>
            </Card>
          </aside>
        </div>
      )}
    </PageTransition>
  );
}
