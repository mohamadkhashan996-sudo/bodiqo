"use client";
import { useEffect, useState } from "react";
import { Phone, Video } from "lucide-react";

type Call = { id: string; type: "AUDIO" | "VIDEO"; status: string; createdAt: string; caller: { id: string; name: string | null; handle: string | null; image: string | null }; participants: { user: { id: string; name: string | null; handle: string | null; image: string | null } }[] };
export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  useEffect(() => { void fetch("/api/calls").then((response) => response.json()).then((data: { calls?: Call[] }) => setCalls(data.calls ?? [])); }, []);
  return <div className="mx-auto max-w-3xl"><p className="text-[11px] font-bold uppercase tracking-[.22em] text-[var(--signal)]">Voice & vision</p><h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">Call history</h1><p className="mt-2 text-sm text-[var(--muted)]">Moments that left the timeline and became real.</p><section className="mt-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/55 shadow-sm">{calls.map((call) => <div key={call.id} className="flex items-center gap-4 border-b border-[var(--mist)] p-5 last:border-0"><div className="grid size-11 place-items-center rounded-2xl bg-[var(--mist)]">{call.type === "VIDEO" ? <Video className="size-5" /> : <Phone className="size-5" />}</div><div className="min-w-0 flex-1"><p className="font-bold">{call.caller.name ?? call.caller.handle ?? "Cirqua member"}</p><p className="mt-1 text-xs text-[var(--muted)]">{call.status.toLowerCase()} · {new Date(call.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-bold ${call.status === "MISSED" ? "bg-red-50 text-red-600" : "bg-[var(--mist)] text-[var(--muted)]"}`}>{call.type.toLowerCase()}</span></div>)}{!calls.length && <div className="p-12 text-center text-sm text-[var(--muted)]">Your call history will settle here.</div>}</section></div>;
}
