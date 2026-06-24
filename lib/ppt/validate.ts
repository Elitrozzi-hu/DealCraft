// Input validation for the POST body. The body is a flat map of token name ->
// value (one level of nesting allowed, e.g. a `pricing` object, which is
// flattened). Values must be scalars. Throws ValidationError (-> HTTP 400) with
// a human-readable message on bad input.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Validated, normalized token map: token name -> scalar value. */
export type ClientData = Record<string, string | number>;

const MAX_STRING = 200; // generic string token cap
const MAX_LOGO = 8 * 1024 * 1024; // logo may be a (large) data URL
const NON_NEGATIVE = new Set([
  'users',
  'mrr',
  'mrr_disc',
  'users_a',
  'mrr_a',
  'mrr_disc_a',
  'users_b',
  'mrr_b',
  'mrr_disc_b',
  'headcount',
  'desklessPct',
]);

function assignScalar(out: ClientData, key: string, value: unknown): void {
  if (value == null) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ValidationError(`"${key}" must be a finite number`);
    if (NON_NEGATIVE.has(key) && value < 0) throw new ValidationError(`"${key}" must be >= 0`);
    out[key] = value;
  } else if (typeof value === 'string') {
    const cap = key === 'logo' ? MAX_LOGO : MAX_STRING;
    if (value.length > cap) throw new ValidationError(`"${key}" exceeds ${cap} characters`);
    out[key] = value;
  } else if (typeof value === 'boolean') {
    out[key] = String(value);
  } else {
    throw new ValidationError(`"${key}" must be a string or number`);
  }
}

export function parseClientData(raw: unknown): ClientData {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const out: ClientData = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // one level of nesting (e.g. { pricing: { mrr, users } })
      for (const [k2, v2] of Object.entries(value as Record<string, unknown>)) assignScalar(out, k2, v2);
    } else {
      assignScalar(out, key, value);
    }
  }
  return out;
}
