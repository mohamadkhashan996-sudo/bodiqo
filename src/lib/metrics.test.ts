import { beforeEach, describe, expect, it } from "vitest";

import {
  incCounter,
  metricsSnapshot,
  observeMs,
  renderPrometheus,
} from "@/lib/metrics";

describe("metrics", () => {
  beforeEach(() => {
    // Counters accumulate process-wide; assert relative presence.
    incCounter("relune_test_counter", { suite: "unit" });
    observeMs("relune_test_latency", 12, { suite: "unit" });
  });

  it("renders prometheus text with process gauges", () => {
    const text = renderPrometheus();
    expect(text).toContain("relune_up 1");
    expect(text).toContain("relune_process_uptime_seconds");
    expect(text).toContain('relune_test_counter{suite="unit"}');
  });

  it("exposes a JSON snapshot", () => {
    const snap = metricsSnapshot();
    expect(snap.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(snap.heapUsed).toBeGreaterThan(0);
  });
});
