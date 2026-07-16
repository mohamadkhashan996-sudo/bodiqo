"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/post-card";
import { Avatar } from "@/components/ui/avatar";
export default function ExplorePage() { const [data, setData] = useState<any>({}); useEffect(() => { fetch("/api/explore").then(r => r.json()).then(setData).catch(() => {}); }, []); return <div className="mx-auto max-w-6xl"><p className="text-[11px] font-bold tracking-[.2em] text-[var(--signal)] uppercase">Beyond your orbit</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Explore Cirqua</h1><div className="mt-8 grid gap-4 md:grid-cols-3">{(data.users ?? data.creators ?? []).slice(0, 6).map((user: any) => <Link href={`/u/${user.handle}`} key={user.id} className="rounded-[1.5rem] border border-white/70 bg-white/60 p-5"><Avatar src={user.image} name={user.displayName ?? user.name} /><b className="mt-3 block">{user.displayName ?? user.name}</b><small className="text-[var(--muted)]">@{user.handle}</small></Link>)}</div><div className="mt-10 grid gap-4 md:grid-cols-2">{(data.posts ?? []).map((post: any) => <PostCard key={post.id} post={post} />)}</div></div>; }
