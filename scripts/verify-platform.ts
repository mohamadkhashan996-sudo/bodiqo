#!/usr/bin/env npx tsx
/**
 * Full platform operational verification against a running Relune server.
 * Usage: BASE_URL=http://localhost:3000 npm run test:verify
 *
 * Covers: health, public pages, auth session, demo login, feed/search/profile,
 * notifications, messaging, calls APIs, and Socket.IO handshake.
 */
import { io } from "socket.io-client";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.VERIFY_EMAIL || "maya@cirqua.local";
const password = process.env.VERIFY_PASSWORD || "cirqua1234";

type Jar = Map<string, string>;

const failures: string[] = [];
const warnings: string[] = [];

function fail(msg: string) {
  failures.push(msg);
  console.error(`FAIL  ${msg}`);
}
function warn(msg: string) {
  warnings.push(msg);
  console.warn(`WARN  ${msg}`);
}
function ok(msg: string) {
  console.log(`ok    ${msg}`);
}

function parseSetCookie(header: string | null, jar: Jar) {
  if (!header) return;
  // Node fetch may join multiple set-cookie; split carefully
  const parts = header.split(/,(?=\s*[^;=]+=[^;]+)/);
  for (const part of parts) {
    const nv = part.split(";")[0]?.trim();
    if (!nv) continue;
    const eq = nv.indexOf("=");
    if (eq < 0) continue;
    jar.set(nv.slice(0, eq), nv.slice(eq + 1));
  }
}

function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(
  path: string,
  init: RequestInit & { jar?: Jar; expect?: number | number[] } = {},
) {
  const jar = init.jar;
  const headers = new Headers(init.headers);
  if (jar?.size) headers.set("cookie", cookieHeader(jar));
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(`${base}${path}`, { ...init, headers, redirect: "manual" });
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  if (jar) {
    for (const c of raw) parseSetCookie(c, jar);
    // fallback
    parseSetCookie(res.headers.get("set-cookie"), jar);
  }
  const expect = init.expect ?? 200;
  const allowed = Array.isArray(expect) ? expect : [expect];
  if (!allowed.includes(res.status)) {
    const text = await res.text().catch(() => "");
    fail(`${init.method || "GET"} ${path} → ${res.status} (expected ${allowed.join("|")}) ${text.slice(0, 180)}`);
  } else {
    ok(`${init.method || "GET"} ${path} → ${res.status}`);
  }
  return res;
}

async function json<T = unknown>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function csrfLogin(jar: Jar) {
  // NextAuth credentials: CSRF + callback
  const csrfRes = await req("/api/auth/csrf", { jar });
  const csrfBody = await json<{ csrfToken?: string }>(csrfRes);
  const csrf = csrfBody?.csrfToken;
  if (!csrf) {
    fail("missing csrf token");
    return false;
  }
  const body = new URLSearchParams({
    csrfToken: csrf,
    email,
    password,
    callbackUrl: `${base}/home`,
    json: "true",
  });
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookieHeader(jar),
  });
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
  const set = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of set) parseSetCookie(c, jar);
  parseSetCookie(res.headers.get("set-cookie"), jar);
  if (res.status >= 400) {
    fail(`credentials login → ${res.status}`);
    return false;
  }
  ok(`credentials login → ${res.status}`);
  const session = await req("/api/auth/session", { jar });
  const s = await json<{ user?: { email?: string; handle?: string } }>(session);
  if (!s?.user?.email) {
    fail("session missing after login");
    return false;
  }
  ok(`session user ${s.user.email} @${s.user.handle ?? "?"}`);
  return true;
}

async function checkPages(jar?: Jar) {
  const publicPages = [
    "/",
    "/explore",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/terms",
    "/privacy",
    "/trending",
    "/communities",
    "/search",
    "/shorts",
    "/u/maya",
    "/manifest.webmanifest",
    "/sitemap.xml",
    "/robots.txt",
  ];
  for (const path of publicPages) {
    await req(path, { jar, expect: [200, 307, 308] });
  }

  if (!jar) return;
  const authed = [
    "/home",
    "/notifications",
    "/messages",
    "/calls",
    "/settings",
    "/settings/profile",
    "/settings/privacy",
    "/settings/security",
    "/settings/bookmarks",
    "/admin",
  ];
  for (const path of authed) {
    await req(path, { jar, expect: [200, 307, 308] });
  }
}

