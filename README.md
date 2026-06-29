# DealCraft

**AI sales copilot for Humand.** Give it a lead or company, and it resolves the
account, enriches and analyzes the deal (pains → solution → modules, stakeholders,
a deal score with provenance), and generates a ready-to-send `.pptx` deck.

Built as a Next.js App Router app acting as a **BFF** (Backend-for-Frontend) in
front of swappable **LLM**, **enrichment**, and **CRM** providers.

---

## What it does

1. **Resolve** a lead/company from a name or a HubSpot deal/contact.
2. **Enrich** it with external data (company research, contacts, buying signals).
3. **Analyze** the deal: detect pains, map them to Humand solutions/modules,
   identify stakeholders, and compute a **deal score** — every strategic data
   point carries provenance (`source · sourceType · confidence · timestamp · status`).
4. **Generate** a `.pptx` sales deck from a template, filled with the analysis.

---

## Tech stack

| Area      | Choice                                                              |
| --------- | ------------------------------------------------------------------ |
| Language  | TypeScript 5 (strict, no `any`)                                     |
| Framework | Next.js 16.2.9 (App Router) + React 19.2                            |
| Styling   | Tailwind CSS v4                                                     |
| AI        | Vercel AI SDK (`ai` v6) + `@openrouter/ai-sdk-provider`, `zod` v4   |
| CRM       | `@hubspot/api-client` (server-only)                                 |
| PPTX      | `jszip` (token-fill of a `.pptx` template)                          |
| Tests     | None — code is verified with **lint + type check** only.           |

> ⚠️ This is **Next.js 16**, which has breaking changes vs. older versions.
> Before writing Next.js code, read the relevant guide in
> `node_modules/next/dist/docs/`. See `AGENTS.md`.

---

## Getting started

### Prerequisites
- Node.js 20+ and npm
- API credentials for the providers you intend to use (see below). For a quick
  local spin-up you can use the **mock** providers and skip real credentials.

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file from the template and fill in the values
cp .env.example .env

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>.

### Useful commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build + type check
npm run start    # Run the production build
npm run lint     # ESLint
npx tsc --noEmit # Type check only
```

> Before claiming a change "works/done", run **lint + tsc** and check the output —
> there are no tests to rely on.

---

## Environment variables

All env vars are read in **one place only**: `lib/server/env.ts`. Copy
`.env.example` to `.env` and fill in what you need. Providers are pluggable via
registry keys — set the `*_PROVIDER` var to switch implementations.

| Variable                          | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`              | OpenRouter API key (LLM calls). **Required** for real LLM output.       |
| `OPENROUTER_MODEL`                | Default model id, e.g. `google/gemini-2.5-flash`.                       |
| `LLM_PROVIDER`                    | Active LLM provider. Only `openrouter` is implemented.                  |
| `ENRICHMENT_PROVIDER`             | `llm-websearch` \| `classidy` \| `lusha` \| `mock`.                     |
| `ENRICHMENT_LLM_PROVIDER`         | LLM used by the `llm-websearch` enrichment (defaults to `openrouter`).  |
| `CLASSIDY_WEBHOOK_URL` / `CLASSIDY_API_KEY` | Cassidy enrichment workflow webhook + key.                   |
| `CASSIDY_SUCCESS_CASE_WEBHOOK_URL`| Cassidy success-case scraper (Notion → success-cases sync). No key.     |
| `LUSHA_API_KEY`                   | Lusha enrichment key.                                                    |
| `CRM_PROVIDER`                    | `hubspot` \| `mock`.                                                     |
| `HUBSPOT_ACCESS_TOKEN`            | HubSpot token (server-only). Required when `CRM_PROVIDER=hubspot`.       |
| `LOG_LEVEL`                       | `debug` \| `info` \| `warn` \| `error` \| `silent`. Dev default: `debug`.|
| `LOG_FORMAT`                      | `pretty` (dev) \| `json` (prod).                                         |

> Set every provider to its `mock` value to run the whole flow with no external
> credentials.

---

## Architecture (high level)

The app is a thin BFF: route handlers parse the request, call **one** `lib/`
function, and map errors. Business logic lives in `lib/`, where dependencies flow
strictly downward.

```
app/
  api/*/route.ts        BFF endpoints: chat, materials, generate-ppt,
                        deals/search, leads/search, signals, notion-webhook
  page.tsx, layout.tsx  UI entry

lib/
  llm/                  generate() abstraction over OpenRouter; named LLM tasks
                        live in generations/<task>/ (prompt.ts + structured-output.ts)
  enrichment/           provider registry (llm-websearch, classidy, lusha, mock)
                        + NormalizedEnrichment zod contract + provenance helpers
  crm/                  getCrmProvider() registry (hubspot, mock); HubSpot deal lookup
  ppt/                  {{token}}-fill pipeline that builds the .pptx
  server/               server-only adapters route handlers call; env.ts, logger.ts
  api-client.ts         client → BFF calls

types/index.ts          barrel over all *.types.ts — always import via @/types
components/             ui/ (stateless primitives) + features/ (deal-analysis, etc.)
hooks/                  use-deal-state, use-deal-search, use-ppt-generator, ...
docs/                   reference docs (HubSpot properties, solutions map)
scripts/                dev tooling (not in build)
```

### Key conventions
- Path alias `@/*` → project root.
- Every server module starts with `import "server-only"`.
- **Add or swap a provider = one file + one registry line.** Unknown provider → 400.
- **Add an LLM task = one `lib/llm/generations/<task>/` dir** (`prompt.ts` +
  `structured-output.ts`). Never inline prompts in adapters.
- Shared types → `types/index.ts`; shared constants → `lib/constants.ts`.
- Strategic data carries provenance; confidence is **computed**, not LLM-reported.

For the full architecture and rules, read `CLAUDE.md` and `AGENTS.md`.

---

## Gotchas worth knowing

- **`generate` is `schema` XOR `tools`**: passing a `schema` uses `generateObject`
  (no tools); no schema allows tools. Web search + structured output = **two calls**.
- **Two different web-search mechanisms**: OpenRouter's `openrouter:web_search`
  server tool (in `llm-websearch.ts`) ≠ the Exa `web` plugin (in `signals-adapter.ts`).
- **PPTX**: the template is preserved byte-for-byte except `{{token}}` fields. A bad
  body → `ValidationError` → 400.
- **Long-running routes**: `deals/search` has `maxDuration = 300` (Cassidy can take
  minutes); `signals` has `maxDuration = 120`.
- `hubspot-deals.ts` filters BDR-pipeline deals.

---

## Workflow notes
- Don't commit or push unless explicitly asked.
- This is Next.js 16 — consult `node_modules/next/dist/docs/` before writing Next code.
</content>
</invoke>
