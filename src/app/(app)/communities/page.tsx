"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, EmptyState } from "@/components/ui/card";
import { PageTransition } from "@/components/motion/primitives";
import { track } from "@/lib/analytics";

type Community = {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  category: string | null;
  membersCount: number;
  members: { status: string }[];
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await fetch("/api/communities").then((r) => r.json());
    setCommunities(data.communities ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: description || undefined,
        visibility: "PUBLIC",
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
    await load();
  }

  return (
    <PageTransition className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--signal)]">
            Shared frequency
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
            Communities
          </h1>
        </div>
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Create space
        </Button>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
        Small worlds for the interests that keep drawing you back.
      </p>

      {open ? (
        <Card className="mt-6 space-y-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">New community</h2>
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
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" disabled={busy || !name.trim()} onClick={() => void create()}>
              {busy ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <Link
            href={`/communities/${community.slug}`}
            key={community.slug}
            className="group rounded-[2rem] border border-[var(--mist)] bg-[var(--glass)] p-6 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-[var(--mist)] font-[family-name:var(--font-display)] text-xl">
              {community.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.image} alt="" className="size-full object-cover" />
              ) : (
                community.name.slice(0, 1)
              )}
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[var(--signal)]">
              {community.category ?? "Relune space"}
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">{community.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
              {community.description ?? "A space waiting for its first story."}
            </p>
            <div className="mt-5 flex items-center justify-between text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <UsersRound className="size-3.5" />
                {community.membersCount.toLocaleString()} members
              </span>
              {community.members[0]?.status === "JOINED" ? (
                <span className="rounded-full bg-[var(--mist)] px-2 py-1">Joined</span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {!communities.length ? (
        <EmptyState className="mt-8" title="No communities yet" description="Create the first space." />
      ) : null}
    </PageTransition>
  );
}
