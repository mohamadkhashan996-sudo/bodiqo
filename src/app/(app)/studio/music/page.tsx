"use client";

import { useEffect, useState } from "react";

import {
  StudioPanel,
  StudioShell,
} from "@/components/studio/studio-shell";
import { Skeleton, StateBanner } from "@/components/ui/card";

type Track = {
  id: string;
  title: string;
  artist: string;
  durationSec: number;
  genre: string;
  license: string;
};

export default function StudioMusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/studio/music")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setTracks(json.tracks ?? []);
        setNote(json.note ?? "");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudioShell
      title="Music library"
      subtitle="Starter royalty-free catalog for Relune creators."
    >
      {loading ? <Skeleton className="h-32 rounded-[var(--radius-2xl)]" /> : null}
      {error ? <StateBanner tone="error">{error}</StateBanner> : null}
      {!loading && !error ? (
        <>
          {note ? (
            <p className="mb-4 text-sm text-[var(--muted)]">{note}</p>
          ) : null}
          <StudioPanel title={`${tracks.length} tracks`}>
            <ul className="space-y-3">
              {tracks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--mist-strong)] p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-[var(--muted)]">
                      {t.artist} · {t.genre}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t.license}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {Math.floor(t.durationSec / 60)}:
                    {String(t.durationSec % 60).padStart(2, "0")}
                  </span>
                </li>
              ))}
            </ul>
          </StudioPanel>
        </>
      ) : null}
    </StudioShell>
  );
}
