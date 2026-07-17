"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuest } from "@/components/auth/guest-provider";
import { uploadFile } from "@/lib/upload-client";

type Story = {
  id: string;
  mediaUrl: string;
  mediaKind?: string;
  textOverlay?: string | null;
  author?: {
    id?: string;
    handle?: string | null;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
  views?: Array<{ id: string }>;
};

export function StoriesRail() {
  const { data: session } = useSession();
  const { requireAuth } = useGuest();
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<Story | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [overlay, setOverlay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingKind, setPendingKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const d = await fetch("/api/stories").then((r) => r.json());
    setStories(d.stories ?? []);
  }

  useEffect(() => {
    void load().catch(() => {});
  }, []);

  async function openStory(story: Story) {
    setActive(story);
    if (session?.user) {
      void fetch(`/api/stories/${story.id}/view`, { method: "POST" }).catch(() => {});
    }
  }

  async function pickFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      setPendingUrl(result.url);
      setPendingKind(result.kind === "VIDEO" ? "VIDEO" : "IMAGE");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function publish() {
    if (!pendingUrl) return;
    setUploading(true);
    setError(null);
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaUrl: pendingUrl,
        mediaKind: pendingKind,
        textOverlay: overlay.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Could not publish story");
      return;
    }
    setComposeOpen(false);
    setPendingUrl(null);
    setOverlay("");
    await load();
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => {
            if (!requireAuth()) return;
            setComposeOpen(true);
          }}
          className="w-16 shrink-0 text-center"
        >
          <span className="grid size-[3.75rem] place-items-center rounded-[1.25rem] border-2 border-dashed border-[var(--mist-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <Plus className="size-5 text-[var(--signal-deep)]" />
          </span>
          <span className="mt-1 block truncate text-[10px] font-semibold text-[var(--muted-strong)]">Your story</span>
        </button>
        {stories.map((story) => {
          const seen = Boolean(story.views?.length);
          return (
            <motion.button
              whileHover={{ y: -3 }}
              key={story.id}
              type="button"
              onClick={() => void openStory(story)}
              className="w-16 shrink-0 text-center"
            >
              <span
                className={`block rounded-[1.25rem] p-0.5 ${
                  seen
                    ? "bg-[var(--mist)]"
                    : "bg-gradient-to-br from-[var(--signal)] to-[var(--ember)]"
                }`}
              >
                <Avatar
                  src={story.author?.image}
                  name={story.author?.displayName ?? story.author?.name}
                  className="size-14 rounded-[1.1rem] border-2 border-[var(--cloud)]"
                />
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold text-[var(--muted-strong)]">
                {story.author?.handle ?? "Story"}
              </span>
            </motion.button>
          );
        })}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.author?.displayName ?? active?.author?.handle ?? "Story"}
      >
        {active?.mediaKind === "VIDEO" ? (
          <video src={active.mediaUrl} controls autoPlay className="w-full rounded-2xl" />
        ) : active?.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.mediaUrl} alt="" className="w-full rounded-2xl" />
        ) : null}
        {active?.textOverlay ? <p className="mt-3 text-sm">{active.textOverlay}</p> : null}
      </Modal>

      <Modal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setPendingUrl(null);
          setError(null);
        }}
        title="Add to your story"
      >
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.currentTarget.value = "";
            }}
          />
          {pendingUrl ? (
            pendingKind === "VIDEO" ? (
              <video src={pendingUrl} controls className="w-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pendingUrl} alt="" className="w-full rounded-2xl" />
            )
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--mist-strong)] bg-[var(--cloud-elevated)] px-4 py-10 text-sm font-medium text-[var(--muted-strong)] shadow-[var(--shadow-sm)]"
            >
              <Plus className="size-6" />
              {uploading ? "Uploading…" : "Choose photo or video"}
            </button>
          )}
          <Input
            value={overlay}
            onChange={(e) => setOverlay(e.target.value)}
            placeholder="Optional caption"
            maxLength={500}
          />
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button
            type="button"
            className="w-full"
            disabled={!pendingUrl || uploading}
            onClick={() => void publish()}
          >
            {uploading ? "Publishing…" : "Share story"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
