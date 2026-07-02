import { randomBytes, createHash } from 'node:crypto';

import {
  type TokenSet,
  type JwtPayload,
  type Session,
  callJanusToken,
  buildClearCookies,
  buildTokenCookies,
  parseCookies,
  refreshTokens,
  resolveSession,
  revokeToken,
  COOKIE_OPTS,
} from './_token-base.js';
import {
  HUMAND_CLIENT_ID,
  APP_CALLBACK_URL as APP_CALLBACK_URL_ENV,
  JANUS_URL as JANUS_URL_ENV,
  HUMAND_AUDIENCE as HUMAND_AUDIENCE_ENV,
  NODE_ENV,
} from '../../src/lib/server/env.js';

export type { TokenSet, JwtPayload, Session };
export { buildClearCookies, buildTokenCookies, parseCookies, refreshTokens, resolveSession, revokeToken };

const CLIENT_ID = HUMAND_CLIENT_ID!;
const APP_CALLBACK_URL = APP_CALLBACK_URL_ENV!;
const JANUS_URL = JANUS_URL_ENV!;
const HUMAND_AUDIENCE = HUMAND_AUDIENCE_ENV!;

export const PKCE_COOKIE = 'hu_pkce';

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
}

function generateChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generatePKCE() {
  const verifier = generateVerifier();
  return { verifier, challenge: generateChallenge(verifier) };
}

export function buildPKCECookie(verifier: string, state: string): string {
  const PKCE_OPTS = `HttpOnly; ${NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=300`;
  return `${PKCE_COOKIE}=${verifier}|${state}; ${PKCE_OPTS}`;
}

export function buildClearPKCECookie(): string {
  return `${PKCE_COOKIE}=; Max-Age=0; ${COOKIE_OPTS}`;
}

export function parsePKCECookie(
  raw: string,
): { verifier: string; state: string } | null {
  const idx = raw.indexOf('|');
  if (idx === -1) return null;
  return { verifier: raw.slice(0, idx), state: raw.slice(idx + 1) };
}

// &continue is mandatory — Janus requires it to complete the STAFF flow
export function buildLoginUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: APP_CALLBACK_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    resource: HUMAND_AUDIENCE,
  });
  return `${JANUS_URL}/oauth2/authorize?${params.toString()}&continue`;
}

// ── Janus calls ───────────────────────────────────────────────────────────────

export async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  return callJanusToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: APP_CALLBACK_URL,
      resource: HUMAND_AUDIENCE,
    }),
  );
}
