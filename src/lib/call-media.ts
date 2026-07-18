/** WebRTC media helpers: HD constraints, ICE, track replace, quality. */

export type CallMediaKind = "AUDIO" | "VIDEO";
export type CameraFacing = "user" | "environment";
export type CallQuality = "excellent" | "good" | "fair" | "poor";

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

export function mediaConstraints(
  kind: CallMediaKind,
  facing: CameraFacing = "user",
): MediaStreamConstraints {
  return {
    audio: HD_AUDIO_CONSTRAINTS,
    video:
      kind === "VIDEO"
        ? {
            ...HD_VIDEO_CONSTRAINTS,
            facingMode: { ideal: facing },
          }
        : false,
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

export async function acquireLocalStream(
  kind: CallMediaKind,
  facing: CameraFacing = "user",
) {
  const stream = await navigator.mediaDevices.getUserMedia(
    mediaConstraints(kind, facing),
  );
  for (const track of stream.getVideoTracks()) {
    try {
      track.contentHint = "motion";
    } catch {
      /* unsupported */
    }
  }
  return stream;
}

export async function acquireDisplayStream() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: true,
  });
  for (const track of stream.getVideoTracks()) {
    try {
      track.contentHint = "detail";
    } catch {
      /* unsupported */
    }
  }
  return stream;
}

/** Switch front ↔ rear camera mid-call; falls back to new getUserMedia. */
export async function switchCameraFacing(
  current: MediaStream | null,
  facing: CameraFacing,
): Promise<{ stream: MediaStream; track: MediaStreamTrack | null }> {
  const nextFacing: CameraFacing =
    facing === "user" ? "environment" : "user";

  // Prefer in-place constraint apply when the same device supports it.
  const existing = current?.getVideoTracks()[0];
  if (existing && typeof existing.applyConstraints === "function") {
    try {
      await existing.applyConstraints({
        facingMode: { exact: nextFacing },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      });
      return { stream: current!, track: existing };
    } catch {
      /* fall through to device swap */
    }
  }

  const fresh = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      ...HD_VIDEO_CONSTRAINTS,
      facingMode: { ideal: nextFacing },
    },
  });
  const track = fresh.getVideoTracks()[0] ?? null;
  if (track) {
    try {
      track.contentHint = "motion";
    } catch {
      /* ignore */
    }
  }
  if (current && track) {
    const audioTracks = current.getAudioTracks();
    const merged = new MediaStream([...audioTracks, track]);
    current.getVideoTracks().forEach((t) => {
      current.removeTrack(t);
      t.stop();
    });
    return { stream: merged, track };
  }
  return { stream: fresh, track };
}

/** Prefer VP9/H264 for HD when the browser exposes codec preferences. */
export function preferHdCodecs(connection: RTCPeerConnection) {
  try {
    const transceiver = connection
      .getTransceivers()
      .find(
        (t) =>
          t.sender.track?.kind === "video" ||
          t.receiver.track?.kind === "video",
      );
    if (!transceiver || typeof RTCRtpReceiver.getCapabilities !== "function")
      return;
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

/** Cap outbound video around 720p/2.5Mbps for stable HD. */
export async function applyHdSenderParams(connection: RTCPeerConnection) {
  const sender = connection
    .getSenders()
    .find((item) => item.track?.kind === "video");
  if (!sender || typeof sender.getParameters !== "function") return;
  try {
    const params = sender.getParameters();
    if (!params.encodings?.length) {
      params.encodings = [{}];
    }
    for (const encoding of params.encodings) {
      encoding.maxBitrate = 2_500_000;
      encoding.maxFramerate = 30;
      encoding.scaleResolutionDownBy = 1;
    }
    await sender.setParameters(params);
  } catch {
    /* ignore */
  }
}

/** Soften bitrate when network is struggling. */
export async function applyDegradedSenderParams(
  connection: RTCPeerConnection,
) {
  const sender = connection
    .getSenders()
    .find((item) => item.track?.kind === "video");
  if (!sender || typeof sender.getParameters !== "function") return;
  try {
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    for (const encoding of params.encodings) {
      encoding.maxBitrate = 600_000;
      encoding.maxFramerate = 20;
      encoding.scaleResolutionDownBy = 2;
    }
    await sender.setParameters(params);
  } catch {
    /* ignore */
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

/**
 * Sample inbound RTP stats → coarse quality label.
 * Uses packet loss + jitter when available.
 */
export async function sampleCallQuality(
  connection: RTCPeerConnection,
): Promise<{ quality: CallQuality; lossPct: number; rttMs: number | null }> {
  try {
    const stats = await connection.getStats();
    let packetsLost = 0;
    let packetsReceived = 0;
    let jitter = 0;
    let rttMs: number | null = null;

    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "video") {
        packetsLost += Number(report.packetsLost ?? 0);
        packetsReceived += Number(report.packetsReceived ?? 0);
        jitter = Math.max(jitter, Number(report.jitter ?? 0));
      }
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        const rtt = Number(report.currentRoundTripTime ?? 0);
        if (rtt > 0) rttMs = Math.round(rtt * 1000);
      }
    });

    const total = packetsLost + packetsReceived;
    const lossPct = total > 0 ? (packetsLost / total) * 100 : 0;

    let quality: CallQuality = "excellent";
    if (lossPct > 8 || jitter > 0.08 || (rttMs ?? 0) > 400) quality = "poor";
    else if (lossPct > 3 || jitter > 0.04 || (rttMs ?? 0) > 250) quality = "fair";
    else if (lossPct > 1 || jitter > 0.02 || (rttMs ?? 0) > 150) quality = "good";

    return { quality, lossPct, rttMs };
  } catch {
    return { quality: "good", lossPct: 0, rttMs: null };
  }
}
