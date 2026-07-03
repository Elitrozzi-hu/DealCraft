# DealCraft

**AI sales copilot for Humand.** Give it a lead or company, and it resolves the
account, enriches and analyzes the deal (pains → solution → modules, stakeholders,
a deal score with provenance), and generates a ready-to-send `.pptx` deck.

Built as a **Vite + React Router SPA** with **Vercel serverless functions**
(`api/*`) acting as a **BFF** (Backend-for-Frontend) in front of swappable
**LLM**, **enrichment**, and **CRM** providers.

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
| Frontend  | Vite 8 + React 19.2 + React Router v6 (declarative)                 |
| Backend   | Vercel serverless functions (`api/*.ts`, `@vercel/node`)           |
| Runtime   | `bun` (package manager + scripts)                                   |
| Styling   | Tailwind CSS v4                                                     |
| AI        | Vercel AI SDK (`ai` v6) + `@openrouter/ai-sdk-provider`, `zod` v4   |
| Data      | `@tanstack/react-query` (provider mounted; hooks still use `fetch`) |
| CRM       | `@hubspot/api-client` (runs only inside `api/*` functions)          |
| Persistence | Supabase Postgres (`@supabase/supabase-js`, server-only)          |
| PPTX      | `jszip` (token-fill of a `.pptx` template)                          |
| Tests     | **Vitest 4** unit suite (`tests/`) over the highest-risk pure logic |

---

## Getting started

### Prerequisites
- **bun** (`curl -fsSL https://bun.sh/install | bash`) and Node.js 20+
- The **Vercel CLI** (installed as a devDependency) + a Vercel account, to run the
  full stack locally via `vercel dev`
- API credentials for the providers you intend to use (see below). For a quick
  local spin-up you can use the **mock** providers and skip real credentials.

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Create your env file from the template and fill in the values
cp .env.example .env.local          # vercel dev loads .env.local

# 3a. Run the FULL stack (SPA + api/* on one origin) — needs the Vercel CLI
vercel login                        # one-time; first run also links the project (.vercel/)
bun run dev:full                    # = vercel dev → http://localhost:3000

