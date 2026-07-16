"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Shield, Video, VideoOff } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

type Participant = {
  userId: string;
  user: { id: string; name: string | null; handle: string | null; image: string | null };
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
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function CallOverlay() {
  const { socket } = useSocket();
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const callRef = useRef<Call | null>(null);
  const remoteUserId = useRef<string | null>(null);
  const pendingOffer = useRef<RTCSessionDescriptionInit | null>(null);
  const ringTimer = useRef<number | null>(null);

  const stopMedia = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    remoteStream.current = null;
    peer.current?.close();
    peer.current = null;
    if (ringTimer.current) {
      window.clearTimeout(ringTimer.current);
      ringTimer.current = null;
    }
  }, []);

  const end = useCallback(() => {
    if (call) socket?.emit("call:end", { callId: call.id });
    stopMedia();
    setCall(null);
    setIncoming(null);
  }, [call, socket, stopMedia]);

  const preparePeer = useCallback(
    (next: Call, targetUserId: string) => {
      remoteUserId.current = targetUserId;
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      remoteStream.current = new MediaStream();
      connection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        if (remoteVideo.current && remoteStream.current) {
          remoteVideo.current.srcObject = remoteStream.current;
        }
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("call:signal", {
            callId: next.id,
            toUserId: targetUserId,
            signal: { candidate: event.candidate.toJSON() },
          });
        }
      };
      peer.current = connection;
      return connection;
    },
    [socket],
  );

  const accept = useCallback(async () => {
    if (!incoming) return;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.type === "VIDEO",
      });
      if (localVideo.current) localVideo.current.srcObject = stream.current;
      const target = incoming.callerId;
      const connection = preparePeer(incoming, target);
      stream.current.getTracks().forEach((track) =>
        connection.addTrack(track, stream.current!),
      );
      if (pendingOffer.current) {
        await connection.setRemoteDescription(pendingOffer.current);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        socket?.emit("call:signal", {
          callId: incoming.id,
          toUserId: target,
          signal: { description: answer },
        });
        pendingOffer.current = null;
      }
      socket?.emit("call:accept", { callId: incoming.id });
      setCall(incoming);
      setIncoming(null);
    } catch {
      /* permission denied */
    }
  }, [incoming, preparePeer, socket]);

  useEffect(() => {
    const invite = (next: Call) => {
      setIncoming(next);
      if (ringTimer.current) window.clearTimeout(ringTimer.current);
      ringTimer.current = window.setTimeout(() => {
        socket?.emit("call:missed", { callId: next.id });
        setIncoming(null);
      }, 45000);
    };
    const signal = async ({
      callId,
      fromUserId,
      signal: next,
    }: {
      callId: string;
      fromUserId: string;
      signal: CallSignal;
    }) => {
      if (next.description?.type === "offer") {
        pendingOffer.current = next.description;
        return;
      }
      if (!peer.current || callRef.current?.id !== callId) return;
      if (next.description) await peer.current.setRemoteDescription(next.description);
      if (next.candidate) await peer.current.addIceCandidate(next.candidate);
      remoteUserId.current = fromUserId;
    };
    const start = async (event: Event) => {
      const next = (event as CustomEvent<Call>).detail;
      const target = next.participants.find((item) => item.userId !== next.callerId)
        ?.userId;
      if (!next || !target) return;
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: next.type === "VIDEO",
        });
        if (localVideo.current) localVideo.current.srcObject = stream.current;
        const connection = preparePeer(next, target);
        stream.current.getTracks().forEach((track) =>
          connection.addTrack(track, stream.current!),
        );
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket?.emit("call:signal", {
          callId: next.id,
          toUserId: target,
          signal: { description: offer },
        });
        setCall(next);
      } catch {
        /* permission denied */
      }
    };
    socket?.on("call:incoming", invite);
    socket?.on("call:signal", signal);
    socket?.on("call:end", end);
    socket?.on("call:decline", end);
    socket?.on("call:missed", () => {
      setIncoming(null);
      stopMedia();
    });
    window.addEventListener("relune:call-start", start);
    return () => {
      socket?.off("call:incoming", invite);
      socket?.off("call:signal", signal);
      socket?.off("call:end", end);
      socket?.off("call:decline", end);
      socket?.off("call:missed");
      window.removeEventListener("relune:call-start", start);
    };
  }, [end, preparePeer, socket, stopMedia]);

  useEffect(() => {
    callRef.current = call;
  }, [call]);
  useEffect(() => () => stopMedia(), [stopMedia]);

  if (incoming) {
    return (
      <div className="fixed inset-x-4 bottom-5 z-50 mx-auto max-w-sm rounded-[2rem] border border-white/60 bg-[var(--ink)] p-5 text-[var(--cloud)] shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[.2em] text-[var(--ember)]">
          Incoming {incoming.type.toLowerCase()} call
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl">
          {incoming.caller.name ?? incoming.caller.handle ?? "Relune member"}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/60">
          <Shield className="size-3 text-[var(--signal)]" />
          Encrypted WebRTC · DTLS
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void accept()}
            className="rounded-full bg-[var(--signal)] px-5 py-3 text-sm font-bold"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => {
              socket?.emit("call:decline", { callId: incoming.id });
              setIncoming(null);
            }}
            className="rounded-full bg-white/10 px-5 py-3 text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  if (!call) return null;

  const toggleMute = () => {
    stream.current?.getAudioTracks().forEach((track) => {
      track.enabled = muted;
    });
    setMuted((value) => !value);
  };
  const toggleCamera = () => {
    stream.current?.getVideoTracks().forEach((track) => {
      track.enabled = cameraOff;
    });
    setCameraOff((value) => !value);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 overflow-hidden rounded-[2rem] border border-white/50 bg-[var(--ink)] p-3 text-white shadow-2xl">
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
          className="absolute bottom-2 right-2 h-20 w-14 rounded-xl border border-white/30 object-cover"
        />
        <span className="absolute bottom-2 left-3 text-xs">
          {call.type.toLowerCase()} · encrypted
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={toggleMute} className="rounded-full bg-white/10 p-2.5">
          {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
        {call.type === "VIDEO" ? (
          <button type="button" onClick={toggleCamera} className="rounded-full bg-white/10 p-2.5">
            {cameraOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </button>
        ) : null}
        <button type="button" onClick={end} className="rounded-full bg-[var(--signal)] p-2.5">
          <PhoneOff className="size-4" />
        </button>
      </div>
    </div>
  );
}
