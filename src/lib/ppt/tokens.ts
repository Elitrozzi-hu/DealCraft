// Token resolution: turn validated ClientData into a `{{token}}` -> string map,
// applying base defaults and formatting numbers with thousands separators. The
// actual substitution into the deck happens in fill.ts.

import type { ClientData } from './validate.js';

const DEFAULT_CLIENT_NAME = 'Royal Caribbean Group';

/** Build the string lookup, formatting numbers and applying base defaults. */
export function buildTokenMap(data: ClientData): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    tokens[key] = typeof value === 'number' ? value.toLocaleString('en-US') : value;
  }
  if (!tokens.clientName) tokens.clientName = DEFAULT_CLIENT_NAME;
  if (!tokens.date) tokens.date = new Date().toISOString().split('T')[0];
  return tokens;
}
