"use client";

import { FormEvent, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useGuest } from "@/components/auth/guest-provider";

export function CommentsPanel({ postId }: { postId: string }) {
  const { requireAuth } = useGuest();
  const [comments, setComments] = useState<any[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {});
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
    <section className="mt-4 border-t border-[var(--mist)] pt-4">
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2 text-sm">
            <Avatar
              src={comment.author?.image}
              name={comment.author?.displayName ?? comment.author?.name}
              className="size-7 rounded-xl"
            />
            <div>
              <b>{comment.author?.displayName ?? comment.author?.name}</b>
              <p className="text-[var(--muted)]">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => requireAuth()}
          placeholder="Add a considered reply…"
          className="min-w-0 flex-1 rounded-full border border-[var(--mist)] bg-white/60 px-4 py-2 text-sm outline-none focus:border-[var(--signal)]"
        />
        <button type="submit" className="text-xs font-bold text-[var(--signal)]">
          Send
        </button>
      </form>
    </section>
  );
}
