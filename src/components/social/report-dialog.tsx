"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { useGuest } from "@/components/auth/guest-provider";
import { Button } from "@/components/ui/button";
import { StateBanner } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const REASONS = [
  "Spam",
  "Harassment or bullying",
  "Scam or fraud",
  "Fake account",
  "Hate or abuse",
  "Copyright",
  "Other",
] as const;

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  title = "Report",
}: {
  open: boolean;
  onClose: () => void;
  targetType: "USER" | "POST" | "COMMENT" | "MESSAGE" | "STORY" | "COMMUNITY";
  targetId: string;
  title?: string;
}) {
  const { requireAuth } = useGuest();
  const [reason, setReason] = useState<(typeof REASONS)[number]>("Spam");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/social/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not submit report");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {done ? (
        <div className="space-y-4">
          <StateBanner tone="success">
            Thanks. Our team will review this report.
          </StateBanner>
          <Button type="button" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Reports are confidential. Choose the reason that best matches what
            you saw.
          </p>
          <div className="space-y-2">
            {REASONS.map((item) => (
              <label
                key={item}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm shadow-[var(--shadow-sm)] ${
                  reason === item
                    ? "border-[var(--signal-deep)] bg-[var(--signal)]/15"
                    : "border-[var(--mist-strong)] bg-[var(--surface)]"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {item}
              </label>
            ))}
          </div>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional details"
            maxLength={2000}
            className="min-h-24"
          />
          {error ? <StateBanner tone="error">{error}</StateBanner> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Sending…" : "Submit report"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