async function checkApis(jar: Jar) {
  const health = await req("/api/health?mode=ready", { jar });
  const h = await json<{ ok?: boolean; database?: string; redis?: string }>(health);
  if (!h?.ok) fail("health not ok");
  if (h?.database !== "up") fail(`database ${h?.database}`);
  if (h?.redis && h.redis !== "up" && h.redis !== "not_configured") {
    warn(`redis ${h.redis}`);
  }

  await req("/api/posts?limit=5", { jar });
  await req("/api/explore?limit=5", { jar });
  await req("/api/search?q=maya", { jar });
  await req("/api/trending", { jar });
  await req("/api/notifications", { jar });
  await req("/api/conversations", { jar });
  await req("/api/calls", { jar });
  await req("/api/calls/ice", { jar });
  await req("/api/users/me", { jar });
  await req("/api/users/maya", { jar });
  await req("/api/bookmarks", { jar });
  await req("/api/communities", { jar });
  await req("/api/stories", { jar, expect: [200, 404] });
  await req("/api/shorts?limit=5", { jar, expect: [200, 404] });

  // Create a post
  const body = `verify-${Date.now()} platform check`;
  const create = await req("/api/posts", {
    jar,
    method: "POST",
    body: JSON.stringify({ body, visibility: "PUBLIC" }),
    expect: [200, 201],
  });
  const created = await json<{ post?: { id?: string }; id?: string }>(create);
  const postId = created?.post?.id || created?.id;
  if (!postId) {
    fail("post create missing id");
  } else {
    await req(`/api/posts/${postId}/like`, { jar, method: "POST", expect: [200, 201] });
    await req(`/api/posts/${postId}/comments`, {
      jar,
      method: "POST",
      body: JSON.stringify({ body: "verify comment" }),
      expect: [200, 201],
    });
    await req(`/post/${postId}`, { jar, expect: [200, 307, 308] });
  }

  // Messaging DM with leo
  const leoRes = await req("/api/users/leo", { jar });
  const leo = await json<{ user?: { id?: string } }>(leoRes);
  const leoId = leo?.user?.id;
  if (leoId) {
    const dm = await req("/api/conversations", {
      jar,
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", userId: leoId }),
      expect: [200, 201],
    });
    const dmBody = await json<{ conversation?: { id?: string }; id?: string }>(dm);
    const conversationId = dmBody?.conversation?.id || dmBody?.id;
    if (conversationId) {
      await req(`/api/conversations/${conversationId}/messages`, {
        jar,
        method: "POST",
        body: JSON.stringify({ body: `verify-msg-${Date.now()}` }),
        expect: [200, 201],
      });
      await req(`/messages/${conversationId}`, { jar, expect: [200, 307, 308] });
    } else {
      fail("DM create missing conversation id");
    }
  } else {
    warn("leo user missing — skip DM check");
  }
}

async function checkSocket(jar: Jar) {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      fail("socket.io connect timeout");
      resolve();
    }, 8000);
    const socket = io(base, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      extraHeaders: { cookie: cookieHeader(jar) },
    });
    socket.on("connect", () => {
      ok(`socket.io connected ${socket.id}`);
      clearTimeout(timer);
      socket.close();
      resolve();
    });
    socket.on("connect_error", (err) => {
      fail(`socket.io ${err.message}`);
      clearTimeout(timer);
      socket.close();
      resolve();
    });
  });
}

async function main() {
  console.log(`Verifying ${base} as ${email}`);
  await checkPages();
  const jar: Jar = new Map();
  const loggedIn = await csrfLogin(jar);
  if (loggedIn) {
    await checkPages(jar);
    await checkApis(jar);
    await checkSocket(jar);
  }

  console.log("\n---");
  console.log(`failures: ${failures.length}`);
  console.log(`warnings: ${warnings.length}`);
  if (failures.length) {
    process.exit(1);
  }
  console.log("platform verify passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
