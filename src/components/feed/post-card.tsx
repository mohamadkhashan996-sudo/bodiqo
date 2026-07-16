"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MessageCircle,
  Pin,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { CommentsPanel } from "@/components/feed/comments-panel";
import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { ReportDialog } from "@/components/social/report-dialog";

function MediaCarousel({
  media,
}: {
  media: Array<{ id?: string; url: string; kind?: string }>;
}) {
  const [index, setIndex] = useState(0);
  const item = media[index];
  if (!item) return null;

  if (media.length === 1) {
    return item.kind === "VIDEO" ? (
      <video
        src={item.url}
        controls
        className="mt-5 max-h-[32rem] w-full rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--mist)_65%,transparent)] bg-[var(--night)] object-cover shadow-[var(--shadow-sm)]"
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.url}
        alt=""
        className="mt-5 max-h-[32rem] w-full rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--mist)_65%,transparent)] object-cover shadow-[var(--shadow-sm)]"
        loading="lazy"
      />
    );
  }

  return (
    <div className="relative mt-5 overflow-hidden rounded-[var(--radius-xl)] border border-[color:color-mix(in_srgb,var(--mist)_65%,transparent)] shadow-[var(--shadow-sm)]">
      {item.kind === "VIDEO" ? (
        <video
          src={item.url}
          controls
          className="max-h-[32rem] w-full bg-[var(--night)] object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt=""
          className="max-h-[32rem] w-full object-cover"
          loading="lazy"
        />
      )}
      <button
        type="button"
        aria-label="Previous"
        className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-[var(--ink)]/70 text-white disabled:opacity-30"
        disabled={index === 0}
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next"
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-[var(--ink)]/70 text-white disabled:opacity-30"
        disabled={index >= media.length - 1}
        onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
      >
        <ChevronRight className="size-4" />
      </button>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={`size-1.5 rounded-full ${
              i === index ? "bg-white" : "bg-white/40"
            }`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-[var(--ink)]/70 px-2 py-0.5 text-[10px] font-semibold text-white">
        {index + 1}/{media.length}
      </span>
    </div>
  );
}

export function PostCard({ post }: { post: any }) {
  const { requireAuth } = useGuest();
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [comments, setComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  async function action(kind: "like" | "bookmark") {
    if (!requireAuth()) return;
    const res = await fetch(`/api/posts/${post.id}/${kind}`, {
      method:
        kind === "like"
          ? liked
            ? "DELETE"
            : "POST"
          : bookmarked
            ? "DELETE"
            : "POST",
    });
    if (res.ok && kind === "like") {
      setLiked(!liked);
      setLikes((n: number) => n + (liked ? -1 : 1));
    }
    if (res.ok && kind === "bookmark") {
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
    setShareNote("Link copied");
    window.setTimeout(() => setShareNote(null), 2000);
  }

  const author = post.author ?? {};
  const media = Array.isArray(post.media) ? post.media : [];

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
            {post.type === "SHORT" ? (
              <span className="rounded-full bg-[var(--ember)]/15 px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--ember)]">
                Reel
              </span>
            ) : null}
            {media.length > 1 ? (
              <span className="rounded-full bg-[var(--signal)]/15 px-2 py-0.5 font-semibold uppercase tracking-[0.12em] text-[var(--signal)]">
                Carousel
              </span>
            ) : null}
            {post.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal)]/15 px-2.5 py-1 font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
                <Pin className="size-3" />
                Pinned
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {post.body ? (
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">
          {post.body}
        </p>
      ) : null}
      {media.length ? <MediaCarousel media={media} /> : null}
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
          onClick={() => setComments(!comments)}
          className={`icon-button h-10 px-3 text-sm ${comments ? "text-[var(--ink)]" : ""}`}
        >
          <MessageCircle className="size-4" />
          <span className="text-xs font-semibold">{post.commentCount ?? 0}</span>
        </button>
        <button
          type="button"
          onClick={() => void action("bookmark")}
          className={`icon-button h-10 w-10 ${bookmarked ? "border-[var(--signal)]/25 bg-[var(--signal)]/12 text-[var(--signal)]" : ""}`}
          aria-label="Save"
        >
          <Bookmark className="size-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!requireAuth()) return;
            setReportOpen(true);
          }}
          className="icon-button h-10 w-10"
          aria-label="Report post"
        >
          <Flag className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="icon-button ml-auto h-10 w-10"
          aria-label="Share"
        >
          <Share2 className="size-4" />
        </button>
      </div>
      {shareNote ? (
        <p className="mt-2 text-xs text-[var(--signal-deep)]">{shareNote}</p>
      ) : null}
      {comments ? <CommentsPanel postId={post.id} /> : null}
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="POST"
        targetId={String(post.id)}
        title="Report post"
      />
    </motion.article>
  );
}
