/** Client `accept` strings aligned with server allowlist. */
export const ACCEPT_BY_PURPOSE = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  avatar: "image/jpeg,image/png,image/webp",
  video: "video/mp4,video/webm",
  post: "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm",
  story: "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm",
  short: "video/mp4,video/webm",
  message:
    "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  document:
    "application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  audio: "audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav",
} as const;
