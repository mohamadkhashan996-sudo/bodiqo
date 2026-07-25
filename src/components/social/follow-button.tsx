"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { useGuest } from "@/components/auth/guest-provider";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";

export type FollowRelation = "none" | "following" | "requested" | "self";

type FollowUpdateEvent = {
  actorId: string;
  targetId: string;
  status: "following" | "requested" | "none";
};

export function FollowButton({
  handle,
  userId,
  initialRelation = "none",
  onChange,
  className,
}: {
  handle: string;
  /** Target user id — enables live follow:update sync when provided. */
  userId?: string;
  initialRelation?: FollowRelation;
  onChange?: (relation: FollowRelation) => void;
  className?: string;
}) {
  const { requireAuth } = useGuest();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [relation, setRelation] = useState<FollowRelation>(initialRelation);
  const [loading, setLoading] = useState(false);
  const me = session?.user?.id;

  useEffect(() => {
    setRelation(initialRelation);
  }, [handle, initialRelation]);

  useEffect(() => {
    if (!socket || !userId || !me) return;
    const onUpdate = (payload: FollowUpdateEvent) => {
      if (payload.targetId !== userId && payload.actorId !== userId) return;
      // My outgoing relation toward this profile
      if (payload.actorId === me && payload.targetId === userId) {
        setRelation(payload.status);
        onChange?.(payload.status);
      }
    };
    socket.on("follow:update", onUpdate);
    return () => {
      socket.off("follow:update", onUpdate);
    };
  }, [socket, userId, me, onChange]);

  if (relation === "self") return null;

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    const previous = relation;
    try {
      if (relation === "following" || relation === "requested") {
        setRelation("none");
        onChange?.("none");
        const res = await fetch(`/api/users/${handle}/follow`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setRelation(previous);
          onChange?.(previous);
        }
      } else {
        setRelation("following");
        onChange?.("following");
        const res = await fetch(`/api/users/${handle}/follow`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setRelation(previous);
          onChange?.(previous);
          return;
        }
        const next =
          data.follow?.status === "requested" ? "requested" : "following";
        setRelation(next);
        onChange?.(next);
      }
    } finally {
      setLoading(false);
    }
  }

  const label =
    relation === "following"
      ? "Following"
      : relation === "requested"
        ? "Requested"
        : "Follow";

  return (
    <Button
      type="button"
      variant={relation === "none" ? "signal" : "outline"}
      disabled={loading}
      className={className ?? "min-h-9 px-3 text-xs"}
      onClick={() => void toggle()}
      aria-label={
        relation === "requested"
          ? "Cancel follow request"
          : relation === "following"
            ? "Unfollow"
            : "Follow"
      }
      title={
        relation === "requested"
          ? "Cancel request"
          : relation === "following"
            ? "Unfollow"
            : "Follow"
      }
    >
      {loading ? "…" : label}
    </Button>
  );
}
