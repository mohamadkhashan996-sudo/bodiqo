"use client";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Image as ImageIcon, Users } from "lucide-react";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { Textarea } from "@/components/ui/input";
import { useGuest } from "@/components/auth/guest-provider";

type Community = { name: string; description: string | null; rules: string | null; image: string | null; coverImage: string | null; membersCount: number; postsCount: number; members: { user: { id: string; name: string | null; handle: string | null; image: string | null } }[]; posts: { id: string; body: string; mediaUrl: string | null; createdAt: string }[] };
export default function CommunityPage() {
  const { requireAuth } = useGuest();
  const { slug } = useParams<{ slug: string }>(); const [community, setCommunity] = useState<Community | null>(null); const [joined, setJoined] = useState(false); const [body, setBody] = useState("");
  const load = () => void fetch(`/api/communities/${slug}`).then((response) => response.json()).then((data: { community?: Community; membership?: { status: string } }) => { setCommunity(data.community ?? null); setJoined(data.membership?.status === "JOINED"); });
  useEffect(load, [slug]);
  async function toggle() {
    if (!requireAuth()) return;
    const data = await fetch(`/api/communities/${slug}/join`, { method: "POST" }).then((response) => response.json());
    setJoined(Boolean(data.joined));
    load();
  }
  async function post(event: FormEvent) {
    event.preventDefault();
    if (!requireAuth()) return;
    if (!body.trim()) return;
    await fetch(`/api/communities/${slug}/posts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    setBody("");
    load();
  }
  if (!community) return <div className="p-10 text-center text-[var(--muted)]">Finding this space…</div>;
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
              <p className="text-xs uppercase tracking-[.2em] text-[var(--ember)]">Community</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">{community.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">{community.description}</p>
            </div>
            <Button onClick={toggle} variant="signal">
              {joined ? "Leave space" : "Join space"}
            </Button>
          </div>
          <p className="mt-6 text-xs font-medium text-white/85">{community.membersCount} members · {community.postsCount} posts</p>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <main className="space-y-4">
          {joined ? (
            <Card className="p-4">
              <form onSubmit={post}>
                <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={`Share with ${community.name}…`} className="min-h-32 border-0 bg-transparent p-0 text-[var(--ink)] shadow-none placeholder:text-[var(--placeholder)]" />
                <Button className="mt-3">Publish</Button>
              </form>
            </Card>
          ) : null}
          {community.posts.length ? community.posts.map((post) => (
            <Card key={post.id} className="p-5">
              <p className="whitespace-pre-wrap text-sm leading-7">{post.body}</p>
              {post.mediaUrl ? (
                <MediaImage
                  src={post.mediaUrl}
                  alt="Community post media"
                  className="mt-4 h-auto w-full rounded-[var(--radius-xl)]"
                />
              ) : null}
              <p className="mt-3 text-xs text-[var(--muted)]">{new Date(post.createdAt).toLocaleString()}</p>
            </Card>
          )) : (
            <EmptyState title="No community posts yet" description="When members start sharing, the conversation will begin here." />
          )}
        </main>
        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"><Users className="size-4" />People</h2>
            <div className="mt-3 space-y-2">{community.members.map((member) => <p key={member.user.id} className="text-sm">{member.user.name ?? member.user.handle}</p>)}</div>
          </Card>
          <Card className="p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl">House rules</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{community.rules ?? "Bring curiosity. Leave room for others."}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"><ImageIcon className="size-4" aria-hidden />Media gallery</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {community.posts
                .filter((post) => post.mediaUrl)
                .slice(0, 6)
                .map((post) => (
                  <MediaImage
                    key={post.id}
                    src={post.mediaUrl!}
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
    </PageTransition>
  );
}
