import { LOG_LEVEL, LOG_FORMAT, NODE_ENV } from "./env";

// Structured, server-only logger (the "wide event" / canonical-log-line approach:
// emit ONE event per request enriched through its lifecycle, not scattered lines).
// This is the ONLY module that calls `console.*` directly — every other server
// module logs through `createLogger(scope)`. Server-only: it reads the env seam
// and Classidy debug payloads carry contact PII, so it must never reach a client
// bundle. Threshold + format are resolved ONCE at module load (no per-call env
// reads); changing a level needs a process restart.

// --- Levels ---------------------------------------------------------------
// Numeric ordering so a sub-threshold call is dropped with one integer compare,
// before any record is built or any string is serialized.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 } as const;
type Threshold = keyof typeof LEVELS;
export type LogLevel = Exclude<Threshold, "silent">;

const THRESHOLD: number = (() => {
  const raw = (LOG_LEVEL ?? "").toLowerCase();
  if (raw in LEVELS) return LEVELS[raw as Threshold];
  // Default: chatty in dev, quieter in prod.
  return NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
})();

const FORMAT: "pretty" | "json" =
  LOG_FORMAT === "pretty" || LOG_FORMAT === "json"
    ? LOG_FORMAT
    : NODE_ENV === "production"
      ? "json"
      : "pretty";

const INCLUDE_STACK = NODE_ENV !== "production";

// --- Field types (strict: no `any`) ---------------------------------------
// A closed scalar union keeps pretty/JSON formatting total. Complex or
// PII-bearing payloads must be pre-serialized by the caller (`JSON.stringify`),
// forcing an explicit, auditable decision at every such site.
export type LogField = string | number | boolean | null | undefined;
export type LogFields = Record<string, LogField>;

interface LogRecord {
  level: LogLevel;
  scope: string;
  msg: string;
  time: string;
  fields: LogFields;
}

// --- Public surface -------------------------------------------------------
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  /** Start a canonical wide event; enrich through the request, `emit()` once. */
  event(name: string): WideEvent;
  /** Derive a child logger that always carries `base` fields under a sub-scope. */
  child(scope: string, base?: LogFields): Logger;
}

export interface WideEvent {
  set(key: string, value: LogField): this;
  merge(fields: LogFields): this;
  /** Attach an Error as errorType/errorMessage/errorCode (+stack only off-prod). */
  setError(err: unknown): this;
  /** Emit once. Level defaults to `error` if `setError` was called, else `info`. */
  emit(level?: LogLevel): void;
}

// --- Emit + format --------------------------------------------------------
function emitRecord(rec: LogRecord): void {
  const line = FORMAT === "json" ? formatJson(rec) : formatPretty(rec);
  // Route to the matching console method so the stdout/stderr split is preserved.
  const sink =
    rec.level === "error"
      ? console.error
      : rec.level === "warn"
        ? console.warn
        : console.log;
  sink(line);
}

function formatJson(rec: LogRecord): string {
  // One JSON object per line — machine-parseable (jq, Loki, Vercel drains).
  return JSON.stringify({
    time: rec.time,
    level: rec.level,
    scope: rec.scope,
    msg: rec.msg,
    ...rec.fields,
  });
}

const COLOR: Record<LogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

function formatPretty(rec: LogRecord): string {
  // Readable single line: `HH:MM:SS.mmm LEVEL [scope] msg  k=v k=v`.
  const kv = Object.entries(rec.fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      const s = String(v);
      return `${k}=${typeof v === "string" && /\s/.test(v) ? JSON.stringify(v) : s}`;
    })
    .join(" ");
  const t = rec.time.slice(11, 23); // HH:MM:SS.mmm
  return `${COLOR[rec.level]}${t} ${rec.level.toUpperCase().padEnd(5)}${RESET} [${rec.scope}] ${rec.msg}${kv ? "  " + kv : ""}`;
}

// --- Factory --------------------------------------------------------------
export function createLogger(scope: string, base: LogFields = {}): Logger {
  const log = (level: LogLevel, msg: string, fields?: LogFields): void => {
    if (LEVELS[level] < THRESHOLD) return; // drop BEFORE building the record
    emitRecord({
      level,
      scope,
      msg,
      time: new Date().toISOString(),
      fields: { ...base, ...fields },
    });
  };

  return {
    debug: (m, f) => log("debug", m, f),
    info: (m, f) => log("info", m, f),
    warn: (m, f) => log("warn", m, f),
    error: (m, f) => log("error", m, f),
    child: (childScope, childBase) =>
      createLogger(`${scope}:${childScope}`, { ...base, ...childBase }),
    event: (name) => {
      const fields: LogFields = { ...base };
      let sawError = false;
      const ev: WideEvent = {
        set(key, value) {
          fields[key] = value;
          return ev;
        },
        merge(extra) {
          Object.assign(fields, extra);
          return ev;
        },
        setError(err) {
          sawError = true;
          if (err instanceof Error) {
            fields.errorType = err.name;
            fields.errorMessage = err.message;
            if (INCLUDE_STACK) fields.errorStack = err.stack ?? null;
            const code = (err as { code?: unknown }).code;
            if (typeof code === "string" || typeof code === "number") {
              fields.errorCode = code;
            }
          } else {
            fields.errorType = typeof err;
            fields.errorMessage = String(err);
          }
          return ev;
        },
        emit(level) {
          const lvl: LogLevel = level ?? (sawError ? "error" : "info");
          if (LEVELS[lvl] < THRESHOLD) return; // drop BEFORE serializing
          emitRecord({
            level: lvl,
            scope,
            msg: name,
            time: new Date().toISOString(),
            fields,
          });
        },
      };
      return ev;
    },
  };
}