# 3b. …or just the frontend (no backend; /api/* will 404)
bun dev                             # = vite → http://localhost:5173
```

Open <http://localhost:3000> (full stack) or <http://localhost:5173> (frontend only).

### Useful commands

```bash
bun run dev:full   # Full stack: SPA + api/* via vercel dev (http://localhost:3000)
bun dev            # Frontend only: vite dev server (http://localhost:5173)
bun run build      # Production build → dist/  (vite build)
bun run preview    # Preview the production build
bun run lint       # ESLint
bunx tsc --noEmit  # Type check only
bun run test       # Vitest unit suite (vitest run)
bun run test:watch # Vitest in watch mode
```

> Before claiming a change "works/done", run **lint + tsc + test** and check the
> output.

> ℹ️ The `dev` script is `vite` (not `vercel dev`): `vercel dev` runs the project's
> dev command to serve the frontend, so aliasing `dev` to `vercel dev` would recurse.
> Use `bun run dev:full` (or `vercel dev` directly) for the full stack.

---

## Testing & CI

A **Vitest 4** unit suite lives in `tests/`, mirroring `src/` (e.g.
`tests/lib/server/enrichment-to-deal.test.ts`). It deliberately targets only the
highest-risk **pure logic** — enrichment normalization (`classidy`,
`llm-websearch`), the `enrichment-to-deal` adapter, the persistence
registry/mock provider, `success-cases-reader`'s industry matching, and
`deals-adapter`'s cold/reopen/refresh branches — with no LLM/CRM/DB/network
calls and no component rendering. DB-touching behavior is verified against the
`mock` persistence provider, never a real Supabase project.

```bash
bun run test        # run the suite once (vitest run)
bun run test:watch  # watch mode
```

- `vitest.config.ts` reuses the Vite `@` alias via `mergeConfig`; `node`
  environment, no globals (import `{ describe, it, expect }` from `vitest`).
- `tests/` is in `tsconfig` `include` and the ESLint glob, so tests are
  type-checked and linted under the same strict rules as `src/`.
- **CI** (`.github/workflows/test.yml`) runs `lint → tsc → test` on every
  `pull_request` to `main`, and re-runs on each push to a branch with an open PR.

---

## Environment variables

All env vars are read in **one place only**: `src/lib/server/env.ts`. Copy
`.env.example` to `.env.local` and fill in what you need (`vercel dev` loads
`.env.local`). Providers are pluggable via registry keys — set the `*_PROVIDER`
var to switch implementations.

| Variable                          | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`              | OpenRouter API key (LLM calls). **Required** for real LLM output.       |
| `OPENROUTER_MODEL`                | Default model id, e.g. `google/gemini-2.5-flash`.                       |
| `LLM_PROVIDER`                    | Active LLM provider: `openrouter` \| `glados`.                          |
| `ENRICHMENT_PROVIDER`             | `llm-websearch` \| `classidy` \| `lusha` \| `mock`.                     |
| `ENRICHMENT_LLM_PROVIDER`         | LLM used by the `llm-websearch` enrichment (defaults to `openrouter`).  |
| `CLASSIDY_WEBHOOK_URL` / `CLASSIDY_API_KEY` | Cassidy enrichment workflow webhook + key.                   |
| `CASSIDY_SUCCESS_CASE_WEBHOOK_URL`| Cassidy success-case scraper (Notion → success-cases sync). No key.     |
| `LUSHA_API_KEY`                   | Lusha enrichment key.                                                    |
| `CRM_PROVIDER`                    | `hubspot` \| `mock`.                                                     |
| `HUBSPOT_ACCESS_TOKEN`            | HubSpot token (server-side). Required when `CRM_PROVIDER=hubspot`.       |
| `NOTION_WEBHOOK_TOKEN`            | Shared secret expected in the `token` header of the Notion webhook.     |
| `PERSISTENCE_PROVIDER`            | `supabase` (default) \| `mock`.                                          |
| `SUPABASE_URL`                    | Supabase project URL. Required when `PERSISTENCE_PROVIDER=supabase`.    |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase `service_role` key (server-only, bypasses RLS). Never expose to the client. |
| `LOG_LEVEL`                       | `debug` \| `info` \| `warn` \| `error` \| `silent`. Dev default: `debug`.|
| `LOG_FORMAT`                      | `pretty` (dev) \| `json` (prod).                                         |

> Set every provider to its `mock` value (including `PERSISTENCE_PROVIDER=mock`,
> an in-memory store — no DB needed) to run the whole flow with no external
> credentials. (Note: there is no `mock` LLM provider — chat/materials/signals/
> pre-call-brief need a real `OPENROUTER_API_KEY`.)

---

## Architecture (high level)

The app is a thin BFF: Vercel functions parse the request, call **one** `src/lib/`
function, and map errors. Business logic lives in `src/lib/`, where dependencies
flow strictly downward.

```
index.html              Vite entry → src/main.tsx → src/App.tsx
src/
  main.tsx              createRoot(<App/>); imports fonts + index.css
  App.tsx               <QueryClientProvider><BrowserRouter><Routes>  ("/" → DealCraftApp)
  index.css             Tailwind v4 @import + @theme; Geist font vars
  lib/
    llm/                generate() abstraction: generate.ts (dispatcher) +
                        registry.ts (getGenerationProvider()) + providers/
                        (openrouter, glados) + types.ts (shared contracts).
                        Named LLM tasks live in generations/<task>/
                        (prompt.ts + structured-output.ts)
    enrichment/         provider registry (llm-websearch, classidy, lusha, mock)
                        + NormalizedEnrichment zod contract + provenance helpers
    crm/                getCrmProvider() registry (hubspot, mock); HubSpot deal lookup
    ppt/                {{token}}-fill pipeline that builds the .pptx
    persistence/        getPersistenceProvider() registry (supabase, mock); types.ts =
                        DB-agnostic PersistenceProvider interface; company-key.ts =
                        shared company_key normalization; providers/supabase.ts +
                        providers/supabase.database.types.ts (generated)
    server/             server-side adapters; env.ts (only process.env reader), logger.ts
    api-client.ts       client → BFF calls (plain fetch)
  types/index.ts        barrel over all *.types.ts — always import via @/types
  components/           ui/ (stateless primitives) + features/ (deal-analysis, etc.)
  hooks/                use-deal-state, use-deal-search, use-ppt-generator, ...

api/                    Vercel serverless functions (@vercel/node, (req,res)):
                        chat, materials, generate-ppt, deals/search, leads/search,
                        signals, pre-call-brief, notion-webhook/success-cases
vercel.json             framework=vite, outputDirectory=dist, per-fn includeFiles
supabase/migrations/    deal, deal_analysis, success_case, llm_call + RPC functions
                        (applied via the Supabase MCP; see CLAUDE.md)
deck-assets/, data/     runtime assets read via process.cwd() (stay at project root);
                        data/success-cases.json is now only a seed source, not read
                        at request time — see success-cases-reader.ts
```

