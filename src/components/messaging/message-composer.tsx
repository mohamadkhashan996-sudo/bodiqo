"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileUp,
  ImagePlus,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Send,
  Square,
  Video,
  X,
} from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ACCEPT_BY_PURPOSE } from "@/lib/media-accept";
import { uploadFile } from "@/lib/upload-client";

type PendingMedia = {
  url: string;
  kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  name: string;
};

const TYPING_IDLE_MS = 1800;

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
  const [attachOpen, setAttachOpen] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActive = useRef(false);

  function setTyping(active: boolean) {
    if (typingActive.current === active) return;
    typingActive.current = active;
    onTyping(active);
  }

  function bumpTyping() {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingActive.current) onTyping(false);
    };
  }, [onTyping]);

  async function attach(file: File, kind: PendingMedia["kind"]) {
    setUploading(true);
    setError(null);
    setAttachOpen(false);
    try {
      const result = await uploadFile(file, { private: true });
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
          const audio = new Blob(chunks.current, {
            type: next.mimeType || "audio/webm",
          });
          stream.getTracks().forEach((track) => track.stop());
          if (!audio.size) return;
          setUploading(true);
          try {
            const file = new File([audio], `voice-${Date.now()}.webm`, {
              type: audio.type,
            });
            const result = await uploadFile(file, { private: true });
            await onSend({
              body: "Voice note",
              type: "AUDIO",
              mediaUrl: result.url,
            });
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Voice upload failed",
            );
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
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setTyping(false);
  }

  return (
    <form
      onSubmit={submit}
      className="border-t-2 border-[var(--mist-strong)] bg-[var(--surface)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-3 md:p-4"
    >
      <div className="mx-auto max-w-4xl">
        {reply ? (
          <div className="surface-subtle mb-2 flex items-center justify-between rounded-[var(--radius-lg)] px-3 py-2 text-xs text-[var(--muted)]">
            <span className="truncate">Replying to: {reply}</span>
            <button
              type="button"
              onClick={onCancelReply}
              className="min-h-10 shrink-0 touch-manipulation px-2 font-semibold text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {media ? (
          <div className="surface-subtle mb-2 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              {media.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.url}
                  alt=""
                  className="size-12 shrink-0 rounded-[0.75rem] object-cover"
                />
              ) : media.kind === "VIDEO" ? (
                <video
                  src={media.url}
                  className="size-12 shrink-0 rounded-[0.75rem] object-cover"
                  muted
                />
              ) : null}
              <span className="truncate text-[var(--muted)]">
                {media.kind === "IMAGE"
                  ? "Photo ready to send"
                  : media.kind === "VIDEO"
                    ? "Video ready to send"
                    : `${media.kind}: ${media.name}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMedia(null)}
              className="icon-button size-10 touch-manipulation"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mb-2 text-xs text-[var(--danger)]">{error}</p>
        ) : null}

        {attachOpen ? (
          <div className="mb-2 flex gap-2 sm:hidden">
            <button
              type="button"
              disabled={uploading}
              onClick={() => imageRef.current?.click()}
              className="icon-button size-11 flex-1 touch-manipulation"
              aria-label="Attach image"
            >
              <ImagePlus className="size-5" />
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => videoRef.current?.click()}
              className="icon-button size-11 flex-1 touch-manipulation"
              aria-label="Attach video"
            >
              <Video className="size-5" />
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="icon-button size-11 flex-1 touch-manipulation"
              aria-label="Attach file"
            >
              <FileUp className="size-5" />
            </button>
          </div>
        ) : null}

        <div className="surface-panel flex items-end gap-1.5 rounded-[var(--radius-xl)] p-1.5 shadow-[var(--shadow-sm)] sm:gap-2 sm:p-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => setAttachOpen((v) => !v)}
            className="icon-button size-11 shrink-0 touch-manipulation sm:hidden"
            aria-label="More attachments"
            aria-expanded={attachOpen}
          >
            <MoreHorizontal className="size-5" />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => imageRef.current?.click()}
            className="icon-button hidden size-10 shrink-0 sm:inline-flex"
            aria-label="Attach image"
          >
            <ImagePlus className="size-5" />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => videoRef.current?.click()}
            className="icon-button hidden size-10 shrink-0 sm:inline-flex"
            aria-label="Attach video"
          >
            <Video className="size-5" />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="icon-button hidden size-10 shrink-0 sm:inline-flex"
            aria-label="Attach file"
          >
            <FileUp className="size-5" />
          </button>

          <input
            ref={imageRef}
            type="file"
            accept={ACCEPT_BY_PURPOSE.image}
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
            accept={ACCEPT_BY_PURPOSE.video}
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
            accept={ACCEPT_BY_PURPOSE.document}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file, "FILE");
              e.currentTarget.value = "";
            }}
          />

          <div className="min-w-0 flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-3 py-2 shadow-[var(--shadow-sm)]">
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                if (event.target.value) bumpTyping();
                else setTyping(false);
              }}
              placeholder={uploading ? "Uploading…" : "Share a thought…"}
              rows={1}
              className="max-h-28 w-full resize-none bg-transparent text-base leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--placeholder)] sm:text-sm"
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
                className="min-h-10 min-w-10 touch-manipulation p-1"
              >
                {paused ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={stop}
                className="min-h-10 min-w-10 touch-manipulation p-1"
              >
                <Square className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void record()}
              className="icon-button size-11 shrink-0 touch-manipulation sm:size-10"
              aria-label="Record voice note"
            >
              <Mic className="size-5" />
            </button>
          )}
          <Button
            type="submit"
            disabled={uploading}
            className="min-h-11 min-w-11 touch-manipulation px-3 sm:min-h-10"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
