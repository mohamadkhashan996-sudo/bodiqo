"use client";

import { FormEvent, useState } from "react";
import { ImagePlus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PostComposer({ onCreated }: { onCreated?: (post: any) => void }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const response = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    const data = await response.json();
    setSending(false);
    if (response.ok) { setBody(""); onCreated?.(data.post); }
  }
  return <form onSubmit={submit} className="rounded-[1.75rem] border border-white/70 bg-white/65 p-4 shadow-[0_18px_45px_var(--shadow)] backdrop-blur-sm"><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What feels worth sharing?" className="min-h-24 w-full resize-none bg-transparent px-2 py-2 text-lg outline-none placeholder:text-[var(--muted)]" maxLength={10000} /><div className="mt-2 flex items-center justify-between border-t border-[var(--mist)] pt-3"><span className="inline-flex items-center gap-2 text-xs text-[var(--muted)]"><ImagePlus className="size-4" /> Add a visual soon</span><Button disabled={sending || !body.trim()}><Send className="mr-2 size-3.5" />{sending ? "Sharing" : "Share"}</Button></div></form>;
}
