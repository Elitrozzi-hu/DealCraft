import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCookies, buildTokenCookies } from '../auth/_lib.js';

const JANUS_URL     = process.env.JANUS_URL as string;
const CLIENT_ID     = process.env.HUMAND_CLIENT_ID as string;
const CLIENT_SECRET = process.env.HUMAND_CLIENT_SECRET as string;
const GLADOS_URL    = process.env.GLADOS_API_URL as string;
const COOKIE_REFRESH = 'hu_refresh_token';
const COOKIE_GLADOS  = 'hu_glados_token';
const COOKIE_OPTS    = `HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/api/glados`;

function encodeGladosToken(accessToken: string, expiresIn: number): string {
  const expMs = Date.now() + expiresIn * 1000;
  return `${accessToken}|${expMs}`;
}

function decodeGladosToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf('|');
  if (idx === -1) return null;
  const expMs = Number(raw.slice(idx + 1));
  if (isNaN(expMs) || Date.now() >= expMs) return null;
  return raw.slice(0, idx);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const cookies = parseCookies(req);
  const setCookies: string[] = [];

  let gladosToken = decodeGladosToken(cookies[COOKIE_GLADOS]);

  if (!gladosToken) {
    const refreshToken = cookies[COOKIE_REFRESH];
    if (!refreshToken) return res.status(401).json({ error: 'unauthenticated' });

    const tokenRes = await fetch(`${JANUS_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        resource:      'glados-api',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      if (tokenRes.status === 401) return res.status(401).json({ error: 'session_expired' });
      return res.status(502).json({ error: 'token_exchange_failed', detail: err });
    }

    const { access_token, refresh_token: newRefresh, expires_in } = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    gladosToken = access_token;

    setCookies.push(`${COOKIE_GLADOS}=${encodeGladosToken(access_token, expires_in ?? 900)}; Max-Age=${expires_in ?? 900}; ${COOKIE_OPTS}`);

    const [, refreshCookie] = buildTokenCookies({ access_token, refresh_token: newRefresh, expires_in: expires_in ?? 900 });
    setCookies.push(refreshCookie);
  }

  if (setCookies.length) res.setHeader('Set-Cookie', setCookies);

  const gladosPath = '/' + (Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path ?? '');

  const gladosRes = await fetch(`${GLADOS_URL}${gladosPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${gladosToken}`,
    },
    body: JSON.stringify(req.body),
  });

  if (!gladosRes.ok) {
    const err = await gladosRes.json().catch(() => ({}));
    return res.status(gladosRes.status).json({ error: 'glados_error', detail: err });
  }

  return res.status(200).json(await gladosRes.json());
}
