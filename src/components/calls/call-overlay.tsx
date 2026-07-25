"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Shield,
  SwitchCamera,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";

import { useSocket } from "@/hooks/use-socket";
import { CALL_START_EVENT } from "@/lib/call-events";
import {
  acquireDisplayStream,
  acquireLocalStream,
  applyDegradedSenderParams,
  applyHdSenderParams,
  type CallQuality,
  type CameraFacing,
  fetchIceServers,
  preferHdCodecs,
  replaceVideoTrack,
  sampleCallQuality,
  switchCameraFacing,
} from "@/lib/call-media";
import {
  callSafetyNumber,
  decryptFromPeer,
  encryptForPeer,
  ensureIdentityKeys,
  fetchPeerPublicKey,
} from "@/lib/e2e-crypto";

type Participant = {
  userId: string;
  user: {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
  };
};

type Call = {
  id: string;
  type: "AUDIO" | "VIDEO";
  callerId: string;
  caller: Participant["user"];
  participants: Participant[];
};

type CallSignal = {
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  encrypted?: {
    ciphertext: string;
    nonce: string;
    senderEphemeralKey: string;
  };
};

function playRingTone(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  osc.stop(ctx.currentTime + 0.4);
}

async function notifyIncoming(call: Call) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return;
    const name = call.caller.name ?? call.caller.handle ?? "Someone";
    const note = new Notification(`${name} is calling`, {
      body: `Incoming ${call.type === "VIDEO" ? "video" : "voice"} call · Relune`,
      tag: `call-${call.id}`,
      requireInteraction: true,
    });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  } catch {
    /* ignore */
  }
}

