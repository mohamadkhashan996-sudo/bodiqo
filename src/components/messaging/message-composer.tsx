"use client";

import { FormEvent, useRef, useState } from "react";
import {
  FileUp,
  ImagePlus,
  Mic,
  Pause,
  Play,
  Send,
  Square,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/upload-client";

type PendingMedia = {
  url: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  name: string;
};

export function MessageComposer({
  onSend,
  onTyping,
  reply,
  onCancelReply,
}: {
  onSend: (payload: {
    body: string;
    type: string;
    mediaUrl?: string;
  }) => Promise<void>;
  onTyping: (typing: boolean) => void;
  reply?: string;
  onCancelReply: () => void;
}) {
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<PendingMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function attach(file: File, kind: PendingMedia["kind"]) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setMedia({ url: result.url, kind, name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function record() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const next = new MediaRecorder(stream);
      chunks.current = [];
      next.ondataavailable = (event) => chunks.current.push(event.data);
      next.onstop = () => {
        void (async () => {
          const audio = new Blob(chunks.current, { type: next.mimeType || "audio/webm" });
          stream.getTracks().forEach((track) => track.stop());
          if (!audio.size) return;
          setUploading(true);
          try {
            const file = new File([audio], `voice-${Date.now()}.webm`, {
              type: audio.type,
            });
            const result = await uploadFile(file);
            await onSend({
              body: "Voice note",
              type: "AUDIO",
              mediaUrl: result.url,
            });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Voice upload failed");
          } finally {
            setUploading(false);
          }
        })();
      };
      next.start();
      recorder.current = next;
      setRecording(true);
    } catch {
      setError("Microphone permission is required for voice notes.");
    }
  }

  function stop() {
    recorder.current?.stop();
    setRecording(false);
    setPaused(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && !media) return;
    const type = media?.kind ?? "TEXT";
    await onSend({
      body: body.trim() || (media ? media.name : ""),
      type,
      mediaUrl: media?.url,
    });
    setBody("");
    setMedia(null);
    onTyping(false);
  }

  return (
    <form
      onSubmit={submit}
      className="border-t border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] bg-[var(--glass)] p-3 backdrop-blur-xl md:p-4"
    >
      <div className="mx-auto max-w-4xl">
        {reply ? (
          <div className="surface-subtle mb-2 flex items-center justify-between rounded-[var(--radius-lg)] px-3 py-2 text-xs text-[var(--muted)]">
            <span className="truncate">Replying to: {reply}</span>
            <button
              type="button"
              onClick={onCancelReply}
              className="font-semibold text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {media ? (
          <div className="surface-subtle mb-2 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-sm">
            <span className="truncate text-[var(--muted)]">
              {media.kind}: {media.name}
            </span>
            <button type="button" onClick={() => setMedia(null)} className="icon-button size-8">
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>
        ) : null}

        <div className="surface-panel flex items-end gap-2 rounded-[var(--radius-xl)] p-2 shadow-[var(--shadow-sm)]">
          <button
            type="button"
            disabled={uploading}
            onClick={() => imageRef.current?.click()}
            className="icon-button size-10 shrink-0"
            aria-label="Attach image"
          >
            <ImagePlus className="size-5" />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => videoRef.current?.click()}
            className="icon-button size-10 shrink-0"
            aria-label="Attach video"
          >
            <Video className="size-5" />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="icon-button size-10 shrink-0"
            aria-label="Attach file"
          >
            <FileUp className="size-5" />
          </button>

          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file, "IMAGE");
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file, "VIDEO");
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file, "FILE");
              e.currentTarget.value = "";
            }}
          />

          <div className="flex-1 rounded-[var(--radius-lg)] px-2 py-1">
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                onTyping(Boolean(event.target.value));
              }}
              placeholder={uploading ? "Uploading…" : "Share a thought…"}
              rows={1}
              className="max-h-28 w-full resize-none bg-transparent text-sm leading-6 outline-none"
            />
          </div>

          {recording ? (
            <div className="flex items-center gap-1 rounded-full bg-[var(--signal)] px-2 py-2 text-white">
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className="w-0.5 animate-pulse bg-white"
                  style={{ height: `${8 + (index % 3) * 5}px` }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  if (paused) recorder.current?.resume();
                  else recorder.current?.pause();
                  setPaused(!paused);
                }}
                className="p-1"
              >
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              <button type="button" onClick={stop} className="p-1">
                <Square className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void record()}
              className="icon-button size-10 shrink-0"
              aria-label="Record voice note"
            >
              <Mic className="size-5" />
            </button>
          )}
          <Button type="submit" disabled={uploading} className="min-h-10 px-3">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
