"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FormEvent } from "react";

import { VerificationBadge } from "@/components/brand/official-badge";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateBanner } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

type VerificationRequest = {
  id: string;
  status: string;
  category: string;
  fullName: string;
  notes?: string | null;
  createdAt: string;
};

const CATEGORIES = [
  "Creator",
  "Public figure",
  "Brand",
  "Organization",
  "Journalist",
  "Other",
];

export default function VerificationSettingsPage() {
  const [verified, setVerified] = useState(false);
  const [official, setOfficial] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [profile, verification] = await Promise.all([
      fetch("/api/users/me").then((r) => r.json()),
      fetch("/api/verification").then((r) => r.json()),
    ]);
    setVerified(Boolean(profile.user?.isVerified));
    setOfficial(Boolean(profile.user?.isOfficial));
    setFullName(profile.user?.displayName ?? profile.user?.name ?? "");
    setRequests(verification.requests ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        category,
        notes: notes.trim() || undefined,
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not submit request");
      return;
    }
    setNotes("");
    setEvidenceUrl("");
    setMessage(
      "Verification request submitted. Our team will review it shortly.",
    );
    await refresh();
  }

  const pending = requests.some((r) => r.status === "PENDING");

  return (
    <PageTransition className="page-shell max-w-3xl">
      <div className="mb-6">
        <Link
          href="/settings"
          className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Back to settings
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Verification
          <VerificationBadge
            isVerified={verified}
            isOfficial={official}
            className="size-6"
          />
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Request a verified badge so people know your profile is authentic.
        </p>
      </div>

      <Card className="space-y-5 p-6">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : verified || official ? (
          <StateBanner tone="success">
            {official
              ? "This is an official Relune platform account."
              : "Your account is verified."}
          </StateBanner>
        ) : pending ? (
          <StateBanner tone="warning">
            You have a pending verification request. We&apos;ll notify you when
            it&apos;s reviewed.
          </StateBanner>
        ) : null}

        {error ? <StateBanner tone="error">{error}</StateBanner> : null}
        {message ? <StateBanner tone="success">{message}</StateBanner> : null}

        {!verified && !official && !pending ? (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                Full name
              </span>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                className="mt-2"
              />
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-[var(--radius-lg)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] p-3 text-sm"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                Evidence link
              </span>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://"
                type="url"
                className="mt-2"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Link to a website, press page, or public profile that confirms
                your identity.
              </p>
            </label>
            <label className="block">
              <span className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                Notes
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else we should know"
                className="mt-2 min-h-28"
                maxLength={1000}
              />
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? "Submitting…" : "Request verification"}
            </Button>
          </form>
        ) : null}

        {requests.length ? (
          <div className="border-t border-[var(--mist-strong)] pt-5">
            <p className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
              Request history
            </p>
            <ul className="mt-3 space-y-3">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-[var(--radius-xl)] border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{request.category}</span>
                    <span className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{request.fullName}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </PageTransition>
  );
}
