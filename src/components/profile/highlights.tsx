"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type HighlightItem = {
  id: string;
  mediaUrl: string;
  mediaKind: string;
  textOverlay?: string | null;
};

type Highlight = {
  id: string;
  title: string;
  coverUrl?: string | null;
  items: HighlightItem[];
};

export function ProfileHighlights({
  handle,
  isOwner,
}: {
  handle: string;
  isOwner: boolean;
}) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [locked, setLocked] = useState(false);
  const [active, setActive] = useState<Highlight | null>(null);
  const [itemIndex, setItemIndex] = useState(0);

  async function load() {
    const d = await fetch(`/api/highlights?handle=${encodeURIComponent(handle)}`).then(
      (r) => r.json(),
    );
    setLocked(Boolean(d.locked));
    setHighlights(d.highlights ?? []);
  }

  useEffect(() => {
    void load().catch(() => setHighlights([]));
  }, [handle]);

  async function removeHighlight(id: string) {
    const res = await fetch(`/api/highlights?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setActive(null);
    await load();
  }

  if (locked || (!highlights.length && !isOwner)) return null;

  const current = active?.items[itemIndex];

  return (
    <>
      <div className="mt-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Highlights
        </p>
        {highlights.length ? (
          <div className="flex gap-4 overflow-x-auto pb-1">
            {highlights.map((highlight) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => {
                  setActive(highlight);
                  setItemIndex(0);
                }}
                className="w-16 shrink-0 text-center"
              >
                <span className="block overflow-hidden rounded-[1.25rem] border-2 border-[var(--mist-strong)] bg-[var(--surface)]">
                  {highlight.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={highlight.coverUrl}
                      alt=""
                      className="size-14 object-cover"
                    />
                  ) : (
                    <span className="grid size-14 place-items-center text-xs text-[var(--muted)]">
                      ···
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-[10px] font-semibold text-[var(--muted-strong)]">
                  {highlight.title}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Save stories to highlights so they stay on your profile.
          </p>
        )}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.title ?? "Highlight"}
      >
        {current ? (
          <>
            {current.mediaKind === "VIDEO" ? (
              <video
                src={current.mediaUrl}
                controls
                autoPlay
                className="w-full rounded-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.mediaUrl}
                alt=""
                className="w-full rounded-2xl"
              />
            )}
            {current.textOverlay ? (
              <p className="mt-3 text-sm">{current.textOverlay}</p>
            ) : null}
            {(active?.items.length ?? 0) > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="quiet"
                  disabled={itemIndex <= 0}
                  onClick={() => setItemIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-[var(--muted)]">
                  {itemIndex + 1} / {active?.items.length}
                </span>
                <Button
                  type="button"
                  variant="quiet"
                  disabled={itemIndex >= (active?.items.length ?? 1) - 1}
                  onClick={() =>
                    setItemIndex((i) =>
                      Math.min((active?.items.length ?? 1) - 1, i + 1),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">No items in this highlight.</p>
        )}

        {isOwner && active ? (
          <button
            type="button"
            onClick={() => void removeHighlight(active.id)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--danger)]"
          >
            <Trash2 className="size-4" />
            Delete highlight
          </button>
        ) : null}
      </Modal>
    </>
  );
}
