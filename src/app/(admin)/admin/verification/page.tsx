"use client";

import {
  AdminPageHeader,
  adminPost,
  Panel,
  useAdminJson,
} from "@/components/admin/admin-ui";

export default function AdminVerificationPage() {
  const { data, loading, error, reload } = useAdminJson<{
    requests: Array<{
      id: string;
      status: string;
      fullName: string;
      category: string;
      notes: string | null;
      createdAt: string;
      user: {
        handle: string | null;
        displayName: string | null;
        isVerified: boolean;
      };
    }>;
  }>("/api/admin/verification");

  async function review(
    requestId: string,
    action: "approve" | "reject" | "needs_info",
  ) {
    const adminNote =
      action === "needs_info"
        ? window.prompt("What additional information is needed?") || undefined
        : undefined;
    await adminPost("/api/admin/verification", {
      requestId,
      action,
      adminNote,
    });
    await reload();
  }

  return (
    <div>
      <AdminPageHeader
        title="Verification"
        subtitle="Approve, reject, or request more information. History is retained per user."
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-[var(--ember)]">{error}</p> : null}
      <div className="space-y-3">
        {data?.requests.map((r) => (
          <Panel key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
                  {r.status} · {r.category}
                </p>
                <p className="mt-2 font-[family-name:var(--font-syne)] text-lg font-semibold">
                  {r.fullName}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  @{r.user.handle || "user"} · {r.user.displayName}
                </p>
                {r.notes ? <p className="mt-2 text-sm">{r.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[var(--signal-deep)] px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => void review(r.id, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-full border px-3 py-1.5 text-xs"
                  onClick={() => void review(r.id, "needs_info")}
                >
                  Request info
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[var(--ember)] px-3 py-1.5 text-xs text-white"
                  onClick={() => void review(r.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
