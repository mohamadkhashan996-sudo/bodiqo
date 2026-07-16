"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Heart, MessageCircle, Pin, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { CommentsPanel } from "@/components/feed/comments-panel";
import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";

export function PostCard({ post }: { post: any }) {
  const { requireAuth } = useGuest();
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [comments, setComments] = useState(false);

  async function action(action: "like" | "bookmark") {
    if (!requireAuth()) return;
    const res = await fetch(`/api/posts/${post.id}/${action}`, {
      method:
        action === "like"
          ? liked
            ? "DELETE"
            : "POST"
          : bookmarked
            ? "DELETE"
            : "POST",
    });
    if (res.ok && action === "like") {
      setLiked(!liked);
      setLikes((n: number) => n + (liked ? -1 : 1));
    }
    if (res.ok && action === "bookmark") {
      setBookmarked(!bookmarked);
    }
  }

  async function share() {
    const url = `${location.origin}/post/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: "RELUNE", text: post.body, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  function toggleComments() {
    setComments(!comments);
  }

  const author = post.author ?? {};

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-panel-strong overflow-hidden rounded-[var(--radius-2xl)] p-5 backdrop-blur-xl md:p-6"
    >
      <div className="flex items-start gap-3">
        <Avatar src={author.image} name={author.displayName ?? author.name} className="size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/u/${author.handle}`}
              className="font-semibold tracking-tight transition hover:text-[var(--signal)]"
            >
              {author.displayName ?? author.name ?? "Relune member"}
            </Link>
            {author.isVerified || author.isOfficial ? (
              <VerificationBadge
                isOfficial={author.isOfficial}
                isVerified={author.isVerified}
                className="size-4"
              />
            ) : null}
            <span className="text-sm text-[var(--muted)]">@{author.handle}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <time>{new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}</time>
            {post.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal)]/15 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
                <Pin className="size-3" />
                Pinned
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">
        {post.body}
      </p>
      {post.media?.length ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {post.media.map((media: any) =>
            media.kind === "VIDEO" ? (
              <video
                key={media.id}
                src={media.url}
                controls
                className="max-h-[32rem] w-full rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--mist)_65%,transparent)] bg-[var(--night)] object-cover shadow-[var(--shadow-sm)]"
              />
            ) : (
              <img
                key={media.id}
                src={media.url}
                alt=""
                className="max-h-[32rem] w-full rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--mist)_65%,transparent)] object-cover shadow-[var(--shadow-sm)]"
                loading="lazy"
              />
            ),
          )}
        </div>
      ) : null}
      <div className="mt-5 flex items-center gap-2 border-t border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] pt-4 text-[var(--muted)]">
        <button
          type="button"
          onClick={() => void action("like")}
          className={`icon-button h-10 px-3 text-sm ${liked ? "border-[var(--signal)]/25 bg-[var(--signal)]/12 text-[var(--signal)]" : ""}`}
        >
          <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
          <span className="text-xs font-semibold">{likes}</span>
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className={`icon-button h-10 px-3 text-sm ${comments ? "text-[var(--ink)]" : ""}`}
        >
          <MessageCircle className="size-4" />
          <span className="text-xs font-semibold">{post.commentCount ?? 0}</span>
        </button>
        <button
          type="button"
          onClick={() => void action("bookmark")}
          className={`icon-button h-10 w-10 ${bookmarked ? "border-[var(--signal)]/25 bg-[var(--signal)]/12 text-[var(--signal)]" : ""}`}
        >
          <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="icon-button ml-auto h-10 w-10"
        >
          <Share2 className="size-4" />
        </button>
      </div>
      {comments ? <CommentsPanel postId={post.id} /> : null}
    </motion.article>
  );
}
