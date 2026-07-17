type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return "info";
}

function shouldLog(level: Level) {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel()];
}

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "relune",
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),
  child(bindings: Record<string, unknown>) {
    return {
      debug: (message: string, meta?: Record<string, unknown>) =>
        log("debug", message, { ...bindings, ...meta }),
      info: (message: string, meta?: Record<string, unknown>) =>
        log("info", message, { ...bindings, ...meta }),
      warn: (message: string, meta?: Record<string, unknown>) =>
        log("warn", message, { ...bindings, ...meta }),
      error: (message: string, meta?: Record<string, unknown>) =>
        log("error", message, { ...bindings, ...meta }),
    };
  },
};
