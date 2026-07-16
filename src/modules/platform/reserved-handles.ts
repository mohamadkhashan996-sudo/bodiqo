import { AppError } from "@/lib/errors";

const RESERVED_ROOT = "relune";

/** Map common homoglyphs and leetspeak to ASCII before comparison */
const HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a", // Cyrillic а
  "\u0435": "e", // Cyrillic е
  "\u043e": "o", // Cyrillic о
  "\u0440": "p", // Cyrillic р (sometimes used as r)
  "\u0456": "i",
  "\u04cf": "l",
  "\u1d00": "a",
  "\uff52": "r",
  "\uff4c": "l",
  "\uff45": "e",
  "\uff4e": "n",
  "\uff55": "u",
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
};

export function normalizeHandleCandidate(raw: string) {
  let value = raw
    .trim()
    .replace(/^@+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  for (const [from, to] of Object.entries(HOMOGLYPHS)) {
    value = value.split(from).join(to);
  }

  return value.replace(/[\s._\-·•]+/g, "");
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

/** Returns a user-facing error if the handle is reserved for the platform */
export function reservedHandleReason(raw: string): string | null {
  const normalized = normalizeHandleCandidate(raw);
  if (!normalized) return null;

  if (normalized === RESERVED_ROOT) {
    return "This username is reserved for the official RELUNE platform account.";
  }

  if (
    normalized.startsWith(RESERVED_ROOT) &&
    normalized.length <= RESERVED_ROOT.length + 2
  ) {
    return "Usernames similar to the official RELUNE account are not available.";
  }

  if (normalized.endsWith(RESERVED_ROOT) && normalized.length <= RESERVED_ROOT.length + 2) {
    return "Usernames similar to the official RELUNE account are not available.";
  }

  if (levenshtein(normalized, RESERVED_ROOT) <= 1) {
    return "This username is too similar to the official RELUNE account.";
  }

  if (normalized.includes(RESERVED_ROOT) && normalized.length <= RESERVED_ROOT.length + 3) {
    return "Usernames containing “relune” are reserved for the platform.";
  }

  return null;
}

export function assertHandleAvailable(raw: string) {
  const reason = reservedHandleReason(raw);
  if (reason) throw new AppError(reason, 409);
}

export const OFFICIAL_HANDLE = RESERVED_ROOT;
