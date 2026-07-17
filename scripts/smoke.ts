#!/usr/bin/env npx tsx
/**
 * Lightweight smoke checks against a running Relune server.
 * Usage: BASE_URL=http://localhost:3000 npm run test:smoke
 */
const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function check(path: string, expect: number | number[] = 200) {
  const res = await fetch(`${base}${path}`);
  const allowed = Array.isArray(expect) ? expect : [expect];
  if (!allowed.includes(res.status)) {
    throw new Error(`${path} → ${res.status} (expected ${allowed.join("|")})`);
  }
  console.log(`ok ${res.status} ${path}`);
  return res;
}

async function main() {
  await check("/");
  await check("/explore");
  await check("/home", [200, 307, 308]);
  await check("/manifest.webmanifest");
  await check("/sitemap.xml");
  await check("/robots.txt");
  const health = await check("/api/health");
  const body = (await health.json()) as {
    ok?: boolean;
    service?: string;
    database?: string;
  };
  if (!body.ok) throw new Error("health not ok");
  if (body.database !== "up") throw new Error(`database ${body.database}`);
  if (body.service !== "relune") console.warn("warn: service name", body.service);
  await check("/api/health?mode=live");
  await check("/api/health?mode=ready");
  await check("/sign-in");
  await check("/sign-up");
  await check("/terms");
  await check("/privacy");
  await check("/api/explore?limit=5");
  console.log("smoke passed");
}

main().catch((error) => {
  console.error("smoke failed", error);
  process.exit(1);
});
