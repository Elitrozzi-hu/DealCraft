# PPT generation (`lib/ppt`)

Generates a customized `.pptx` by filling `{{token}}` placeholders in a
**tokenized PowerPoint template** — the real deck, filled in place. The output is
the template byte-for-byte except the dynamic fields, so embedded fonts, custom
geometries, notes, masters and media are all preserved exactly.

## Data flow

```
POST body (JSON)
  └─ validate.ts    parseClientData()      → flat { token: scalar }, or 400
  └─ tokens.ts      buildTokenMap()        → { token: string } (+ defaults, number formatting)
  └─ templates.ts   templatePath(id)       → deck-assets/templates/<id>.pptx
  └─ logo.ts        loadLogo()             → logo bytes + dimensions (optional)
  └─ fill.ts        fillTemplate()         → unzip → substitute {{token}} in slide XML
  │                                          (+ inject {{logo}} → <p:pic>) → re-zip
  └─ generate.ts    generatePresentation() orchestrates the above
```

`app/api/generate-ppt/route.ts` is a thin handler: parse JSON → `generatePresentation`
→ stream the bytes (or map `ValidationError` → 400).

## Module map

| File | Responsibility |
|------|----------------|
| `validate.ts` | Validate + normalize the request body (`ValidationError` on bad input) |
| `tokens.ts` | Build the token map (defaults + number formatting) |
| `templates.ts` | Resolve a template id to `deck-assets/templates/<id>.pptx` |
| `xml.ts` | XML-escape values; collapse split-run tokens; substitute `{{token}}` |
| `logo.ts` | Load a client logo; inject it as a `<p:pic>` over the `{{logo}}` placeholder |
| `fill.ts` | Open the template zip, fill every slide, re-zip |
| `generate.ts` | Orchestrator |
| `index.ts` | Public exports |

## Request contract

`POST /api/generate-ppt`, JSON body. Every key matching a `{{token}}` in the
template is substituted. Recognized tokens:

- `clientName` (default: `Royal Caribbean Group`), `date` (default: today)
- `template` — tokenized template id under `deck-assets/templates/` (default
  `royal-caribbean`); not substituted as text
- `logo` — a data URL or `http(s)` URL. Replaces the `{{logo}}` placeholder on
  slide 2 with a real image, contained within the placeholder box; omitted ⇒ the
  placeholder is removed. Not substituted as text.
- Pricing: `users`, `mrr`, `mrr_disc`, and `_a` / `_b` plan variants.

Numbers are formatted with thousands separators. Unknown tokens are left literal
(so missing data is visible). One level of nesting is flattened, so
`{ "pricing": { "mrr": 1000 } }` also fills `{{mrr}}`.

Responses: `200` (the `.pptx`), `400` (invalid JSON / validation), `500` (render error).

## Adding a template

A template is just a `.pptx` with `{{token}}` placeholders typed into it (in
PowerPoint or Google Slides) dropped at `deck-assets/templates/<id>.pptx`. No
extraction or re-render step — the same filler fills any template. Request it
with `{ "template": "<id>", ... }`.

## Regenerating the Royal Caribbean template

The source deck already ships the author's pricing/logo placeholders; the build
step additionally tokenizes the client name and proposal date and normalizes the
one split-run pricing token:

```bash
node scripts/make-pptx-template.mjs "Royal Caribbean Group.pptx" royal-caribbean
# → deck-assets/templates/royal-caribbean.pptx
```
