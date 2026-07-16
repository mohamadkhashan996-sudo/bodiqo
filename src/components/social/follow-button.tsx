"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGuest } from "@/components/auth/guest-provider";

export type FollowRelation = "none" | "following" | "requested" | "self";

export function FollowButton({
  handle,
  initialRelation = "none",
  onChange,
  className,
}: {
  handle: string;
  initialRelation?: FollowRelation;
  onChange?: (relation: FollowRelation) => void;
  className?: string;
}) {
  const { requireAuth } = useGuest();
  const [relation, setRelation] = useState<FollowRelation>(initialRelation);
  const [loading, setLoading] = useState(false);

  if (relation === "self") return null;

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    try {
      if (relation === "following" || relation === "requested") {
        const res = await fetch(`/api/users/${handle}/follow`, {
          method: "DELETE",
        });
        if (res.ok) {
          setRelation("none");
          onChange?.("none");
        }
      } else {
        const res = await fetch(`/api/users/${handle}/follow`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const next =
            data.follow?.status === "requested" ? "requested" : "following";
          setRelation(next);
          onChange?.(next);
        }
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
    >
      {loading ? "…" : label}
    </Button>
  );
}