### Key conventions
- Path alias `@/*` → `./src` (tsconfig `paths` + Vite alias). The `api/*` functions
  resolve `@/lib/...` via the same tsconfig path.
- **No `import "server-only"`** — it would crash the Vercel functions. The
  client/server boundary is by convention: only `api/*` imports
  `@/lib/{server,llm,enrichment,crm,ppt,persistence}`; the frontend imports only
  `@/lib/api-client`, `@/lib/constants`, `@/lib/fixtures`, `@/types`. Unit tests
  under `tests/` are exempt (Node-only, never bundled).
- **Add or swap a provider = one file + one registry line.** Unknown provider → 400.
- **Add an LLM task = one `src/lib/llm/generations/<task>/` dir** (`prompt.ts` +
  `structured-output.ts`). Never inline prompts in adapters.
- Shared types → `src/types/index.ts`; shared constants → `src/lib/constants.ts`.
- Strategic data carries provenance; confidence is **computed**, not LLM-reported.

For the full architecture and rules, read `CLAUDE.md`.

---

## Gotchas worth knowing

- **`generate` is `schema` XOR `tools`**: passing a `schema` uses `generateObject`
  (no tools); no schema allows tools. Web search + structured output = **two calls**.
- **Two different web-search mechanisms**: OpenRouter's `openrouter:web_search`
  server tool (in `llm-websearch.ts`) ≠ the Exa `web` plugin (in `signals-adapter.ts`).
- **PPTX**: the template is preserved byte-for-byte except `{{token}}` fields. A bad
  body → `ValidationError` → 400.
- **Long-running functions** (`export const config = { maxDuration }`): `deals/search`
  & `notion-webhook` = 300 (Cassidy can take minutes); `signals` = 120. 300s needs a
  Vercel Pro/Enterprise plan.
- **Runtime assets**: `deck-assets/templates/*.pptx` stays at the project root and is
  bundled for deploy via `vercel.json` `includeFiles` (still gitignored — won't reach
  a git-based deploy). `data/success-cases.json` is now only a **one-time seed
  source** — reads/writes go through `getPersistenceProvider()`, not the filesystem,
  so it's no longer bundled either.
- `hubspot-deals.ts` filters BDR-pipeline deals.
- **Persistence**: `POST /api/deals/search` skips re-running enrichment for a company
  it's already analyzed (a "reopen") unless the request sets `refresh: true`. RLS is
  enabled on all 4 Supabase tables with **zero policies** — only the BFF's
  `service_role` key can read/write; the frontend never holds a Supabase key.
  Migrations are applied via the Supabase MCP (`apply_migration`), not the CLI — see
  `CLAUDE.md` for why and for the full persistence-layer breakdown.

---

## Workflow notes
- Don't commit or push unless explicitly asked.
- `vercel dev` needs the Vercel CLI + `vercel login` + a linked project (`.vercel/`,
  gitignored). It is only required for the **full** local stack; the skill's preflight
  (detecting the `vercel` backend) only needs the `api/` directory to exist.
