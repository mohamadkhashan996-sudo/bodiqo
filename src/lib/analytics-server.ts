/**
 * Server-side analytics helper (no window).
 * Mirrors client `track` event names for product instrumentation.
 */

type Props = Record<string, string | number | boolean | undefined>;

export type ServerAnalyticsEvent =
  | "post_share"
  | "post_create"
  | "sign_up"
  | "sign_in";

export function trackServer(event: ServerAnalyticsEvent, props: Props = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics:server]", event, props);
  }
  // Extension point for Segment / PostHog / GA4 server adapters
}
