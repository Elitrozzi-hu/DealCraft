

import type {
  ApiErrorShape,
  DealSearchRequest,
  DealSearchResult,
  DeckRequest,
  LeadSearchRequest,
  LeadSearchResult,
  MaterialsRequest,
  MaterialsResult,
  PreCallBriefRequest,
  PreCallBriefResult,
  SignalsRequest,
  SignalsResult,
} from "@/types";

export class ApiError extends Error implements ApiErrorShape {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const TIMEOUT_MS = {
  dealsSearch: 310_000,
  signals: 130_000,
  leadsSearch: 70_000,
  materials: 70_000,
  preCallBrief: 70_000,
  generatePpt: 60_000,
} as const;

async function postJson<TReq, TRes>(
  path: `/api/${string}`,
  body: TReq,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<TRes> {
  const res = await fetchWithTimeout(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: withTimeout(timeoutMs, signal),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }
  return (await res.json()) as TRes;
}


function withTimeout(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError(408, "The request took too long and was cancelled. Please try again.");
    }
    throw err;
  }
}

/** Best-effort extraction of a server error message. */
async function readError(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // ignore — fall through to a generic message
  }
  return `Request failed (${res.status})`;
}

export function searchDeal(
  req: DealSearchRequest,
  signal?: AbortSignal,
): Promise<DealSearchResult> {
  return postJson<DealSearchRequest, DealSearchResult>(
    "/api/deals/search",
    req,
    TIMEOUT_MS.dealsSearch,
    signal,
  );
}

export function searchLeads(
  req: LeadSearchRequest,
  signal?: AbortSignal,
): Promise<LeadSearchResult> {
  return postJson<LeadSearchRequest, LeadSearchResult>(
    "/api/leads/search",
    req,
    TIMEOUT_MS.leadsSearch,
    signal,
  );
}

export function generateMaterials(
  req: MaterialsRequest,
  signal?: AbortSignal,
): Promise<MaterialsResult> {
  return postJson<MaterialsRequest, MaterialsResult>(
    "/api/materials",
    req,
    TIMEOUT_MS.materials,
    signal,
  );
}

export function searchSignals(
  req: SignalsRequest,
  signal?: AbortSignal,
): Promise<SignalsResult> {
  return postJson<SignalsRequest, SignalsResult>(
    "/api/signals",
    req,
    TIMEOUT_MS.signals,
    signal,
  );
}

export function generatePreCallBrief(
  req: PreCallBriefRequest,
  signal?: AbortSignal,
): Promise<PreCallBriefResult> {
  return postJson<PreCallBriefRequest, PreCallBriefResult>(
    "/api/pre-call-brief",
    req,
    TIMEOUT_MS.preCallBrief,
    signal,
  );
}

export async function generatePpt(
  req: DeckRequest,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetchWithTimeout("/api/generate-ppt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: withTimeout(TIMEOUT_MS.generatePpt, signal),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }
  return res.blob();
}
