/**
 * Shared token model — used by both auth-add-staff and auth-add-user.
 * Storage: httpOnly cookies (required for CONFIDENTIAL clients).
 * Refresh: silent renewal on expired access_token; redirect to /login on missing refresh_token.
 */

import {
  JANUS_URL as JANUS_URL_ENV,
  HUMAND_CLIENT_ID,
  HUMAND_CLIENT_SECRET,
  HUMAND_AUDIENCE as HUMAND_AUDIENCE_ENV,
  NODE_ENV,
} from '../../src/lib/server/env.js';

const JANUS_URL = JANUS_URL_ENV!;
const CLIENT_ID = HUMAND_CLIENT_ID!;
const CLIENT_SECRET = HUMAND_CLIENT_SECRET!;
const HUMAND_AUDIENCE = HUMAND_AUDIENCE_ENV!;

export const COOKIE_ACCESS = 'hu_access_token';
export const COOKIE_REFRESH = 'hu_refresh_token';
export const COOKIE_OPTS = `HttpOnly; ${NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  exp?: number;
}

export interface Session {
  user: JwtPayload;
  accessToken: string;
  /** Set when tokens were silently renewed — caller must forward these Set-Cookie headers */
  renewedCookies?: string[];
}

// ── Janus token calls ─────────────────────────────────────────────────────────

export async function callJanusToken(body: URLSearchParams): Promise<TokenSet> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  if (!JANUS_URL) throw new Error('JANUS_URL is not set');

  try {
    const res = await fetch(`${JANUS_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.json();
      console.error('[janus] token request body:', body.toString());
      console.error('[janus] error response:', JSON.stringify(errorBody));
      throw new Error(`Janus ${res.status}: ${(errorBody as { error?: string }).error}`);
    }

    return res.json() as Promise<TokenSet>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return callJanusToken(
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, resource: HUMAND_AUDIENCE }),
  );
}

export async function revokeToken(token: string): Promise<void> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    await fetch(`${JANUS_URL}/oauth2/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ token, token_type_hint: 'refresh_token' }).toString(),
      signal: controller.signal,
    });
  } catch {
    // best-effort — local cookies cleared regardless
  } finally {
    clearTimeout(timeout);
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function buildTokenCookies(tokens: TokenSet): string[] {
  const accessMaxAge = tokens.expires_in ?? 900;
  const refreshMaxAge = 60 * 60 * 24 * 30; // 30 days
  return [
    `${COOKIE_ACCESS}=${tokens.access_token}; Max-Age=${accessMaxAge}; ${COOKIE_OPTS}`,
    `${COOKIE_REFRESH}=${tokens.refresh_token}; Max-Age=${refreshMaxAge}; ${COOKIE_OPTS}`,
  ];
}

export function buildClearCookies(): string[] {
  return [
    `${COOKIE_ACCESS}=; Max-Age=0; ${COOKIE_OPTS}`,
    `${COOKIE_REFRESH}=; Max-Age=0; ${COOKIE_OPTS}`,
  ];
}

export function parseCookies(req: {
  headers: { cookie?: string | string[] };
}): Record<string, string> {
  const raw = req.headers.cookie;
  const header = Array.isArray(raw) ? raw[0] : (raw ?? '');
  return Object.fromEntries(
    header.split(';').flatMap(pair => {
      const [k, ...v] = pair.trim().split('=');
      return k ? [[k.trim(), v.join('=').trim()]] : [];
    }),
  );
}

// ── JWT decode (no signature verification) ────────────────────────────────────

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid JWT');
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload;
}

function isExpired(payload: JwtPayload): boolean {
  return !!payload.exp && payload.exp * 1000 < Date.now();
}

// ── Session resolution ────────────────────────────────────────────────────────

export async function resolveSession(req: {
  headers: { cookie?: string | string[] };
}): Promise<Session | null> {
  const cookies = parseCookies(req);
  const accessToken = cookies[COOKIE_ACCESS];
  const refreshToken = cookies[COOKIE_REFRESH];

  if (accessToken) {
    try {
      const payload = decodeJwt(accessToken);
      if (!isExpired(payload)) return { user: payload, accessToken };
    } catch {
      // malformed token — fall through to refresh
    }
  }

  if (!refreshToken) return null;

  try {
    const tokens = await refreshTokens(refreshToken);
    const payload = decodeJwt(tokens.access_token);
    return {
      user: payload,
      accessToken: tokens.access_token,
      renewedCookies: buildTokenCookies(tokens),
    };
  } catch {
    return null;
  }
}
