"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { useGuest } from "@/components/auth/guest-provider";
import { useSocket } from "@/hooks/use-socket";
import {
  bumpReactionCount,
  emptyReactionCounts,
  normalizeReactionCounts,
  totalReactions,
  type ReactionCounts,
  type ReactionKey,
} from "@/lib/reactions";

type ReactionState = {
  liked: boolean;
  likeCount: number;
  reaction?: ReactionKey | null;
  reactionCounts?: ReactionCounts | Partial<ReactionCounts> | null;
};

type PostReactionEvent = {
  postId: string;
  likeCount: number;
  liked: boolean;
  userId: string;
  reaction?: ReactionKey | null;
  reactionCounts?: ReactionCounts;
  previousReaction?: ReactionKey | null;
};

function applyOptimistic(
  counts: ReactionCounts,
  previous: ReactionKey | null,
  next: ReactionKey | null,
): ReactionCounts {
  let out = counts;
  if (previous) out = bumpReactionCount(out, previous, -1);
  if (next) out = bumpReactionCount(out, next, 1);
  return out;
}

/**
 * Optimistic multi-type reactions with server + realtime sync.
 * Clicking the same type again undoes; switching types keeps likeCount stable.
 */
export function usePostReaction(postId: string, initial: ReactionState) {
  const { requireAuth } = useGuest();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [liked, setLiked] = useState(Boolean(initial.liked));
  const [likeCount, setLikeCount] = useState(initial.likeCount ?? 0);
  const [reaction, setReaction] = useState<ReactionKey | null>(
    initial.reaction ?? (initial.liked ? "LIKE" : null),
  );
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>(() => {
    const normalized = normalizeReactionCounts(initial.reactionCounts);
    if (totalReactions(normalized) === 0 && (initial.likeCount ?? 0) > 0) {
      normalized.LIKE = initial.likeCount ?? 0;
    }
    return normalized;
  });
  const [pending, setPending] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const stateRef = useRef({ liked, reaction, likeCount, reactionCounts });

  useEffect(() => {
    stateRef.current = { liked, reaction, likeCount, reactionCounts };
  }, [liked, reaction, likeCount, reactionCounts]);

  useEffect(() => {
    setLiked(Boolean(initial.liked));
    setLikeCount(initial.likeCount ?? 0);
    setReaction(initial.reaction ?? (initial.liked ? "LIKE" : null));
    const normalized = normalizeReactionCounts(initial.reactionCounts);
    if (totalReactions(normalized) === 0 && (initial.likeCount ?? 0) > 0) {
      normalized.LIKE = initial.likeCount ?? 0;
    }
    setReactionCounts(normalized);
  }, [
    postId,
    initial.liked,
    initial.likeCount,
    initial.reaction,
    initial.reactionCounts,
  ]);

  useEffect(() => {
    if (!socket || !postId) return;
    socket.emit("post:join", { postId });
    const onReaction = (payload: PostReactionEvent) => {
      if (payload.postId !== postId) return;
      setLikeCount(Math.max(0, payload.likeCount));
      if (payload.reactionCounts) {
        setReactionCounts(normalizeReactionCounts(payload.reactionCounts));
      }
      if (session?.user?.id && payload.userId === session.user.id) {
        setLiked(payload.liked);
        setReaction(payload.reaction ?? null);
      }
    };
    socket.on("post:reaction", onReaction);
    socket.on("post:like", onReaction);
    return () => {
      socket.emit("post:leave", { postId });
      socket.off("post:reaction", onReaction);
      socket.off("post:like", onReaction);
    };
  }, [socket, postId, session?.user?.id]);

  const commit = useCallback(
    async (next: ReactionKey | null) => {
      if (!requireAuth() || pending) return;
      const prev = stateRef.current;
      const previous = prev.reaction;
      if (previous === next) return;

      setPending(true);
      const nextCounts = applyOptimistic(prev.reactionCounts, previous, next);
      const nextLiked = Boolean(next);
      const delta =
        previous && next ? 0 : next ? 1 : previous ? -1 : 0;
      setReaction(next);
      setLiked(nextLiked);
      setReactionCounts(nextCounts);
      setLikeCount((n) => Math.max(0, n + delta));
      if (next) setBurstKey((k) => k + 1);

      try {
        const res = await fetch(`/api/posts/${postId}/react`, {
          method: next ? "POST" : "DELETE",
          headers: next
            ? { "Content-Type": "application/json" }
            : undefined,
          body: next ? JSON.stringify({ type: next }) : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setReaction(previous);
          setLiked(prev.liked);
          setReactionCounts(prev.reactionCounts);
          setLikeCount(prev.likeCount);
          return;
        }
        if (typeof data.likeCount === "number") {
          setLikeCount(Math.max(0, data.likeCount));
        }
        if (typeof data.liked === "boolean") setLiked(data.liked);
        if ("reaction" in data) {
          setReaction((data.reaction as ReactionKey | null) ?? null);
        }
        if (data.reactionCounts) {
          setReactionCounts(normalizeReactionCounts(data.reactionCounts));
        }
      } catch {
        setReaction(previous);
        setLiked(prev.liked);
        setReactionCounts(prev.reactionCounts);
        setLikeCount(prev.likeCount);
      } finally {
        setPending(false);
      }
    },
    [pending, postId, requireAuth],
  );

  const react = useCallback(
    async (type: ReactionKey) => {
      const current = stateRef.current.reaction;
      if (current === type) {
        await commit(null);
        return;
      }
      await commit(type);
    },
    [commit],
  );

  const remove = useCallback(async () => {
    await commit(null);
  }, [commit]);

  /** Quick-action: toggle LIKE, or undo any existing reaction. */
  const toggle = useCallback(async () => {
    const current = stateRef.current.reaction;
    if (current) {
      await commit(null);
      return;
    }
    await commit("LIKE");
  }, [commit]);

  return {
    liked,
    likeCount,
    reaction,
    reactionCounts,
    pending,
    burstKey,
    react,
    remove,
    toggle,
  };
}

/** @deprecated Prefer usePostReaction — LIKE-only shim. */
export function usePostLike(
  postId: string,
  initial: { liked: boolean; likeCount: number },
) {
  const state = usePostReaction(postId, {
    ...initial,
    reaction: initial.liked ? "LIKE" : null,
    reactionCounts: emptyReactionCounts(),
  });
  return {
    liked: state.liked,
    likeCount: state.likeCount,
    pending: state.pending,
    toggle: state.toggle,
  };
}
