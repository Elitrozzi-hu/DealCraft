// Low-level XML token helpers used by the in-place template filler. The deck is
// filled by string-substituting `{{token}}` placeholders directly in the slide
// XML, so values must be XML-escaped and tokens whose braces were split across
// formatting runs must first be collapsed back into a single literal.

const TAG_RE = /<[^>]+>/g;
const SPLIT_TOKEN_RE = /\{\{((?:(?!\}\})[\s\S])*?)\}\}/g;
const TOKEN_RE = /\{\{(\w+)\}\}/g;

/** Escape a value for insertion as XML text content. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Collapse any `{{token}}` whose `{{`/`}}` straddle a run boundary (e.g.
 * `{{</a:t></a:r><a:r>...<a:t>mrr}}`) back into a single literal `{{token}}`,
 * dropping the intervening run markup. Only spans that strip down to a bare
 * identifier are touched, so real text containing braces is left alone.
 */
export function normalizeSplitTokens(xml: string): string {
  return xml.replace(SPLIT_TOKEN_RE, (match, inner: string) => {
    const name = inner.replace(TAG_RE, '');
    return /^\w+$/.test(name) ? `{{${name}}}` : match;
  });
}

/** Replace every known `{{token}}`; unknown tokens are left literal. */
export function replaceTokens(xml: string, tokens: Record<string, string>): string {
  return xml.replace(TOKEN_RE, (match, key: string) => (key in tokens ? xmlEscape(tokens[key]) : match));
}
