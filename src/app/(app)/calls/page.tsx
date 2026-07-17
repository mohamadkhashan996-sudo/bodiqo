"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Phone, PhoneIncoming, PhoneMissed, Video } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import { PageTransition } from "@/components/motion/primitives";
import { EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

type Call = {
  id: string;
  type: "AUDIO" | "VIDEO";
  status: string;
  createdAt: string;
  callerId: string;
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

export default function CallsPage() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const [calls, setCalls] = useState<Call[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  function callback(call: Call, type: "AUDIO" | "VIDEO") {
    const peer = otherParty(call);
    if (!peer?.id || !socket) return;
    setBusyId(call.id);
    socket.emit(
      "call:invite",
      { calleeIds: [peer.id], type },
      (result: { ok: boolean; data?: unknown; error?: string }) => {
        setBusyId(null);
        if (result.ok && result.data) {
          window.dispatchEvent(
            new CustomEvent("relune:call-start", { detail: result.data }),
          );
        }
      },
    );
  }

  return (
    <PageTransition className="page-shell page-stack max-w-4xl">
      <section className="glass-strong premium-ring hero-panel">
        <p className="kicker">Voice & vision</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl">
          Call history
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Encrypted voice and video with HD media, mute, camera control, and
          screen share.
        </p>
      </section>
      <section className="surface-panel-strong overflow-hidden rounded-[var(--radius-2xl)]">
        {calls.map((call) => {
          const peer = otherParty(call);
          const missed = call.status === "MISSED";
          return (
            <div
              key={call.id}
              className="flex items-center gap-4 border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] p-5 last:border-0"
            >
              <div className="relative">
                <Avatar
                  src={peer.image}
                  name={peer.name ?? peer.handle}
                  className="size-11 rounded-2xl"
                />
                <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-[var(--surface)] shadow-sm">
                  {missed ? (
                    <PhoneMissed className="size-3 text-[var(--danger)]" />
                  ) : call.type === "VIDEO" ? (
                    <Video className="size-3 text-[var(--signal)]" />
                  ) : (
                    <PhoneIncoming className="size-3 text-[var(--signal)]" />
                  )}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {peer.name ?? peer.handle ?? "Relune member"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {call.status.toLowerCase()} ·{" "}
                  {new Date(call.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 px-3"
                  disabled={busyId === call.id}
                  onClick={() => callback(call, "AUDIO")}
                  aria-label="Call back"
                >
                  <Phone className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9 px-3"
                  disabled={busyId === call.id}
                  onClick={() => callback(call, "VIDEO")}
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
