"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Plus, UsersRound } from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { PageHeader } from "@/components/ui/page-header";
import { track } from "@/lib/analytics";

type Community = {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  membersCount: number;
  members: { status: string; role?: string }[];
};

export default function CommunitiesPage() {
  const { requireAuth } = useGuest();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await fetch("/api/communities").then((r) => r.json());
    setCommunities(data.communities ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!requireAuth()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug:
          slug ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        description: description || undefined,
        rules: rules || undefined,
        visibility,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create community");
      return;
    }
    track("community_join", { action: "create" });
    setOpen(false);
    setName("");
    setSlug("");
    setDescription("");
    setRules("");
    setVisibility("PUBLIC");
    await load();
  }

  return (
    <PageTransition className="page-shell page-stack">
      <PageHeader
        kicker="Shared frequency"
        title="Communities"
        description="Public rooms anyone can join, or private spaces behind a request."
        actions={
          <Button
            type="button"
            onClick={() => {
              if (!requireAuth()) return;
              setOpen((v) => !v);
            }}
          >
            <Plus className="size-4" aria-hidden /> Create space
          </Button>
        }
      />

      {open ? (
        <Card className="space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            New community
          </h2>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }
            }}
          />
          <Input
            placeholder="slug-like-this"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
          <Textarea
            placeholder="What is this space about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Textarea
            placeholder="House rules (optional)"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={visibility === "PUBLIC" ? "signal" : "quiet"}
              onClick={() => setVisibility("PUBLIC")}
            >
              Public
            </Button>
            <Button
              type="button"
              variant={visibility === "PRIVATE" ? "signal" : "quiet"}
              onClick={() => setVisibility("PRIVATE")}
            >
              <Lock className="size-3.5" /> Private
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {visibility === "PRIVATE"
              ? "People must request to join. Moderators approve access."
              : "Anyone can join and see the feed right away."}
          </p>
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={busy || !name.trim()}
              onClick={() => void create()}
            >
              {busy ? "Creating…" : "Create"}
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-56 rounded-[var(--radius-2xl)]" />
          <Skeleton className="h-56 rounded-[var(--radius-2xl)]" />
        </div>
      ) : communities.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <Link
              href={`/communities/${community.slug}`}
              key={community.slug}
              className="surface-panel group rounded-[var(--radius-2xl)] p-6 transition-[transform,box-shadow,border-color] duration-[var(--duration)] ease-[var(--ease-out)] hover:-translate-y-1 hover:border-[color:color-mix(in_srgb,var(--ink)_28%,var(--mist-strong))] hover:shadow-[var(--shadow-lg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)]"
            >
              <div className="relative grid size-12 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--mist)] font-[family-name:var(--font-display)] text-xl">
                {community.image ? (
                  <MediaImage
                    src={community.image}
                    alt=""
                    width={96}
                    height={96}
                    sizes="48px"
                    className="size-full object-cover"
                  />
                ) : (
                  community.name.slice(0, 1)
                )}
              </div>
              <p className="kicker mt-6">
                {community.category ??
                  (community.visibility === "PRIVATE" ? "Private" : "Public")}
              </p>
              <h2 className="mt-2 flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl tracking-tight">
                {community.name}
                {community.visibility === "PRIVATE" ? (
                  <Lock className="size-4 text-[var(--muted)]" aria-hidden />
                ) : null}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                {community.description ??
                  "A space waiting for its first story."}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <UsersRound className="size-3.5" aria-hidden />
                  {community.membersCount.toLocaleString()} members
                </span>
                {community.members[0]?.status === "JOINED" ? (
                  <span className="rounded-full bg-[var(--mist)] px-2 py-1">
                    Joined
                  </span>
                ) : community.members[0]?.status === "PENDING" ? (
                  <span className="rounded-full bg-[var(--mist)] px-2 py-1">
                    Pending
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersRound className="size-6" />}
          title="No communities yet"
          description="Create the first space and invite people who share your frequency."
          action={
            <Button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden /> Create space
            </Button>
          }
        />
      )}
    </PageTransition>
  );
}
