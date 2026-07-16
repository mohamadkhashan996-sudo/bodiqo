/**
 * Pluggable product analytics.
 * Set NEXT_PUBLIC_ANALYTICS_PROVIDER=console|plausible|none
 * and NEXT_PUBLIC_ANALYTICS_DOMAIN for Plausible.
 */

type Props = Record<string, string | number | boolean | undefined>;

export type AnalyticsEvent =
  | "page_view"
  | "sign_up"
  | "sign_in"
  | "post_create"
  | "message_send"
  | "community_join"
  | "feature_use"
  | "session_start";

function provider() {
  return (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || "none").toLowerCase();
}

export function track(event: AnalyticsEvent, props: Props = {}) {
  if (typeof window === "undefined") return;
  const mode = provider();
  if (mode === "none") return;

  if (mode === "console" || process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[analytics]", event, props);
  }

  if (mode === "plausible" && "plausible" in window) {
    (
      window as Window & {
        plausible?: (e: string, o?: { props?: Props }) => void;
      }
    ).plausible?.(event, { props });
  }

  // Extension point for Segment / PostHog / GA4 adapters
  window.dispatchEvent(
    new CustomEvent("relune:analytics", { detail: { event, props } }),
  );
}

export function trackPageView(path: string) {
  track("page_view", { path });
}
