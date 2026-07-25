#!/usr/bin/env npx tsx
/**
 * Complete authentication flow test against a running Relune server.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/test-auth-flow.ts
 */
import { PrismaClient } from "@prisma/client";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);
const email = `auth.test.${stamp}@cirqua.local`;
const handle = `authtest${stamp}`.slice(0, 24);
const name = "Auth Test User";
const weakPasswords = [
  "short",
  "alllowercase1",
  "ALLUPPERCASE1",
  "NoDigitsHere",
  "password1",
  "cirqua123",
];
const strongPassword = "AuthTest9x!";
const resetPassword = "AuthReset8y!";

type Jar = Map<string, string>;
type Result = { status: "✅" | "⚠" | "❌"; label: string; detail: string };
type ApiBody = {
  ok?: boolean;
  verifyUrl?: string;
  resetUrl?: string;
  token?: string;
  code?: string;
  error?: string;
  verified?: boolean;
  csrfToken?: string;
  id?: string;
  handle?: string;
  user?: { email?: string };
  [key: string]: unknown;
};

const results: Result[] = [];

function record(status: Result["status"], label: string, detail: string) {
  results.push({ status, label, detail });
  const pad = status === "✅" ? "OK  " : status === "⚠" ? "WARN" : "FAIL";
  console.log(`${pad}  ${label}: ${detail}`);
}

function parseSetCookie(header: string | null, jar: Jar) {
  if (!header) return;
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

async function api(
  path: string,
  init: RequestInit & { jar?: Jar; ip?: string } = {},
): Promise<{ res: Response; body: ApiBody }> {
  const jar = init.jar;
  const headers = new Headers(init.headers);
  if (jar?.size) headers.set("cookie", cookieHeader(jar));
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  // Isolate abuse counters so the suite does not trip register/login rate limits.
  headers.set("x-forwarded-for", init.ip || `203.0.113.${(Math.random() * 200 + 20) | 0}`);
  const { jar: _j, ip: _ip, ...rest } = init;
  void _j;
  void _ip;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
    redirect: "manual",
  });
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  if (jar) {
    for (const c of raw) parseSetCookie(c, jar);
    parseSetCookie(res.headers.get("set-cookie"), jar);
  }
  let body: ApiBody = {};
  const text = await res.text();
  try {
    body = text ? (JSON.parse(text) as ApiBody) : {};
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { res, body };
}

function hasSessionCookie(jar: Jar) {
  for (const key of jar.keys()) {
    if (key.includes("session-token") || key.includes("authjs.session-token")) {
      return true;
    }
  }
  return false;
}

async function establishSession(jar: Jar, challengeToken: string) {
  const csrfRes = await api("/api/auth/csrf", { jar });
  const csrf = csrfRes.body?.csrfToken as string | undefined;
  if (!csrf) throw new Error("missing csrf");

  const body = new URLSearchParams({
    csrfToken: csrf,
    token: challengeToken,
    remember: "true",
    callbackUrl: `${base}/home`,
    json: "true",
  });
  const headers = new Headers({
    "content-type": "application/x-www-form-urlencoded",
    cookie: cookieHeader(jar),
  });

  const res = await fetch(`${base}/api/auth/callback/challenge`, {
    method: "POST",
    headers,
    body,
    redirect: "manual",
  });
  const set =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  for (const c of set) parseSetCookie(c, jar);
  parseSetCookie(res.headers.get("set-cookie"), jar);
  return res;
}

