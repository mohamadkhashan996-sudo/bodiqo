#!/usr/bin/env npx tsx
/**
 * Deep critical-path probe — uploads, admin actions, IDOR, block/mute,
 * story delete, communities, live list, and 500 hunting.
 */
import { PrismaClient } from "@prisma/client";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const prisma = new PrismaClient();
const stamp = Date.now().toString(36);

type Jar = Map<string, string>;
type Row = { name: string; status: "PASS" | "FAIL" | "WARN"; detail: string };
const results: Row[] = [];

function record(name: string, status: Row["status"], detail: string) {
  results.push({ name, status, detail });
  console.log(`${status.padEnd(4)} ${name}: ${detail}`);
}

function parseSetCookie(header: string | null, jar: Jar) {
  if (!header) return;
  for (const part of header.split(/,(?=\s*[^;=]+=[^;]+)/)) {
    const nv = part.split(";")[0]?.trim();
    if (!nv?.includes("=")) continue;
    const i = nv.indexOf("=");
    jar.set(nv.slice(0, i), nv.slice(i + 1));
  }
}
function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(
  path: string,
  init: RequestInit & { jar?: Jar; ip?: string; form?: FormData } = {},
) {
  const jar = init.jar;
  const headers = new Headers(init.headers);
  if (jar?.size) headers.set("cookie", cookieHeader(jar));
  if (init.body && !init.form && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set(
    "x-forwarded-for",
    init.ip || `203.0.113.${(Math.random() * 200 + 20) | 0}`,
  );
  const { jar: _j, ip: _ip, form, ...rest } = init;
  void _j;
  void _ip;
  const res = await fetch(`${base}${path}`, {
    ...rest,
    body: form ?? rest.body,
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
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { res, body, text };
}

async function login(email: string, password: string, jar: Jar) {
  const csrf = await api("/api/auth/csrf", { jar });
  const token = (csrf.body as { csrfToken?: string })?.csrfToken;
  if (!token) return false;
  const body = new URLSearchParams({
    csrfToken: token,
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
  for (const c of res.headers.getSetCookie?.() ?? []) parseSetCookie(c, jar);
  parseSetCookie(res.headers.get("set-cookie"), jar);
  const session = await api("/api/auth/session", { jar });
  return Boolean((session.body as { user?: { id?: string } })?.user?.id);
}

async function ensureUser(label: string) {
  const email = `crit.${label}.${stamp}@cirqua.local`;
  const handle = `crit${label}${stamp}`.slice(0, 24);
  const password = "CritTest9x!";
  const { hashPassword } = await import("../src/modules/auth/password");
  const passwordHash = await hashPassword(password);

  // Prefer API register; fall back to Prisma when rate-limited so probes still run.
  const reg = await api("/api/auth/register", {
    method: "POST",
    ip: `203.0.113.${(Math.random() * 200 + 20) | 0}`,
    body: JSON.stringify({ name: `Crit ${label}`, handle, email, password }),
  });
  if (reg.res.status !== 200 && reg.res.status !== 201) {
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        handle,
        name: `Crit ${label}`,
        displayName: `Crit ${label}`,
        passwordHash,
        emailVerified: new Date(),
        onboardingDone: true,
        status: "ACTIVE",
        role: "USER",
      },
      update: {
        passwordHash,
        emailVerified: new Date(),
        onboardingDone: true,
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: new Date(),
        onboardingDone: true,
        status: "ACTIVE",
      },
    });
  }
  const jar: Jar = new Map();
  if (!(await login(email, password, jar))) {
    throw new Error(`login ${email}`);
  }
  const me = await api("/api/users/me", { jar });
  const id = (me.body as { user?: { id?: string } })?.user?.id;
  if (!id) throw new Error(`missing user id for ${email}`);
  return { email, handle, password, jar, id };
}

async function main() {
  console.log(`\nCritical probe → ${base}\n`);
  const a = await ensureUser("a");
  const b = await ensureUser("b");
  const maya: Jar = new Map();
  const leo: Jar = new Map();
  const admin: Jar = new Map();
  await login("maya@cirqua.local", "cirqua1234", maya);
  await login("leo@cirqua.local", "cirqua1234", leo);
  await login("admin@cirqua.local", "cirqua1234", admin);

  // 1) Tiny PNG upload
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.append(
    "file",
    new Blob([png], { type: "image/png" }),
    "pixel.png",
  );
  const upload = await api("/api/upload", {
    jar: a.jar,
    method: "POST",
    form,
  });
  const mediaUrl =
    (upload.body as { url?: string; asset?: { url?: string } })?.url ||
    (upload.body as { asset?: { url?: string } })?.asset?.url;
  record(
    "Upload image",
    upload.res.status === 200 || upload.res.status === 201
      ? "PASS"
      : "FAIL",
    `status ${upload.res.status} url=${mediaUrl ?? "?"}`,
  );

  // 2) Post with media
  if (mediaUrl) {
    const post = await api("/api/posts", {
      jar: a.jar,
      method: "POST",
      body: JSON.stringify({
        body: `crit media ${stamp}`,
        visibility: "PUBLIC",
        type: "IMAGE",
        media: [{ url: mediaUrl, kind: "IMAGE" }],
      }),
    });
    const postId = (post.body as { post?: { id?: string } })?.post?.id;
    record(
      "Post with media",
      post.res.status === 201 || post.res.status === 200 ? "PASS" : "FAIL",
      `status ${post.res.status} id=${postId ?? "?"}`,
    );

    // 3) Serve media
    if (mediaUrl.startsWith("/")) {
      const media = await api(mediaUrl, { jar: b.jar });
      record(
        "Serve uploaded media",
        media.res.status === 200 ? "PASS" : "FAIL",
        `status ${media.res.status}`,
      );
    }

    // 4) React + unlike
    if (postId) {
      await api(`/api/posts/${postId}/react`, {
        jar: b.jar,
        method: "POST",
        body: JSON.stringify({ type: "LOVE" }),
      });
      const unlike = await api(`/api/posts/${postId}/like`, {
        jar: b.jar,
        method: "DELETE",
      });
      record(
        "Unlike / react",
        unlike.res.status === 200 ? "PASS" : "FAIL",
        `unlike ${unlike.res.status}`,
      );

      // 5) Owner delete
      const del = await api(`/api/posts/${postId}`, {
        jar: a.jar,
        method: "DELETE",
      });
      record(
        "Owner delete post",
        del.res.status === 200 ? "PASS" : "FAIL",
        `status ${del.res.status}`,
      );
    }
  }

  // 6) Block / mute / unblock
  const block = await api(`/api/users/${b.handle}/block`, {
    jar: a.jar,
    method: "POST",
  });
  const mute = await api(`/api/users/${b.handle}/mute`, {
    jar: a.jar,
    method: "POST",
  });
  const unblock = await api(`/api/users/${b.handle}/block`, {
    jar: a.jar,
    method: "DELETE",
  });
  const unmute = await api(`/api/users/${b.handle}/mute`, {
    jar: a.jar,
    method: "DELETE",
  });
  record(
    "Block/mute cycle",
    [block, mute, unblock, unmute].every(
      (x) => x.res.status === 200 || x.res.status === 201,
    )
      ? "PASS"
      : "FAIL",
    `block ${block.res.status} mute ${mute.res.status} unblock ${unblock.res.status} unmute ${unmute.res.status}`,
  );

  // 7) Story create + owner delete
  if (mediaUrl) {
    const story = await api("/api/stories", {
      jar: a.jar,
      method: "POST",
      body: JSON.stringify({
        mediaUrl,
        mediaKind: "IMAGE",
        textOverlay: "crit story",
      }),
    });
    const storyId =
      (story.body as { story?: { id?: string } })?.story?.id ||
      (story.body as { id?: string })?.id;
    record(
      "Create story",
      story.res.status === 201 || story.res.status === 200 ? "PASS" : "FAIL",
      `status ${story.res.status} id=${storyId ?? "?"}`,
    );
    if (storyId) {
      // non-owner delete
      const idor = await api(`/api/stories/${storyId}`, {
        jar: b.jar,
        method: "DELETE",
      });
      record(
        "Story IDOR delete",
        idor.res.status === 403 || idor.res.status === 404 ? "PASS" : "FAIL",
        `status ${idor.res.status}`,
      );
      const del = await api(`/api/stories/${storyId}`, {
        jar: a.jar,
        method: "DELETE",
      });
      record(
        "Owner delete story",
        del.res.status === 200 ? "PASS" : "FAIL",
        `status ${del.res.status}`,
      );
    }
  }

  // 8) Communities list + discover
  const communities = await api("/api/communities", { jar: a.jar });
  const discover = await api("/api/communities/discover", { jar: a.jar });
  record(
    "Communities APIs",
    communities.res.status === 200 && discover.res.status === 200
      ? "PASS"
      : "FAIL",
    `list ${communities.res.status} discover ${discover.res.status}`,
  );

  // 9) Live list
  const live = await api("/api/live", { jar: a.jar });
  record(
    "Live list",
    live.res.status === 200 ? "PASS" : "FAIL",
    `status ${live.res.status}`,
  );

  // 10) Admin: resolve report none + settings get
  const reports = await api("/api/admin/reports?status=OPEN&take=5", {
    jar: admin,
  });
  record(
    "Admin list open reports",
    reports.res.status === 200 ? "PASS" : "FAIL",
    `status ${reports.res.status}`,
  );
  const settings = await api("/api/admin/settings", { jar: admin });
  record(
    "Admin settings GET",
    settings.res.status === 200 ? "PASS" : "FAIL",
    `status ${settings.res.status}`,
  );

  // 11) Regular USER (leo) cannot access admin — maya is seeded ADMIN in phase4
  const leoAdmin = await api("/api/admin/overview", { jar: leo });
  record(
    "Creator/user denied admin",
    leoAdmin.res.status === 403 || leoAdmin.res.status === 401
      ? "PASS"
      : "FAIL",
    `status ${leoAdmin.res.status}`,
  );

  // 12) Privilege escalation: patch own role via users/me
  const escalate = await api("/api/users/me", {
    jar: a.jar,
    method: "PATCH",
    body: JSON.stringify({ role: "SUPER_ADMIN", displayName: "Nope" }),
  });
  const meAfter = await api("/api/users/me", { jar: a.jar });
  const role = (meAfter.body as { user?: { role?: string } })?.user?.role;
  // role not in schema — should be ignored; user stays USER
  const dbRole = await prisma.user.findUnique({
    where: { id: a.id },
    select: { role: true },
  });
  record(
    "Privilege escalation via me PATCH",
    dbRole?.role === "USER" && escalate.res.status === 200 ? "PASS" : "FAIL",
    `apiRole=${role ?? "?"} dbRole=${dbRole?.role} status=${escalate.res.status}`,
  );

  // 13) Path traversal / media
  const traversal = await api("/api/media/../.env", { jar: a.jar });
  record(
    "Media path traversal",
    traversal.res.status === 400 ||
      traversal.res.status === 404 ||
      traversal.res.status === 403
      ? "PASS"
      : "FAIL",
    `status ${traversal.res.status}`,
  );

  // 14) Mass assignment official flags
  const official = await api("/api/users/me", {
    jar: a.jar,
    method: "PATCH",
    body: JSON.stringify({
      isOfficial: true,
      isVerified: true,
      displayName: "Crit A",
    }),
  });
  const flags = await prisma.user.findUnique({
    where: { id: a.id },
    select: { isOfficial: true, isVerified: true },
  });
  record(
    "Cannot self-verify/official",
    !flags?.isOfficial && !flags?.isVerified && official.res.status === 200
      ? "PASS"
      : "FAIL",
    `official=${flags?.isOfficial} verified=${flags?.isVerified}`,
  );

  // 15) Notifications mark read (omit id = mark all if supported)
  const notif = await api("/api/notifications", {
    jar: b.jar,
    method: "PATCH",
    body: JSON.stringify({}),
  });
  record(
    "Mark notifications read",
    notif.res.status === 200 ? "PASS" : "FAIL",
    `status ${notif.res.status}`,
  );

  // 16) Search injection
  const search = await api(
    `/api/search?q=${encodeURIComponent(`" OR 1=1 --`)}`,
  );
  record(
    "Search SQLi string",
    search.res.status === 200 ? "PASS" : "FAIL",
    `status ${search.res.status}`,
  );

  // 17) Double-submit like (idempotent)
  const p2 = await api("/api/posts", {
    jar: a.jar,
    method: "POST",
    body: JSON.stringify({ body: `idem ${stamp}`, visibility: "PUBLIC" }),
  });
  const p2id = (p2.body as { post?: { id?: string } })?.post?.id;
  if (p2id) {
    const l1 = await api(`/api/posts/${p2id}/like`, {
      jar: b.jar,
      method: "POST",
    });
    const l2 = await api(`/api/posts/${p2id}/like`, {
      jar: b.jar,
      method: "POST",
    });
    record(
      "Idempotent like",
      (l1.res.status === 200 || l1.res.status === 201) &&
        (l2.res.status === 200 || l2.res.status === 201 || l2.res.status === 409)
        ? "PASS"
        : "FAIL",
      `first ${l1.res.status} second ${l2.res.status}`,
    );
  }

  // 18) Account export
  const exportRes = await api("/api/account", { jar: a.jar });
  record(
    "Account data export",
    exportRes.res.status === 200 ? "PASS" : "FAIL",
    `status ${exportRes.res.status}`,
  );

  // 19) Studio pages for maya
  for (const path of [
    "/api/studio/analytics",
    "/api/studio/content",
    "/api/studio/videos",
    "/api/studio/followers",
  ]) {
    const r = await api(path, { jar: maya });
    record(
      `Studio ${path}`,
      r.res.status === 200 ? "PASS" : "FAIL",
      `status ${r.res.status}`,
    );
  }

  // 20) Hunt 500s on common pages
  let fiveHundreds = 0;
  for (const path of [
    "/home",
    "/explore",
    "/trending",
    "/search",
    "/shorts",
    "/live",
    "/communities",
    "/notifications",
    "/messages",
    "/settings",
    "/studio",
    "/admin",
    "/u/relune",
    "/u/maya",
    "/calls",
    "/saved",
  ]) {
    const r = await api(path, { jar: maya });
    if (r.res.status >= 500) {
      fiveHundreds++;
      record(`Page ${path}`, "FAIL", `status ${r.res.status}`);
    }
  }
  if (fiveHundreds === 0) {
    record("No 5xx on major pages", "PASS", "16 pages checked");
  }

  // 21) Suspended session invalidation
  {
    const target = await ensureUser("suspend");
    const before = await api("/api/users/me", { jar: target.jar });
    const suspend = await api("/api/admin/users", {
      jar: admin,
      method: "POST",
      body: JSON.stringify({
        action: "suspend",
        userId: target.id,
        reason: "critical probe",
      }),
    });
    const after = await api("/api/users/me", { jar: target.jar });
    // Restore so we don't leave junk banned
    await api("/api/admin/users", {
      jar: admin,
      method: "POST",
      body: JSON.stringify({ action: "unban", userId: target.id }),
    }).catch(() => undefined);
    await prisma.user
      .update({
        where: { id: target.id },
        data: { status: "ACTIVE", banReason: null },
      })
      .catch(() => undefined);
    record(
      "Suspend kills active session",
      before.res.status === 200 &&
        (suspend.res.status === 200 || suspend.res.status === 201) &&
        (after.res.status === 401 || after.res.status === 403)
        ? "PASS"
        : "FAIL",
      `before ${before.res.status} suspend ${suspend.res.status} after ${after.res.status}`,
    );
  }

  // 22) Foreign media URL returns 400 not 500
  {
    const bad = await api("/api/posts", {
      jar: a.jar,
      method: "POST",
      body: JSON.stringify({
        body: "foreign media",
        visibility: "PUBLIC",
        type: "IMAGE",
        media: [
          {
            url: "/uploads/someone-else/not-yours.png",
            kind: "IMAGE",
          },
        ],
      }),
    });
    record(
      "Foreign media URL is 400",
      bad.res.status === 400 ? "PASS" : "FAIL",
      `status ${bad.res.status}`,
    );
  }

  // 23) Verify-email must not unsuspend
  {
    const target = await ensureUser("verifyreact");
    const { createEmailToken } = await import(
      "../src/modules/auth/email-tokens"
    );
    const raw = await createEmailToken(
      target.id,
      target.email,
      "VERIFY_EMAIL",
      24,
    );
    await prisma.user.update({
      where: { id: target.id },
      data: { status: "SUSPENDED", emailVerified: null, banReason: "probe" },
    });
    const verify = await api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token: raw }),
    });
    const row = await prisma.user.findUnique({
      where: { id: target.id },
      select: { status: true },
    });
    await prisma.user
      .update({
        where: { id: target.id },
        data: { status: "ACTIVE", banReason: null, emailVerified: new Date() },
      })
      .catch(() => undefined);
    record(
      "Verify-email cannot unsuspend",
      verify.res.status === 200 && row?.status === "SUSPENDED" ? "PASS" : "FAIL",
      `verify ${verify.res.status} status ${row?.status}`,
    );
  }

  // 24) Live end is host-only (mod cannot end)
  {
    const host = await ensureUser("livehost");
    const mod = await ensureUser("livemod");
    const session = await prisma.liveSession.create({
      data: {
        hostId: host.id,
        title: "probe live",
        status: "LIVE",
        startedAt: new Date(),
      },
      select: { id: true },
    });
    await prisma.liveModerator.create({
      data: { sessionId: session.id, userId: mod.id },
    });
    const endAsMod = await api(`/api/live/${session.id}`, {
      jar: mod.jar,
      method: "DELETE",
    });
    const stillLive = await prisma.liveSession.findUnique({
      where: { id: session.id },
      select: { status: true },
    });
    await api(`/api/live/${session.id}`, {
      jar: host.jar,
      method: "DELETE",
    }).catch(() => undefined);
    await prisma.liveSession
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    record(
      "Live mod cannot end stream",
      endAsMod.res.status === 403 && stillLive?.status === "LIVE"
        ? "PASS"
        : "FAIL",
      `mod ${endAsMod.res.status} status ${stillLive?.status}`,
    );
  }

  // 25) JWTs without revocation metadata are invalid.
  {
    const { isJwtSessionActive } = await import(
      "../src/modules/auth/session-validity"
    );
    const missingMetadata = await isJwtSessionActive({ sub: a.id });
    record(
      "Legacy JWT metadata required",
      missingMetadata === false ? "PASS" : "FAIL",
      `active=${missingMetadata}`,
    );
  }

  // 26) Every login receives a unique device-session key.
  {
    const jarOne: Jar = new Map();
    const jarTwo: Jar = new Map();
    await login(a.email, a.password, jarOne);
    await login(a.email, a.password, jarTwo);
    const devices = await prisma.deviceSession.findMany({
      where: { userId: a.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { sessionKey: true },
    });
    record(
      "Login session keys are unique",
      devices.length === 2 && devices[0]?.sessionKey !== devices[1]?.sessionKey
        ? "PASS"
        : "FAIL",
      `${new Set(devices.map((device) => device.sessionKey)).size} unique keys`,
    );
  }

  // 27) Generic admin PATCH cannot suspend an account.
  {
    const patch = await api("/api/admin/users", {
      jar: admin,
      method: "PATCH",
      body: JSON.stringify({ userId: a.id, status: "SUSPENDED" }),
    });
    const account = await prisma.user.findUnique({
      where: { id: a.id },
      select: { status: true },
    });
    record(
      "Admin PATCH cannot bypass suspension action",
      account?.status === "ACTIVE" && patch.res.status === 200 ? "PASS" : "FAIL",
      `status ${patch.res.status} account=${account?.status}`,
    );
  }

  // Staff without roles:write cannot use the generic user editor to assign roles.
  {
    const moderator = await ensureUser("rolemod");
    await prisma.user.update({
      where: { id: moderator.id },
      data: { role: "MODERATOR" },
    });
    await prisma.user.update({ where: { id: b.id }, data: { role: "USER" } });
    const moderatorJar: Jar = new Map();
    await login(moderator.email, moderator.password, moderatorJar);
    const patch = await api("/api/admin/users", {
      jar: moderatorJar,
      method: "PATCH",
      body: JSON.stringify({ userId: b.id, role: "SUPPORT" }),
    });
    const account = await prisma.user.findUnique({
      where: { id: b.id },
      select: { role: true },
    });
    record(
      "Role mutation requires roles:write",
      patch.res.status === 403 && account?.role === "USER" ? "PASS" : "FAIL",
      `status ${patch.res.status} role=${account?.role}`,
    );
  }

  // 28) Blocked viewers cannot read or write live chat over HTTP.
  {
    const session = await prisma.liveSession.create({
      data: {
        hostId: a.id,
        title: "blocked chat probe",
        status: "LIVE",
        startedAt: new Date(),
        blockedUserIds: [b.id],
      },
      select: { id: true },
    });
    const read = await api(`/api/live/${session.id}/chat`, { jar: b.jar });
    const write = await api(`/api/live/${session.id}/chat`, {
      jar: b.jar,
      method: "POST",
      body: JSON.stringify({ body: "must not post" }),
    });
    await prisma.liveSession
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    record(
      "Blocked viewer denied live chat",
      read.res.status === 403 && write.res.status === 403 ? "PASS" : "FAIL",
      `read ${read.res.status} write ${write.res.status}`,
    );
  }

  // 29) Concurrent deletes claim the post once and decrement counters once.
  {
    const created = await api("/api/posts", {
      jar: b.jar,
      method: "POST",
      body: JSON.stringify({
        body: `delete race ${stamp} #deleterace`,
        visibility: "PUBLIC",
      }),
    });
    const postId = (created.body as { post?: { id?: string } })?.post?.id;
    const before = await prisma.user.findUnique({
      where: { id: b.id },
      select: { postsCount: true },
    });
    if (!postId || !before) {
      record("Concurrent post delete is atomic", "FAIL", "post setup failed");
    } else {
      const responses = await Promise.all([
        api(`/api/posts/${postId}`, { jar: b.jar, method: "DELETE" }),
        api(`/api/posts/${postId}`, { jar: b.jar, method: "DELETE" }),
      ]);
      const after = await prisma.user.findUnique({
        where: { id: b.id },
        select: { postsCount: true },
      });
      const statuses = responses.map((response) => response.res.status).sort();
      record(
        "Concurrent post delete is atomic",
        statuses[0] === 200 &&
          statuses[1] === 404 &&
          after?.postsCount === before.postsCount - 1
          ? "PASS"
          : "FAIL",
        `statuses ${statuses.join(",")} count ${before.postsCount}->${after?.postsCount}`,
      );
    }
  }

  // 30) Official-account challenges and established sessions track owner validity.
  {
    const ownerPassword = "OwnerTest9x!";
    const { hashOpaque, hashPassword } = await import(
      "../src/modules/auth/password"
    );
    const owner = await prisma.user.create({
      data: {
        email: `crit.owner.${stamp}@cirqua.local`,
        handle: `critowner${stamp}`.slice(0, 24),
        name: "Critical Owner",
        displayName: "Critical Owner",
        passwordHash: await hashPassword(ownerPassword),
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerified: new Date(),
        onboardingDone: true,
      },
      select: { id: true, role: true },
    });
    const ownerJar: Jar = new Map();
    await login(`crit.owner.${stamp}@cirqua.local`, ownerPassword, ownerJar);
    const { openOfficialAccountSession } = await import(
      "../src/modules/admin/services/official-session"
    );
    async function authenticateChallenge(token: string) {
      const jar: Jar = new Map();
      const csrf = await api("/api/auth/csrf", { jar });
      const csrfToken = (csrf.body as { csrfToken?: string })?.csrfToken;
      if (!csrfToken) {
        return {
          authenticated: false,
          csrf: false,
          deviceSessionId: null,
          jar,
        };
      }
      const form = new URLSearchParams({
        csrfToken,
        token,
        callbackUrl: `${base}/u/relune`,
        json: "true",
      });
      await api("/api/auth/callback/challenge", {
        jar,
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const session = await api("/api/auth/session", { jar });
      const value = (session.body ?? {}) as {
        user?: { id?: string };
        deviceSessionId?: string;
      };
      return {
        authenticated: Boolean(value.user?.id),
        csrf: true,
        deviceSessionId: value.deviceSessionId ?? null,
        jar,
      };
    }

    const establishedChallenge = await openOfficialAccountSession(
      owner,
      new Request(`${base}/api/admin/official/open`),
    );
    const established = await authenticateChallenge(establishedChallenge.token);
    const { io } = await import("socket.io-client");
    const officialSocket =
      "jar" in established
        ? io(base, {
            path: "/socket.io",
            transports: ["websocket"],
            extraHeaders: { Cookie: cookieHeader(established.jar) },
            reconnection: false,
          })
        : null;
    const officialSocketConnected = officialSocket
      ? await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => resolve(false), 3000);
          officialSocket.once("connect", () => {
            clearTimeout(timer);
            resolve(true);
          });
          officialSocket.once("connect_error", () => {
            clearTimeout(timer);
            resolve(false);
          });
        })
      : false;
    const revoked = await api("/api/auth/sessions", {
      jar: ownerJar,
      method: "DELETE",
      body: JSON.stringify({ all: true }),
    });
    const officialSocketDisconnected =
      officialSocket && officialSocketConnected
        ? await new Promise<boolean>((resolve) => {
            if (!officialSocket.connected) return resolve(true);
            const timer = setTimeout(() => resolve(false), 3000);
            officialSocket.once("disconnect", () => {
              clearTimeout(timer);
              resolve(true);
            });
          })
        : false;
    officialSocket?.close();
    const afterRevocation =
      "jar" in established
        ? await api("/api/auth/session", { jar: established.jar })
        : null;
    const remainsAuthenticated = Boolean(
      (
        afterRevocation?.body as
          | { user?: { id?: string } }
          | null
          | undefined
      )?.user?.id,
    );
    record(
      "Established official session tracks owner revocation",
      established.authenticated && !remainsAuthenticated ? "PASS" : "FAIL",
      `before=${established.authenticated} after=${remainsAuthenticated}`,
    );
    record(
      "Owner revocation disconnects official socket",
      revoked.res.status === 200 &&
        officialSocketConnected &&
        officialSocketDisconnected
        ? "PASS"
        : "FAIL",
      `revoke=${revoked.res.status} connected=${officialSocketConnected} disconnected=${officialSocketDisconnected}`,
    );

    const pendingChallenge = await openOfficialAccountSession(
      owner,
      new Request(`${base}/api/admin/official/open`),
    );
    await prisma.user.update({
      where: { id: owner.id },
      data: { sessionVersion: { increment: 1 } },
    });
    const pending = await authenticateChallenge(pendingChallenge.token);
    await prisma.authChallenge.deleteMany({
      where: {
        tokenHash: {
          in: [
            hashOpaque(establishedChallenge.token),
            hashOpaque(pendingChallenge.token),
          ],
        },
      },
    });
    if (established.deviceSessionId) {
      await prisma.deviceSession.deleteMany({
        where: { id: established.deviceSessionId },
      });
    }
    await prisma.deviceSession.deleteMany({ where: { userId: owner.id } });
    await prisma.loginHistory.deleteMany({ where: { userId: owner.id } });
    await prisma.session.deleteMany({ where: { userId: owner.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: owner.id } });
    await prisma.user.delete({ where: { id: owner.id } });
    record(
      "Invalidated owner challenge is rejected",
      pending.csrf && !pending.authenticated ? "PASS" : "FAIL",
      `csrf=${pending.csrf} authenticated=${pending.authenticated}`,
    );
  }

  // 31) Revoking all sessions disconnects an already-connected socket.
  {
    const { io } = await import("socket.io-client");
    const socket = io(base, {
      path: "/socket.io",
      transports: ["websocket"],
      extraHeaders: { Cookie: cookieHeader(a.jar) },
      reconnection: false,
    });
    const connected = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 3000);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve(true);
      });
      socket.once("connect_error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
    const logout = connected
      ? await api("/api/admin/users", {
          jar: admin,
          method: "POST",
          body: JSON.stringify({ action: "logout_all", userId: a.id }),
        })
      : null;
    const disconnected = connected
      ? await new Promise<boolean>((resolve) => {
          if (!socket.connected) return resolve(true);
          const timer = setTimeout(() => resolve(false), 3000);
          socket.once("disconnect", () => {
            clearTimeout(timer);
            resolve(true);
          });
        })
      : false;
    socket.close();
    record(
      "Session revocation disconnects socket",
      connected && logout?.res.status === 200 && disconnected ? "PASS" : "FAIL",
      `connected=${connected} logout=${logout?.res.status ?? "n/a"} disconnected=${disconnected}`,
    );
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const warn = results.filter((r) => r.status === "WARN").length;
  console.log(`\n=== CRITICAL SUMMARY ===`);
  console.log(`PASS ${pass}  FAIL ${fail}  WARN ${warn}`);
  if (fail) {
    console.log(
      "FAILURES:",
      results.filter((r) => r.status === "FAIL").map((r) => r.name),
    );
  }
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
