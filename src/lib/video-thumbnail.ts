/** Browser-only helpers for Shorts video metadata + poster frames. */

export type VideoProbe = {
  durationSec: number;
  width: number;
  height: number;
  objectUrl: string;
};

export async function probeVideoFile(file: File): Promise<VideoProbe> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const meta = await loadVideoMeta(objectUrl);
    return { ...meta, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function loadVideoMeta(src: string) {
  return new Promise<{ durationSec: number; width: number; height: number }>(
    (resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };
      video.onloadedmetadata = () => {
        const durationSec = Number.isFinite(video.duration)
          ? video.duration
          : 0;
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        cleanup();
        if (!durationSec || !width || !height) {
          reject(new Error("Could not read video metadata"));
          return;
        }
        resolve({ durationSec, width, height });
      };
      video.onerror = () => {
        cleanup();
        reject(new Error("Could not load video preview"));
      };
      video.src = src;
    },
  );
}

/** Capture a JPEG poster near 1s (or mid-clip for short videos). */
export async function captureVideoThumbnail(
  objectUrl: string,
  durationSec: number,
): Promise<File> {
  const seekTo = Math.min(1, Math.max(0.1, durationSec * 0.15));
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () =>
      reject(new Error("Could not load video for thumbnail"));
    video.src = objectUrl;
  });

  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    try {
      video.currentTime = seekTo;
    } catch {
      reject(new Error("Could not seek video for thumbnail"));
    }
  });

  const maxEdge = 720;
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 1280;
  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Thumbnail canvas unavailable");
  ctx.drawImage(video, 0, 0, width, height);

  video.removeAttribute("src");
  video.load();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("Could not encode thumbnail"));
      },
      "image/jpeg",
      0.82,
    );
  });

  return new File([blob], `thumb-${Date.now()}.jpg`, { type: "image/jpeg" });
}
