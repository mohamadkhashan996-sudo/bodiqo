/** WebRTC media helpers: HD constraints, ICE, track replace. */

export type CallMediaKind = "AUDIO" | "VIDEO";

export const HD_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  facingMode: "user",
};

export const HD_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
};

export function mediaConstraints(kind: CallMediaKind): MediaStreamConstraints {
  return {
    audio: HD_AUDIO_CONSTRAINTS,
    video: kind === "VIDEO" ? HD_VIDEO_CONSTRAINTS : false,
  };
}

export function defaultIceServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
}

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch("/api/calls/ice");
    if (!res.ok) return defaultIceServers();
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    return data.iceServers?.length ? data.iceServers : defaultIceServers();
  } catch {
    return defaultIceServers();
  }
}

export async function acquireLocalStream(kind: CallMediaKind) {
  return navigator.mediaDevices.getUserMedia(mediaConstraints(kind));
}

export async function acquireDisplayStream() {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: true,
  });
}

/** Prefer VP9/H264 for HD when the browser exposes codec preferences. */
export function preferHdCodecs(connection: RTCPeerConnection) {
  try {
    const transceiver = connection
      .getTransceivers()
      .find((t) => t.sender.track?.kind === "video" || t.receiver.track?.kind === "video");
    if (!transceiver || typeof RTCRtpReceiver.getCapabilities !== "function") return;
    const caps = RTCRtpReceiver.getCapabilities("video");
    if (!caps?.codecs?.length) return;
    const preferred = [
      ...caps.codecs.filter((c) => /vp9/i.test(c.mimeType)),
      ...caps.codecs.filter((c) => /h264/i.test(c.mimeType)),
      ...caps.codecs.filter((c) => /vp8/i.test(c.mimeType)),
      ...caps.codecs,
    ];
    const seen = new Set<string>();
    const ordered = preferred.filter((c) => {
      const key = `${c.mimeType}:${c.sdpFmtpLine ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (
      ordered.length &&
      typeof transceiver.setCodecPreferences === "function"
    ) {
      transceiver.setCodecPreferences(ordered);
    }
  } catch {
    /* ignore unsupported browsers */
  }
}

export async function replaceVideoTrack(
  connection: RTCPeerConnection,
  track: MediaStreamTrack | null,
) {
  const sender = connection
    .getSenders()
    .find((item) => item.track?.kind === "video" || item.track === null);
  if (sender) {
    await sender.replaceTrack(track);
    return;
  }
  if (track) connection.addTrack(track);
}
