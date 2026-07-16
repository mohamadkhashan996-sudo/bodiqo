"use client";

import { FormEvent, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGuest } from "@/components/auth/guest-provider";

export function CommentsPanel({ postId }: { postId: string }) {
  const { requireAuth } = useGuest();
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!requireAuth()) return;
    if (!body.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((old) => [...old, data.comment]);
      setBody("");
    }
  }

  return (
    <section className="mt-5 border-t border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] pt-5">
      <div className="surface-subtle rounded-[var(--radius-xl)] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Conversation</p>
            <p className="text-xs text-[var(--muted)]">
              Thoughtful replies make the feed feel alive.
            </p>
          </div>
          <span className="rounded-full bg-[var(--signal-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
            {comments.length} replies
          </span>
        </div>
        {loading ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-[1rem]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="size-8 rounded-[1rem]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          </div>
        ) : comments.length ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="surface-panel rounded-[var(--radius-lg)] p-3 text-sm">
                <div className="flex gap-3">
                  <Avatar
                    src={comment.author?.image}
                    name={comment.author?.displayName ?? comment.author?.name}
                    className="size-8 rounded-[1rem]"
                  />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[var(--ink)]">
                      {comment.author?.displayName ?? comment.author?.name}
                    </b>
                    <p className="mt-1 whitespace-pre-wrap leading-6 text-[var(--muted)]">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No replies yet"
            description="Start the conversation with a thoughtful response."
            className="px-4 py-10"
          />
        )}
      </div>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => requireAuth()}
          placeholder="Add a considered reply…"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="signal">
          Send
        </Button>
      </form>
    </section>
  );
}
