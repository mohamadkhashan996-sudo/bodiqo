"use client";

import { FormEvent, useRef, useState } from "react";
import {
  CalendarClock,
  FilePenLine,
  Hash,
  ImagePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { MediaKind, PostType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useExperience } from "@/components/experience-provider";
import { uploadFile } from "@/lib/upload-client";
import type { FeedPost } from "@/types/feed";

type MediaItem = { url: string; kind: MediaKind; name: string };

export function PostComposer({ onCreated }: { onCreated?: (post: FeedPost) => void }) {
  const { t } = useExperience();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"Post" | "Photo" | "Video" | "Reel" | "Poll">(
    "Post",
  );
  const [sending, setSending] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [scheduleAt, setScheduleAt] = useState("");
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

  async function publish(
    status: "PUBLISHED" | "DRAFT" | "SCHEDULED" = "PUBLISHED",
  ) {
    const filledPoll = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (kind === "Poll" && filledPoll.length < 2) {
      setHints(["Add at least two poll options."]);
      return;
    }
    if (!body.trim() && media.length === 0 && filledPoll.length < 2) return;

    setSending(true);
    setHints([]);

    if (status === "PUBLISHED" && body.trim()) {
      const [moderation, duplicate] = await Promise.all([
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "moderate", text: body }),
        }).then((r) => r.json()),
        fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "duplicate", text: body }),
        }).then((r) => r.json()),
      ]);
      if (moderation.spam?.spamLikely) {
        setSending(false);
        setHints([
          moderation.spam.assistance ||
            "This may look like spam. Please revise.",
        ]);
        return;
      }
      if (moderation.toxicity?.toxicLikely) {
        setSending(false);
        setHints([
          moderation.toxicity.assistance ||
            "This language looks harmful. Please revise.",
        ]);
        return;
      }
      if (duplicate.duplicateLikely) {
        setSending(false);
        setHints([
          duplicate.assistance ||
            "This looks like a duplicate of a recent post.",
        ]);
        return;
      }
    }

    let type: PostType = "TEXT";
    if (kind === "Poll") type = "POLL";
    else if (kind === "Reel") type = "SHORT";
    else if (kind === "Video") type = "VIDEO";
    else if (kind === "Photo" || media.some((m) => m.kind === "IMAGE" || m.kind === "GIF")) {
      type = media.some((m) => m.kind === "VIDEO") ? "VIDEO" : "IMAGE";
    } else if (media.some((m) => m.kind === "VIDEO")) {
      type = "VIDEO";
    }

    const payload: Record<string, unknown> = {
      body,
      type,
      status,
      media: media.map((m) => ({ url: m.url, kind: m.kind })),
    };
    if (kind === "Poll") {
      payload.poll = { options: filledPoll };
    }
    if (status === "SCHEDULED") {
      if (!scheduleAt) {
        setSending(false);
        setHints(["Pick a schedule time."]);
        return;
      }
      payload.scheduledAt = new Date(scheduleAt).toISOString();
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSending(false);
    if (response.ok) {
      setBody("");
      setHints([]);
      setMedia([]);
      setPollOptions(["", ""]);
      setScheduleAt("");
      if (status === "PUBLISHED") onCreated?.(data.post);
      else {
        setHints([
          status === "DRAFT"
            ? "Draft saved."
            : `Scheduled for ${new Date(scheduleAt).toLocaleString()}.`,
        ]);
      }
    } else {
      setHints([data.error || "Could not save post"]);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await publish(scheduleAt ? "SCHEDULED" : "PUBLISHED");
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
        ? "video/mp4,video/webm,image/*,image/gif"
        : kind === "Photo"
          ? "image/*,image/gif"
          : "image/*,image/gif,video/mp4,video/webm";

  return (
    <form
      onSubmit={submit}
      className="rounded-[1.75rem] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      <Tabs
        items={["Post", "Photo", "Video", "Reel", "Poll"]}
        value={kind}
        onChange={(value) => setKind(value as typeof kind)}
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          kind === "Poll"
            ? "Ask a question… use @mentions and #hashtags"
            : t("home", "composerPlaceholder")
        }
        className="min-h-28 border-0 bg-transparent px-2 text-lg text-[var(--ink)] shadow-none placeholder:text-[var(--placeholder)]"
        maxLength={10000}
        aria-label={t("home", "composerPlaceholder")}
      />
      {kind === "Poll" ? (
        <div className="mt-3 space-y-2 px-2">
          {pollOptions.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(e) =>
                  setPollOptions((prev) =>
                    prev.map((item, i) => (i === index ? e.target.value : item)),
                  )
                }
                placeholder={`Option ${index + 1}`}
                maxLength={80}
              />
              {pollOptions.length > 2 ? (
                <button
                  type="button"
                  className="rounded-xl border-2 border-[var(--mist-strong)] px-3 text-[var(--muted)]"
                  onClick={() =>
                    setPollOptions((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
          {pollOptions.length < 6 ? (
            <button
              type="button"
              className="text-sm text-[var(--signal-deep)] hover:underline"
              onClick={() => setPollOptions((prev) => [...prev, ""])}
            >
              Add option
            </button>
          ) : null}
        </div>
      ) : null}
      {hints.length ? (
        <ul className="mt-2 space-y-1 px-2 text-sm text-[var(--signal-deep)]">
          {hints.map((h) => (
            <li key={h}>
              <button
                type="button"
                className="text-start underline-offset-2 hover:underline"
                onClick={() => {
                  if (h === "Draft saved." || h.startsWith("Scheduled")) return;
                  setBody(h);
                }}
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
              className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--mist-strong)]"
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
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-[var(--mist-strong)] px-2 pt-3">
        <CalendarClock className="size-4 text-[var(--muted)]" />
        <Input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => setScheduleAt(e.target.value)}
          className="max-w-xs"
        />
        {scheduleAt ? (
          <button
            type="button"
            className="text-xs text-[var(--muted)] hover:underline"
            onClick={() => setScheduleAt("")}
          >
            Clear schedule
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--mist-strong)] pt-3">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-strong)]">
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
          {kind !== "Poll" ? (
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
                  ? "Add photos / GIFs"
                  : kind === "Reel" || kind === "Video"
                    ? "Add video"
                    : "Media / GIFs"}
            </button>
          ) : null}
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
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-[var(--mist)]"
            disabled={sending || uploading}
            onClick={() => void publish("DRAFT")}
          >
            <FilePenLine className="size-3.5" aria-hidden /> Draft
          </button>
        </div>
        <Button
          disabled={
            sending ||
            uploading ||
            (!body.trim() &&
              !media.length &&
              pollOptions.map((o) => o.trim()).filter(Boolean).length < 2)
          }
          type="submit"
        >
          <Send className="size-3.5" aria-hidden />
          {sending
            ? t("common", "loading")
            : scheduleAt
              ? "Schedule"
              : t("home", "compose")}
        </Button>
      </div>
    </form>
  );
}
