"use client";

import { useEffect } from "react";

import { track } from "@/lib/analytics";

type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";

/**
 * Lightweight RUM without the `web-vitals` package.
 * Reports Core Web Vitals once per metric to the analytics adapter when enabled.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof PerformanceObserver === "undefined"
    ) {
      return;
    }

    const sent = new Set<MetricName>();
    const report = (name: MetricName, value: number) => {
      if (sent.has(name)) return;
      sent.add(name);
      track("feature_use", {
        feature: "web_vital",
        name,
        value: Math.round(name === "CLS" ? value * 1000 : value),
      });
    };

    const observers: PerformanceObserver[] = [];

    try {
      const lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          startTime?: number;
        };
        if (last?.startTime != null) report("LCP", last.startTime);
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcp);
    } catch {
      /* unsupported */
    }

    try {
      let clsValue = 0;
      const cls = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<
          PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        >) {
          if (!entry.hadRecentInput) clsValue += entry.value ?? 0;
        }
      });
      cls.observe({ type: "layout-shift", buffered: true });
      observers.push(cls);
      const onHide = () => report("CLS", clsValue);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") onHide();
      });
    } catch {
      /* unsupported */
    }

    try {
      const paint = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            report("FCP", entry.startTime);
          }
        }
      });
      paint.observe({ type: "paint", buffered: true });
      observers.push(paint);
    } catch {
      /* unsupported */
    }

    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      if (nav?.responseStart) report("TTFB", nav.responseStart);
    } catch {
      /* ignore */
    }

    try {
      const inp = new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<
          PerformanceEntry & { duration?: number; interactionId?: number }
        >;
        let worst = 0;
        for (const entry of entries) {
          if ((entry.interactionId ?? 0) > 0) {
            worst = Math.max(worst, entry.duration ?? 0);
          }
        }
        if (worst > 0) report("INP", worst);
      });
      inp.observe({
        type: "event",
        buffered: true,
        durationThreshold: 40,
      } as PerformanceObserverInit);
      observers.push(inp);
    } catch {
      /* unsupported */
    }

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return null;
}
