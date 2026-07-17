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
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";
import { MediaImage } from "@/components/ui/media-image";
import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { ReportDialog } from "@/components/social/report-dialog";
import { linkifyPostBody } from "@/lib/post-body";
import type { FeedPoll, FeedPost } from "@/types/feed";

const CommentsPanel = dynamic(
  () =>
    import("@/components/feed/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false },
);

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
        playsInline
        preload="metadata"
        className="mt-5 max-h-[32rem] w-full rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--night)] object-cover shadow-[var(--shadow-sm)]"
      />
    ) : (
      <MediaImage
        src={item.url}
        alt="Post media"
        className="mt-5 max-h-[32rem] h-auto w-full rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] object-cover shadow-[var(--shadow-sm)]"
      />
    );
  }

  return (
    <div
      className="relative mt-5 overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] shadow-[var(--shadow-sm)]"
      role="group"
      aria-roledescription="carousel"
      aria-label={`Media ${index + 1} of ${media.length}`}
    >
      {item.kind === "VIDEO" ? (
        <video
          src={item.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-[32rem] w-full bg-[var(--night)] object-cover"
        />
      ) : (
        <MediaImage
          src={item.url}
          alt={`Post media ${index + 1} of ${media.length}`}
          className="max-h-[32rem] h-auto w-full object-cover"
        />
      )}
      <button
        type="button"
        aria-label="Previous media"
        className="on-dark-control absolute start-2 top-1/2 -translate-y-1/2 disabled:opacity-50"
        disabled={index === 0}
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next media"
        className="on-dark-control absolute end-2 top-1/2 -translate-y-1/2 disabled:opacity-50"
        disabled={index >= media.length - 1}
        onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
      >
        <ChevronRight className="size-4" />
      </button>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-0.5">
        {media.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to media ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className="grid size-9 place-items-center"
            onClick={() => setIndex(i)}
          >
            <span
              className={`size-2 rounded-full border border-white/80 ${
                i === index ? "bg-white" : "bg-white/55"
              }`}
            />
          </button>
        ))}
      </div>
      <span className="absolute end-3 top-3 rounded-full border border-white/60 bg-[var(--ink)]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
        {index + 1}/{media.length}
      </span>
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  const { requireAuth } = useGuest();
  const [likes, setLikes] = useState(post.likeCount ?? 0);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [comments, setComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [poll, setPoll] = useState<FeedPoll | null | undefined>(post.poll);
  const [voting, setVoting] = useState(false);

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
    try {
      if (navigator.share) {
        await navigator.share({
          title: "RELUNE",
          text: post.body ?? undefined,
          url,
        });
      } else {
        await navigator.clipboard?.writeText(url);
        setShareNote("Link copied");
        window.setTimeout(() => setShareNote(null), 2000);
      }
    } catch {
      /* cancelled */
    }
    void fetch(`/api/posts/${post.id}/share`, { method: "POST" }).catch(() => {});
  }

  async function vote(optionId: string) {
    if (!requireAuth() || voting) return;
    setVoting(true);
    const res = await fetch(`/api/posts/${post.id}/poll/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    const data = await res.json().catch(() => ({}));
    setVoting(false);
    if (res.ok && data.post?.poll) setPoll(data.post.poll);
  }

  const author = post.author ?? {};
  const media = Array.isArray(post.media) ? post.media : [];
  const totalVotes = poll?.totalVotes ?? 0;

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
            <span className="text-sm text-[var(--muted-strong)]">@{author.handle}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-strong)]">
            <time>{new Date(post.publishedAt ?? post.createdAt ?? Date.now()).toLocaleDateString()}</time>
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
          {linkifyPostBody(post.body)}
        </p>
      ) : null}
      {poll?.options?.length ? (
        <div className="mt-4 space-y-2">
          {poll.options.map((option) => {
            const pct =
              totalVotes > 0
                ? Math.round((option.voteCount / totalVotes) * 100)
                : 0;
            const selected = poll.votedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={voting}
                onClick={() => void vote(option.id)}
                className={`relative w-full overflow-hidden rounded-[var(--radius-xl)] border-2 px-4 py-3 text-start text-sm transition ${
                  selected
                    ? "border-[var(--signal-deep)] bg-[var(--signal-soft)]"
                    : "border-[var(--mist-strong)] bg-[var(--surface)] hover:border-[var(--signal)]"
                }`}
              >
                {poll.votedOptionId ? (
                  <span
                    className="absolute inset-y-0 start-0 bg-[var(--signal)]/15"
                    style={{ width: `${pct}%` }}
                  />
                ) : null}
                <span className="relative flex items-center justify-between gap-3">
                  <span className="font-medium">{option.label}</span>
                  {poll.votedOptionId ? (
                    <span className="tabular-nums text-[var(--muted)]">{pct}%</span>
                  ) : null}
                </span>
              </button>
            );
          })}
          <p className="text-xs text-[var(--muted)]">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            {poll.endsAt
              ? ` · ends ${new Date(poll.endsAt).toLocaleString()}`
              : ""}
          </p>
        </div>
      ) : null}
      {media.length ? <MediaCarousel media={media} /> : null}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t-2 border-[var(--mist-strong)] pt-4 text-[var(--muted-strong)]">
        <button
          type="button"
          onClick={() => void action("like")}
          className={`icon-button min-h-11 gap-1.5 px-3.5 text-sm ${liked ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]" : ""}`}
        >
          <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
          <span className="text-sm font-semibold tabular-nums text-current">{likes}</span>
        </button>
        <button
          type="button"
          onClick={() => setComments(!comments)}
          className={`icon-button min-h-11 gap-1.5 px-3.5 text-sm ${comments ? "border-[var(--ink)] text-[var(--ink)]" : ""}`}
        >
          <MessageCircle className="size-4" />
          <span className="text-sm font-semibold tabular-nums text-current">{post.commentCount ?? 0}</span>
        </button>
        <button
          type="button"
          onClick={() => void action("bookmark")}
          className={`icon-button size-11 ${bookmarked ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]" : ""}`}
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
          className="icon-button size-11"
          aria-label="Report post"
        >
          <Flag className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="icon-button ms-auto size-11"
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
