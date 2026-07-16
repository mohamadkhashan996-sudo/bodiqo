"use client";
import { useEffect, useState } from "react";
import { Phone, Video } from "lucide-react";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState } from "@/components/ui/card";

type Call = { id: string; type: "AUDIO" | "VIDEO"; status: string; createdAt: string; caller: { id: string; name: string | null; handle: string | null; image: string | null }; participants: { user: { id: string; name: string | null; handle: string | null; image: string | null } }[] };
export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  useEffect(() => { void fetch("/api/calls").then((response) => response.json()).then((data: { calls?: Call[] }) => setCalls(data.calls ?? [])); }, []);
  return (
    <PageTransition className="page-shell page-stack max-w-4xl">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Voice & vision</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Call history</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Moments that left the timeline and became real.</p>
      </section>
      <section className="surface-panel-strong overflow-hidden rounded-[var(--radius-2xl)]">
        {calls.map((call) => (
          <div key={call.id} className="flex items-center gap-4 border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] p-5 last:border-0">
            <div className="surface-subtle grid size-11 place-items-center rounded-2xl">
              {call.type === "VIDEO" ? <Video className="size-5" /> : <Phone className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{call.caller.name ?? call.caller.handle ?? "Relune member"}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {call.status.toLowerCase()} · {new Date(call.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                call.status === "MISSED"
                  ? "bg-[var(--danger)]/12 text-[var(--danger)]"
                  : "bg-[var(--mist)] text-[var(--muted)]"
              }`}
            >
              {call.type.toLowerCase()}
            </span>
          </div>
        ))}
        {!calls.length ? (
          <EmptyState
            title="Your call history will settle here"
            description="Audio and video conversations will appear once your circle starts calling."
            className="m-5"
          />
        ) : null}
      </section>
    </PageTransition>
  );
}
