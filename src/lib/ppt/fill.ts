// In-place template filler. Opens a tokenized `.pptx` (a real PowerPoint zip),
// substitutes `{{token}}` placeholders directly in each slide's XML, optionally
// injects a logo image, and re-zips. Every other part of the package — fonts,
// custom geometries, notes, masters, media — is carried through untouched, so
// the output is the template byte-for-byte except the filled fields.

import JSZip from 'jszip';
import { normalizeSplitTokens, replaceTokens } from './xml.js';
import { injectLogo, type LogoAsset } from './logo.js';

const SLIDE_RE = /^ppt\/slides\/slide\d+\.xml$/;
const LOGO_TOKEN = '{{logo}}';

export async function fillTemplate(
  templateBytes: Buffer | Uint8Array,
  tokens: Record<string, string>,
  logo: LogoAsset | null,
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(templateBytes);

  const slideNames = Object.keys(zip.files).filter((name) => SLIDE_RE.test(name));
  for (const name of slideNames) {
    const file = zip.file(name);
    if (!file) continue;
    let xml = normalizeSplitTokens(await file.async('string'));

    if (xml.includes(LOGO_TOKEN)) {
      xml = logo ? await injectLogo(zip, name, xml, logo) : xml.split(LOGO_TOKEN).join('');
    }

    xml = replaceTokens(xml, tokens);
    zip.file(name, xml);
  }

  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}
