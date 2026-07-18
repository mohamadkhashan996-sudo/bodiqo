"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Phone, PhoneIncoming, PhoneMissed, Video } from "lucide-react";

import { PageTransition } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useSocket } from "@/hooks/use-socket";
import { dispatchCallStart } from "@/lib/call-events";
import { emitAck } from "@/lib/socket-client";

type Call = {
  id: string;
  type: "AUDIO" | "VIDEO";
  status: string;
  createdAt: string;
  callerId: string;
  durationSec?: number | null;
  caller: {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
  };
  participants: {
    userId?: string;
    user: {
      id: string;
      name: string | null;
      handle: string | null;
      image: string | null;
    };
  }[];
};

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Connected";
    case "ENDED":
      return "Ended";
    case "DECLINED":
      return "Declined";
    case "MISSED":
      return "Missed";
    case "FAILED":
      return "Failed";
    case "RINGING":
      return "Ringing";
    default:
      return status.toLowerCase();
  }
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallsPage() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [calls, setCalls] = useState<Call[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/calls")
      .then((response) => response.json())
      .then((data: { calls?: Call[] }) => setCalls(data.calls ?? []));
  }, []);

  function otherParty(call: Call) {
    const me = session?.user?.id;
    if (call.callerId === me) {
      return (
        call.participants.find((p) => p.user.id !== me)?.user ?? call.caller
      );
    }
    return call.caller;
  }

  async function callback(call: Call, type: "AUDIO" | "VIDEO") {
    const peer = otherParty(call);
    if (!peer?.id || !socket) return;
    setBusyId(call.id);
    setError(null);
    const result = await emitAck(socket, "call:invite", {
      calleeIds: [peer.id],
      type,
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error || "Could not start the call");
      return;
    }
    if (result.data) dispatchCallStart(result.data);
  }

  return (
    <PageTransition className="page-shell page-stack max-w-4xl">
      <PageHeader
        kicker="Voice & vision"
        title="Call history"
        description="One-to-one encrypted voice and video with mute, camera control, and screen share."
      />
      {error ? (
        <p className="rounded-[var(--radius-xl)] border-2 border-[var(--danger)]/30 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <section className="surface-panel-strong overflow-hidden rounded-[var(--radius-2xl)]">
        {calls.map((call) => {
          const peer = otherParty(call);
          const missed = call.status === "MISSED";
          const duration = formatDuration(call.durationSec);
          return (
            <div
              key={call.id}
              className="flex flex-wrap items-center gap-3 border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] p-4 last:border-0 sm:gap-4 sm:p-5"
            >
              <div className="relative shrink-0">
                <Avatar
                  src={peer.image}
                  name={peer.name ?? peer.handle}
                  className="size-11 rounded-2xl"
                />
                <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-[var(--surface)] shadow-sm">
                  {missed ? (
                    <PhoneMissed className="size-3 text-[var(--danger)]" />
                  ) : call.type === "VIDEO" ? (
                    <Video className="size-3 text-[var(--signal)]" />
                  ) : (
                    <PhoneIncoming className="size-3 text-[var(--signal)]" />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1 basis-[12rem]">
                <p className="truncate font-bold">
                  {peer.name ?? peer.handle ?? "Relune member"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {statusLabel(call.status)}
                  {duration ? ` · ${duration}` : ""} ·{" "}
                  {new Date(call.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 px-3"
                  disabled={busyId === call.id}
                  onClick={() => void callback(call, "AUDIO")}
                  aria-label="Call back"
                >
                  <Phone className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 px-3"
                  disabled={busyId === call.id}
                  onClick={() => void callback(call, "VIDEO")}
                  aria-label="Video call back"
                >
                  <Video className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
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
