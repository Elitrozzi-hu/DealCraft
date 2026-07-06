@AGENTS.md

# DealCraft

AI sales copilot for Humand: resolve a lead/company, enrich + analyze the deal (pains → solution graph → modules, stakeholders, dealscore with provenance), generate `.pptx` decks. Vite + React Router SPA with Vercel serverless functions (`api/*`) as a BFF in front of swappable LLM, enrichment, and CRM providers.

## Stack
TypeScript 5 (strict, no `any`), Vite 8 + React 19.2 + React Router v6, Tailwind v4. `bun` runtime/pkg manager. Vercel functions (`api/*.ts`, `@vercel/node`), local dev via `vercel dev`. AI SDK (`ai` v6 + `@openrouter/ai-sdk-provider`), `zod` v4, `jszip` (.pptx), `@tanstack/react-query`. `recharts` v2 (admin dashboard only, `React.lazy`-loaded to keep the main bundle lean). CRM: `@hubspot/api-client` (server-only). Persistence: Supabase Postgres (`@supabase/supabase-js`, service_role, server-only) — tables `deal`, `deal_analysis`, `success_case`, `llm_call`, `admin_user` (admin-gating); migrations in `supabase/migrations/` applied via Supabase MCP. Tests: Vitest under `tests/` (mirrors `src/`), pure-logic only.

## Commands
- `bun run dev:full` (`vercel dev`) → full stack, http://localhost:3000
- `bun dev` (`vite`) → frontend only, http://localhost:5173 (no `/api/*`)
- `bun run build` / `bun run lint` / `bunx tsc --noEmit` / `bun run test`
- Before saying "done": run lint + tsc + test, show output.
- CI (`.github/workflows/test.yml`) runs lint+tsc+test on PRs to `main`.

## Architecture
- `api/*.ts` — thin BFF handlers: parse → call one `src/lib/` fn → map errors.
- `src/lib/llm/` — `generate()` dispatcher + `registry.ts` + `providers/` (openrouter, glados). `generations/<task>/` = `prompt.ts` + `structured-output.ts` per LLM task.
- `src/lib/enrichment/` — provider registry (`llm-websearch`, `classidy`, `lusha`, `mock`); `result-schema.ts` = `NormalizedEnrichment` zod contract + provenance.
- `src/lib/crm/` — `getCrmProvider()` (`hubspot`, `mock`); HubSpot deal-lookup + auth. Server-only.
- `src/lib/ppt/` — `{{token}}`-fill pipeline (validate/tokens/templates/fill/xml/logo) → `generate.ts`/`index.ts`.
- `src/lib/persistence/` — `getPersistenceProvider()` (`supabase`, `mock`); DB-agnostic `PersistenceProvider` interface in `types.ts`. `company-key.ts` = single source of truth for `company_key` normalization. Multi-step writes go through Postgres RPC functions (no transactions in supabase-js).
- `src/lib/server/` — adapters `api/*` calls: `deals-adapter` (cold/reopen/refresh), `enrichment-to-deal`, `materials-adapter`, `pre-call-brief-adapter`, `signals-adapter`. Plus `env.ts` (only place reading `process.env`), `config.ts`, `logger.ts`.
- `supabase/migrations/*.sql` — schema + RPCs (`refresh_deal_analysis`, `update_deal_analysis_signals`, `update_deal_analysis_pre_call_brief`, `success_cases_by_industry`), applied via Supabase MCP `apply_migration`. RLS on, zero policies — only the BFF (service_role) accesses.
- `src/types/index.ts` — barrel over all `*.types.ts`. Always import via `@/types`.
- Frontend: `main.tsx` → `App.tsx` (QueryClientProvider > BrowserRouter > Routes) → `DealCraftApp`. `src/components/{ui,features}`, `src/hooks/`.

## Key rules
- Path alias `@/*` → `./src`.
- No `import "server-only"` — client/server boundary is by convention: only `api/*` imports `@/lib/{server,llm,enrichment,crm,ppt,persistence}`. Frontend imports only `@/lib/api-client`, `@/lib/constants`, `@/lib/fixtures`, `@/types`. Tests under `tests/` are exempt.
- Add/swap a provider = one file + one registry line. Provider selection via env vars (`LLM_PROVIDER`, `ENRICHMENT_PROVIDER`, `ENRICHMENT_LLM_PROVIDER`, `CRM_PROVIDER`, `PERSISTENCE_PROVIDER`). Unknown provider → 400.
- Add an LLM task = one `src/lib/llm/generations/<task>/` dir. Never inline prompts in adapters.
- Shared types → `src/types/index.ts`; shared constants → `src/lib/constants.ts`.
- Strategic data carries provenance (source · sourceType · confidence · timestamp · status); confidence is computed, not LLM-self-reported.
- Don't commit or push unless asked.

## Gotchas
- `generate()` is `schema` XOR `tools`: schema → `generateObject`; no schema → `generateText` (tools allowed). Web search + structured output = two calls.
- PPT template preserved byte-for-byte except `{{token}}` fields; bad body → `ValidationError` → 400.
- `maxDuration`: `deals/search` & `notion-webhook` = 300, `signals` = 120, `chat` & `leads/search` = 60.
- Runtime assets (`deck-assets/templates/*.pptx`) read via `process.cwd()`, bundled via `vercel.json` `includeFiles` (gitignored — won't reach git-based deploys). `data/success-cases.json` is a one-time seed source only; reads/writes go through `getPersistenceProvider()`, not `fs`.
- Persistence cold/reopen/refresh: reopen never re-runs enrichment; only explicit `refresh: true` does. Failed enrichment never touches a stored snapshot.
- `deal_analysis` versioning is RPC-only (advisory-lock per `deal_id`); `updateSignals`/`updatePreCallBrief` return `false` (not throw) on stale writes.
- `enrichDeal` requires `req.deal.id` (a real HubSpot deal) — throws `NoAssociatedDealError` (→ 400) otherwise; there is no cold-start-without-a-deal path. `/api/signals` and `/api/pre-call-brief` resolve target `deal_analysis` via `hubspotDealId` (optional request field) when present, falling back to `company_key` for legacy rows.
- Supabase migrations/types are applied/regenerated via the MCP (`apply_migration`, `generate_typescript_types`) — no authenticated CLI in this environment.