async function main() {
  console.log(`\nAuth flow test → ${base}`);
  console.log(`Subject: ${email} / @${handle}\n`);

  // ── Password validation ──────────────────────────────────────────
  // Prefer unit rules + one live register probe (avoids register rate limits).
  const { assertStrongPassword } = await import("../src/modules/auth/password");
  let unitRejected = 0;
  for (const pw of weakPasswords) {
    try {
      assertStrongPassword(pw);
      record("❌", "Password validation", `Unit accepted weak password "${pw}"`);
    } catch {
      unitRejected++;
    }
  }
  const liveWeak = await api("/api/auth/register", {
    method: "POST",
    ip: `198.51.100.${(Math.random() * 200 + 1) | 0}`,
    body: JSON.stringify({
      name,
      handle: `w${stamp}`.slice(0, 24),
      email: `weak.${stamp}@cirqua.local`,
      password: "alllowercase1",
    }),
  });
  if (unitRejected === weakPasswords.length && liveWeak.res.status === 400) {
    record(
      "✅",
      "Password validation",
      `Unit rejected ${weakPasswords.length}; live register rejects weak password`,
    );
  } else if (unitRejected === weakPasswords.length) {
    record(
      "⚠",
      "Password validation",
      `Unit OK; live probe → ${liveWeak.res.status}`,
    );
  } else {
    record(
      "❌",
      "Password validation",
      `Only ${unitRejected}/${weakPasswords.length} weak passwords rejected`,
    );
  }

  // ── Create account ───────────────────────────────────────────────
  const reg = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      handle,
      email,
      password: strongPassword,
    }),
  });
  if (reg.res.status !== 201 || !reg.body?.ok) {
    record(
      "❌",
      "Create account",
      `Register failed ${reg.res.status}: ${JSON.stringify(reg.body).slice(0, 200)}`,
    );
  } else if (!reg.body.verifyUrl && !reg.body.token) {
    record(
      "⚠",
      "Create account",
      "Registered but no verifyUrl/token in non-prod response",
    );
  } else {
    record(
      "✅",
      "Create account",
      `201 ok — verify token returned (dev)`,
    );
  }

  // ── DB storage after register ────────────────────────────────────
  const pending = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      handle: true,
      name: true,
      status: true,
      emailVerified: true,
      passwordHash: true,
      createdAt: true,
    },
  });
  if (
    pending &&
    pending.handle === handle &&
    pending.name === name &&
    pending.status === "PENDING" &&
    !pending.emailVerified &&
    !!pending.passwordHash?.startsWith("$2")
  ) {
    record(
      "✅",
      "DB storage (pending)",
      `User ${pending.id} PENDING, bcrypt hash, unverified`,
    );
  } else {
    record(
      "❌",
      "DB storage (pending)",
      `Unexpected row: ${JSON.stringify(pending)}`,
    );
  }

  // ── Sign in before verify should fail ────────────────────────────
  const preLogin = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: strongPassword }),
  });
  if (
    preLogin.res.status === 403 &&
    (preLogin.body?.code === "EMAIL_NOT_VERIFIED" ||
      preLogin.body?.error === "EMAIL_NOT_VERIFIED" ||
      String(preLogin.body?.error || "").includes("Verify your email"))
  ) {
    record(
      "✅",
      "Email verification gate",
      "Login blocked until verified (403 EMAIL_NOT_VERIFIED)",
    );
  } else {
    record(
      "❌",
      "Email verification gate",
      `Expected 403 EMAIL_NOT_VERIFIED, got ${preLogin.res.status} ${JSON.stringify(preLogin.body).slice(0, 180)}`,
    );
  }

  // ── Email verification ───────────────────────────────────────────
  const verifyToken = reg.body?.token as string | undefined;
  if (!verifyToken) {
    record("❌", "Email verification", "No token from register response");
  } else {
    const ver = await api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: verifyToken }),
    });
    if (ver.res.status === 200 && (ver.body?.ok === true || ver.body?.verified)) {
      record("✅", "Email verification", "Token consumed — account verified");
    } else {
      // Some APIs return ok without verified flag
      const after = await prisma.user.findUnique({
        where: { email },
        select: { emailVerified: true, status: true },
      });
      if (after?.emailVerified && after.status === "ACTIVE") {
        record(
          "✅",
          "Email verification",
          `Verified via status ${ver.res.status}; DB ACTIVE`,
        );
      } else {
        record(
          "❌",
          "Email verification",
          `${ver.res.status} ${JSON.stringify(ver.body).slice(0, 200)} DB=${JSON.stringify(after)}`,
        );
      }
    }
  }

  const active = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      status: true,
      emailVerified: true,
      handle: true,
      email: true,
      name: true,
    },
  });
  if (
    active?.status === "ACTIVE" &&
    active.emailVerified &&
    active.handle === handle
  ) {
    record(
      "✅",
      "DB storage (verified)",
      `ACTIVE, emailVerified=${active.emailVerified.toISOString()}`,
    );
  } else {
    record(
      "❌",
      "DB storage (verified)",
      `Unexpected: ${JSON.stringify(active)}`,
    );
  }

  // ── Wrong password ───────────────────────────────────────────────
  const badPw = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: "WrongPass9!" }),
  });
  if (badPw.res.status === 401) {
    record("✅", "Wrong password rejected", "401 on invalid credentials");
  } else {
    record(
      "❌",
      "Wrong password rejected",
      `${badPw.res.status} ${JSON.stringify(badPw.body).slice(0, 120)}`,
    );
  }

  // ── Sign in ──────────────────────────────────────────────────────
  const jar: Jar = new Map();
  const login = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: strongPassword }),
  });
  const challengeToken = login.body?.token as string | undefined;
  if (login.res.status !== 200 || !challengeToken) {
    record(
      "❌",
      "Sign in (login API)",
      `${login.res.status} ${JSON.stringify(login.body).slice(0, 200)}`,
    );
  } else {
    record("✅", "Sign in (login API)", "SESSION_READY challenge issued");
    const cb = await establishSession(jar, challengeToken);
    if (cb.status >= 400) {
      record("❌", "Sign in (session)", `challenge callback → ${cb.status}`);
    } else if (!hasSessionCookie(jar)) {
      record(
        "❌",
        "Sign in (session)",
        `No session cookie. cookies=${[...jar.keys()].join(",")}`,
      );
    } else {
      const sess = await api("/api/auth/session", { jar });
      if (sess.body?.user?.email?.toLowerCase() === email) {
        record(
          "✅",
          "Sign in (session)",
          `Session established for ${sess.body.user.email}`,
        );
      } else {
        record(
          "❌",
          "Sign in (session)",
          `Session mismatch: ${JSON.stringify(sess.body).slice(0, 200)}`,
        );
      }
    }
  }

  // ── Session persistence ──────────────────────────────────────────
  if (hasSessionCookie(jar)) {
    const again = await api("/api/auth/session", { jar });
    const me = await api("/api/users/me", { jar });
    if (
      again.body?.user?.email?.toLowerCase() === email &&
      (me.res.status === 200 || me.body?.user || me.body?.id || me.body?.handle)
    ) {
      record(
        "✅",
        "Session persistence",
        "Cookie reused — /api/auth/session + /api/users/me OK",
      );
    } else if (again.body?.user?.email?.toLowerCase() === email) {
      record(
        "⚠",
        "Session persistence",
        `Session OK but /api/users/me → ${me.res.status}`,
      );
    } else {
      record(
        "❌",
        "Session persistence",
        `Lost session: ${JSON.stringify(again.body).slice(0, 160)}`,
      );
    }
  } else {
    record("❌", "Session persistence", "Skipped — no session cookie");
  }

  // ── Sign out ─────────────────────────────────────────────────────
  if (hasSessionCookie(jar)) {
    const csrf = await api("/api/auth/csrf", { jar });
    const token = csrf.body?.csrfToken as string;
    const body = new URLSearchParams({
      csrfToken: token || "",
      callbackUrl: `${base}/sign-in`,
      json: "true",
    });
    const headers = new Headers({
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(jar),
    });
    const res = await fetch(`${base}/api/auth/signout`, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
    });
    const set =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const c of set) parseSetCookie(c, jar);
    parseSetCookie(res.headers.get("set-cookie"), jar);

    // Clear expired/empty session cookies from jar for honesty
    for (const [k, v] of [...jar.entries()]) {
      if (
        k.includes("session-token") &&
        (!v || v === "" || v === "null" || v.length < 10)
      ) {
        jar.delete(k);
      }
    }

    const after = await api("/api/auth/session", { jar });
    if (!after.body?.user) {
      record("✅", "Sign out", "Session cleared — /api/auth/session empty");
    } else {
      // Auth.js sometimes leaves cookie value but nulls session; check user
      record(
        "❌",
        "Sign out",
        `Still has user: ${JSON.stringify(after.body).slice(0, 160)}`,
      );
    }
  } else {
    record("❌", "Sign out", "Skipped — never signed in");
  }

  // ── Password reset ───────────────────────────────────────────────
  const forgot = await api("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const resetToken = forgot.body?.token as string | undefined;
  const resetUrl = forgot.body?.resetUrl as string | undefined;
  if (forgot.res.status !== 200 && forgot.res.status !== 201) {
    record(
      "❌",
      "Password reset request",
      `${forgot.res.status} ${JSON.stringify(forgot.body).slice(0, 160)}`,
    );
  } else if (!resetToken && !resetUrl) {
    // Production-style ack without token — still OK if email logged
    if (forgot.body?.ok) {
      record(
        "⚠",
        "Password reset request",
        "Ack OK but no dev token — cannot complete reset in this harness",
      );
    } else {
      record(
        "❌",
        "Password reset request",
        `Unexpected body: ${JSON.stringify(forgot.body).slice(0, 160)}`,
      );
    }
  } else {
    record(
      "✅",
      "Password reset request",
      "Reset token returned in non-prod response",
    );
    const token =
      resetToken ||
      (() => {
        try {
          return new URL(resetUrl!).searchParams.get("token") || undefined;
        } catch {
          return undefined;
        }
      })();
    if (!token) {
      record("❌", "Password reset complete", "Could not extract token");
    } else {
      const weakReset = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: "weak" }),
      });
      if (weakReset.res.status === 400 || weakReset.res.status === 422) {
        record(
          "✅",
          "Password reset validation",
          "Weak reset password rejected",
        );
      } else {
        record(
          "❌",
          "Password reset validation",
          `Accepted weak reset → ${weakReset.res.status}`,
        );
      }

      const reset = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: resetPassword }),
      });
      if (reset.res.status === 200 && (reset.body?.ok !== false)) {
        record("✅", "Password reset complete", "Password updated");
      } else {
        record(
          "❌",
          "Password reset complete",
          `${reset.res.status} ${JSON.stringify(reset.body).slice(0, 180)}`,
        );
      }

      // Old password should fail
      const oldLogin = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: strongPassword }),
      });
      if (oldLogin.res.status === 401) {
        record(
          "✅",
          "Post-reset old password",
          "Old password correctly rejected",
        );
      } else {
        record(
          "❌",
          "Post-reset old password",
          `Still accepted? ${oldLogin.res.status}`,
        );
      }

      // New password + session
      const jar2: Jar = new Map();
      const newLogin = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: resetPassword }),
      });
      if (newLogin.res.status === 200 && newLogin.body?.token) {
        await establishSession(jar2, newLogin.body.token);
        const sess = await api("/api/auth/session", { jar: jar2 });
        if (sess.body?.user?.email?.toLowerCase() === email) {
          record(
            "✅",
            "Post-reset sign in",
            "Signed in with new password",
          );
        } else {
          record(
            "❌",
            "Post-reset sign in",
            `Session missing: ${JSON.stringify(sess.body).slice(0, 120)}`,
          );
        }
      } else {
        record(
          "❌",
          "Post-reset sign in",
          `${newLogin.res.status} ${JSON.stringify(newLogin.body).slice(0, 160)}`,
        );
      }
    }
  }

  // ── Resend verification (idempotent / anti-enum) ─────────────────
  const resend = await api("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (resend.res.status === 200 || resend.res.status === 201) {
    record(
      "✅",
      "Resend verification",
      `Endpoint responds ${resend.res.status} (anti-enumeration OK)`,
    );
  } else {
    record(
      "⚠",
      "Resend verification",
      `${resend.res.status} ${JSON.stringify(resend.body).slice(0, 120)}`,
    );
  }

  // Cleanup test user (optional — keep for inspection if FAIL)
  const failed = results.some((r) => r.status === "❌");
  if (!failed && pending?.id) {
    await prisma.emailToken.deleteMany({ where: { userId: pending.id } }).catch(() => {});
    await prisma.authChallenge.deleteMany({ where: { userId: pending.id } }).catch(() => {});
    await prisma.deviceSession.deleteMany({ where: { userId: pending.id } }).catch(() => {});
    await prisma.loginHistory.deleteMany({ where: { userId: pending.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: pending.id } }).catch(() => {});
    console.log("\nCleaned up test user.");
  } else if (pending?.id) {
    console.log(`\nKept test user ${pending.id} (${email}) for inspection.`);
  }

  console.log("\n──────── Summary ────────");
  for (const r of results) {
    console.log(`${r.status} ${r.label}`);
  }
  const counts = {
    ok: results.filter((r) => r.status === "✅").length,
    warn: results.filter((r) => r.status === "⚠").length,
    fail: results.filter((r) => r.status === "❌").length,
  };
  console.log(
    `\n${counts.ok} working · ${counts.warn} needs improvement · ${counts.fail} broken`,
  );
  await prisma.$disconnect();
  process.exit(counts.fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
