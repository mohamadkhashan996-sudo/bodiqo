"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Archive,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flag,
  MapPin,
  MessageCircle,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { Avatar } from "@/components/ui/avatar";
import { MediaImage } from "@/components/ui/media-image";
import { ReactionButton } from "@/components/feed/reaction-button";
import { usePostBookmark } from "@/hooks/use-post-bookmark";
import { usePostReaction } from "@/hooks/use-post-like";
import { linkifyPostBody } from "@/lib/post-body";
import type { FeedPoll, FeedPost } from "@/types/feed";

const CommentsPanel = dynamic(
  () => import("@/components/feed/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false },
);
const ShareSheet = dynamic(
  () => import("@/components/social/share-sheet").then((m) => m.ShareSheet),
  { ssr: false },
);
const SaveToCollectionSheet = dynamic(
  () =>
    import("@/components/social/save-to-collection-sheet").then(
      (m) => m.SaveToCollectionSheet,
    ),
  { ssr: false },
);
const ReportDialog = dynamic(
  () =>
    import("@/components/social/report-dialog").then((m) => m.ReportDialog),
  { ssr: false },
);

function MediaCarousel({
  media,
  priority = false,
}: {
  media: Array<{ id?: string; url: string; kind?: string }>;
  priority?: boolean;
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
        priority={priority}
        className="mt-5 h-auto max-h-[32rem] w-full rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] object-cover shadow-[var(--shadow-sm)]"
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
          className="h-auto max-h-[32rem] w-full object-cover"
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

export function PostCard({
  post,
  onBookmarkChange,
  priority = false,
  onPinnedChange,
  onRemoved,
}: {
  post: FeedPost;
  onBookmarkChange?: (bookmarked: boolean) => void;
  priority?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  onRemoved?: (postId: string) => void;
}) {
  const { data: session } = useSession();
  const { requireAuth } = useGuest();
  const isOwner = Boolean(
    session?.user?.id && post.author?.id === session.user.id,
  );
  const [pinned, setPinned] = useState(Boolean(post.isPinned));
  const [pinPending, setPinPending] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ownerBusy, setOwnerBusy] = useState(false);
  const {
    likeCount,
    reaction,
    reactionCounts,
    pending: likePending,
    burstKey,
    react,
    toggle: toggleLike,
  } = usePostReaction(post.id, {
    liked: Boolean(post.liked),
    likeCount: post.likeCount ?? 0,
    reaction: post.reaction ?? null,
    reactionCounts: post.reactionCounts,
  });
  const {
    bookmarked,
    pending: bookmarkPending,
    toggle: toggleBookmark,
  } = usePostBookmark(post.id, Boolean(post.bookmarked), onBookmarkChange);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [shareCount, setShareCount] = useState(post.shareCount ?? 0);
  const [comments, setComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [poll, setPoll] = useState<FeedPoll | null | undefined>(post.poll);
  const [voting, setVoting] = useState(false);

  async function action(kind: "bookmark") {
    if (!bookmarked) {
      setSaveSheetOpen(true);
      return;
    }
    const wasBookmarked = bookmarked;
    const ok = await toggleBookmark();
    if (ok && !wasBookmarked) {
      setSaveNote("Saved");
      window.setTimeout(() => setSaveNote(null), 2200);
    }
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

  async function togglePin() {
    if (!isOwner || pinPending) return;
    setPinPending(true);
    const next = !pinned;
    setPinned(next);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
    setPinPending(false);
    if (!res.ok) {
      setPinned(!next);
      return;
    }
    onPinnedChange?.(next);
  }

  async function archive() {
    if (!isOwner || ownerBusy) return;
    if (!window.confirm("Archive this post? It will leave the public feed.")) {
      return;
    }
    setOwnerBusy(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    setOwnerBusy(false);
    if (!res.ok) return;
    setHidden(true);
    onRemoved?.(post.id);
  }

  async function remove() {
    if (!isOwner || ownerBusy) return;
    if (!window.confirm("Delete this post permanently?")) return;
    setOwnerBusy(true);
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setOwnerBusy(false);
    if (!res.ok) return;
    setHidden(true);
    onRemoved?.(post.id);
  }

  if (hidden) return null;

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
        <Avatar
          src={author.image}
          name={author.displayName ?? author.name}
          className="size-11"
        />
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
            <span className="text-sm text-[var(--muted-strong)]">
              @{author.handle}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-strong)]">
            <time
              dateTime={
                post.publishedAt ?? post.createdAt
                  ? new Date(
                      post.publishedAt ?? post.createdAt!,
                    ).toISOString()
                  : undefined
              }
            >
              {post.publishedAt || post.createdAt
                ? new Date(
                    post.publishedAt ?? post.createdAt!,
                  ).toLocaleDateString()
                : null}
            </time>
            {post.type === "SHORT" ? (
              <span className="rounded-full bg-[var(--ember)]/15 px-2 py-0.5 font-semibold tracking-[0.12em] text-[var(--ember)] uppercase">
                Reel
              </span>
            ) : null}
            {media.length > 1 ? (
              <span className="rounded-full bg-[var(--signal)]/15 px-2 py-0.5 font-semibold tracking-[0.12em] text-[var(--signal)] uppercase">
                Carousel
              </span>
            ) : null}
            {pinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal)]/15 px-2.5 py-1 font-semibold tracking-[0.14em] text-[var(--signal)] uppercase">
                <Pin className="size-3" />
                Pinned
              </span>
            ) : null}
            {post.locationName ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {post.locationName}
              </span>
            ) : null}
            {post.visibility && post.visibility !== "PUBLIC" ? (
              <span className="rounded-full bg-[var(--mist)] px-2 py-0.5 font-semibold tracking-[0.12em] uppercase">
                {post.visibility.toLowerCase()}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {post.body ? (
        <p className="mt-4 min-w-0 text-[15px] leading-7 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-[var(--ink)]">
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
                    <span className="text-[var(--muted)] tabular-nums">
                      {pct}%
                    </span>
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
      {media.length ? (
        <MediaCarousel media={media} priority={priority} />
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t-2 border-[var(--mist-strong)] pt-4 text-[var(--muted-strong)]">
        <ReactionButton
          reaction={reaction}
          reactionCounts={reactionCounts}
          likeCount={likeCount}
          pending={likePending}
          burstKey={burstKey}
          onReact={(type) => void react(type)}
          onToggle={() => void toggleLike()}
        />
        <button
          type="button"
          onClick={() => setComments(!comments)}
          className={`icon-button min-h-11 gap-1.5 px-3.5 text-sm ${comments ? "border-[var(--ink)] text-[var(--ink)]" : ""}`}
        >
          <MessageCircle className="size-4" />
          <span className="text-sm font-semibold text-current tabular-nums">
            {commentCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void action("bookmark")}
          onContextMenu={(e) => {
            e.preventDefault();
            if (!requireAuth()) return;
            setSaveSheetOpen(true);
          }}
          disabled={bookmarkPending}
          className={`icon-button size-11 ${bookmarked ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]" : ""}`}
          aria-label={bookmarked ? "Remove from saved" : "Save"}
          title="Save · right-click for collections"
        >
          <Bookmark
            className="size-4"
            fill={bookmarked ? "currentColor" : "none"}
          />
        </button>
        {isOwner ? (
          <button
            type="button"
            onClick={() => void togglePin()}
            disabled={pinPending || ownerBusy}
            className={`icon-button size-11 ${pinned ? "border-[var(--signal-deep)] bg-[var(--signal-soft)] text-[var(--signal-deep)]" : ""}`}
            aria-label={pinned ? "Unpin from profile" : "Pin to profile"}
            title={pinned ? "Unpin from profile" : "Pin to profile (max 3)"}
          >
            <Pin className="size-4" fill={pinned ? "currentColor" : "none"} />
          </button>
        ) : null}
        {isOwner ? (
          <button
            type="button"
            onClick={() => void archive()}
            disabled={ownerBusy}
            className="icon-button size-11"
            aria-label="Archive post"
            title="Archive"
          >
            <Archive className="size-4" />
          </button>
        ) : null}
        {isOwner ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={ownerBusy}
            className="icon-button size-11 text-[var(--danger)]"
            aria-label="Delete post"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
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
          onClick={() => setShareOpen(true)}
          className="icon-button ms-auto min-h-11 gap-1.5 px-3.5 text-sm"
          aria-label="Share"
        >
          <Share2 className="size-4" />
          {shareCount > 0 ? (
            <span className="text-sm font-semibold text-current tabular-nums">
              {shareCount}
            </span>
          ) : null}
        </button>
      </div>
      {saveNote ? (
        <p className="mt-2 text-xs font-semibold text-[var(--signal-deep)]">
          {saveNote} ·{" "}
          <Link href="/saved" className="underline underline-offset-2">
            View library
          </Link>
        </p>
      ) : null}
      {comments ? (
        <CommentsPanel
          postId={post.id}
          postAuthorId={post.author?.id}
          onCommentCountChange={setCommentCount}
        />
      ) : null}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={post.id}
        text={post.body}
        mediaUrl={media[0]?.url ?? null}
        onShared={(count) => {
          if (typeof count === "number") setShareCount(count);
          else setShareCount((n) => n + 1);
        }}
      />
      <SaveToCollectionSheet
        open={saveSheetOpen}
        onClose={() => setSaveSheetOpen(false)}
        postId={post.id}
        onSaved={() => {
          onBookmarkChange?.(true);
          setSaveNote("Saved");
          window.setTimeout(() => setSaveNote(null), 2200);
        }}
      />
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
