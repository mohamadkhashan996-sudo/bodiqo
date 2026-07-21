#!/usr/bin/env npx tsx
/**
 * Phone registration and login E2E test against a running development server.
 * Uses SMS_PROVIDER=log and the non-production debug code.
 */
import { PrismaClient } from "@prisma/client";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const phone = `+120255501${String(Date.now() % 100).padStart(2, "0")}`;
const handle = `phonetest${stamp}`.slice(0, 24);
const jar = new Map<string, string>();
let userId: string | undefined;

type Body = {
  debugCode?: string;
  token?: string;
  requires2fa?: boolean;
  user?: { id?: string; email?: string };
  error?: string;
};

function parseSetCookie(header: string | null) {
  if (!header) return;
  for (const part of header.split(/,(?=\s*[^;=]+=[^;]+)/)) {
    const pair = part.split(";")[0]?.trim();
    if (!pair) continue;
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set("cookie", cookieHeader());
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("x-forwarded-for", "198.51.100.42");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    parseSetCookie(cookie);
  }
  parseSetCookie(response.headers.get("set-cookie"));
  const body = (await response.json().catch(() => ({}))) as Body;
  return { response, body };
}

async function establishSession(token: string) {
  const csrf = await api("/api/auth/csrf");
  const csrfToken = (csrf.body as { csrfToken?: string }).csrfToken;
  if (!csrfToken) throw new Error("Auth.js did not issue a CSRF token");

  const response = await api("/api/auth/callback/challenge", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      token,
      remember: "true",
      callbackUrl: `${base}/home`,
      json: "true",
    }),
  });
  if (response.response.status >= 400) {
    throw new Error(`Session callback failed: ${response.response.status}`);
  }
}

function requireDebugCode(body: Body, step: string) {
  if (!body.debugCode) {
    throw new Error(
      `${step} did not return a debug code. Run this E2E test only with NODE_ENV=development and SMS_PROVIDER=log.`,
    );
  }
  return body.debugCode;
}

async function main() {
  console.log(`Phone auth E2E → ${base}`);

  const registerSend = await api("/api/auth/phone/send", {
    method: "POST",
    body: JSON.stringify({ phone, purpose: "REGISTER" }),
  });
  if (registerSend.response.status !== 200) {
    throw new Error(
      `Registration OTP send failed: ${registerSend.response.status} ${registerSend.body.error ?? ""}`,
    );
  }

  const register = await api("/api/auth/phone/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Phone Auth Test",
      handle,
      phone,
      code: requireDebugCode(registerSend.body, "Registration OTP"),
    }),
  });
  if (register.response.status !== 201 || !register.body.token) {
    throw new Error(
      `Phone registration failed: ${register.response.status} ${register.body.error ?? ""}`,
    );
  }
  userId = register.body.user?.id;
  await establishSession(register.body.token);

  const registeredSession = await api("/api/auth/session");
  if (!registeredSession.body.user?.id) {
    throw new Error("Phone registration did not establish a session");
  }
  console.log("PASS Phone registration + session");

  jar.clear();
  const loginSend = await api("/api/auth/phone/send", {
    method: "POST",
    body: JSON.stringify({ phone, purpose: "LOGIN" }),
  });
  if (loginSend.response.status !== 200) {
    throw new Error(
      `Login OTP send failed: ${loginSend.response.status} ${loginSend.body.error ?? ""}`,
    );
  }

  const login = await api("/api/auth/phone/login", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code: requireDebugCode(loginSend.body, "Login OTP"),
    }),
  });
  if (
    login.response.status !== 200 ||
    !login.body.token ||
    login.body.requires2fa
  ) {
    throw new Error(
      `Phone login failed: ${login.response.status} ${login.body.error ?? ""}`,
    );
  }
  await establishSession(login.body.token);

  const loginSession = await api("/api/auth/session");
  if (loginSession.body.user?.id !== userId) {
    throw new Error("Phone login session belongs to the wrong user");
  }
  console.log("PASS Phone OTP login + session");
}

main()
  .then(async () => {
    console.log("Phone authentication E2E passed.");
  })
  .catch((error) => {
    console.error(
      "Phone authentication E2E failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.phoneOtp
      .deleteMany({ where: { phone } })
      .catch(() => undefined);
    if (userId) {
      await prisma.authChallenge
        .deleteMany({ where: { userId } })
        .catch(() => undefined);
      await prisma.deviceSession
        .deleteMany({ where: { userId } })
        .catch(() => undefined);
      await prisma.loginHistory
        .deleteMany({ where: { userId } })
        .catch(() => undefined);
      await prisma.user
        .delete({ where: { id: userId } })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
  });
