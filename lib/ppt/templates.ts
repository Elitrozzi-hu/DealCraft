// Template resolution. Tokenized `.pptx` templates live under
// `deck-assets/templates/<id>.pptx`. Each is a real PowerPoint deck whose
// client-specific fields have been replaced with `{{token}}` placeholders, so
// adding a new deck is just dropping a tokenized `.pptx` here — no extraction or
// re-rendering step.

import { join } from 'node:path';

const TEMPLATES_DIR = join(process.cwd(), 'deck-assets', 'templates');

/** Default template id when the request does not specify one. */
const DEFAULT_TEMPLATE = 'royal-caribbean';

/** Resolve a template id to its on-disk path (id is sanitized to a basename). */
export function templatePath(id?: string): string {
  const safe = (id || DEFAULT_TEMPLATE).replace(/[^a-z0-9_-]/gi, '');
  return join(TEMPLATES_DIR, `${safe || DEFAULT_TEMPLATE}.pptx`);
}
