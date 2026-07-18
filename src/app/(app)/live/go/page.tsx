"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import type { FormEvent } from "react";

import { useGuest } from "@/components/auth/guest-provider";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateBanner } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function GoLivePage() {
  const router = useRouter();
  const { requireAuth } = useGuest();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not start live");
      return;
    }
    router.push(`/live/${data.session.id}`);
  }

  return (
    <PageTransition className="page-shell max-w-lg">
      <Link
        href="/live"
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        ← Back to Live
      </Link>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
        Go live
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-strong)]">
        Start a TikTok-style broadcast with live chat, gifts, and moderators.
      </p>

      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          {error ? <StateBanner tone="error">{error}</StateBanner> : null}
          <label className="block">
            <span className="text-[11px] tracking-[0.16em] text-[var(--muted)] uppercase">
              Title
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="What are you streaming?"
              className="mt-2"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <Button
            type="submit"
            variant="signal"
            className="w-full"
            disabled={loading}
          >
            <Radio className="size-4" />
            {loading ? "Starting…" : "Start live"}
          </Button>
        </form>
      </Card>
    </PageTransition>
  );
}
