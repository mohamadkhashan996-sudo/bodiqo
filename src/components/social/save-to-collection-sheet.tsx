"use client";

import { useEffect, useState } from "react";
import { Check, FolderPlus, Lock, Globe2 } from "lucide-react";

import { Modal } from "@/components/ui/modal";

export type BookmarkCollection = {
  id: string;
  name: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC";
  itemCount: number;
};

export function SaveToCollectionSheet({
  open,
  onClose,
  postId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  onSaved?: () => void;
}) {
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setLoading(true);
    void fetch("/api/bookmarks/collections")
      .then((r) => r.json())
      .then((data) => setCollections(data.collections ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  async function saveOnly() {
    setBusyId("all");
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.error || "Could not save");
        return;
      }
      try {
        const bc = new BroadcastChannel("relune:bookmarks");
        bc.postMessage({ postId, bookmarked: true });
        bc.close();
      } catch {
        // ignore
      }
      onSaved?.();
      setStatus("Saved");
      window.setTimeout(() => onClose(), 700);
    } finally {
      setBusyId(null);
    }
  }

  async function saveTo(collectionId: string) {
    setBusyId(collectionId);
    try {
      const res = await fetch(
        `/api/bookmarks/collections/${collectionId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.error || "Could not add to collection");
        return;
      }
      try {
        const bc = new BroadcastChannel("relune:bookmarks");
        bc.postMessage({ postId, bookmarked: true });
        bc.close();
      } catch {
        // ignore
      }
      onSaved?.();
      setStatus("Saved to collection");
      window.setTimeout(() => onClose(), 700);
    } finally {
      setBusyId(null);
    }
  }

  async function createAndSave() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bookmarks/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, visibility: "PRIVATE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "Could not create collection");
        return;
      }
      const collection = data.collection as BookmarkCollection;
      setCollections((old) => [collection, ...old]);
      setName("");
      await saveTo(collection.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Save to">
      <p className="text-sm text-[var(--muted-strong)]">
        Keep it in your library, or organize into a private or public
        collection.
      </p>

      <button
        type="button"
        disabled={busyId !== null}
        onClick={() => void saveOnly()}
        className="mt-4 flex w-full items-center justify-between rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] px-3 py-3 text-left hover:bg-[var(--mist)]/40 disabled:opacity-60"
      >
        <span className="text-sm font-semibold text-[var(--ink)]">
          Saved (all)
        </span>
        {busyId === "all" ? (
          <span className="text-xs text-[var(--muted)]">…</span>
        ) : (
          <Check className="size-4 text-[var(--signal-deep)]" />
        )}
      </button>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
          Collections
        </p>
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : null}
        {!loading && !collections.length ? (
          <p className="text-sm text-[var(--muted)]">
            No collections yet — create one below.
          </p>
        ) : null}
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {collections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void saveTo(c.id)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] px-3 py-2.5 text-left hover:bg-[var(--mist)]/40 disabled:opacity-60"
              >
                <span className="grid size-9 place-items-center rounded-full bg-[var(--signal-soft)] text-[var(--signal-deep)]">
                  {c.visibility === "PUBLIC" ? (
                    <Globe2 className="size-4" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {c.itemCount} item{c.itemCount === 1 ? "" : "s"} ·{" "}
                    {c.visibility === "PUBLIC" ? "Public" : "Private"}
                  </span>
                </span>
                {busyId === c.id ? (
                  <span className="text-xs text-[var(--muted)]">…</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="New collection name"
          className="min-h-11 flex-1 rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 text-sm"
        />
        <button
          type="button"
          disabled={!name.trim() || creating}
          onClick={() => void createAndSave()}
          className="icon-button min-h-11 gap-1.5 px-3 text-sm disabled:opacity-60"
        >
          <FolderPlus className="size-4" />
          Create
        </button>
      </div>

      {status ? (
        <p className="mt-3 text-center text-xs font-semibold text-[var(--signal-deep)]">
          {status}
        </p>
      ) : null}
    </Modal>
  );
}
