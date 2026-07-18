"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Flag,
  Heart,
  ImagePlus,
  Loader2,
  Pencil,
  Pin,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";

import { useGuest } from "@/components/auth/guest-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaImage } from "@/components/ui/media-image";
import { useSocket } from "@/hooks/use-socket";
import { ACCEPT_BY_PURPOSE } from "@/lib/media-accept";
import { compressImageFile } from "@/lib/image-compress";
import { linkifyPostBody } from "@/lib/post-body";
import { REACTION_META, REACTION_TYPES, type ReactionKey } from "@/lib/reactions";
import { uploadFile } from "@/lib/upload-client";
import { appendUniqueById } from "@/lib/utils";
import type { FeedComment, FeedReaction } from "@/types/feed";

const ReportDialog = dynamic(
  () =>
    import("@/components/social/report-dialog").then((m) => m.ReportDialog),
  { ssr: false },
);

const EMOJIS = [
  "😂",
  "❤️",
  "🔥",
  "👏",
  "😍",
  "😮",
  "😢",
  "🙌",
  "✨",
  "💯",
  "🥰",
  "🤣",
];

type SortMode = "newest" | "top";

type CommentEvent =
  | {
      type: "created";
      postId: string;
      comment: FeedComment;
      commentCount: number;
    }
  | {
      type: "deleted";
      postId: string;
      commentId: string;
      parentId: string | null;
      commentCount: number;
      deletedIds?: string[];
    }
  | {
      type: "updated";
      postId: string;
      comment: FeedComment;
    }
  | {
      type: "pinned";
      postId: string;
      commentId: string;
      isPinned: boolean;
    }
  | {
      type: "liked";
      postId: string;
      commentId: string;
      likeCount: number;
      liked: boolean;
      reaction?: FeedReaction | null;
      userId: string;
    };

