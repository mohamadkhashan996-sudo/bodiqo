import { getIo } from "@/lib/socket";

export type FollowUpdateEvent = {
  actorId: string;
  targetId: string;
  status: "following" | "requested" | "none";
  /** Viewer-relative counts when known. */
  followersCount?: number;
  followingCount?: number;
};

/** Notify both parties so profile buttons/counts can refresh live. */
export function broadcastFollowUpdate(event: FollowUpdateEvent) {
  const io = getIo();
  if (!io) return;
  io.to(`user:${event.actorId}`).emit("follow:update", event);
  io.to(`user:${event.targetId}`).emit("follow:update", event);
}
