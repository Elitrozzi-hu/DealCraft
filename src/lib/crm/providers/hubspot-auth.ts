import { HUBSPOT_ACCESS_TOKEN } from "@/lib/server/env";

// HubSpot authentication contract — isolated from the search contract in
// `hubspot.ts`. Turns whatever is in `HUBSPOT_ACCESS_TOKEN` into a usable bearer:
//
//   - A Private App token (`pat-…`) is already a bearer → used as-is.
//   - Anything else is treated as a HubSpot CLI **personal access key**, which is
//     NOT a bearer: it must be exchanged for a short-lived access token (~30 min)
//     via HubSpot's `localdevauth` endpoint (the same one the CLI uses). The
//     minted token is cached and reused until shortly before expiry, so we do NOT
//     hit the exchange on every request (it would waste latency + rate-limit).

const EXCHANGE_URL = "https://api.hubapi.com/localdevauth/v1/auth/refresh";
/** Refresh this long before the reported expiry to avoid using a stale token. */
const REFRESH_SKEW_MS = 60_000;

/** Subset of the `localdevauth/v1/auth/refresh` response we consume. */
interface AccessTokenResponse {
  oauthAccessToken: string;
  expiresAtMillis: number;
}

interface CachedToken {
  token: string;
  /** Epoch ms at which the minted token expires. */
  expiresAt: number;
}

let cached: CachedToken | undefined;

/** Exchange a personal access key for a short-lived access token. */
async function exchangePersonalAccessKey(pak: string): Promise<CachedToken> {
  const res = await fetch(EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encodedOAuthRefreshToken: pak }),
    // Stay well under the route's 60s budget.
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `HubSpot personal access key exchange failed: ${res.status} ${detail}`.trim(),
    );
  }

  const data = (await res.json()) as AccessTokenResponse;
  return { token: data.oauthAccessToken, expiresAt: data.expiresAtMillis };
}

/**
 * Resolve a HubSpot access token to use as the SDK bearer. A `pat-…` Private App
 * token is returned directly; any other value is treated as a personal access key
 * and exchanged for a cached, short-lived token. Throws if no credential is set.
 */
export async function getHubspotAccessToken(): Promise<string> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN is not set; required for the HubSpot CRM provider.",
    );
  }

  // Private App tokens are usable bearers as-is.
  if (HUBSPOT_ACCESS_TOKEN.startsWith("pat-")) {
    return HUBSPOT_ACCESS_TOKEN;
  }

  // Otherwise it's a personal access key: exchange + cache.
  if (cached && Date.now() < cached.expiresAt - REFRESH_SKEW_MS) {
    return cached.token;
  }
  cached = await exchangePersonalAccessKey(HUBSPOT_ACCESS_TOKEN);
  return cached.token;
}
