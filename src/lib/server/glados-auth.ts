import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  GLADOS_API_URL,
  JANUS_URL,
  HUMAND_CLIENT_ID,
  HUMAND_CLIENT_SECRET,
  NODE_ENV,
} from './env.js';

const COOKIE_GLADOS  = 'hu_glados_token';
const COOKIE_REFRESH = 'hu_refresh_token';
const GLADOS_COOKIE_OPTS  = `HttpOnly; ${NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/api`;
const REFRESH_COOKIE_OPTS = `HttpOnly; ${NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/`;

function parseCookies(req: VercelRequest): Record<string, string> {
  const raw = (req.headers.cookie as string | undefined) ?? '';
  return Object.fromEntries(
    raw.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const idx = c.indexOf('=');
        return idx === -1 ? [c, ''] : [c.slice(0, idx), c.slice(idx + 1)];
      }),
  );
}

function encodeGladosToken(token: string, expiresIn: number): string {
  return `${token}|${Date.now() + expiresIn * 1000}`;
}

function decodeGladosToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf('|');
  if (idx === -1) return null;
  const expMs = Number(raw.slice(idx + 1));
  if (isNaN(expMs) || Date.now() >= expMs) return null;
  return raw.slice(0, idx);
}

/**
 * Extracts or refreshes the GLaDOS access token from the incoming request's
 * cookies, then caches it in `hu_glados_token` (scoped to /api) and
 * rotates `hu_refresh_token`. Call this from any BFF function before making
 * server-side GLaDOS requests (i.e. when LLM_PROVIDER=glados).
 */
export async function getGladosToken(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string> {
  if (!GLADOS_API_URL) throw new Error('GLADOS_API_URL is not set');

  const cookies = parseCookies(req);

  const cached = decodeGladosToken(cookies[COOKIE_GLADOS]);
  if (cached) return cached;

  const refreshToken = cookies[COOKIE_REFRESH];
  if (!refreshToken) {
    throw Object.assign(new Error('unauthenticated'), { statusCode: 401 });
  }

  const tokenRes = await fetch(`${JANUS_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     HUMAND_CLIENT_ID!,
      client_secret: HUMAND_CLIENT_SECRET!,
      resource:      'glados-api',
    }),
  });

  if (!tokenRes.ok) {
    const statusCode = tokenRes.status === 401 ? 401 : 502;
    throw Object.assign(new Error('glados_token_exchange_failed'), { statusCode });
  }

  const { access_token, refresh_token: newRefresh, expires_in } = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresIn = expires_in ?? 900;
  const setCookies = [
    `${COOKIE_GLADOS}=${encodeGladosToken(access_token, expiresIn)}; Max-Age=${expiresIn}; ${GLADOS_COOKIE_OPTS}`,
    `${COOKIE_REFRESH}=${newRefresh}; Max-Age=${60 * 60 * 24 * 30}; ${REFRESH_COOKIE_OPTS}`,
  ];

  const existing = res.getHeader('Set-Cookie');
  const base = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  res.setHeader('Set-Cookie', [...base, ...setCookies]);

  return access_token;
}