export function CallOverlay() {
  const { socket } = useSocket();
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);
  const [peerCameraOff, setPeerCameraOff] = useState(false);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [e2eReady, setE2eReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [networkHint, setNetworkHint] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [quality, setQuality] = useState<CallQuality | null>(null);
  const reconnecting = useRef(false);
  const facingRef = useRef<CameraFacing>("user");

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cameraTrack = useRef<MediaStreamTrack | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const callRef = useRef<Call | null>(null);
  const remoteUserId = useRef<string | null>(null);
  const peerKey = useRef<string | null>(null);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const ringTimer = useRef<number | null>(null);
  const ringAudio = useRef<AudioContext | null>(null);
  const ringInterval = useRef<number | null>(null);
  const iceServers = useRef<RTCIceServer[]>([]);

  const stopRing = useCallback(() => {
    if (ringTimer.current) {
      window.clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
    if (ringInterval.current) {
      window.clearInterval(ringInterval.current);
      ringInterval.current = null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    cameraTrack.current = null;
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    remoteStream.current = null;
    peer.current?.close();
    peer.current = null;
    pendingOffer.current = null;
    pendingCandidates.current = [];
    stopRing();
  }, [stopRing]);

  const emitMediaState = useCallback(
    (next: {
      muted?: boolean;
      cameraOff?: boolean;
      sharingScreen?: boolean;
    }) => {
      const active = callRef.current;
      if (!active || !socket) return;
      socket.emit("call:media-state", { callId: active.id, ...next });
    },
    [socket],
  );

  const end = useCallback(() => {
    if (callRef.current)
      socket?.emit("call:end", { callId: callRef.current.id });
    stopMedia();
    setCall(null);
    setIncoming(null);
    setSharingScreen(false);
    setMuted(false);
    setCameraOff(false);
    setPeerMuted(false);
    setPeerCameraOff(false);
    setSafetyNumber(null);
    setError(null);
    setElapsed(0);
    setConnected(false);
    setNetworkHint(null);
    setQuality(null);
    setFacing("user");
    facingRef.current = "user";
    reconnecting.current = false;
  }, [socket, stopMedia]);

  const sendSignal = useCallback(
    async (callId: string, toUserId: string, signal: CallSignal) => {
      let payload: CallSignal = signal;
      if (peerKey.current && e2eReady) {
        try {
          const encrypted = await encryptForPeer(
            JSON.stringify(signal),
            peerKey.current,
          );
          payload = { encrypted };
        } catch {
          setError("Couldn’t encrypt call signaling. Signal not sent.");
          return;
        }
      }
      socket?.emit("call:signal", { callId, toUserId, signal: payload });
    },
    [e2eReady, socket],
  );

  const flushCandidates = useCallback(async () => {
    if (!peer.current) return;
    const queued = pendingCandidates.current.splice(0);
    for (const candidate of queued) {
      try {
        await peer.current.addIceCandidate(candidate);
      } catch {
        /* stale candidate */
      }
    }
  }, []);

  const preparePeer = useCallback(
    async (next: Call, targetUserId: string) => {
      remoteUserId.current = targetUserId;
      if (!iceServers.current.length) {
        iceServers.current = await fetchIceServers();
      }
      try {
        await ensureIdentityKeys();
        setE2eReady(true);
        const key = await fetchPeerPublicKey(targetUserId);
        peerKey.current = key;
        if (key) setSafetyNumber(await callSafetyNumber(key));
      } catch {
        setE2eReady(false);
      }

      const connection = new RTCPeerConnection({
        iceServers: iceServers.current,
      });
      remoteStream.current = new MediaStream();
      connection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        if (!event.streams[0] && event.track) {
          remoteStream.current?.addTrack(event.track);
        }
        if (remoteVideo.current && remoteStream.current) {
          remoteVideo.current.srcObject = remoteStream.current;
        }
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(next.id, targetUserId, {
            candidate: event.candidate.toJSON(),
          });
        }
      };
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        if (state === "connected") {
          setConnected(true);
          setError(null);
          setNetworkHint(null);
          reconnecting.current = false;
          return;
        }
        if (state === "disconnected" || state === "failed") {
          setConnected(false);
          setNetworkHint(
            state === "failed" ? "Connection failed" : "Poor network — reconnecting…",
          );
          if (reconnecting.current) return;
          reconnecting.current = true;
          void (async () => {
            try {
              connection.restartIce();
              const offer = await connection.createOffer({ iceRestart: true });
              await connection.setLocalDescription(offer);
              const peerId = remoteUserId.current;
              const active = callRef.current;
              if (peerId && active) {
                await sendSignal(active.id, peerId, { description: offer });
              }
            } catch {
              setError("Connection interrupted");
              socket?.emit("call:end", { callId: callRef.current?.id });
              stopMedia();
              setCall(null);
            } finally {
              window.setTimeout(() => {
                reconnecting.current = false;
              }, 4000);
            }
          })();
        }
      };
      peer.current = connection;
      return connection;
    },
    [sendSignal, socket, stopMedia],
  );

  const attachLocal = useCallback((local: MediaStream) => {
    stream.current = local;
    cameraTrack.current =
      local.getVideoTracks()[0] ?? cameraTrack.current ?? null;
    if (localVideo.current) localVideo.current.srcObject = local;
  }, []);

  const accept = useCallback(async () => {
    if (!incoming) return;
    stopRing();
    setError(null);
    try {
      const local = await acquireLocalStream(incoming.type, facingRef.current);
      attachLocal(local);
      const target = incoming.callerId;
      const connection = await preparePeer(incoming, target);
      local.getTracks().forEach((track) => connection.addTrack(track, local));
      preferHdCodecs(connection);
      await applyHdSenderParams(connection);
      if (pendingOffer.current) {
        await connection.setRemoteDescription(pendingOffer.current);
        await flushCandidates();
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        await sendSignal(incoming.id, target, { description: answer });
        pendingOffer.current = null;
      }
      socket?.emit("call:accept", { callId: incoming.id });
      setCall(incoming);
      setIncoming(null);
    } catch {
      setError("Camera or microphone permission is required.");
    }
  }, [
    attachLocal,
    flushCandidates,
    incoming,
    preparePeer,
    sendSignal,
    socket,
    stopRing,
  ]);

  useEffect(() => {
    const invite = (next: Call) => {
      if (callRef.current) {
        socket?.emit("call:busy", { callId: next.id });
        return;
      }
      setIncoming(next);
      void notifyIncoming(next);
      void (async () => {
        try {
          await ensureIdentityKeys();
          setE2eReady(true);
          const key = await fetchPeerPublicKey(next.callerId);
          peerKey.current = key;
          if (key) setSafetyNumber(await callSafetyNumber(key));
        } catch {
          /* keys optional until accept */
        }
      })();
      try {
        const ctx = new AudioContext();
        ringAudio.current = ctx;
        playRingTone(ctx);
        ringInterval.current = window.setInterval(() => {
          if (ringAudio.current) playRingTone(ringAudio.current);
        }, 2000);
      } catch {
        /* autoplay blocked */
      }
      if (ringTimer.current) window.clearTimeout(ringTimer.current);
      ringTimer.current = window.setTimeout(() => {
        socket?.emit("call:missed", { callId: next.id });
        setIncoming(null);
        stopRing();
      }, 45000);
    };

    const resolveSignal = async (raw: CallSignal): Promise<CallSignal> => {
      if (!raw.encrypted) return raw;
      try {
        const plain = await decryptFromPeer(raw.encrypted, peerKey.current);
        return JSON.parse(plain) as CallSignal;
      } catch {
        return raw;
      }
    };

    const signal = async ({
      callId,
      fromUserId,
      signal: raw,
    }: {
      callId: string;
      fromUserId: string;
      signal: CallSignal;
    }) => {
      const next = await resolveSignal(raw);
      if (next.description?.type === "offer") {
        remoteUserId.current = fromUserId;
        // Offer arrived after accept — answer immediately instead of parking it.
        if (peer.current && callRef.current?.id === callId) {
          try {
            await peer.current.setRemoteDescription(next.description);
            await flushCandidates();
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            await sendSignal(callId, fromUserId, { description: answer });
            pendingOffer.current = null;
          } catch {
            pendingOffer.current = next.description;
          }
          return;
        }
        pendingOffer.current = next.description;
        return;
      }
      if (!peer.current || callRef.current?.id !== callId) {
        if (next.candidate) pendingCandidates.current.push(next.candidate);
        return;
      }
      if (next.description) {
        await peer.current.setRemoteDescription(next.description);
        await flushCandidates();
      }
      if (next.candidate) {
        if (!peer.current.remoteDescription) {
          pendingCandidates.current.push(next.candidate);
        } else {
          try {
            await peer.current.addIceCandidate(next.candidate);
          } catch {
            /* ignore */
          }
        }
      }
      remoteUserId.current = fromUserId;
    };

    const start = async (event: Event) => {
      const next = (event as CustomEvent<Call>).detail;
      const target = next.participants.find(
        (item) => item.userId !== next.callerId,
      )?.userId;
      if (!next || !target) return;
      setError(null);
      try {
        const local = await acquireLocalStream(next.type, facingRef.current);
        attachLocal(local);
        const connection = await preparePeer(next, target);
        local.getTracks().forEach((track) => connection.addTrack(track, local));
        preferHdCodecs(connection);
        await applyHdSenderParams(connection);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await sendSignal(next.id, target, { description: offer });
        setCall(next);
      } catch {
        setError("Camera or microphone permission is required.");
      }
    };

    const onAccepted = ({ callId }: { callId: string; userId: string }) => {
      if (callRef.current?.id === callId) {
        setError(null);
        setConnected(true);
      }
    };

    const onBusy = ({ callId }: { callId: string }) => {
      if (callRef.current?.id === callId) {
        setError("User is busy");
        stopMedia();
        setCall(null);
        setConnected(false);
      }
    };

    const onMediaState = ({
      callId,
      muted: nextMuted,
      cameraOff: nextCameraOff,
    }: {
      callId: string;
      muted?: boolean;
      cameraOff?: boolean;
    }) => {
      if (callRef.current?.id !== callId) return;
      if (typeof nextMuted === "boolean") setPeerMuted(nextMuted);
      if (typeof nextCameraOff === "boolean") setPeerCameraOff(nextCameraOff);
    };

    const hangupRemote = () => {
      stopMedia();
      setCall(null);
      setIncoming(null);
      setSharingScreen(false);
      setConnected(false);
      setNetworkHint(null);
    };

    socket?.on("call:incoming", invite);
    socket?.on("call:signal", signal);
    socket?.on("call:accepted", onAccepted);
    socket?.on("call:busy", onBusy);
    socket?.on("call:media-state", onMediaState);
    socket?.on("call:end", hangupRemote);
    socket?.on("call:decline", hangupRemote);
    socket?.on("call:missed", () => {
      setIncoming(null);
      stopRing();
      stopMedia();
      setCall(null);
      setConnected(false);
    });
    window.addEventListener(CALL_START_EVENT, start);
    return () => {
      socket?.off("call:incoming", invite);
      socket?.off("call:signal", signal);
      socket?.off("call:accepted", onAccepted);
      socket?.off("call:busy", onBusy);
      socket?.off("call:media-state", onMediaState);
      socket?.off("call:end", hangupRemote);
      socket?.off("call:decline", hangupRemote);
      socket?.off("call:missed");
      window.removeEventListener(CALL_START_EVENT, start);
    };
  }, [
    attachLocal,
    flushCandidates,
    preparePeer,
    sendSignal,
    socket,
    stopMedia,
    stopRing,
  ]);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => () => stopMedia(), [stopMedia]);

  useEffect(() => {
    if (!call || !connected) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [call, connected]);

  useEffect(() => {
    const onDeviceChange = () => {
      setNetworkHint((prev) => prev ?? "Audio device changed");
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        onDeviceChange,
      );
    };
  }, []);

  const toggleSpeaker = async () => {
    const el = remoteVideo.current as HTMLVideoElement & {
      setSinkId?: (id: string) => Promise<void>;
    };
    if (!el?.setSinkId) {
      setSpeakerOn((v) => !v);
      if (el) el.muted = speakerOn;
      return;
    }
    try {
      // "" = default output (often speaker on desktop). "communications" unsupported in most browsers.
      await el.setSinkId("");
      el.muted = false;
      setSpeakerOn(true);
    } catch {
      el.muted = speakerOn;
      setSpeakerOn((v) => !v);
    }
  };

  useEffect(() => {
    if (!call || !connected || !peer.current) return;
    let cancelled = false;
    const tick = async () => {
      const connection = peer.current;
      if (!connection || cancelled) return;
      const sample = await sampleCallQuality(connection);
      if (cancelled) return;
      setQuality(sample.quality);
      if (sample.quality === "poor" || sample.quality === "fair") {
        setNetworkHint(
          sample.quality === "poor"
            ? "Poor connection — lowering video quality"
            : "Fair connection",
        );
        await applyDegradedSenderParams(connection);
      } else if (sample.quality === "excellent") {
        setNetworkHint(null);
        await applyHdSenderParams(connection);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [call, connected]);

  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);

  const toggleMute = () => {
    const next = !muted;
    stream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
    emitMediaState({ muted: next });
  };

  const toggleCamera = async () => {
    if (sharingScreen) return;
    const next = !cameraOff;
    stream.current?.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setCameraOff(next);
    emitMediaState({ cameraOff: next });
  };

  const switchCamera = async () => {
    if (!peer.current || !call || call.type !== "VIDEO" || sharingScreen) return;
    try {
      const { stream: nextStream, track } = await switchCameraFacing(
        stream.current,
        facingRef.current,
      );
      const nextFacing: CameraFacing =
        facingRef.current === "user" ? "environment" : "user";
      setFacing(nextFacing);
      facingRef.current = nextFacing;
      stream.current = nextStream;
      cameraTrack.current = track;
      if (track) {
        track.enabled = !cameraOff;
        await replaceVideoTrack(peer.current, track);
      }
      if (localVideo.current) localVideo.current.srcObject = nextStream;
      await applyHdSenderParams(peer.current);
    } catch {
      setError("Couldn’t switch camera on this device.");
    }
  };

  const stopScreenShare = useCallback(async () => {
    if (!peer.current || !callRef.current) return;
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    const active = callRef.current;
    let cam = cameraTrack.current;
    if (!cam && active.type === "VIDEO") {
      try {
        cam =
          (
            await acquireLocalStream("VIDEO", facingRef.current)
          ).getVideoTracks()[0] ?? null;
      } catch {
        cam = null;
      }
    }
    if (cam) {
      cameraTrack.current = cam;
      await replaceVideoTrack(peer.current, cam);
      if (stream.current) {
        stream.current.getVideoTracks().forEach((t) => {
          stream.current?.removeTrack(t);
          if (t !== cam) t.stop();
        });
        stream.current.addTrack(cam);
        if (localVideo.current) localVideo.current.srcObject = stream.current;
      }
      await applyHdSenderParams(peer.current);
    } else {
      await replaceVideoTrack(peer.current, null);
    }
    setSharingScreen(false);
    emitMediaState({ sharingScreen: false, cameraOff });
  }, [cameraOff, emitMediaState]);

  const toggleScreen = async () => {
    if (!peer.current || !call) return;
    if (sharingScreen) {
      await stopScreenShare();
      return;
    }
    try {
      const display = await acquireDisplayStream();
      screenStream.current = display;
      const track = display.getVideoTracks()[0];
      if (!track) return;
      track.onended = () => {
        void stopScreenShare();
      };
      await replaceVideoTrack(peer.current, track);
      if (stream.current) {
        stream.current.getVideoTracks().forEach((t) => {
          stream.current?.removeTrack(t);
        });
        stream.current.addTrack(track);
        if (localVideo.current) localVideo.current.srcObject = stream.current;
      }
      setSharingScreen(true);
      setCameraOff(false);
      emitMediaState({ sharingScreen: true, cameraOff: false });
    } catch {
      setError("Screen share was blocked or cancelled.");
    }
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (incoming) {
    return (
      <div className="fixed inset-x-3 bottom-[max(1rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-50 mx-auto w-[min(24rem,calc(100vw-1.5rem))] max-w-sm rounded-[2rem] border-2 border-white/75 bg-[var(--ink)] p-5 text-[var(--cloud-elevated)] shadow-2xl backdrop-blur-xl lg:bottom-5">
        <p className="text-xs tracking-[.2em] text-[var(--ember)] uppercase">
          Incoming {incoming.type.toLowerCase()} call
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
          {incoming.caller.name ?? incoming.caller.handle ?? "Relune member"}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/85">
          <Shield className="size-3 text-[var(--signal)]" />
          End-to-end encrypted · DTLS-SRTP
        </p>
        {error ? (
          <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void accept()}
            className="rounded-full border-2 border-[var(--signal)] bg-[var(--signal)] px-5 py-3 text-sm font-bold text-white"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => {
              socket?.emit("call:decline", { callId: incoming.id });
              stopRing();
              setIncoming(null);
            }}
            className="on-dark-control px-5 py-3 text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (!call) {
    if (error) {
      return (
        <div className="fixed inset-x-3 bottom-[max(1rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-50 mx-auto w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl bg-[var(--ink)] px-4 py-3 text-sm text-white shadow-xl sm:inset-x-auto sm:right-5 sm:mx-0 lg:bottom-5">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-xs text-[var(--ember)]"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return null;
  }

  const peerName =
    call.participants.find((p) => p.userId !== call.callerId)?.user.name ??
    call.caller.name ??
    call.caller.handle ??
    "Call";

  return (
    <div className="fixed right-3 bottom-[max(1rem,calc(4.5rem+env(safe-area-inset-bottom)))] left-3 z-50 mx-auto w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border-2 border-white/75 bg-[var(--ink)] p-3 text-white shadow-2xl sm:right-5 sm:left-auto sm:mx-0 lg:bottom-5">
      <div className="relative aspect-video overflow-hidden rounded-[1.35rem] bg-[var(--night-elevated)]">
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        <video
          ref={localVideo}
          autoPlay
          muted
          playsInline
          className={`absolute right-2 bottom-2 h-20 w-14 rounded-xl border-2 border-white/70 object-cover ${
            facing === "user" && !sharingScreen ? "scale-x-[-1]" : ""
          }`}
        />
        <div className="absolute top-3 left-3 space-y-1">
          <p className="text-xs font-semibold">{peerName}</p>
          <p className="text-[10px] font-medium text-white/90">
            {connected ? formatElapsed(elapsed) : "Calling…"}
          </p>
        </div>
        <div className="absolute bottom-2 left-3 flex flex-col gap-1 text-[10px] font-medium text-white/90">
          <span className="inline-flex items-center gap-1">
            <Shield className="size-3 text-[var(--signal)]" />
            {e2eReady ? "E2E · HD" : "Secure WebRTC"}
            {quality ? ` · ${quality}` : ""}
            {sharingScreen ? " · sharing" : ""}
            {!sharingScreen && call.type === "VIDEO"
              ? facing === "user"
                ? " · front"
                : " · rear"
              : ""}
          </span>
          {networkHint ? <span>{networkHint}</span> : null}
          {peerMuted ? <span>Peer muted</span> : null}
          {peerCameraOff ? <span>Peer camera off</span> : null}
        </div>
      </div>
      {safetyNumber ? (
        <p className="mt-2 px-1 font-mono text-[10px] tracking-wide text-white/80">
          Verify: {safetyNumber}
        </p>
      ) : null}
      {error ? (
        <p className="mt-1 px-1 text-[10px] text-[var(--danger)]">{error}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={toggleMute}
          className="on-dark-control"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => void toggleSpeaker()}
          className="on-dark-control"
          aria-label={speakerOn ? "Speaker on" : "Speaker off"}
        >
          {speakerOn ? (
            <Volume2 className="size-4" />
          ) : (
            <VolumeX className="size-4" />
          )}
        </button>
        {call.type === "VIDEO" ? (
          <>
            <button
              type="button"
              onClick={() => void toggleCamera()}
              className="on-dark-control"
              aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
              disabled={sharingScreen}
            >
              {cameraOff ? (
                <VideoOff className="size-4" />
              ) : (
                <Video className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void switchCamera()}
              className="on-dark-control"
              aria-label={
                facing === "user" ? "Switch to rear camera" : "Switch to front camera"
              }
              disabled={sharingScreen || cameraOff}
              title={facing === "user" ? "Rear camera" : "Front camera"}
            >
              <SwitchCamera className="size-4" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void toggleScreen()}
          className={
            sharingScreen
              ? "on-dark-control on-dark-control-active"
              : "on-dark-control"
          }
          aria-label={sharingScreen ? "Stop sharing" : "Share screen"}
        >
          <MonitorUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={end}
          className="on-dark-control on-dark-control-active"
          aria-label="End call"
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}
