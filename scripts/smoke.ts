#!/usr/bin/env npx tsx
/**
 * Lightweight smoke checks against a running Relune server.
 * Usage: BASE_URL=http://localhost:3000 npm run test:smoke
 */
const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function check(path: string, expect = 200) {
  const res = await fetch(`${base}${path}`);
  if (res.status !== expect) {
    throw new Error(`${path} → ${res.status} (expected ${expect})`);
  }
  console.log(`ok ${res.status} ${path}`);
  return res;
}

async function main() {
  await check("/");
  await check("/manifest.webmanifest");
  await check("/sitemap.xml");
  await check("/robots.txt");
  const health = await check("/api/health");
  const body = (await health.json()) as { ok?: boolean; service?: string };
  if (!body.ok) throw new Error("health not ok");
  if (body.service !== "relune") console.warn("warn: service name", body.service);
  await check("/api/health?mode=live");
  await check("/sign-in");
  await check("/terms");
  await check("/privacy");
  console.log("smoke passed");
}

main().catch((error) => {
  console.error("smoke failed", error);
  process.exit(1);
});
