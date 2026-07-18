import { getIo } from "@/lib/socket";
import type { ReactionCounts, ReactionKey } from "@/lib/reactions";
import type { CommentDTO } from "@/modules/feed/services/comments";

export type PostReactionEvent = {
  postId: string;
  likeCount: number;
  reactionCounts: ReactionCounts;
  reaction: ReactionKey | null;
  previousReaction?: ReactionKey | null;
  /** True when the acting user currently has any reaction. */
  liked: boolean;
  userId: string;
};

/** @deprecated Use PostReactionEvent — kept for older clients. */
export type PostLikeEvent = PostReactionEvent;

/** Notify everyone watching a post room of an authoritative reaction state. */
export function broadcastPostLike(event: PostReactionEvent) {
  const io = getIo();
  if (!io) return;
  io.to(`post:${event.postId}`).emit("post:like", event);
  io.to(`post:${event.postId}`).emit("post:reaction", event);
}

export type CommentEvent =
  | {
      type: "created";
      postId: string;
      comment: CommentDTO;
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
      comment: CommentDTO;
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
      reaction?: ReactionKey | null;
      userId: string;
    };

export function broadcastComment(event: CommentEvent) {
  getIo()?.to(`post:${event.postId}`).emit("post:comment", event);
}
