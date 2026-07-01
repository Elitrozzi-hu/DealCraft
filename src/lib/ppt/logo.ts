// Client logo handling. The template ships a `{{logo}}` text placeholder; when a
// logo is supplied we load its bytes, then replace that text shape with a real
// `<p:pic>` (registering the image as slide media + a relationship) sized to fit
// the placeholder box without distortion.

import type JSZip from 'jszip';

const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

export type LogoAsset = { buf: Buffer; ext: 'png' | 'jpg'; w: number; h: number };

const extOf = (mime: string, file: string): 'png' | 'jpg' =>
  mime.includes('jpeg') || mime.includes('jpg') || /\.jpe?g$/i.test(file) ? 'jpg' : 'png';

/** Read pixel dimensions from PNG/JPEG bytes (no deps), for aspect-ratio fitting. */
function imageDims(buf: Buffer): { w: number; h: number } | null {
  if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = buf[o + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

/** Load a logo from a data URL or http(s) URL into bytes + measured dimensions. */
export async function loadLogo(file: string): Promise<LogoAsset> {
  let buf: Buffer;
  let mime = '';

  if (file.startsWith('data:')) {
    const comma = file.indexOf(',');
    if (comma === -1) throw new Error('malformed data URL');
    mime = file.slice(5, comma);
    buf = Buffer.from(file.slice(comma + 1), 'base64');
  } else if (/^https?:\/\//i.test(file)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(file, { signal: controller.signal });
      if (!res.ok) throw new Error(`logo fetch failed (${res.status})`);
      const ab = await res.arrayBuffer();
      if (ab.byteLength > MAX_IMAGE_BYTES) throw new Error('logo exceeds size limit');
      buf = Buffer.from(ab);
      mime = res.headers.get('content-type') || '';
    } finally {
      clearTimeout(timer);
    }
  } else {
    throw new Error('logo must be a data URL or http(s) URL');
  }

  const dims = imageDims(buf);
  if (!dims) throw new Error('unsupported logo image (expected PNG or JPEG)');
  return { buf, ext: extOf(mime, file), w: dims.w, h: dims.h };
}

const relsPathFor = (slideName: string): string =>
  slideName.replace(/slides\/(slide\d+)\.xml$/, 'slides/_rels/$1.xml.rels');

function uniqueMediaName(zip: JSZip, ext: string): string {
  for (let i = 1; ; i++) {
    const name = `logo${i}.${ext}`;
    if (!zip.file(`ppt/media/${name}`)) return name;
  }
}

const maxNumber = (s: string, re: RegExp): number =>
  [...s.matchAll(re)].reduce((max, m) => Math.max(max, +m[1]), 0);

/**
 * Replace the `<p:sp>` containing `{{logo}}` on `slideName` with a `<p:pic>`
 * referencing `logo`, adding the image to the package and a relationship to the
 * slide's `.rels`. The picture is contained within the original placeholder box.
 * Returns the rewritten slide XML.
 */
export async function injectLogo(
  zip: JSZip,
  slideName: string,
  xml: string,
  logo: LogoAsset,
): Promise<string> {
  const idx = xml.indexOf('{{logo}}');
  const spStart = xml.lastIndexOf('<p:sp>', idx);
  const spEnd = idx === -1 ? -1 : xml.indexOf('</p:sp>', idx);
  if (idx === -1 || spStart === -1 || spEnd === -1) return xml.split('{{logo}}').join('');
  const sp = xml.slice(spStart, spEnd);

  const off = sp.match(/<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>/);
  const ext = sp.match(/<a:ext cx="(\d+)" cy="(\d+)"\s*\/>/);
  if (!off || !ext) return xml.split('{{logo}}').join('');
  const bx = +off[1];
  const by = +off[2];
  const bw = +ext[1];
  const bh = +ext[2];

  // contain the image within the placeholder box, centered
  const scale = Math.min(bw / logo.w, bh / logo.h);
  const w = Math.round(logo.w * scale);
  const h = Math.round(logo.h * scale);
  const x = Math.round(bx + (bw - w) / 2);
  const y = Math.round(by + (bh - h) / 2);

  // register the media file + a relationship on the slide
  const mediaName = uniqueMediaName(zip, logo.ext);
  zip.file(`ppt/media/${mediaName}`, logo.buf);

  const relsName = relsPathFor(slideName);
  const relsFile = zip.file(relsName);
  let rels = relsFile ? await relsFile.async('string') : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const rid = `rId${maxNumber(rels, /Id="rId(\d+)"/g) + 1}`;
  rels = rels.replace(
    '</Relationships>',
    `<Relationship Id="${rid}" Type="${IMAGE_REL_TYPE}" Target="../media/${mediaName}"/></Relationships>`,
  );
  zip.file(relsName, rels);

  // ensure the package declares the image content type (png/jpg)
  await ensureContentType(zip, logo.ext);

  const picId = maxNumber(xml, /\bid="(\d+)"/g) + 1;
  const pic =
    `<p:pic><p:nvPicPr><p:cNvPr id="${picId}" name="logo"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;

  return xml.slice(0, spStart) + pic + xml.slice(spEnd + '</p:sp>'.length);
}

const CONTENT_TYPES_PATH = '[Content_Types].xml';

/** Idempotently declare a `<Default>` content type for an image extension. */
async function ensureContentType(zip: JSZip, ext: 'png' | 'jpg'): Promise<void> {
  const file = zip.file(CONTENT_TYPES_PATH);
  if (!file) return;
  let xml = await file.async('string');
  if (new RegExp(`<Default[^>]*Extension="${ext}"`, 'i').test(xml)) return;
  const mime = ext === 'jpg' ? 'image/jpeg' : 'image/png';
  xml = xml.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
  zip.file(CONTENT_TYPES_PATH, xml);
}
