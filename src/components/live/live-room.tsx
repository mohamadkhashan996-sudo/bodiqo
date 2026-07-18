"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  Crown,
  Eye,
  Gift,
  Mic,
  MicOff,
  Pin,
  Radio,
  Send,
  Shield,
  Trash2,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import type { FormEvent } from "react";

import { useGuest } from "@/components/auth/guest-provider";
import { VerificationBadge } from "@/components/brand/official-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/hooks/use-socket";
import {
  acquireLocalStream,
  applyDegradedSenderParams,
  applyHdSenderParams,
  fetchIceServers,
  preferHdCodecs,
  sampleCallQuality,
} from "@/lib/call-media";
import { formatCount } from "@/lib/utils";

type LiveUser = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
  isVerified?: boolean;
};

type LiveSession = {
  id: string;
  title: string;
  coverUrl?: string | null;
  status: string;
  viewerCount: number;
  peakViewers?: number;
  giftCoins?: number;
  mutedUserIds?: string[];
  host: LiveUser;
  moderators?: Array<{ user: LiveUser }>;
};

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  isPinned?: boolean;
  user: LiveUser;
};

type GiftItem = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  coinCost: number;
};

type GiftEvent = {
  id: string;
  coinCost: number;
  gift: GiftItem;
  sender: LiveUser;
};

