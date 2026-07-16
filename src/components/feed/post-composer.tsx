"use client";

import { FormEvent, useState } from "react";
import { ImagePlus, Sparkles, Hash, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useExperience } from "@/components/experience-provider";

export function PostComposer({ onCreated }: { onCreated?: (post: unknown) => void }) {
  const { t } = useExperience();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [hints, setHints] = useState<string[]>([]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const spam = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "spam", text: body }),
    }).then((r) => r.json());
    if (spam.spamLikely) {
      setSending(false);
      setHints([spam.assistance || "This may look like spam. Please revise."]);
      return;
    }
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await response.json();
    setSending(false);
    if (response.ok) {
      setBody("");
      setHints([]);
      onCreated?.(data.post);
    }
  }

  async function suggest(action: "caption" | "hashtags") {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text: body, seed: body }),
    }).then((r) => r.json());
    if (action === "caption") setHints(res.suggestions ?? []);
    if (action === "hashtags") {
      const tags = (res.hashtags as string[] | undefined)?.join(" ") ?? "";
      setBody((b) => `${b.trim()} ${tags}`.trim());
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("home", "composerPlaceholder")}
        className="min-h-28 border-0 bg-transparent px-2 text-lg shadow-none"
        maxLength={10000}
        aria-label={t("home", "composerPlaceholder")}
      />
      {hints.length ? (
        <ul className="mt-2 space-y-1 px-2 text-sm text-[var(--signal-deep)]">
          {hints.map((h) => (
            <li key={h}>
              <button
                type="button"
                className="text-start underline-offset-2 hover:underline"
                onClick={() => setBody(h)}
              >
                {h}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mist)] pt-3">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-2 rounded-full px-2 py-1">
            <ImagePlus className="size-4" aria-hidden /> Media
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-[var(--mist)]"
            onClick={() => void suggest("caption")}
          >
            <Sparkles className="size-3.5" aria-hidden /> {t("ai", "caption")}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-[var(--mist)]"
            onClick={() => void suggest("hashtags")}
          >
            <Hash className="size-3.5" aria-hidden /> {t("ai", "hashtags")}
          </button>
        </div>
        <Button disabled={sending || !body.trim()} type="submit">
          <Send className="size-3.5" aria-hidden />
          {sending ? t("common", "loading") : t("home", "compose")}
        </Button>
      </div>
    </form>
  );
}
