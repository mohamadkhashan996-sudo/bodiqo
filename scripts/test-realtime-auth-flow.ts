#!/usr/bin/env npx tsx
/**
 * Two-user realtime E2E probe for messages, notifications, and call signaling.
 * It verifies server behavior without requesting microphone/camera access.
 */
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const password = "Realtime9x!";
const userIds: string[] = [];
let conversationId: string | undefined;
let callId: string | undefined;

type Jar = Map<string, string>;
type Json = Record<string, unknown>;

function parseSetCookie(header: string | null, jar: Jar) {
  if (!header) return;
  for (const part of header.split(/,(?=\s*[^;=]+=[^;]+)/)) {
    const pair = part.split(";")[0]?.trim();
    if (!pair) continue;
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function api(path: string, jar: Jar, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set("cookie", cookieHeader(jar));
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("x-forwarded-for", "198.51.100.73");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    parseSetCookie(cookie, jar);
  }
  parseSetCookie(response.headers.get("set-cookie"), jar);
  const body = (await response.json().catch(() => ({}))) as Json;
  return { response, body };
}

async function establishSession(jar: Jar, challengeToken: string) {
  const csrf = await api("/api/auth/csrf", jar);
  const csrfToken = csrf.body.csrfToken;
  if (typeof csrfToken !== "string") throw new Error("Missing CSRF token");
  const response = await api("/api/auth/callback/challenge", jar, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      token: challengeToken,
      remember: "true",
      callbackUrl: `${base}/home`,
      json: "true",
    }),
  });
  if (response.response.status >= 400) {
    throw new Error(`Session callback failed: ${response.response.status}`);
  }
}

async function createUser(label: string) {
  const { hashPassword } = await import("../src/modules/auth/password");
  const email = `realtime.${label}.${stamp}@relune.local`;
  const user = await prisma.user.create({
    data: {
      email,
      handle: `rt${label}${stamp}`.slice(0, 24),
      name: `Realtime ${label}`,
      passwordHash: await hashPassword(password),
      emailVerified: new Date(),
      status: "ACTIVE",
      onboardingDone: true,
      privacy: { create: { whoCanCall: "EVERYONE" } },
    },
    select: { id: true, email: true },
  });
  userIds.push(user.id);

  const jar: Jar = new Map();
  const login = await api("/api/auth/login", jar, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (typeof login.body.token !== "string") {
    throw new Error(`Login failed for ${label}: ${login.response.status}`);
  }
  await establishSession(jar, login.body.token);
  return { ...user, jar };
}

function connect(jar: Jar) {
  const socket = io(base, {
    path: "/socket.io",
    transports: ["websocket"],
    extraHeaders: { Cookie: cookieHeader(jar) },
    reconnection: false,
  });
  return new Promise<Socket>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connect timeout")), 10_000);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function eventOnce<T>(socket: Socket, event: string, timeout = 10_000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${event} event timeout`)),
      timeout,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function emitAck<T>(socket: Socket, event: string, input: unknown) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${event} acknowledgement timeout`)),
      10_000,
    );
    socket.emit(
      event,
      input,
      (result: { ok: boolean; data?: T; error?: string }) => {
        clearTimeout(timer);
        if (!result.ok) {
          reject(new Error(result.error || `${event} failed`));
          return;
        }
        resolve(result.data as T);
      },
    );
  });
}

async function main() {
  const alice = await createUser("alice");
  const bob = await createUser("bob");
  const [aliceSocket, bobSocket] = await Promise.all([
    connect(alice.jar),
    connect(bob.jar),
  ]);

  try {
    const conversation = await api("/api/conversations", alice.jar, {
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", userId: bob.id }),
    });
    const conversationBody = conversation.body.conversation as
      | { id?: string }
      | undefined;
    conversationId =
      conversationBody?.id ||
      (typeof conversation.body.id === "string"
        ? conversation.body.id
        : undefined);
    if (!conversationId) {
      throw new Error(`Conversation creation failed: ${conversation.response.status}`);
    }

    await emitAck(bobSocket, "conversation:join", { conversationId });
    const receivedMessage = eventOnce<{ body?: string }>(
      bobSocket,
      "message:new",
    );
    const messageText = `Realtime message ${stamp}`;
    const sent = await api(
      `/api/conversations/${conversationId}/messages`,
      alice.jar,
      { method: "POST", body: JSON.stringify({ body: messageText }) },
    );
    if (sent.response.status !== 201 && sent.response.status !== 200) {
      throw new Error(`Message send failed: ${sent.response.status}`);
    }
    if ((await receivedMessage).body !== messageText) {
      throw new Error("Recipient received the wrong message payload");
    }
    console.log("PASS Send and receive realtime messages");

    const incomingCall = eventOnce<{ id?: string }>(
      bobSocket,
      "call:incoming",
    );
    const callNotification = eventOnce<{ type?: string }>(
      bobSocket,
      "notification:new",
    );
    const call = await emitAck<{ id?: string }>(aliceSocket, "call:invite", {
      conversationId,
      calleeIds: [bob.id],
      type: "AUDIO",
    });
    const incoming = await incomingCall;
    callId = call.id || incoming.id;
    if (!callId) throw new Error("Call invite did not return a call ID");
    if ((await callNotification).type !== "CALL") {
      throw new Error("Call notification was not delivered in realtime");
    }
    console.log("PASS Realtime call invite and notification");

    const accepted = eventOnce<{ callId?: string }>(
      aliceSocket,
      "call:accepted",
    );
    await emitAck(bobSocket, "call:accept", { callId });
    if ((await accepted).callId !== callId) {
      throw new Error("Caller did not receive call acceptance");
    }

    const signal = eventOnce<{ callId?: string; signal?: unknown }>(
      bobSocket,
      "call:signal",
    );
    await emitAck(aliceSocket, "call:signal", {
      callId,
      toUserId: bob.id,
      signal: { type: "offer", sdp: "development-probe" },
    });
    if ((await signal).callId !== callId) {
      throw new Error("Call signaling was not delivered");
    }

    const ended = eventOnce<{ callId?: string }>(bobSocket, "call:end");
    await emitAck(aliceSocket, "call:end", { callId });
    if ((await ended).callId !== callId) {
      throw new Error("Callee did not receive call end");
    }
    console.log("PASS Call accept, signaling, and end events");
  } finally {
    aliceSocket.close();
    bobSocket.close();
  }
}

main()
  .catch((error) => {
    console.error(
      "Realtime E2E failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (callId) {
      await prisma.call.deleteMany({ where: { id: callId } }).catch(() => undefined);
    }
    if (conversationId) {
      await prisma.conversation
        .deleteMany({ where: { id: conversationId } })
        .catch(() => undefined);
    }
    if (userIds.length) {
      await prisma.notification
        .deleteMany({
          where: { OR: [{ userId: { in: userIds } }, { actorId: { in: userIds } }] },
        })
        .catch(() => undefined);
      await prisma.authChallenge
        .deleteMany({ where: { userId: { in: userIds } } })
        .catch(() => undefined);
      await prisma.deviceSession
        .deleteMany({ where: { userId: { in: userIds } } })
        .catch(() => undefined);
      await prisma.loginHistory
        .deleteMany({ where: { userId: { in: userIds } } })
        .catch(() => undefined);
      await prisma.user
        .deleteMany({ where: { id: { in: userIds } } })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
  });
