/**
 * Lightweight in-process metrics for Prometheus scrapes.
 * Suitable for single-node or sticky deploys; for multi-node use a remote APM.
 */

type CounterKey = string;

const counters = new Map<CounterKey, number>();
const histograms = new Map<CounterKey, number[]>();
const startedAt = Date.now();

function key(name: string, labels?: Record<string, string>) {
  if (!labels || !Object.keys(labels).length) return name;
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
    .join(",");
  return `${name}{${parts}}`;
}

export function incCounter(
  name: string,
  labels?: Record<string, string>,
  by = 1,
) {
  const k = key(name, labels);
  counters.set(k, (counters.get(k) ?? 0) + by);
}

export function observeMs(
  name: string,
  ms: number,
  labels?: Record<string, string>,
) {
  const k = key(name, labels);
  const bucket = histograms.get(k) ?? [];
  bucket.push(ms);
  if (bucket.length > 500) bucket.shift();
  histograms.set(k, bucket);
}

export function renderPrometheus() {
  const lines: string[] = [
    "# HELP relune_up Relune process is up",
    "# TYPE relune_up gauge",
    "relune_up 1",
    "# HELP relune_process_uptime_seconds Process uptime",
    "# TYPE relune_process_uptime_seconds gauge",
    `relune_process_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`,
    "# HELP relune_nodejs_heap_used_bytes Heap used bytes",
    "# TYPE relune_nodejs_heap_used_bytes gauge",
    `relune_nodejs_heap_used_bytes ${process.memoryUsage().heapUsed}`,
  ];

  for (const [k, value] of counters) {
    lines.push(`# TYPE ${k.split("{")[0]} counter`);
    lines.push(`${k} ${value}`);
  }

  for (const [k, samples] of histograms) {
    if (!samples.length) continue;
    const sum = samples.reduce((a, b) => a + b, 0);
    const count = samples.length;
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(count * 0.95))]!;
    const base = k.split("{")[0]!;
    const labelPart = k.includes("{") ? k.slice(k.indexOf("{")) : "";
    lines.push(`# TYPE ${base}_sum summary`);
    lines.push(`${base}_sum${labelPart} ${sum}`);
    lines.push(`${base}_count${labelPart} ${count}`);
    lines.push(`${base}_p95${labelPart} ${p95}`);
  }

  return `${lines.join("\n")}\n`;
}

export function metricsSnapshot() {
  return {
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    heapUsed: process.memoryUsage().heapUsed,
    counters: Object.fromEntries(counters),
    histograms: Object.fromEntries(
      [...histograms].map(([k, samples]) => [
        k,
        {
          count: samples.length,
          avgMs: samples.length
            ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
            : 0,
        },
      ]),
    ),
  };
}
