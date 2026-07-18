"use client";

import { useState } from "react";

import {
  AdminPageHeader,
  adminPatch,
  adminPost,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminSupportPage() {
  const [status, setStatus] = useState("OPEN");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const qs = status ? `?status=${status}` : "";
  const { data, loading, error, reload } = useAdminJson<{
    tickets: Array<{
      id: string;
      subject: string;
      body: string;
      status: string;
      priority: number;
      email: string | null;
      createdAt: string;
      resolution: string | null;
      user: { handle: string | null; email: string } | null;
      assignee: { handle: string | null } | null;
    }>;
  }>(`/api/admin/support${qs}`);

  async function createTicket() {
    await adminPost("/api/admin/support", {
      subject,
      body,
      email: email || null,
      priority: 1,
    });
    setSubject("");
    setBody("");
    setEmail("");
    setMsg("Ticket created");
    await reload();
  }

  async function setTicketStatus(ticketId: string, next: string) {
    await adminPatch("/api/admin/support", {
      ticketId,
      status: next,
      resolution:
        next === "RESOLVED" || next === "CLOSED"
          ? "Handled by support"
          : null,
    });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Support tickets"
        subtitle="Helpdesk queue for user issues — not game admin."
      />
      {msg ? <p className="mb-3 text-sm text-[var(--signal-deep)]">{msg}</p> : null}
      <Panel className="mb-6 space-y-3">
        <h2 className="font-[family-name:var(--font-syne)] text-lg font-semibold">
          Create ticket
        </h2>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="User email (optional)"
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details"
          rows={3}
          className="w-full rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => void createTicket().catch((e) => setMsg(String(e)))}
          className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-[var(--cloud)]"
        >
          Create
        </button>
      </Panel>
      <div className="mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border-2 border-[var(--mist-strong)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="WAITING">Waiting</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.tickets.map((t) => (
          <Panel key={t.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                  {t.status} · P{t.priority}
                </p>
                <p className="mt-2 font-medium">{t.subject}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t.user?.handle
                    ? `@${t.user.handle}`
                    : t.email || t.user?.email || "anonymous"}{" "}
                  · {new Date(t.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{t.body}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs"
                  onClick={() => void setTicketStatus(t.id, "IN_PROGRESS")}
                >
                  In progress
                </button>
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs"
                  onClick={() => void setTicketStatus(t.id, "RESOLVED")}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs"
                  onClick={() => void setTicketStatus(t.id, "CLOSED")}
                >
                  Close
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