type SignalPayload = {
  type: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export function LiveRoom({
  sessionId,
  initialSession,
}: {
  sessionId: string;
  initialSession?: LiveSession | null;
}) {
  const { data: sessionAuth } = useSession();
  const me = sessionAuth?.user?.id;
  const { requireAuth } = useGuest();
  const { socket } = useSocket();
  const router = useRouter();

  const [session, setSession] = useState<LiveSession | null>(
    initialSession ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBody, setChatBody] = useState("");
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [flyingGift, setFlyingGift] = useState<GiftEvent | null>(null);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [modQuery, setModQuery] = useState("");
  const [modResults, setModResults] = useState<LiveUser[]>([]);
  const [pinned, setPinned] = useState<ChatMessage | null>(null);
  const [reactBurst, setReactBurst] = useState<
    Array<{ id: string; emoji: string }>
  >([]);

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Map<string, RTCPeerConnection>>(new Map());
  const isHostRef = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const isHost = Boolean(me && session?.host.id === me);
  const isMod =
    isHost || Boolean(session?.moderators?.some((m) => m.user.id === me));
  const muted = Boolean(me && session?.mutedUserIds?.includes(me));

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    void fetch(`/api/live/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.session) {
          setSession(d.session);
          if (d.session.status === "ENDED") setEnded(true);
        }
      });
    void fetch(`/api/live/${sessionId}/chat`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setPinned(d.pinned ?? null);
      });
    void fetch("/api/live/gifts")
      .then((r) => r.json())
      .then((d) => {
        setGifts(d.gifts ?? []);
        setCoins(d.coins ?? 0);
      })
      .catch(() => undefined);
  }, [sessionId]);

  const closePeer = useCallback((userId: string) => {
    const pc = peers.current.get(userId);
    if (pc) {
      pc.close();
      peers.current.delete(userId);
    }
  }, []);

  const pendingViewers = useRef<Set<string>>(new Set());

  const createPeer = useCallback(
    async (remoteUserId: string, asOfferer: boolean) => {
      if (peers.current.has(remoteUserId))
        return peers.current.get(remoteUserId)!;

      if (asOfferer && !localStream.current) {
        pendingViewers.current.add(remoteUserId);
        return null;
      }
      pendingViewers.current.delete(remoteUserId);

      const iceServers = await fetchIceServers();
      const pc = new RTCPeerConnection({ iceServers });
      peers.current.set(remoteUserId, pc);

      const stream = localStream.current;
      if (stream && asOfferer) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
        preferHdCodecs(pc);
        void applyHdSenderParams(pc);
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socket) return;
        socket.emit("live:signal", {
          sessionId,
          toUserId: remoteUserId,
          signal: {
            type: "ice",
            candidate: event.candidate.toJSON(),
          } satisfies SignalPayload,
        });
      };

      pc.ontrack = (event) => {
        const [streamIn] = event.streams;
        if (remoteVideo.current && streamIn) {
          remoteVideo.current.srcObject = streamIn;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected" && asOfferer) {
          void sampleCallQuality(pc).then((sample) => {
            if (sample.quality === "poor" || sample.quality === "fair") {
              void applyDegradedSenderParams(pc);
            }
          });
        }
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          closePeer(remoteUserId);
        }
      };

      if (asOfferer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit("live:signal", {
          sessionId,
          toUserId: remoteUserId,
          signal: { type: "offer", sdp: offer } satisfies SignalPayload,
        });
      }

      return pc;
    },
    [closePeer, sessionId, socket],
  );

  // Host camera
  useEffect(() => {
    if (!isHost || ended) return;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await acquireLocalStream("VIDEO");
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        for (const viewerId of pendingViewers.current) {
          void createPeer(viewerId, true);
        }
      } catch {
        setError("Camera/microphone permission is required to go live.");
      }
    })();
    return () => {
      cancelled = true;
      localStream.current?.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    };
  }, [isHost, ended, createPeer]);

  // Socket room + events
  useEffect(() => {
    if (!socket || !sessionId) return;
    const peerConnections = peers.current;
    socket.emit("live:join", { sessionId });

    const onChat = ({ message }: { message: ChatMessage }) => {
      setMessages((old) =>
        old.some((m) => m.id === message.id) ? old : [...old, message],
      );
    };
    const onChatDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((old) => old.filter((m) => m.id !== messageId));
    };
    const onViewers = ({
      viewerCount,
      peakViewers,
    }: {
      viewerCount: number;
      peakViewers?: number;
    }) => {
      setSession((s) =>
        s
          ? {
              ...s,
              viewerCount,
              peakViewers: peakViewers ?? s.peakViewers,
            }
          : s,
      );
    };
    const onGift = ({ event }: { event: GiftEvent }) => {
      setFlyingGift(event);
      window.setTimeout(() => setFlyingGift(null), 2800);
      setSession((s) =>
        s ? { ...s, giftCoins: (s.giftCoins ?? 0) + event.coinCost } : s,
      );
    };
    const onEnded = () => {
      setEnded(true);
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
    const onMute = ({
      userId,
      muted: next,
    }: {
      userId: string;
      muted: boolean;
    }) => {
      setSession((s) => {
        if (!s) return s;
        const ids = new Set(s.mutedUserIds ?? []);
        if (next) ids.add(userId);
        else ids.delete(userId);
        return { ...s, mutedUserIds: [...ids] };
      });
    };
    const onPeerJoin = ({
      userId,
      isHost: peerIsHost,
    }: {
      userId: string;
      isHost?: boolean;
    }) => {
      if (!me || userId === me) return;
      // Host offers to each new viewer
      if (isHostRef.current && !peerIsHost) {
        void createPeer(userId, true);
      }
    };
    const onPeerLeave = ({ userId }: { userId: string }) => {
      closePeer(userId);
    };
    const onSignal = async ({
      fromUserId,
      signal,
    }: {
      fromUserId: string;
      signal: SignalPayload;
    }) => {
      if (!me || fromUserId === me) return;
      if (signal.type === "offer") {
        const pc = await createPeer(fromUserId, false);
        if (!pc || !signal.sdp) return;
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("live:signal", {
          sessionId,
          toUserId: fromUserId,
          signal: { type: "answer", sdp: answer } satisfies SignalPayload,
        });
      } else if (signal.type === "answer") {
        const pc = peers.current.get(fromUserId);
        if (pc && signal.sdp) await pc.setRemoteDescription(signal.sdp);
      } else if (signal.type === "ice" && signal.candidate) {
        const pc = peers.current.get(fromUserId);
        if (pc) {
          try {
            await pc.addIceCandidate(signal.candidate);
          } catch {
            /* ignore */
          }
        }
      }
    };

    const onPinned = ({
      message,
    }: {
      message: ChatMessage | null;
    }) => {
      setPinned(message);
    };
    const onReact = ({ emoji }: { emoji: string }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setReactBurst((old) => [...old.slice(-12), { id, emoji }]);
      window.setTimeout(() => {
        setReactBurst((old) => old.filter((r) => r.id !== id));
      }, 2200);
    };
    const onBlocked = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid !== sessionId) return;
      setError("You’ve been removed from this live.");
      setEnded(true);
      localStream.current?.getTracks().forEach((t) => t.stop());
    };
    const onBlockPeer = ({ userId }: { userId: string }) => {
      closePeer(userId);
    };
    const onModerator = () => {
      void fetch(`/api/live/${sessionId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.session) setSession(d.session);
        });
    };

    socket.on("live:chat", onChat);
    socket.on("live:chat:deleted", onChatDeleted);
    socket.on("live:chat:pinned", onPinned);
    socket.on("live:viewers", onViewers);
    socket.on("live:gift", onGift);
    socket.on("live:react", onReact);
    socket.on("live:ended", onEnded);
    socket.on("live:mute", onMute);
    socket.on("live:blocked", onBlocked);
    socket.on("live:block", onBlockPeer);
    socket.on("live:moderator", onModerator);
    socket.on("live:peer-join", onPeerJoin);
    socket.on("live:peer-leave", onPeerLeave);
    socket.on("live:signal", onSignal);

    return () => {
      socket.emit("live:leave", { sessionId });
      socket.off("live:chat", onChat);
      socket.off("live:chat:deleted", onChatDeleted);
      socket.off("live:chat:pinned", onPinned);
      socket.off("live:viewers", onViewers);
      socket.off("live:gift", onGift);
      socket.off("live:react", onReact);
      socket.off("live:ended", onEnded);
      socket.off("live:mute", onMute);
      socket.off("live:blocked", onBlocked);
      socket.off("live:block", onBlockPeer);
      socket.off("live:moderator", onModerator);
      socket.off("live:peer-join", onPeerJoin);
      socket.off("live:peer-leave", onPeerLeave);
      socket.off("live:signal", onSignal);
      for (const [id, pc] of peerConnections) {
        pc.close();
        peerConnections.delete(id);
      }
    };
  }, [socket, sessionId, me, createPeer, closePeer]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, flyingGift]);

  async function sendChat(e: FormEvent) {
    e.preventDefault();
    if (!requireAuth() || muted || !chatBody.trim()) return;
    const text = chatBody.trim();
    setChatBody("");
    const res = await fetch(`/api/live/${sessionId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not send");
      setChatBody(text);
    }
  }

  async function sendGiftItem(gift: GiftItem) {
    if (!requireAuth()) return;
    const res = await fetch(`/api/live/${sessionId}/gift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giftId: gift.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not send gift");
      return;
    }
    if (typeof data.coins === "number") setCoins(data.coins);
    setGiftOpen(false);
  }

  async function claimCoins() {
    if (!requireAuth()) return;
    const res = await fetch("/api/live/gifts", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.coins === "number") setCoins(data.coins);
  }

  async function endLive() {
    if (!window.confirm("End this live?")) return;
    await fetch(`/api/live/${sessionId}`, { method: "DELETE" });
    setEnded(true);
    localStream.current?.getTracks().forEach((t) => t.stop());
  }

  async function deleteMsg(messageId: string) {
    await fetch(`/api/live/${sessionId}/chat?messageId=${messageId}`, {
      method: "DELETE",
    });
  }

  async function muteUser(userId: string, next: boolean) {
    await fetch(`/api/live/${sessionId}/mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mute", userId, muted: next }),
    });
  }

  async function blockUser(userId: string) {
    if (!window.confirm("Remove this viewer from the live?")) return;
    await fetch(`/api/live/${sessionId}/mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "block", userId }),
    });
  }

  async function pinMsg(messageId: string | null) {
    await fetch(`/api/live/${sessionId}/mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", messageId }),
    });
  }

  async function removeMod(userId: string) {
    await fetch(`/api/live/${sessionId}/mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", userId }),
    });
    const d = await fetch(`/api/live/${sessionId}`).then((r) => r.json());
    if (d.session) setSession(d.session);
  }

  function sendReaction(emoji: string) {
    if (!requireAuth() || muted) return;
    socket?.emit("live:react", { sessionId, emoji });
  }

  async function addMod(userId: string) {
    await fetch(`/api/live/${sessionId}/mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", userId }),
    });
    const d = await fetch(`/api/live/${sessionId}`).then((r) => r.json());
    if (d.session) setSession(d.session);
    setModQuery("");
    setModResults([]);
  }

  useEffect(() => {
    if (!modQuery.trim() || !isHost) {
      setModResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(modQuery)}`)
        .then((r) => r.json())
        .then((d) => setModResults(d.users ?? []));
    }, 250);
    return () => window.clearTimeout(t);
  }, [modQuery, isHost]);

  function toggleCam() {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }

  function toggleMic() {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  if (!session) {
    return (
      <div className="grid min-h-[70dvh] place-items-center text-sm text-white/70">
        Opening live…
      </div>
    );
  }

  const hostName =
    session.host.displayName ??
    session.host.name ??
    session.host.handle ??
    "Host";

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-black text-white">
      {/* Video stage */}
      <div className="absolute inset-0">
        {isHost ? (
          <video
            ref={localVideo}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
        ) : (
          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            className="size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-3 rounded-full bg-black/45 py-1.5 ps-1.5 pe-4 backdrop-blur-md">
          <Avatar
            src={session.host.image}
            name={hostName}
            className="size-10 rounded-full"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold">
              {hostName}
              {session.host.isVerified ? (
                <VerificationBadge isVerified className="size-3.5" />
              ) : null}
            </p>
            <p className="truncate text-[11px] text-white/70">
              @{session.host.handle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ember)] px-3 py-1.5 text-xs font-bold tracking-wide uppercase">
            <Radio className="size-3.5" />
            Live
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
            <Eye className="size-3.5" />
            {formatCount(session.viewerCount)}
          </span>
          <button
            type="button"
            onClick={() => router.push("/live")}
            className="grid size-10 place-items-center rounded-full bg-black/45 backdrop-blur-md"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative z-10 px-4">
        <h1 className="max-w-xl text-lg leading-snug font-semibold drop-shadow">
          {session.title}
        </h1>
        {session.giftCoins ? (
          <p className="mt-1 text-xs text-white/70">
            {formatCount(session.giftCoins)} coins gifted
          </p>
        ) : null}
      </div>

      {/* Flying gift */}
      <AnimatePresence>
        {flyingGift ? (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30 }}
            className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center"
          >
            <div className="rounded-2xl bg-black/55 px-5 py-4 text-center backdrop-blur-md">
              <p className="text-4xl">{flyingGift.gift.emoji}</p>
              <p className="mt-2 text-sm font-semibold">
                {flyingGift.sender.displayName ?? flyingGift.sender.handle} sent{" "}
                {flyingGift.gift.name}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {ended ? (
        <div className="relative z-20 mt-auto grid place-items-center gap-3 bg-black/70 p-8 text-center backdrop-blur-md">
          <p className="text-xl font-semibold">Live ended</p>
          <p className="text-sm text-white/70">
            Peak {formatCount(session.peakViewers ?? session.viewerCount)}{" "}
            viewers
          </p>
          <Button variant="signal" onClick={() => router.push("/live")}>
            Back to Live
          </Button>
        </div>
      ) : (
        <>
          {/* Chat + gifts column */}
          <div className="relative z-10 mt-auto flex max-h-[42dvh] flex-col justify-end gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-h-[48dvh]">
            {pinned ? (
              <div className="flex items-start gap-2 rounded-2xl border border-[var(--ember)]/50 bg-black/55 px-3 py-2 text-sm backdrop-blur-md">
                <Pin className="mt-0.5 size-3.5 shrink-0 text-[var(--ember)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[var(--ember)]">
                    Pinned ·{" "}
                    {pinned.user.displayName ??
                      pinned.user.name ??
                      pinned.user.handle}
                  </p>
                  <p className="break-words text-white/95">{pinned.body}</p>
                </div>
                {isMod ? (
                  <button
                    type="button"
                    className="rounded-full bg-white/10 px-2 py-1 text-[10px]"
                    onClick={() => void pinMsg(null)}
                  >
                    Unpin
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-40 flex h-24 justify-center gap-2 overflow-hidden">
              <AnimatePresence>
                {reactBurst.map((r) => (
                  <motion.span
                    key={r.id}
                    initial={{ opacity: 0, y: 24, scale: 0.6 }}
                    animate={{ opacity: 1, y: -20, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl"
                  >
                    {r.emoji}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            <div className="max-h-48 space-y-1.5 overflow-y-auto pe-1 sm:max-h-64">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start gap-2 rounded-2xl bg-black/35 px-3 py-2 text-sm backdrop-blur-sm"
                >
                  <Avatar
                    src={m.user.image}
                    name={m.user.displayName ?? m.user.name}
                    className="mt-0.5 size-7 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-[var(--ember)]">
                      {m.user.displayName ?? m.user.name ?? m.user.handle}
                    </p>
                    <p className="break-words whitespace-pre-wrap text-white/95">
                      {m.body}
                    </p>
                  </div>
                  {isMod ? (
                    <div className="hidden gap-1 group-hover:flex max-md:!flex">
                      <button
                        type="button"
                        className="rounded-full bg-white/10 p-1.5"
                        onClick={() => void pinMsg(m.id)}
                        aria-label="Pin comment"
                      >
                        <Pin className="size-3" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-white/10 p-1.5"
                        onClick={() => void deleteMsg(m.id)}
                        aria-label="Delete message"
                      >
                        <Trash2 className="size-3" />
                      </button>
                      {m.user.id !== session.host.id ? (
                        <>
                          <button
                            type="button"
                            className="rounded-full bg-white/10 p-1.5"
                            onClick={() =>
                              void muteUser(
                                m.user.id,
                                !(session.mutedUserIds ?? []).includes(
                                  m.user.id,
                                ),
                              )
                            }
                            aria-label="Toggle mute"
                          >
                            <Shield className="size-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-white/10 p-1.5"
                            onClick={() => void blockUser(m.user.id)}
                            aria-label="Block viewer"
                          >
                            <Ban className="size-3" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>

            {!muted ? (
              <div className="flex gap-1.5">
                {["❤️", "🔥", "👏", "😂", "✨"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="grid size-9 place-items-center rounded-full bg-white/15 text-sm"
                    onClick={() => sendReaction(emoji)}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <p className="text-xs font-semibold text-[var(--ember)]">
                {error}
              </p>
            ) : null}

            {isHost ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleCam}
                  className="grid size-11 place-items-center rounded-full bg-white/15"
                  aria-label="Toggle camera"
                >
                  {camOn ? (
                    <Video className="size-4" />
                  ) : (
                    <VideoOff className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  className="grid size-11 place-items-center rounded-full bg-white/15"
                  aria-label="Toggle mic"
                >
                  {micOn ? (
                    <Mic className="size-4" />
                  ) : (
                    <MicOff className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void endLive()}
                  className="rounded-full bg-[var(--danger)] px-4 text-sm font-semibold"
                >
                  End live
                </button>
              </div>
            ) : null}

            {isHost ? (
              <div className="rounded-2xl bg-black/40 p-3 backdrop-blur-md">
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-white/80">
                  <Crown className="size-3.5" /> Moderators
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {(session.moderators ?? []).map((m) => (
                    <button
                      key={m.user.id}
                      type="button"
                      onClick={() => void removeMod(m.user.id)}
                      className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20"
                      title="Remove moderator"
                    >
                      @{m.user.handle} ×
                    </button>
                  ))}
                  {!session.moderators?.length ? (
                    <span className="text-[11px] text-white/50">None yet</span>
                  ) : null}
                </div>
                <Input
                  value={modQuery}
                  onChange={(e) => setModQuery(e.target.value)}
                  placeholder="Add moderator by username"
                  className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
                />
                {modResults.length ? (
                  <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                    {modResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => void addMod(u.id)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs hover:bg-white/10"
                      >
                        <Users className="size-3.5" />
                        {u.displayName ?? u.name} @{u.handle}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={sendChat} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  setGiftOpen((v) => !v);
                }}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--ember)]"
                aria-label="Gifts"
              >
                <Gift className="size-4" />
              </button>
              <Input
                value={chatBody}
                onChange={(e) => setChatBody(e.target.value.slice(0, 280))}
                onPointerDown={(e) => {
                  if (!requireAuth()) e.preventDefault();
                }}
                disabled={muted}
                placeholder={muted ? "You are muted" : "Say something…"}
                className="min-w-0 flex-1 border-white/20 bg-white/10 text-white placeholder:text-white/45"
              />
              <button
                type="submit"
                disabled={!chatBody.trim() || muted}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="size-4" />
              </button>
            </form>

            {giftOpen ? (
              <div className="rounded-2xl bg-black/70 p-3 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Gifts · {formatCount(coins)} coins
                  </p>
                  <button
                    type="button"
                    onClick={() => void claimCoins()}
                    className="text-xs font-semibold text-[var(--ember)]"
                  >
                    Refresh balance
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {gifts.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => void sendGiftItem(g)}
                      className="flex flex-col items-center gap-1 rounded-xl bg-white/10 px-2 py-3 transition hover:bg-white/20"
                    >
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-[10px] font-semibold">
                        {g.name}
                      </span>
                      <span className="text-[10px] text-white/60">
                        {g.coinCost}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
