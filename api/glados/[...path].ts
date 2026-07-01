import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getGladosToken } from '../../src/lib/server/glados-auth.js';
import { GLADOS_API_URL } from '../../src/lib/server/env.js';
import { mapApiError } from '../../src/lib/server/api-error.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let gladosToken: string;
  try {
    gladosToken = await getGladosToken(req, res);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      rules: (e) => {
        if (!(e instanceof Error) || !('statusCode' in e)) return undefined;
        if (e.message === 'unauthenticated') return { status: 401, error: 'unauthenticated' };
        if ((e as { statusCode?: number }).statusCode === 401) return { status: 401, error: 'session_expired' };
        return { status: 502, error: 'token_exchange_failed' };
      },
    });
    return res.status(status).json({ error });
  }

  const gladosPath = '/' + (Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path ?? '');

  const gladosRes = await fetch(`${GLADOS_API_URL}${gladosPath}`, {
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
