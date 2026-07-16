"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Heart, MessageCircle, Share2, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { CommentsPanel } from "@/components/feed/comments-panel";

export function PostCard({ post }: { post: any }) {
  const [likes, setLikes] = useState(post.likeCount ?? 0); const [liked, setLiked] = useState(Boolean(post.liked)); const [comments, setComments] = useState(false);
  async function action(action: "like" | "bookmark") { const res = await fetch(`/api/posts/${post.id}/${action}`, { method: action === "like" && liked ? "DELETE" : "POST" }); if (res.ok && action === "like") { setLiked(!liked); setLikes((n: number) => n + (liked ? -1 : 1)); } }
  async function share() { await navigator.clipboard?.writeText(`${location.origin}/post/${post.id}`); }
  const author = post.author ?? {};
  return <motion.article layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border border-white/70 bg-white/65 p-5 shadow-[0_12px_36px_var(--shadow)] backdrop-blur-sm"><div className="flex gap-3"><Avatar src={author.image} name={author.displayName ?? author.name} /><div className="min-w-0 flex-1"><div className="flex items-center gap-1"><Link href={`/u/${author.handle}`} className="font-semibold hover:text-[var(--signal)]">{author.displayName ?? author.name ?? "Relune member"}</Link>{author.isVerified && <BadgeCheck className="size-4 text-[var(--signal)]" />}<span className="text-sm text-[var(--muted)]">@{author.handle}</span></div><time className="text-xs text-[var(--muted)]">{new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}</time></div></div><p className="mt-4 whitespace-pre-wrap leading-7">{post.body}</p>{post.media?.length ? <div className="mt-4 grid grid-cols-2 gap-2">{post.media.map((media: any) => media.kind === "VIDEO" ? <video key={media.id} src={media.url} controls className="max-h-96 w-full rounded-2xl object-cover" /> : <img key={media.id} src={media.url} alt="" className="max-h-96 w-full rounded-2xl object-cover" />)}</div> : null}<div className="mt-4 flex items-center gap-2 border-t border-[var(--mist)] pt-3 text-[var(--muted)]"><button onClick={() => action("like")} className={liked ? "text-[var(--signal)]" : ""}><Heart className="size-4" fill={liked ? "currentColor" : "none"} /> <span className="ml-1 text-xs">{likes}</span></button><button onClick={() => setComments(!comments)} className="ml-3"><MessageCircle className="size-4" /></button><button onClick={() => action("bookmark")} className="ml-3"><Bookmark className="size-4" /></button><button onClick={share} className="ml-auto"><Share2 className="size-4" /></button></div>{comments && <CommentsPanel postId={post.id} />}</motion.article>;
}
