"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookmarkPlus, Eye, Flag, Plus, Trash2 } from "lucide-react";

import { useGuest } from "@/components/auth/guest-provider";
import { ReportDialog } from "@/components/social/report-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ACCEPT_BY_PURPOSE } from "@/lib/media-accept";
import { uploadFile } from "@/lib/upload-client";

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "😮", "👏", "😢"];

type Story = {
  id: string;
  mediaUrl: string;
  mediaKind?: string;
  textOverlay?: string | null;
  viewCount?: number;
  author?: {
    id?: string;
    handle?: string | null;
    image?: string | null;
    displayName?: string | null;
    name?: string | null;
  };
  views?: Array<{ id: string }>;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
};

type Viewer = {
  id: string;
  handle?: string | null;
  displayName?: string | null;
  name?: string | null;
  image?: string | null;
  viewedAt: string;
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
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [highlightBusy, setHighlightBusy] = useState(false);
  const [highlightDone, setHighlightDone] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwner =
    Boolean(active?.author?.id) && active?.author?.id === session?.user?.id;

  async function load() {
    const d = await fetch("/api/stories").then((r) => r.json());
    setStories(d.stories ?? []);
  }

  useEffect(() => {
    void load().catch(() => {});
  }, []);

  async function openStory(story: Story) {
    setActive(story);
    setViewers([]);
    setViewersOpen(false);
    setHighlightDone(false);
    if (session?.user) {
      void fetch(`/api/stories/${story.id}/view`, { method: "POST" }).catch(
        () => {},
      );
      setStories((prev) =>
        prev.map((s) =>
          s.id === story.id
            ? { ...s, views: s.views?.length ? s.views : [{ id: "local" }] }
            : s,
        ),
      );
    }
  }

  async function react(emoji: string) {
    if (!active || !requireAuth()) return;
    const res = await fetch(`/api/stories/${active.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const nextCounts = { ...(active.reactionCounts ?? {}) };
    if (active.myReaction && nextCounts[active.myReaction]) {
      const previous = nextCounts[active.myReaction] ?? 0;
      nextCounts[active.myReaction] = Math.max(0, previous - 1);
      if (!nextCounts[active.myReaction]) delete nextCounts[active.myReaction];
    }
    nextCounts[emoji] = (nextCounts[emoji] ?? 0) + 1;
    const updated = {
      ...active,
      myReaction: emoji,
      reactionCounts: nextCounts,
    };
    setActive(updated);
    setStories((prev) => prev.map((s) => (s.id === active.id ? updated : s)));
  }

  async function loadViewers() {
    if (!active || !isOwner) return;
    const d = await fetch(`/api/stories/${active.id}/viewers`).then((r) =>
      r.json(),
    );
    setViewers(d.viewers ?? []);
    setViewersOpen(true);
    if (typeof d.viewCount === "number") {
      setActive((prev) => (prev ? { ...prev, viewCount: d.viewCount } : prev));
    }
  }

  async function addToHighlight() {
    if (!active || !isOwner) return;
    setHighlightBusy(true);
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: active.id }),
      });
      if (res.ok) setHighlightDone(true);
    } finally {
      setHighlightBusy(false);
    }
  }

  async function deleteStory() {
    if (!active || !isOwner || !requireAuth()) return;
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/stories/${active.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not delete story");
        return;
      }
      const removedId = active.id;
      setActive(null);
      setStories((prev) => prev.filter((s) => s.id !== removedId));
    } finally {
      setDeleteBusy(false);
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
      <div className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => {
            if (!requireAuth()) return;
            setComposeOpen(true);
          }}
          className="w-16 shrink-0 touch-manipulation snap-start text-center"
        >
          <span className="grid size-[3.75rem] place-items-center rounded-[1.25rem] border-2 border-dashed border-[var(--mist-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <Plus className="size-5 text-[var(--signal-deep)]" />
          </span>
          <span className="mt-1 block truncate text-[10px] font-semibold text-[var(--muted-strong)]">
            Your story
          </span>
        </button>
        {stories.map((story) => {
          const seen = Boolean(story.views?.length);
          return (
            <motion.button
              whileHover={{ y: -3 }}
              key={story.id}
              type="button"
              onClick={() => void openStory(story)}
              className="w-16 shrink-0 touch-manipulation snap-start text-center"
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
        onClose={() => {
          setActive(null);
          setViewersOpen(false);
        }}
        title={active?.author?.displayName ?? active?.author?.handle ?? "Story"}
      >
        {active?.mediaKind === "VIDEO" ? (
          <video
            src={active.mediaUrl}
            controls
            autoPlay
            className="w-full rounded-2xl"
          />
        ) : active?.mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.mediaUrl} alt="" className="w-full rounded-2xl" />
        ) : null}
        {active?.textOverlay ? (
          <p className="mt-3 text-sm">{active.textOverlay}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {REACTION_EMOJIS.map((emoji) => {
            const count = active?.reactionCounts?.[emoji] ?? 0;
            const mine = active?.myReaction === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => void react(emoji)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition ${
                  mine
                    ? "bg-[var(--signal)] text-white"
                    : "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)] hover:bg-[var(--cloud-elevated)]"
                }`}
              >
                <span>{emoji}</span>
                {count > 0 ? (
                  <span className="text-xs opacity-80">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {isOwner ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadViewers()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ink)]"
            >
              <Eye className="size-4" />
              {active?.viewCount ?? 0} views
            </button>
            <button
              type="button"
              disabled={highlightBusy || highlightDone}
              onClick={() => void addToHighlight()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-deep)] disabled:opacity-60"
            >
              <BookmarkPlus className="size-4" />
              {highlightDone
                ? "Saved to highlights"
                : highlightBusy
                  ? "Saving…"
                  : "Add to highlight"}
            </button>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void deleteStory()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--ember)] disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              {deleteBusy ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : active ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                if (!requireAuth()) return;
                setReportOpen(true);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--ember)]"
            >
              <Flag className="size-4" />
              Report story
            </button>
          </div>
        ) : null}

        {viewersOpen ? (
          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-[var(--cloud-elevated)] p-3">
            {viewers.length ? (
              viewers.map((viewer) => (
                <Link
                  key={viewer.id}
                  href={`/u/${viewer.handle}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--surface)]"
                  onClick={() => setActive(null)}
                >
                  <Avatar
                    src={viewer.image}
                    name={viewer.displayName ?? viewer.name}
                    className="size-8"
                  />
                  <span className="text-sm font-medium">
                    {viewer.displayName ?? viewer.handle}
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-[var(--muted)]">
                No viewers yet
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="STORY"
        targetId={active?.id ?? ""}
        title="Report story"
      />

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
            accept={ACCEPT_BY_PURPOSE.story}
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
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
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
