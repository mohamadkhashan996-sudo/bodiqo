"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTransition } from "@/components/motion/primitives";
import { Card, Skeleton, StateBanner } from "@/components/ui/card";

type Audience = "EVERYONE" | "FOLLOWERS" | "FOLLOWING" | "MUTUAL" | "NOBODY";

type Privacy = Record<
  | "whoCanFollow"
  | "whoCanMessage"
  | "whoCanCall"
  | "whoCanComment"
  | "whoCanMention"
  | "whoCanTag"
  | "whoCanSeeStories"
  | "whoCanSeeActivity"
  | "whoCanSeeOnline",
  Audience
> & {
  showReadReceipts: boolean;
  showTyping: boolean;
};

const labels: Record<keyof Privacy, string> = {
  whoCanFollow: "Who can follow me",
  whoCanMessage: "Who can message me",
  whoCanCall: "Who can call me",
  whoCanComment: "Who can comment",
  whoCanMention: "Who can mention me",
  whoCanTag: "Who can tag me",
  whoCanSeeStories: "Who can see my stories",
  whoCanSeeActivity: "Who can see my activity",
  whoCanSeeOnline: "Who can see my online status",
  showReadReceipts: "Send read receipts",
  showTyping: "Show when I’m typing",
};

const audiences: Audience[] = [
  "EVERYONE",
  "FOLLOWERS",
  "FOLLOWING",
  "MUTUAL",
  "NOBODY",
];

function audienceLabel(value: Audience) {
  return value[0] + value.slice(1).toLowerCase();
}

export default function PrivacySettingsPage() {
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/privacy").then((r) => r.json()),
      fetch("/api/users/me").then((r) => r.json()),
    ]).then(([privacyData, meData]) => {
      setPrivacy(privacyData.privacy ?? null);
      setIsPrivate(Boolean(meData.user?.isPrivate));
    });
  }, []);

  async function updatePrivacy(patch: Partial<Privacy>) {
    if (!privacy) return;
    const previous = privacy;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setPrivacy(previous);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save privacy setting");
    }
    setSaving(false);
  }

  async function updateAccountPrivacy(nextPrivate: boolean) {
    const previous = isPrivate;
    setIsPrivate(nextPrivate);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: nextPrivate }),
    });
    if (!res.ok) {
      setIsPrivate(previous);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update account privacy");
    }
    setSaving(false);
  }

  if (!privacy) {
    return (
      <div className="section-shell max-w-3xl space-y-4 px-5 md:px-8">
        <Skeleton className="h-20 rounded-[var(--radius-xl)]" />
        <Skeleton className="h-96 rounded-[var(--radius-2xl)]" />
      </div>
    );
  }

  return (
    <PageTransition className="section-shell max-w-3xl px-5 md:px-8">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Back to settings
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Privacy
        </h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Control who can see your content and how people can reach you.
        </p>
      </div>

      {error ? (
        <div className="mb-4">
          <StateBanner tone="error">{error}</StateBanner>
        </div>
      ) : null}

      <Card className="rounded-[2rem] p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Account visibility</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Public accounts share posts with everyone. Private accounts require a follow
          approval before posts and media are visible.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void updateAccountPrivacy(false)}
            className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
              !isPrivate
                ? "border-[var(--signal)] bg-[var(--signal)]/10"
                : "border-[var(--mist)] bg-[var(--surface)]"
            }`}
          >
            <p className="font-medium">Public</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Anyone can see your posts and follower lists.
            </p>
          </button>
          <button
            type="button"
            onClick={() => void updateAccountPrivacy(true)}
            className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
              isPrivate
                ? "border-[var(--signal)] bg-[var(--signal)]/10"
                : "border-[var(--mist)] bg-[var(--surface)]"
            }`}
          >
            <p className="font-medium">Private</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Only approved followers can see your posts and media.
            </p>
          </button>
        </div>
        <Link
          href="/settings/profile"
          className="mt-4 inline-block text-sm text-[var(--signal-deep)] hover:underline"
        >
          Edit profile details →
        </Link>
      </Card>

      <Card className="mt-6 overflow-hidden rounded-[2rem] p-0">
        {(Object.keys(labels) as (keyof Privacy)[]).map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 border-b border-[var(--mist)] p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <label className="text-sm font-medium" htmlFor={`privacy-${key}`}>
              {labels[key]}
            </label>
            {typeof privacy[key] === "boolean" ? (
              <button
                id={`privacy-${key}`}
                type="button"
                aria-pressed={Boolean(privacy[key])}
                onClick={() =>
                  void updatePrivacy({ [key]: !privacy[key] } as Partial<Privacy>)
                }
                className={`h-7 w-12 rounded-full p-1 transition ${
                  privacy[key] ? "bg-[var(--signal)]" : "bg-[var(--mist)]"
                }`}
              >
                <span
                  className={`block size-5 rounded-full bg-white transition ${
                    privacy[key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            ) : (
              <select
                id={`privacy-${key}`}
                value={privacy[key] as Audience}
                onChange={(event) =>
                  void updatePrivacy({
                    [key]: event.target.value as Audience,
                  } as Partial<Privacy>)
                }
                className="rounded-[var(--radius-md)] border border-[var(--mist)] bg-[var(--surface)] px-3 py-2 text-sm font-medium outline-none"
              >
                {audiences.map((audience) => (
                  <option key={audience} value={audience}>
                    {audienceLabel(audience)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </Card>
      <p className="mt-4 text-xs text-[var(--muted)]">
        {saving ? "Saving…" : "Changes save automatically."}
      </p>
    </PageTransition>
  );
}