function timeAgo(value?: string | Date) {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function upsertTopLevel(list: FeedComment[], comment: FeedComment) {
  if (list.some((c) => c.id === comment.id)) return list;
  return [comment, ...list];
}

function upsertReply(list: FeedComment[], reply: FeedComment): FeedComment[] {
  if (!reply.parentId) return list;
  return list.map((c) => {
    if (c.id === reply.parentId) {
      const replies = c.replies ?? [];
      if (replies.some((r) => r.id === reply.id)) return c;
      return {
        ...c,
        replies: [...replies, reply],
        replyCount: (c.replyCount ?? replies.length) + 1,
      };
    }
    if (c.replies?.length) {
      return { ...c, replies: upsertReply(c.replies, reply) };
    }
    return c;
  });
}

function patchComment(
  list: FeedComment[],
  commentId: string,
  patch: Partial<FeedComment>,
): FeedComment[] {
  return list.map((c) => {
    if (c.id === commentId) return { ...c, ...patch };
    if (c.replies?.length) {
      return { ...c, replies: patchComment(c.replies, commentId, patch) };
    }
    return c;
  });
}

function patchLike(
  list: FeedComment[],
  commentId: string,
  likeCount: number,
  liked?: boolean,
  reaction?: FeedReaction | null,
): FeedComment[] {
  return patchComment(list, commentId, {
    likeCount,
    ...(typeof liked === "boolean" ? { liked } : {}),
    ...(reaction !== undefined ? { reaction } : {}),
  });
}

function removeComments(
  list: FeedComment[],
  ids: Set<string>,
): FeedComment[] {
  return list
    .filter((c) => !ids.has(c.id))
    .map((c) => {
      if (!c.replies?.length) return c;
      const replies = removeComments(c.replies, ids);
      return {
        ...c,
        replies,
        replyCount: Math.max(0, (c.replyCount ?? 0) - (c.replies.length - replies.length)),
      };
    });
}

function clearPins(list: FeedComment[], exceptId?: string): FeedComment[] {
  return list.map((c) => ({
    ...c,
    isPinned: c.id === exceptId ? true : false,
    replies: c.replies ? clearPins(c.replies, exceptId) : c.replies,
  }));
}

export function CommentsPanel({
  postId,
  postAuthorId,
  variant = "panel",
  onCommentCountChange,
}: {
  postId: string;
  postAuthorId?: string;
  variant?: "panel" | "sheet";
  onCommentCountChange?: (count: number) => void;
}) {
  const { requireAuth } = useGuest();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const me = session?.user?.id;
  const isPostAuthor = Boolean(me && postAuthorId && me === postAuthorId);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [likePending, setLikePending] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    kind: string;
    local?: string;
  } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyCursors, setReplyCursors] = useState<Record<string, string | null>>(
    {},
  );
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    () => new Set(),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const sheet = variant === "sheet";

  const totalVisible = useMemo(() => {
    const count = (items: FeedComment[]): number =>
      items.reduce(
        (sum, c) => sum + 1 + (c.replies?.length ? count(c.replies) : 0),
        0,
      );
    return count(comments);
  }, [comments]);

  const load = useCallback(
    async (after?: string | null, replace = false) => {
      if (after) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "20", sort });
        if (after) params.set("cursor", after);
        const res = await fetch(`/api/posts/${postId}/comments?${params}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not load comments");
          return;
        }
        const incoming = (data.comments ?? []) as FeedComment[];
        setComments((old) =>
          replace || !after ? incoming : appendUniqueById(old, incoming),
        );
        setCursor(data.nextCursor ?? null);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [postId, sort],
  );

  useEffect(() => {
    setComments([]);
    setCursor(null);
    setReplyTo(null);
    setExpandedReplies(new Set());
    setReplyCursors({});
    void load(null, true);
  }, [load]);

  useEffect(() => {
    if (!socket || !postId) return;
    socket.emit("post:join", { postId });
    const onEvent = (event: CommentEvent) => {
      if (event.postId !== postId) return;
      if (event.type === "created") {
        const comment = event.comment;
        setComments((old) =>
          comment.parentId
            ? upsertReply(old, comment)
            : upsertTopLevel(old, comment),
        );
        onCommentCountChange?.(event.commentCount);
      } else if (event.type === "deleted") {
        const ids = new Set(event.deletedIds?.length ? event.deletedIds : [event.commentId]);
        setComments((old) => removeComments(old, ids));
        onCommentCountChange?.(event.commentCount);
      } else if (event.type === "updated") {
        setComments((old) =>
          patchComment(old, event.comment.id, event.comment),
        );
      } else if (event.type === "pinned") {
        setComments((old) => {
          const cleared = clearPins(old, event.isPinned ? event.commentId : undefined);
          return patchComment(cleared, event.commentId, {
            isPinned: event.isPinned,
          });
        });
      } else if (event.type === "liked") {
        setComments((old) =>
          patchLike(
            old,
            event.commentId,
            event.likeCount,
            me && event.userId === me ? event.liked : undefined,
            me && event.userId === me
              ? (event.reaction ?? null)
              : undefined,
          ),
        );
      }
    };
    socket.on("post:comment", onEvent);
    return () => {
      socket.off("post:comment", onEvent);
    };
  }, [socket, postId, me, onCommentCountChange]);

  function insertEmoji(emoji: string) {
    setBody((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }

  async function attachMedia(file: File) {
    if (!requireAuth()) return;
    setUploadingMedia(true);
    setError(null);
    try {
      const compressed = file.type.startsWith("image/")
        ? await compressImageFile(file, { maxEdge: 1280 })
        : null;
      const upload = await uploadFile(compressed?.file ?? file, {
        purpose: "comment",
      });
      setMediaPreview({
        url: upload.url,
        kind: upload.kind === "GIF" ? "GIF" : "IMAGE",
        local: compressed?.previewUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!requireAuth() || sending) return;
    const text = body.trim();
    if (!text && !mediaPreview) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          parentId: replyTo?.id,
          mediaUrl: mediaPreview?.url,
          mediaKind: mediaPreview?.kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not post comment");
        return;
      }
      const comment = data.comment as FeedComment;
      setComments((old) =>
        comment.parentId
          ? upsertReply(old, comment)
          : upsertTopLevel(old, comment),
      );
      if (typeof data.commentCount === "number") {
        onCommentCountChange?.(data.commentCount);
      }
      if (replyTo) {
        setExpandedReplies((old) => new Set(old).add(replyTo.id));
      }
      setBody("");
      setReplyTo(null);
      setEmojiOpen(false);
      setMediaPreview(null);
    } finally {
      setSending(false);
    }
  }

  async function applyCommentReaction(
    comment: FeedComment,
    type: ReactionKey | null,
  ) {
    if (!requireAuth() || likePending === comment.id) return;
    const wasLiked = Boolean(comment.liked);
    const previous = (comment.reaction as ReactionKey | null) ?? null;
    const next = type;
    if (previous === next) return;

    const countDelta =
      previous && next ? 0 : next ? 1 : previous ? -1 : 0;
    setLikePending(comment.id);
    setComments((old) =>
      patchLike(
        old,
        comment.id,
        Math.max(0, (comment.likeCount ?? 0) + countDelta),
        Boolean(next),
        next,
      ),
    );
    try {
      const res = await fetch(`/api/comments/${comment.id}/like`, {
        method: next ? "POST" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify({ type: next }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setComments((old) =>
          patchLike(
            old,
            comment.id,
            comment.likeCount ?? 0,
            wasLiked,
            previous,
          ),
        );
        setError(data.error || "Could not update reaction");
        return;
      }
      setComments((old) =>
        patchLike(
          old,
          comment.id,
          typeof data.likeCount === "number"
            ? data.likeCount
            : Math.max(0, (comment.likeCount ?? 0) + countDelta),
          typeof data.liked === "boolean" ? data.liked : Boolean(next),
          (data.reaction as FeedReaction | null | undefined) ?? next,
        ),
      );
    } catch {
      setComments((old) =>
        patchLike(
          old,
          comment.id,
          comment.likeCount ?? 0,
          wasLiked,
          previous,
        ),
      );
    } finally {
      setLikePending(null);
    }
  }

  async function toggleLike(comment: FeedComment) {
    if (comment.liked) {
      await applyCommentReaction(comment, null);
      return;
    }
    await applyCommentReaction(comment, "LIKE");
  }

  async function removeOwn(comment: FeedComment) {
    if (!requireAuth()) return;
    if (comment.author?.id && me && comment.author.id !== me) return;
    if (!window.confirm("Delete this comment?")) return;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not delete");
      return;
    }
    const ids = new Set<string>(
      Array.isArray(data.deletedIds) && data.deletedIds.length
        ? data.deletedIds
        : [comment.id],
    );
    setComments((old) => removeComments(old, ids));
    if (typeof data.commentCount === "number") {
      onCommentCountChange?.(data.commentCount);
    }
  }

  async function saveEdit(comment: FeedComment) {
    const text = editBody.trim();
    if (!text) return;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not edit");
      return;
    }
    if (data.comment) {
      setComments((old) => patchComment(old, comment.id, data.comment));
    }
    setEditingId(null);
  }

  async function togglePin(comment: FeedComment) {
    if (!isPostAuthor || comment.parentId) return;
    const next = !comment.isPinned;
    const res = await fetch(`/api/comments/${comment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not pin comment");
      return;
    }
    setComments((old) => {
      const cleared = clearPins(old, next ? comment.id : undefined);
      return patchComment(cleared, comment.id, { isPinned: next });
    });
  }

  async function loadMoreReplies(parent: FeedComment, append = false) {
    const params = new URLSearchParams({ limit: "20" });
    const cursor = append ? replyCursors[parent.id] : null;
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/comments/${parent.id}/replies?${params}`);
    const data = await res.json();
    if (!res.ok) return;
    const replies = (data.replies ?? []) as FeedComment[];
    setReplyCursors((old) => ({
      ...old,
      [parent.id]: data.nextCursor ?? null,
    }));
    setComments((old) =>
      old.map((c) => {
        if (c.id !== parent.id) return c;
        const merged = append
          ? appendUniqueById(c.replies ?? [], replies)
          : replies;
        return {
          ...c,
          replies: merged,
          replyCount: Math.max(c.replyCount ?? 0, merged.length),
        };
      }),
    );
    setExpandedReplies((old) => new Set(old).add(parent.id));
  }

  function startReply(comment: FeedComment) {
    if (!requireAuth()) return;
    setReplyTo(comment);
    setExpandedReplies((old) => new Set(old).add(comment.id));
    inputRef.current?.focus();
  }

  function renderComment(comment: FeedComment, depth = 0) {
    const liked = Boolean(comment.liked);
    const reactionMeta = comment.reaction
      ? REACTION_META[comment.reaction as ReactionKey]
      : null;
    const mine = Boolean(me && comment.author?.id === me);
    const replies = comment.replies ?? [];
    const replyCount = comment.replyCount ?? replies.length;
    const showReplies =
      depth === 0
        ? expandedReplies.has(comment.id) || replies.length > 0
        : true;
    const canNestReply = depth < 2;
    const indent = depth > 0 ? "ml-8 border-l-2 border-[var(--mist-strong)]/60 pl-3 sm:ml-10" : "";

    return (
      <div key={comment.id} className={indent}>
        <div
          className={`flex gap-3 ${
            sheet
              ? "rounded-2xl bg-white/5 p-3"
              : "surface-panel rounded-[var(--radius-lg)] p-3"
          } text-sm`}
        >
          <Link href={`/u/${comment.author?.handle ?? ""}`}>
            <Avatar
              src={comment.author?.image}
              name={comment.author?.displayName ?? comment.author?.name}
              className="size-8 rounded-[1rem]"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b
                className={`truncate ${sheet ? "text-white" : "text-[var(--ink)]"}`}
              >
                {comment.author?.displayName ??
                  comment.author?.name ??
                  `@${comment.author?.handle ?? "user"}`}
              </b>
              <span
                className={`text-[11px] ${sheet ? "text-white/50" : "text-[var(--muted)]"}`}
              >
                {timeAgo(comment.createdAt)}
                {comment.edited ? " · edited" : ""}
              </span>
              {comment.isPinned ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--signal-deep)]">
                  <Pin className="size-3" />
                  Pinned
                </span>
              ) : null}
            </div>

            {editingId === comment.id ? (
              <div className="mt-2 space-y-2">
                <Input
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value.slice(0, 2000))}
                  className={sheet ? "border-white/20 bg-white/10 text-white" : ""}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="signal"
                    className="min-h-9 px-3 text-xs"
                    onClick={() => void saveEdit(comment)}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-9 px-3 text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={`mt-1 text-[0.9375rem] leading-6 whitespace-pre-wrap ${
                  sheet ? "text-white/95" : "text-[var(--ink)]"
                }`}
              >
                {linkifyPostBody(comment.body)}
              </p>
            )}

            {comment.mediaUrl ? (
              <div className="mt-2 max-w-xs overflow-hidden rounded-xl border-2 border-[var(--mist-strong)]">
                <MediaImage
                  src={comment.mediaUrl}
                  alt="Comment media"
                  className="h-auto w-full object-cover"
                />
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="group/react relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => void toggleLike(comment)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    liked
                      ? "text-[var(--ember)]"
                      : sheet
                        ? "text-white/70"
                        : "text-[var(--muted-strong)]"
                  }`}
                  aria-label={
                    reactionMeta
                      ? `${reactionMeta.label} — tap to undo`
                      : "React"
                  }
                >
                  {reactionMeta ? (
                    <span className="text-sm leading-none" aria-hidden>
                      {reactionMeta.emoji}
                    </span>
                  ) : (
                    <Heart
                      className="size-3.5"
                      fill={liked ? "currentColor" : "none"}
                    />
                  )}
                  {comment.likeCount ?? 0}
                </button>
                <div className="absolute bottom-full left-0 z-10 mb-1 hidden gap-0.5 rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)] group-hover/react:flex max-md:group-focus-within/react:flex">
                  {REACTION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      title={REACTION_META[type].label}
                      aria-label={REACTION_META[type].label}
                      className={`grid size-7 place-items-center rounded-full text-sm hover:bg-[var(--mist)] ${
                        comment.reaction === type
                          ? "bg-[var(--signal-soft)]"
                          : ""
                      }`}
                      onClick={() =>
                        void applyCommentReaction(
                          comment,
                          comment.reaction === type ? null : type,
                        )
                      }
                    >
                      {REACTION_META[type].emoji}
                    </button>
                  ))}
                </div>
              </div>
              {canNestReply ? (
                <button
                  type="button"
                  onClick={() => startReply(comment)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    sheet ? "text-white/70" : "text-[var(--muted-strong)]"
                  }`}
                >
                  <Reply className="size-3.5" />
                  Reply
                </button>
              ) : null}
              {mine ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditBody(comment.body);
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    sheet ? "text-white/50" : "text-[var(--muted)]"
                  }`}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              ) : null}
              {mine ? (
                <button
                  type="button"
                  onClick={() => void removeOwn(comment)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    sheet ? "text-white/50" : "text-[var(--muted)]"
                  }`}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              ) : null}
              {isPostAuthor && depth === 0 ? (
                <button
                  type="button"
                  onClick={() => void togglePin(comment)}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    comment.isPinned
                      ? "text-[var(--signal-deep)]"
                      : sheet
                        ? "text-white/50"
                        : "text-[var(--muted)]"
                  }`}
                >
                  <Pin className="size-3.5" />
                  {comment.isPinned ? "Unpin" : "Pin"}
                </button>
              ) : null}
              {!mine ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!requireAuth()) return;
                    setReportId(comment.id);
                  }}
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    sheet ? "text-white/50" : "text-[var(--muted)]"
                  }`}
                >
                  <Flag className="size-3.5" />
                  Report
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {depth === 0 && replyCount > 0 ? (
          <div className="mt-2 space-y-2">
            {!showReplies ||
            (replyCount > replies.length &&
              !expandedReplies.has(comment.id)) ? (
              <button
                type="button"
                onClick={() => void loadMoreReplies(comment, false)}
                className={`ml-8 text-xs font-semibold sm:ml-10 ${
                  sheet ? "text-white/70" : "text-[var(--signal-deep)]"
                }`}
              >
                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            ) : null}
            {showReplies
              ? replies.map((reply) => renderComment(reply, depth + 1))
              : null}
            {showReplies &&
            (replyCount > replies.length || replyCursors[comment.id]) ? (
              <button
                type="button"
                onClick={() => void loadMoreReplies(comment, true)}
                className={`ml-8 text-xs font-semibold sm:ml-10 ${
                  sheet ? "text-white/70" : "text-[var(--signal-deep)]"
                }`}
              >
                View more replies
              </button>
            ) : null}
          </div>
        ) : null}

        {depth > 0 && replies.length > 0 ? (
          <div className="mt-2 space-y-2">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={
        sheet
          ? "flex h-full min-h-0 flex-col"
          : "mt-5 border-t-2 border-[var(--mist-strong)] pt-5"
      }
    >
      <div
        className={
          sheet
            ? "min-h-0 flex-1 overflow-y-auto px-1 pb-3"
            : "surface-subtle rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] p-4"
        }
      >
        {!sheet ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                Comments
              </p>
              <p className="text-xs text-[var(--muted-strong)]">
                Replies, media, mentions, and live updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="rounded-full border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold"
                aria-label="Sort comments"
              >
                <option value="newest">Newest</option>
                <option value="top">Top</option>
              </select>
              <span className="rounded-full border-2 border-[var(--signal-deep)]/45 bg-[var(--signal-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-deep)]">
                {totalVisible}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSort("newest")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                sort === "newest" ? "bg-white/20 text-white" : "text-white/60"
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSort("top")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                sort === "top" ? "bg-white/20 text-white" : "text-white/60"
              }`}
            >
              Top
            </button>
          </div>
        )}

        {error ? (
          <p className="mb-3 text-xs font-semibold text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-[1rem]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length ? (
          <div className="space-y-3">
            {comments.map((comment) => renderComment(comment, 0))}
            {cursor ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void load(cursor)}
                className={`w-full rounded-full py-2 text-xs font-semibold ${
                  sheet
                    ? "bg-white/10 text-white"
                    : "border-2 border-[var(--mist-strong)] text-[var(--muted-strong)]"
                }`}
              >
                {loadingMore ? "Loading…" : "Load more comments"}
              </button>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="No comments yet"
            description="Be the first to leave a reply."
            className={
              sheet
                ? "border-white/15 bg-white/5 px-4 py-10 text-white"
                : "px-4 py-10"
            }
          />
        )}
      </div>

      <div className={sheet ? "border-t border-white/10 pt-3" : "mt-4"}>
        {replyTo ? (
          <div
            className={`mb-2 flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs ${
              sheet
                ? "bg-white/10 text-white/80"
                : "bg-[var(--cloud-elevated)] text-[var(--muted-strong)]"
            }`}
          >
            <span className="truncate">
              Replying to{" "}
              <b>
                {replyTo.author?.displayName ??
                  replyTo.author?.name ??
                  "comment"}
              </b>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {mediaPreview ? (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaPreview.local || mediaPreview.url}
              alt=""
              className="size-14 rounded-xl object-cover"
            />
            <button
              type="button"
              className="text-xs font-semibold text-[var(--danger)]"
              onClick={() => setMediaPreview(null)}
            >
              Remove
            </button>
          </div>
        ) : null}

        {emojiOpen ? (
          <div
            className={`mb-2 grid grid-cols-6 gap-1 rounded-2xl p-2 ${
              sheet
                ? "bg-white/10"
                : "border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)]"
            }`}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="grid place-items-center rounded-xl py-2 text-xl transition hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={submit} className="flex gap-2">
          <input
            ref={mediaRef}
            type="file"
            accept={ACCEPT_BY_PURPOSE.image}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attachMedia(file);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!requireAuth()) return;
              setEmojiOpen((v) => !v);
            }}
            className={`grid size-11 shrink-0 place-items-center rounded-full ${
              sheet
                ? "bg-white/10 text-white"
                : "border-2 border-[var(--mist-strong)] text-[var(--muted-strong)]"
            }`}
            aria-label="Emoji"
          >
            <Smile className="size-4" />
          </button>
          <button
            type="button"
            disabled={uploadingMedia}
            onClick={() => {
              if (!requireAuth()) return;
              mediaRef.current?.click();
            }}
            className={`grid size-11 shrink-0 place-items-center rounded-full ${
              sheet
                ? "bg-white/10 text-white"
                : "border-2 border-[var(--mist-strong)] text-[var(--muted-strong)]"
            }`}
            aria-label="Add image or GIF"
          >
            {uploadingMedia ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </button>
          <Input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            onPointerDown={(e) => {
              if (!requireAuth()) e.preventDefault();
            }}
            placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
            className={`min-w-0 flex-1 ${
              sheet
                ? "border-white/20 bg-white/10 text-white placeholder:text-white/45"
                : ""
            }`}
            maxLength={2000}
          />
          <Button
            type="submit"
            variant="signal"
            disabled={sending || (!body.trim() && !mediaPreview)}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Send"}
          </Button>
        </form>
      </div>

      <ReportDialog
        open={Boolean(reportId)}
        onClose={() => setReportId(null)}
        targetType="COMMENT"
        targetId={reportId ?? ""}
        title="Report comment"
      />
    </section>
  );
}
