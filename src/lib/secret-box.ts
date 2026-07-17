import { createHash, createHmac, randomBytes } from "node:crypto";
import { createCipheriv, createDecipheriv } from "node:crypto";
import { AppError } from "@/lib/errors";

const PREFIX = "enc:v1:";

function requireAuthSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("AUTH_SECRET is required", 500, "MISCONFIGURED");
    }
    throw new Error("AUTH_SECRET is required for secret sealing");
  }
  return secret;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`relune-sealed:${requireAuthSecret()}`)
    .digest();
}

/** Encrypt a short secret (e.g. TOTP) for at-rest storage. */
export function sealSecret(plain: string) {
  if (!plain) return plain;
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/** Decrypt a sealed secret; legacy plaintext values pass through in non-prod only. */
export function openSecret(stored: string | null | undefined) {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) {
    if (process.env.NODE_ENV === "production") return null;
    return stored;
  }
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

/** Time-limited TURN REST credentials (coturn shared-secret style). */
export function issueTurnCredentials(userId: string, ttlSeconds = 3600) {
  const secret = process.env.TURN_CREDENTIAL;
  if (!secret) return null;
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${userId}`;
  const credential = createHmac("sha1", secret).update(username).digest("base64");
  return { username, credential, ttlSeconds };
}
