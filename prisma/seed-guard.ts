/** Refuse demo seeds in production unless explicitly allowed. */
export function assertDemoSeedsAllowed() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEEDS !== "true"
  ) {
    console.error(
      "Demo seeds are disabled in production. Set ALLOW_DEMO_SEEDS=true only on isolated staging.",
    );
    process.exit(1);
  }
}
