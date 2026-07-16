"use client";

import { FormEvent, useRef, useState } from "react";
import { ImagePlus, Sparkles, Hash, Send, X } from "lucide-react";
import { MediaKind, PostType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useExperience } from "@/components/experience-provider";
import { uploadFile } from "@/lib/upload-client";

type MediaItem = { url: string; kind: MediaKind; name: string };

export function PostComposer({ onCreated }: { onCreated?: (post: unknown) => void }) {
  const { t } = useExperience();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"Post" | "Photo" | "Video" | "Reel">("Post");
  const [sending, setSending] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10 - media.length);
    if (!list.length) return;
    setUploading(true);
    setHints([]);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of list) {
        const data = await uploadFile(file);
        uploaded.push({
          url: data.url,
          kind: data.kind as MediaKind,
          name: file.name,
        });
      }
      setMedia((prev) => [...prev, ...uploaded].slice(0, 10));
    } catch (error) {
      setHints([error instanceof Error ? error.message : "Upload failed"]);
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && media.length === 0) return;
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

    let type: PostType = "TEXT";
    if (kind === "Reel") type = "SHORT";
    else if (kind === "Video") type = "VIDEO";
    else if (kind === "Photo" || media.some((m) => m.kind === "IMAGE" || m.kind === "GIF")) {
      type = media.some((m) => m.kind === "VIDEO") ? "VIDEO" : "IMAGE";
    } else if (media.some((m) => m.kind === "VIDEO")) {
      type = "VIDEO";
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        type,
        media: media.map((m) => ({ url: m.url, kind: m.kind })),
      }),
    });
    const data = await response.json();
    setSending(false);
    if (response.ok) {
      setBody("");
      setHints([]);
      setMedia([]);
      onCreated?.(data.post);
    } else {
      setHints([data.error || "Could not publish post"]);
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

  const accept =
    kind === "Reel"
      ? "video/mp4,video/webm"
      : kind === "Video"
        ? "video/mp4,video/webm,image/*"
        : kind === "Photo"
          ? "image/*"
          : "image/*,video/mp4,video/webm";

  return (
    <form
      onSubmit={submit}
      className="rounded-[1.75rem] border border-[var(--mist)] bg-[var(--glass)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      <Tabs
        items={["Post", "Photo", "Video", "Reel"]}
        value={kind}
        onChange={(value) => setKind(value as typeof kind)}
      />
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
      {media.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto px-2 pb-1">
          {media.map((item) => (
            <div
              key={item.url}
              className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--mist)]"
            >
              {item.kind === "VIDEO" ? (
                <video src={item.url} className="size-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="size-full object-cover" />
              )}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[var(--ink)]/80 text-white"
                onClick={() =>
                  setMedia((prev) => prev.filter((m) => m.url !== item.url))
                }
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {media.length > 1 ? (
            <p className="self-center text-xs text-[var(--muted)]">
              {media.length} media · carousel
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mist)] pt-3">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            multiple={kind === "Photo" || kind === "Post"}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void onPickFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 hover:bg-[var(--mist)]"
            disabled={uploading || media.length >= 10}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            {uploading
              ? "Uploading…"
              : kind === "Photo"
                ? "Add photos"
                : kind === "Reel" || kind === "Video"
                  ? "Add video"
                  : "Media"}
          </button>
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
        <Button
          disabled={sending || uploading || (!body.trim() && !media.length)}
          type="submit"
        >
          <Send className="size-3.5" aria-hidden />
          {sending ? t("common", "loading") : t("home", "compose")}
        </Button>
      </div>
    </form>
  );
}
