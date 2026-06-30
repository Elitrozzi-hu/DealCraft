import { type VercelRequest, type VercelResponse } from '@vercel/node';

import {
  buildClearCookies,
  buildClearPKCECookie,
  buildLoginUrl,
  buildPKCECookie,
  buildTokenCookies,
  exchangeCode,
  generatePKCE,
  parseCookies,
  parsePKCECookie,
  refreshTokens,
  resolveSession,
  revokeToken,
} from './_lib.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = (req.query.path ?? req.query['...path']) as
    | string
    | string[]
    | undefined;
  const route = Array.isArray(segments) ? segments[0] : (segments ?? '');

  switch (route) {
    case 'login':
      return handleLogin(req, res);
    case 'callback':
      return handleCallback(req, res);
    case 'me':
      return handleMe(req, res);
    case 'refresh':
      return handleRefresh(req, res);
    case 'logout':
      return handleLogout(req, res);
    default:
      return res.status(404).send('Not found');
  }
}

// ── GET /api/auth/login ───────────────────────────────────────────────────────

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { verifier, challenge } = generatePKCE();
  // state carries the return path encoded as base64url so the callback can
  // redirect back to it. Not used for CSRF — PKCE verifier handles replay
  // protection. Tradeoff: a tampered state would redirect to the wrong path
  // but not grant access; acceptable for internal tools.
  const returnTo =
    typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
      ? req.query.returnTo
      : '/';
  const state = Buffer.from(returnTo).toString('base64url');
  const loginUrl = buildLoginUrl(state, challenge);
  res.setHeader('Set-Cookie', buildPKCECookie(verifier, state));
  return res.redirect(302, loginUrl);
}

// ── GET /api/auth/callback?code=...&state=... ─────────────────────────────────

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const pkceRaw = req.headers.cookie ? parseCookies(req)['hu_pkce'] : undefined;

  if (!code || !pkceRaw)
    return res.redirect('/error?reason=missing_params');

  const pkce = parsePKCECookie(pkceRaw);
  if (!pkce) return res.redirect('/error?reason=missing_params');

  // Decode returnTo from state (base64url). Fall back to '/' if missing or malformed.
  let returnTo = '/';
  if (state) {
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      if (decoded.startsWith('/')) returnTo = decoded;
    } catch {
      // ignore malformed state — stay at '/'
    }
  }

  try {
    const tokens = await exchangeCode(code, pkce.verifier);
    res.setHeader('Set-Cookie', [
      ...buildTokenCookies(tokens),
      buildClearPKCECookie(),
    ]);
    return res.redirect(returnTo);
  } catch (error) {
    console.error('Token exchange failed:', error);
    return res.redirect('/error?reason=auth_failed');
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

async function handleMe(req: VercelRequest, res: VercelResponse) {
  const session = await resolveSession(req);

  if (!session) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  if (session.renewedCookies) {
    res.setHeader('Set-Cookie', session.renewedCookies);
  }

  return res.status(200).json(session.user);
}

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  const cookies = parseCookies(req);
  const refreshToken = cookies['hu_refresh_token'];

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    res.setHeader('Set-Cookie', buildTokenCookies(tokens));
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'Refresh failed' });
  }
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  const cookies = parseCookies(req);
  const refreshToken = cookies['hu_refresh_token'];
  if (refreshToken) await revokeToken(refreshToken);
  res.setHeader('Set-Cookie', buildClearCookies());
  return res.status(200).json({ ok: true });
}
