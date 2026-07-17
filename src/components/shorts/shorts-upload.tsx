"use client";

import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useGuest } from "@/components/auth/guest-provider";
import { uploadFile } from "@/lib/upload-client";

type CreatedShort = {
  id: string;
  body?: string;
  media?: Array<{ url: string }>;
};

export function ShortsUpload({
  onCreated,
}: {
  onCreated?: (post: CreatedShort) => void;
}) {
  const { requireAuth } = useGuest();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function openUpload() {
    if (!requireAuth()) return;
    setOpen(true);
    setError(null);
  }

  async function pickFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setError("Choose an MP4 or WebM video");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      if (result.kind !== "VIDEO") {
        setError("Upload a video file for Shorts");
        return;
      }
      setPendingUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    if (!pendingUrl) return;
    setPublishing(true);
    setError(null);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: caption.trim(),
        type: "SHORT",
        media: [{ url: pendingUrl, kind: "VIDEO" }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPublishing(false);
    if (!res.ok) {
      setError(data.error || "Could not publish short");
      return;
    }
    setOpen(false);
    setCaption("");
    setPendingUrl(null);
    onCreated?.(data.post);
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
          if (publishing) return;
          setOpen(false);
          setError(null);
        }}
        title="Upload a Short"
      >
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.currentTarget.value = "";
            }}
          />
          {pendingUrl ? (
            <video
              src={pendingUrl}
              controls
              playsInline
              className="aspect-[9/16] max-h-[50vh] w-full rounded-2xl bg-black object-contain"
            />
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-14 text-sm font-medium text-[var(--muted-strong)]"
            >
              <Upload className="size-6" />
              {uploading ? "Uploading…" : "Choose vertical video"}
            </button>
          )}
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            maxLength={2000}
            rows={3}
          />
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
          <div className="flex gap-2">
            {pendingUrl ? (
              <Button
                type="button"
                variant="quiet"
                className="flex-1"
                disabled={uploading || publishing}
                onClick={() => {
                  setPendingUrl(null);
                  fileRef.current?.click();
                }}
              >
                Replace
              </Button>
            ) : null}
            <Button
              type="button"
              className="flex-1"
              disabled={!pendingUrl || uploading || publishing}
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
