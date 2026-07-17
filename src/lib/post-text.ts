/** Pure post-body helpers (safe for server modules). */

export function extractHashtags(body?: string) {
  return [
    ...new Set(
      (body?.match(/#([\p{L}\p{N}_]{1,50})/gu) ?? []).map((tag) =>
        tag.slice(1).toLowerCase(),
      ),
    ),
  ];
}

export function extractMentions(body?: string) {
  return [
    ...new Set(
      (body?.match(/@([a-zA-Z0-9_.]{2,24})/g) ?? []).map((m) =>
        m.slice(1).toLowerCase(),
      ),
    ),
  ];
}

export const POST_BODY_TOKEN =
  /(@[a-zA-Z0-9_.]{2,24})|(#[\p{L}\p{N}_]{1,50})/gu;
