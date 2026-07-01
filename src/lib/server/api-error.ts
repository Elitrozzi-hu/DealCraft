import { ZodError } from "zod";



export interface ApiError {
  status: number;
  error: string;
}

export interface MapApiErrorOptions {
  rules?: (err: unknown) => ApiError | undefined;
  upstreamLabel?: string;
  fallback?: string;
}


export function mapApiError(
  err: unknown,
  opts: MapApiErrorOptions = {},
): ApiError {
  const label = opts.upstreamLabel ?? "Upstream";

  const domain = opts.rules?.(err);
  if (domain) return domain;

  if (err instanceof Error && /Unknown \w+ provider/i.test(err.message)) {
    return { status: 400, error: err.message };
  }
  if (isRateLimited(err)) {
    return { status: 429, error: "Rate limited by the upstream provider." };
  }
  if (err instanceof ZodError) {
    return { status: 502, error: `${label} returned an unexpected shape.` };
  }
  if (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  ) {
    return { status: 502, error: `${label} timed out.` };
  }
  return { status: 500, error: opts.fallback ?? "Request failed" };
}

function isRateLimited(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "statusCode" in err &&
    (err as { statusCode?: number }).statusCode === 429
  );
}
