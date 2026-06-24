// Orchestrator: raw request body -> validated tokens -> tokenized template
// filled in place -> rendered .pptx bytes + a safe download filename.

import { readFile } from 'node:fs/promises';
import { parseClientData } from './validate';
import { buildTokenMap } from './tokens';
import { templatePath } from './templates';
import { fillTemplate } from './fill';
import { loadLogo, type LogoAsset } from './logo';
import { createLogger } from '@/lib/server/logger';

const log = createLogger('ppt');

type GeneratedDeck = { data: ArrayBuffer; filename: string };

export async function generatePresentation(rawBody: unknown): Promise<GeneratedDeck> {
  const data = parseClientData(rawBody); // throws ValidationError on bad input
  const tokens = buildTokenMap(data);

  // `logo` and `template` drive generation, not literal text substitution.
  const templateId = tokens.template;
  const logoSource = tokens.logo;
  delete tokens.template;
  delete tokens.logo;

  let logo: LogoAsset | null = null;
  if (logoSource) {
    try {
      logo = await loadLogo(logoSource);
    } catch (err) {
      // A bad client logo must not sink the deck — drop it and continue.
      log.warn('skipped logo', { reason: (err as Error).message });
    }
  }

  const templateBytes = await readFile(templatePath(templateId));
  const filled = await fillTemplate(templateBytes, tokens, logo);
  return { data: filled, filename: `${tokens.clientName}.pptx` };
}
