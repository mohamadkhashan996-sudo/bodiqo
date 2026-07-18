"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  FilePenLine,
  Hash,
  ImagePlus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { FormEvent } from "react";

import { useExperience } from "@/components/experience-provider";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { compressImageFile, revokePreviewUrl } from "@/lib/image-compress";
import { ACCEPT_BY_PURPOSE } from "@/lib/media-accept";
import { uploadFile } from "@/lib/upload-client";
import { captureVideoThumbnail, probeVideoFile } from "@/lib/video-thumbnail";
import type { FeedPost, MediaKindName, PostTypeName } from "@/types/feed";

type MediaItem = {
  url: string;
  kind: MediaKindName;
  name: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  previewUrl?: string;
};

export function PostComposer({
  onCreated,
}: {
  onCreated?: (post: FeedPost) => void;
}) {
  const { t } = useExperience();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<
    "Post" | "Photo" | "Video" | "Reel" | "Poll"
  >("Post");
  const [sending, setSending] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [visibility, setVisibility] = useState<
    "PUBLIC" | "FOLLOWERS" | "PRIVATE"
  >("PUBLIC");
  const [locationName, setLocationName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadAbort = useRef<AbortController | null>(null);

  async function onPickFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10 - media.length);
    if (!list.length) return;
    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    setUploading(true);
    setUploadProgress(0);
    setHints([]);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of list) {
        if (controller.signal.aborted) break;
        const isVideo =
          file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
        if (isVideo) {
          const probe = await probeVideoFile(file);
          try {
            const thumbFile = await captureVideoThumbnail(
              probe.objectUrl,
              probe.durationSec,
            );
            const thumb = await uploadFile(thumbFile, {
              purpose: kind === "Reel" ? "short-thumb" : "video-thumb",
              signal: controller.signal,
              onProgress: (p) => setUploadProgress(Math.round(p * 0.2)),
            });
            const data = await uploadFile(file, {
              purpose: kind === "Reel" ? "short" : "video",
              width: probe.width,
              height: probe.height,
              durationMs: Math.round(probe.durationSec * 1000),
              thumbUrl: thumb.url,
              signal: controller.signal,
              onProgress: (p) =>
                setUploadProgress(20 + Math.round(p * 0.8)),
            });
            uploaded.push({
              url: data.url,
              kind: data.kind as MediaKindName,
              name: file.name,
              thumbUrl: thumb.url,
              width: probe.width,
              height: probe.height,
              duration: probe.durationSec,
              previewUrl: probe.objectUrl,
            });
          } catch (error) {
            URL.revokeObjectURL(probe.objectUrl);
            throw error;
          }
        } else {
          const compressed = await compressImageFile(file);
          try {
            const data = await uploadFile(compressed.file, {
              purpose: "image",
              width: compressed.width || undefined,
              height: compressed.height || undefined,
              signal: controller.signal,
              onProgress: setUploadProgress,
            });
            uploaded.push({
              url: data.url,
              kind: data.kind as MediaKindName,
              name: file.name,
              width: compressed.width || undefined,
              height: compressed.height || undefined,
              previewUrl: compressed.previewUrl,
            });
          } catch (error) {
            revokePreviewUrl(compressed.previewUrl);
            throw error;
          }
        }
      }
      setMedia((prev) => [...prev, ...uploaded].slice(0, 10));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setHints(["Upload cancelled"]);
      } else {
        setHints([error instanceof Error ? error.message : "Upload failed"]);
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      uploadAbort.current = null;
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

    let type: PostTypeName = "TEXT";
    if (kind === "Poll") type = "POLL";
    else if (kind === "Reel") type = "SHORT";
    else if (kind === "Video") type = "VIDEO";
    else if (
      kind === "Photo" ||
      media.some((m) => m.kind === "IMAGE" || m.kind === "GIF")
    ) {
      type = media.some((m) => m.kind === "VIDEO") ? "VIDEO" : "IMAGE";
    } else if (media.some((m) => m.kind === "VIDEO")) {
      type = "VIDEO";
    }

    const payload: Record<string, unknown> = {
      body,
      type,
      status,
      visibility,
      media: media.map((m) => ({
        url: m.url,
        kind: m.kind,
        thumbUrl: m.thumbUrl,
        width: m.width,
        height: m.height,
        duration: m.duration,
      })),
    };
    if (locationName.trim()) {
      payload.locationName = locationName.trim();
    }
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
      setLocationName("");
      setVisibility("PUBLIC");
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
      ? ACCEPT_BY_PURPOSE.short
      : kind === "Video"
        ? ACCEPT_BY_PURPOSE.post
        : kind === "Photo"
          ? ACCEPT_BY_PURPOSE.image
          : ACCEPT_BY_PURPOSE.post;

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
                    prev.map((item, i) =>
                      i === index ? e.target.value : item,
                    ),
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
          {media.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--mist-strong)]"
            >
              {item.kind === "VIDEO" ? (
                <video
                  src={item.url}
                  className="size-full object-cover"
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl || item.url}
                  alt=""
                  className="size-full object-cover"
                />
              )}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-[var(--ink)]/80 text-white"
                onClick={() => {
                  revokePreviewUrl(item.previewUrl);
                  setMedia((prev) => prev.filter((m) => m.url !== item.url));
                }}
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
        <label className="text-xs text-[var(--muted)]">Visibility</label>
        <select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as typeof visibility)
          }
          className="rounded-xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm"
          aria-label="Post visibility"
        >
          <option value="PUBLIC">Public</option>
          <option value="FOLLOWERS">Followers</option>
          <option value="PRIVATE">Only me</option>
        </select>
        <Input
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="Location (optional)"
          className="max-w-xs"
          maxLength={120}
        />
      </div>
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
        <Link
          href="/studio/posts"
          className="ms-auto text-xs font-semibold text-[var(--signal-deep)] hover:underline"
        >
          Drafts & scheduled
        </Link>
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
                ? uploadProgress != null
                  ? `Uploading ${uploadProgress}%`
                  : "Uploading…"
                : kind === "Photo"
                  ? "Add photos / GIFs"
                  : kind === "Reel" || kind === "Video"
                    ? "Add video"
                    : "Media / GIFs"}
            </button>
          ) : null}
          {uploading ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[var(--danger)] hover:bg-[var(--mist)]"
              onClick={() => uploadAbort.current?.abort()}
            >
              Cancel upload
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
