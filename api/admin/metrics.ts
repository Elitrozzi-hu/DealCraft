import { withAuth } from '../_with-auth.js';

import { assertAdmin } from '../../src/lib/server/admin.js';
import { mapApiError } from '../../src/lib/server/api-error.js';
import { createLogger } from '../../src/lib/server/logger.js';
import { getPersistenceProvider } from '../../src/lib/persistence/registry.js';
import type { AdminMetricsTrendBucket } from '../../src/lib/persistence/types.js';

export const config = { maxDuration: 30 };

const log = createLogger('admin/metrics');

type Range = '30d' | '90d' | 'all';

function parseRange(raw: unknown): Range {
  return raw === '90d' || raw === 'all' ? raw : '30d';
}

function rangeToTrendSince(range: Range): Date | null {
  if (range === 'all') return null;
  const days = range === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function rangeToTrendBucket(range: Range): AdminMetricsTrendBucket {
  if (range === '30d') return 'day';
  if (range === '90d') return 'week';
  return 'month';
}

export default withAuth(async (req, res, session) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!(await assertAdmin(session.user.email ?? session.user.sub))) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const range = parseRange(req.query.range);
  const t0 = Date.now();
  try {
    const metrics = await getPersistenceProvider().getAdminMetrics({
      trendSince: rangeToTrendSince(range),
      trendBucket: rangeToTrendBucket(range),
    });
    log
      .event('admin/metrics.request')
      .set('status', 200)
      .set('range', range)
      .set('durationMs', Date.now() - t0)
      .emit();
    res.status(200).json(metrics);
  } catch (err) {
    const { status, error } = mapApiError(err, {
      upstreamLabel: 'Metrics',
      fallback: 'Failed to load metrics',
    });
    const ev = log
      .event('admin/metrics.request')
      .set('status', status)
      .set('range', range)
      .set('durationMs', Date.now() - t0);
    if (status >= 500) ev.setError(err);
    ev.emit(status >= 500 ? 'error' : 'info');
    res.status(status).json({ error });
  }
});
