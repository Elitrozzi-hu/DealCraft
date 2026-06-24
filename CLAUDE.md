@AGENTS.md

# DealCraft

AI sales copilot for Humand: resolve a lead/company from name/website/email, enrich + analyze the deal (pain → solution graph → modules, stakeholders, dealscore with provenance), and generate client-facing artifacts (`.pptx` decks). Next.js App Router as a BFF in front of swappable LLM, enrichment, and CRM providers.

## Stack
- Language: TypeScript 5 (strict, no `any`)
- Framework: Next.js 16.2.9 (App Router) + React 19.2
- Styling: Tailwind CSS v4 (`@tailwindcss/postcss`)
- AI: Vercel AI SDK (`ai` v6) + `@openrouter/ai-sdk-provider`; `zod` v4 for request/result validation; `jszip` for `.pptx`
- CRM: `@hubspot/api-client` (server-only, behind the CRM provider seam)
- Tests: none configured yet

## Commands
- Run dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build` (also runs the type check)
- Lint: `npm run lint` (`eslint`)
- Type check: `npx tsc --noEmit`
- No test runner — don't claim "tests pass"; verify with lint + type check.

## Architecture
- `app/` — App Router pages; `app/api/*/route.ts` are the BFF route handlers: `chat`, `materials`, `generate-ppt`, `deals/search`, `leads/search`. Handlers stay thin.
- `components/ui/` — presentational primitives; `components/features/` — feature panels (`dealcraft-app` shell, `deal-analysis/`, `materials/`, `copilot-view`).
- `hooks/` — client state (`use-deal-state`, `use-deal-search`, `use-lead-search`, `use-materials`, `use-ppt-generator`, `use-is-narrow`).
- `lib/` — domain + server logic:
  - `lib/llm/` — `generate` LLM abstraction (`generate.ts` + `registry.ts`; OpenRouter is the only LLM provider).
  - `lib/enrichment/` — `enrich` providers via Strategy + Adapter + registry (`providers/{llm-websearch,classidy,mock}.ts`); `result-schema.ts` is the provider-agnostic `NormalizedEnrichment` zod contract + provenance helpers (e.g. `coldProv`); `types.ts` the input contract.
  - `lib/crm/` — `getCrmProvider()` registry over `providers/{hubspot,mock}.ts` (+ `hubspot-auth.ts`); `types.ts` defines the `CrmProvider` strategy (e.g. `searchLeads`). Server-only; `@hubspot/api-client` is isolated here.
  - `lib/ppt/` — fills `{{token}}` placeholders in a tokenized `.pptx` template (`deck-assets/templates/<id>.pptx`); split into `validate`/`tokens`/`templates`/`fill`/`xml`/`logo`, with `generate.ts` orchestrating and `index.ts` the public entry.
  - `lib/server/` — `server-only`: `env.ts` (the only place that reads `process.env`), `config.ts`, `logger.ts`, and the adapter layer that route handlers call — `deals-adapter.ts` (resolve + enrich a deal), `enrichment-to-deal.ts` (map `NormalizedEnrichment` → deal domain shape, deriving provenance), `materials-adapter.ts`.
  - `lib/api-client.ts` (client → BFF), `lib/constants.ts`, `lib/fixtures.ts`.
- `types/index.ts` — central barrel re-exporting `*.types.ts` siblings (provenance, stage, stakeholder, pain, deal, scoring, comparable, input, material, lead, deck, common). Single source of truth; always import via `@/types`, never a deep path.
- Dependency rule: `components`/`hooks` → `lib/api-client` → `app/api/*` → `lib/server/*` → provider registries (`lib/{llm,enrichment,crm}`). Vendor credentials are server-only and never reach the client. `enrich` may import `generate`; never the reverse.

## Conventions
- Path alias `@/*` → project root (e.g. `@/lib/...`, `@/types`).
- Every server module starts with `import "server-only"`; only `lib/server/env.ts` reads `process.env` — import the const elsewhere.
- Add/swap a provider = **one new file + one registry line** (`lib/{llm,enrichment,crm}/registry.ts`); active provider set via `.env` (`LLM_PROVIDER`, `ENRICHMENT_PROVIDER`, `CRM_PROVIDER`) or per-request body override (unknown provider → 400, not a crash).
- Strategic data carries provenance (`source · sourceType · confidence · timestamp · status`); UI distinguishes `validated` vs `inferred` vs `cold`. Confidence is computed, not LLM-self-reported.

## Modularity, reuse & separation of concerns
- One responsibility per module; if a file does two jobs (e.g. fetch + format), split it. Mirror the existing `lib/ppt/` split (`validate` / `tokens` / `templates` / `fill` / `generate` orchestrates).
- Route handlers (`app/api/*/route.ts`) stay thin: parse request → call one `lib/` function → map result/errors to a response. No business logic, vendor SDKs, or `process.env` in a handler.
- Depend on abstractions, not vendors: consumers call `generate` / `getEnrichmentProvider()`, never an SDK directly. A vendor contract lives in exactly one file (e.g. the OpenRouter web-search contract in `llm-websearch.ts`) — isolate it, don't spread it.
- Reuse before adding: a new capability that fits an existing seam is **one new file + one registry line**, not a parallel code path. Check `types/`, `lib/api-client.ts`, `lib/constants.ts`, `lib/enrichment/result-schema.ts`, and `components/ui/` before writing new types, fetchers, helpers, or primitives.
- Respect the layer boundaries (`components`/`hooks` → `lib/api-client` → `app/api` → `lib/server`); never short-circuit them (e.g. a component calling a vendor, or `generate` importing `enrich`). Keep `server-only` code out of client modules.
- Shared types live in `types/index.ts`; shared constants in `lib/constants.ts`. Don't redeclare a shape or magic value locally — import it.
- Components: `components/ui/` are presentational and stateless (props in, no fetching); data/state lives in `hooks/` and feature components. Don't fetch inside a UI primitive.

## Workflow
- This is Next.js 16 with breaking changes — read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (see AGENTS.md).
- Before saying "done": run `npm run lint` and `npx tsc --noEmit`, show the output.
- Don't commit or push unless I ask explicitly.

## Gotchas
- `generate` is **`schema` XOR `tools`**: with a `schema` it runs `generateObject` (no tools); without one, `generateText` (tools allowed). Web search + structured output = **two calls** (search with tools, then structure with schema) — see `lib/enrichment/providers/llm-websearch.ts`.
- Because `llm-websearch` calls `generate` (no private model wiring), swapping `LLM_PROVIDER`/`OPENROUTER_MODEL` swaps the model behind **both** chat and web-search enrichment.
- OpenRouter web search uses the server tool `openrouter:web_search`; the full vendor contract (param names, domain steering) is isolated to `llm-websearch.ts`.
- PPT output is the template byte-for-byte except `{{token}}` fields — preserves embedded fonts/masters/media. Bad request body → `ValidationError` → 400.
- `deals/search` enriches synchronously and can take minutes (Cassidy workflow); the route sets `maxDuration = 300` so it outlives the default before the fetch timeout.
