// Client-side typed fetchers. The ONLY way the client talks to the backend:
// every call targets a relative `/api/*` path — never an external service and
// never a secret. Non-2xx responses are mapped to a thrown `ApiError`.
// See PLAN "BFF boundary is absolute".

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

/** Thrown on any non-2xx API response. */
export class ApiError extends Error implements ApiErrorShape {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Per-route client timeouts (ms), each sitting just above the route's server
// `maxDuration` so the backend's own error surfaces before the client aborts.
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
): Promise<TRes> {
  const res = await fetchWithTimeout(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }
  return (await res.json()) as TRes;
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

export function searchDeal(req: DealSearchRequest): Promise<DealSearchResult> {
  return postJson<DealSearchRequest, DealSearchResult>(
    "/api/deals/search",
    req,
    TIMEOUT_MS.dealsSearch,
  );
}

/** Searches CRM leads by email; returns matching candidates to pick from. */
export function searchLeads(req: LeadSearchRequest): Promise<LeadSearchResult> {
  return postJson<LeadSearchRequest, LeadSearchResult>(
    "/api/leads/search",
    req,
    TIMEOUT_MS.leadsSearch,
  );
}

export function generateMaterials(req: MaterialsRequest): Promise<MaterialsResult> {
  return postJson<MaterialsRequest, MaterialsResult>(
    "/api/materials",
    req,
    TIMEOUT_MS.materials,
  );
}

export function searchSignals(req: SignalsRequest): Promise<SignalsResult> {
  return postJson<SignalsRequest, SignalsResult>("/api/signals", req, TIMEOUT_MS.signals);
}

/** Generates the on-demand internal pre-call brief for a deal. */
export function generatePreCallBrief(
  req: PreCallBriefRequest,
): Promise<PreCallBriefResult> {
  return postJson<PreCallBriefRequest, PreCallBriefResult>(
    "/api/pre-call-brief",
    req,
    TIMEOUT_MS.preCallBrief,
  );
}

/** Generates a `.pptx` and returns it as a Blob for the browser to download. */
export async function generatePpt(req: DeckRequest): Promise<Blob> {
  const res = await fetchWithTimeout("/api/generate-ppt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(TIMEOUT_MS.generatePpt),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readError(res));
  }
  return res.blob();
}
