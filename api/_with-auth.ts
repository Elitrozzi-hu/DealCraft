import type { VercelRequest, VercelResponse } from '@vercel/node';

import { resolveSession, type Session } from './auth/_lib.js';

type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  session: Session,
) => Promise<void>;

export function withAuth(
  handler: AuthedHandler,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    const session = await resolveSession(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (session.renewedCookies) {
      res.setHeader('Set-Cookie', session.renewedCookies);
    }
    return handler(req, res, session);
  };
}
