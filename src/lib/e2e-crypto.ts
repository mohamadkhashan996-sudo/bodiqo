/**
 * Client-side E2E helpers using Web Crypto (ECDH P-256 + AES-GCM).
 * Private keys stay in IndexedDB; only public keys are uploaded to the server.
 */

const DB_NAME = "relune-e2e";
const STORE = "keys";

function bufToB64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string) {
  const db = await openDb();
  return new Promise<CryptoKey | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CryptoKey) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: CryptoKey) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function ensureIdentityKeys() {
  let privateKey = await idbGet("private");
  let publicKey = await idbGet("public");
  if (!privateKey || !publicKey) {
    const pair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveKey", "deriveBits"],
    );
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    await idbSet("private", privateKey);
    await idbSet("public", publicKey);
  }
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  const publicKeyJson = JSON.stringify(jwk);
  await fetch("/api/crypto/keys", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey: publicKeyJson }),
  });
  return { publicKeyJson };
}

async function importPeerPublic(jwkJson: string) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwkJson),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function deriveAesKey(peerPublicJwk: string) {
  const privateKey = await idbGet("private");
  if (!privateKey) throw new Error("Missing local encryption key");
  const peerKey = await importPeerPublic(peerPublicJwk);
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export type EncryptedPayload = {
  ciphertext: string;
  nonce: string;
  senderEphemeralKey: string;
};

export async function encryptForPeer(plaintext: string, peerPublicJwk: string): Promise<EncryptedPayload> {
  const aes = await deriveAesKey(peerPublicJwk);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aes,
    new TextEncoder().encode(plaintext),
  );
  const ownPublic = await idbGet("public");
  const senderEphemeralKey = ownPublic
    ? JSON.stringify(await crypto.subtle.exportKey("jwk", ownPublic))
    : "";
  return {
    ciphertext: bufToB64(encrypted),
    nonce: bufToB64(nonce.buffer),
    senderEphemeralKey,
  };
}

export async function decryptFromPeer(
  payload: { ciphertext: string; nonce: string; senderEphemeralKey?: string | null },
  peerPublicJwk?: string | null,
) {
  const jwk = peerPublicJwk || payload.senderEphemeralKey;
  if (!jwk) throw new Error("Missing peer key");
  const aes = await deriveAesKey(jwk);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(payload.nonce)) },
    aes,
    b64ToBuf(payload.ciphertext),
  );
  return new TextDecoder().decode(plain);
}

export async function fetchPeerPublicKey(userId: string) {
  const res = await fetch(`/api/crypto/keys/${userId}`);
  const data = await res.json();
  return (data.publicKey as string | null) ?? null;
}

/** Short shared safety number from both identity public keys (call verification). */
export async function callSafetyNumber(peerPublicJwk: string) {
  const own = await idbGet("public");
  if (!own) return null;
  const ownJwk = JSON.stringify(await crypto.subtle.exportKey("jwk", own));
  const [a, b] = [ownJwk, peerPublicJwk].sort();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${a}|${b}`),
  );
  const bytes = new Uint8Array(digest);
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    const n = (bytes[i * 2]! << 8) | bytes[i * 2 + 1]!;
    groups.push(String(n % 10000).padStart(4, "0"));
  }
  return groups.join(" ");
}

