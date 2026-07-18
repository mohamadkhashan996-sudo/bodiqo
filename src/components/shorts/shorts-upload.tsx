"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, Plus, Upload } from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { extractHashtags } from "@/lib/post-text";
import { uploadFile } from "@/lib/upload-client";
import { captureVideoThumbnail, probeVideoFile } from "@/lib/video-thumbnail";

type CreatedShort = {
  id: string;
  body?: string;
  media?: Array<{ url: string; thumbUrl?: string | null }>;
  hashtags?: Array<{ tag: string } | string>;
  author?: {
    handle?: string;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
};

type PendingVideo = {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  durationSec: number;
  previewUrl: string;
};

const MAX_CAPTION = 2200;
const DEFAULT_MAX_DURATION_SEC = 600;

export function ShortsUpload({
  onCreated,
}: {
  onCreated?: (post: CreatedShort) => void;
}) {
  const { requireAuth } = useGuest();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<PendingVideo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxDurationSec, setMaxDurationSec] = useState(
    DEFAULT_MAX_DURATION_SEC,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const previewObjectUrl = useRef<string | null>(null);

  const tags = useMemo(() => extractHashtags(caption), [caption]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => {
        const sec = data?.videoLimits?.maxDurationSec;
        if (typeof sec === "number" && sec > 0) setMaxDurationSec(sec);
      })
      .catch(() => undefined);
  }, [open]);

  function resetPending() {
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
    }
    setPending(null);
  }

  function openUpload() {
    if (!requireAuth()) return;
    setOpen(true);
    setError(null);
  }

  async function pickFile(file: File) {
    if (!file.type.startsWith("video/") && !/\.(mp4|webm)$/i.test(file.name)) {
      setError("Choose an MP4 or WebM video");
      return;
    }
    setUploading(true);
    setError(null);
    setProgress("Reading video…");
    try {
      const probe = await probeVideoFile(file);
      previewObjectUrl.current = probe.objectUrl;

      if (probe.durationSec > maxDurationSec) {
        throw new Error(
          `Keep Shorts under ${maxDurationSec} seconds (yours is ${Math.ceil(probe.durationSec)}s)`,
        );
      }

      setProgress("Capturing thumbnail…");
      const thumbFile = await captureVideoThumbnail(
        probe.objectUrl,
        probe.durationSec,
      );

      setProgress("Uploading thumbnail…");
      const thumb = await uploadFile(thumbFile, { purpose: "short-thumb" });

      setProgress("Uploading video…");
      const video = await uploadFile(file, {
        purpose: "short",
        width: probe.width,
        height: probe.height,
        durationMs: Math.round(probe.durationSec * 1000),
        thumbUrl: thumb.url,
      });

      if (video.kind !== "VIDEO") {
        throw new Error("Upload a video file for Shorts");
      }

      setPending({
        url: video.url,
        thumbUrl: thumb.url,
        width: probe.width,
        height: probe.height,
        durationSec: probe.durationSec,
        previewUrl: probe.objectUrl,
      });
      setProgress(null);
    } catch (err) {
      resetPending();
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    if (!pending) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: caption.trim(),
          type: "SHORT",
          visibility: "PUBLIC",
          media: [
            {
              url: pending.url,
              kind: "VIDEO",
              thumbUrl: pending.thumbUrl,
              width: pending.width,
              height: pending.height,
              duration: pending.durationSec,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not publish short");
      }
      setOpen(false);
      setCaption("");
      resetPending();
      onCreated?.(data.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish short");
    } finally {
      setPublishing(false);
    }
  }

  function insertHashtag() {
    setCaption((prev) => {
      const next = prev.trimEnd();
      if (!next) return "#";
      return /\s$/.test(prev) ? `${prev}#` : `${next} #`;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openUpload}
        className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/25"
      >
        <Plus className="size-4" />
        Upload
      </button>

      <Modal
        open={open}
        onClose={() => {
          if (publishing || uploading) return;
          setOpen(false);
          setError(null);
          setProgress(null);
        }}
        title="Upload a Short"
      >
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,.mp4,.webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.currentTarget.value = "";
            }}
          />

          {pending ? (
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                src={pending.previewUrl}
                poster={pending.thumbUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-[46vh] w-full object-contain"
              />
              <p className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">
                {Math.round(pending.durationSec)}s · {pending.width}×
                {pending.height}
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-14 text-sm font-medium text-[var(--muted-strong)]"
            >
              <Upload className="size-6" />
              {uploading
                ? progress || "Uploading…"
                : "Choose MP4 / WebM (vertical works best)"}
            </button>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
                Caption & hashtags
              </label>
              <button
                type="button"
                onClick={insertHashtag}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--mist-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-strong)]"
              >
                <Hash className="size-3" />
                Tag
              </button>
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Say something… add #hashtags"
              maxLength={MAX_CAPTION}
              rows={3}
            />
            <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
              <span>
                {tags.length
                  ? tags.map((tag) => `#${tag}`).join(" ")
                  : "Hashtags are saved with the Short"}
              </span>
              <span>
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}

          <div className="flex gap-2">
            {pending ? (
              <Button
                type="button"
                variant="quiet"
                className="flex-1"
                disabled={uploading || publishing}
                onClick={() => {
                  resetPending();
                  fileRef.current?.click();
                }}
              >
                Replace
              </Button>
            ) : null}
            <Button
              type="button"
              className="flex-1"
              disabled={!pending || uploading || publishing}
              onClick={() => void publish()}
            >
              {publishing ? "Publishing…" : "Publish Short"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
