"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { useGuest } from "@/components/auth/guest-provider";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/use-socket";

export type FriendRelation = "none" | "friends" | "outgoing" | "incoming" | "self";

type FriendUpdateEvent = {
  type: "friends";
  userIds: string[];
};

export function FriendButton({
  userId,
  initialRelation = "none",
  onChange,
  className,
}: {
  userId: string;
  initialRelation?: FriendRelation;
  onChange?: (relation: FriendRelation) => void;
  className?: string;
}) {
  const { requireAuth } = useGuest();
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [relation, setRelation] = useState<FriendRelation>(initialRelation);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const me = session?.user?.id;

  useEffect(() => {
    setRelation(initialRelation);
  }, [userId, initialRelation]);

  useEffect(() => {
    if (!socket || !userId || !me) return;
    const onUpdate = (payload: FriendUpdateEvent) => {
      if (!payload.userIds?.includes(userId) || !payload.userIds.includes(me)) {
        return;
      }
      setRelation("friends");
      onChange?.("friends");
    };
    socket.on("friend:update", onUpdate);
    return () => {
      socket.off("friend:update", onUpdate);
    };
  }, [socket, userId, me, onChange]);

  if (relation === "self") return null;

  async function send() {
    if (!requireAuth()) return;
    setLoading(true);
    const previous = relation;
    try {
      setRelation("outgoing");
      onChange?.("outgoing");
      const res = await fetch("/api/social/friend-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: userId, kind: "FRIEND" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRelation(previous);
        onChange?.(previous);
        return;
      }
      if (data.request?.id) setRequestId(data.request.id);
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrRespond(status: "CANCELLED" | "DECLINED" | "ACCEPTED") {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      let id = requestId;
      if (!id) {
        const list = await fetch("/api/social/friend-request").then((r) =>
          r.json(),
        );
        const match =
          status === "CANCELLED"
            ? (list.outgoing ?? []).find(
                (r: { toUser?: { id: string }; id: string }) =>
                  r.toUser?.id === userId,
              )
            : (list.incoming ?? []).find(
                (r: { fromUser?: { id: string }; id: string }) =>
                  r.fromUser?.id === userId,
              );
        id = match?.id ?? null;
      }
      if (!id) return;
      const res = await fetch("/api/social/friend-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, status }),
      });
      if (!res.ok) return;
      const next: FriendRelation =
        status === "ACCEPTED" ? "friends" : "none";
      setRelation(next);
      onChange?.(next);
      setRequestId(null);
    } finally {
      setLoading(false);
    }
  }

  async function unfriend() {
    if (!requireAuth()) return;
    if (!window.confirm("Remove this friend? You’ll unfollow each other.")) {
      return;
    }
    setLoading(true);
    const previous = relation;
    try {
      setRelation("none");
      onChange?.("none");
      const res = await fetch(`/api/social/friends/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setRelation(previous);
        onChange?.(previous);
      }
    } finally {
      setLoading(false);
    }
  }

  if (relation === "friends") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        className={className ?? "min-h-9 px-3 text-xs"}
        onClick={() => void unfriend()}
      >
        Friends
      </Button>
    );
  }

  if (relation === "outgoing") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        className={className ?? "min-h-9 px-3 text-xs"}
        onClick={() => void cancelOrRespond("CANCELLED")}
      >
        Requested
      </Button>
    );
  }

  if (relation === "incoming") {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="signal"
          disabled={loading}
          className={className ?? "min-h-9 px-3 text-xs"}
          onClick={() => void cancelOrRespond("ACCEPTED")}
        >
          Accept
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          className="min-h-9 px-3 text-xs"
          onClick={() => void cancelOrRespond("DECLINED")}
        >
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="quiet"
      disabled={loading}
      className={className ?? "min-h-9 px-3 text-xs"}
      onClick={() => void send()}
    >
      Add friend
    </Button>
  );
}
