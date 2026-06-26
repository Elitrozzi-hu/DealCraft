@AGENTS.md

# DealCraft

AI sales copilot for Humand: resolve a lead/company, enrich + analyze the deal (pains → solution graph → modules, stakeholders, dealscore with provenance), and generate `.pptx` decks. Next.js App Router as a BFF in front of swappable LLM, enrichment, and CRM providers.

## Stack
- TypeScript 5 (strict, no `any`), Next.js 16.2.9 (App Router) + React 19.2, Tailwind CSS v4
- AI: Vercel AI SDK (`ai` v6) + `@openrouter/ai-sdk-provider`; `zod` v4; `jszip` for `.pptx`
- CRM: `@hubspot/api-client` (server-only)
- Tests: none — verify with lint + type check only.

## Commands
- Dev: `npm run dev` → http://localhost:3000
- Build + type check: `npm run build`
- Lint: `npm run lint` | Type check: `npx tsc --noEmit`
- Before saying "done": run lint + tsc, show the output.

## Architecture

**BFF routes** (`app/api/*/route.ts`): `chat`, `materials`, `generate-ppt`, `deals/search`, `leads/search`, `signals`. Handlers stay thin: parse → call one `lib/` function → map errors.

**lib/ layers** (dependency flows downward — never skip or reverse):
- `lib/llm/` — `generate` abstraction (`generate.ts` + `registry.ts`; only OpenRouter). `generations/<task>/` holds named LLM tasks: each has `prompt.ts` (exports `render*Prompt()`) + `structured-output.ts` (Zod schema). Current tasks: `company-research/`, `company-signals/`.
- `lib/enrichment/` — provider registry (`llm-websearch`, `classidy`, `lusha`, `mock`); `result-schema.ts` = `NormalizedEnrichment` zod contract + provenance helpers; `types.ts` = input contract.
- `lib/crm/` — `getCrmProvider()` registry (`hubspot`, `mock`); `hubspot-deals.ts` = isolated deal-lookup (batch contact→deal, pipeline/stage resolution, BDR-pipeline filtering); `hubspot-auth.ts`. Server-only.
- `lib/ppt/` — `{{token}}`-fill pipeline: `validate` / `tokens` / `templates` / `fill` / `xml` / `logo`; `generate.ts` orchestrates; `index.ts` = public entry.
- `lib/server/` — `server-only` adapters route handlers call: `deals-adapter`, `enrichment-to-deal`, `materials-adapter`, `signals-adapter` (`fetchSignals`: web search + structured LLM → buying signals). Plus `env.ts` (only place that reads `process.env`), `config.ts`, `logger.ts`.
- `lib/api-client.ts` (client → BFF), `lib/constants.ts`, `lib/fixtures.ts`.

**types/index.ts** — barrel over all `*.types.ts` siblings (provenance, stage, stakeholder, pain, deal, scoring, input, material, lead, deck, common, signal, success-case). Always import via `@/types`.

**components/**: `ui/` = stateless primitives (no fetching); `features/` = `deal-analysis/`, `materials/`, `copilot-view`.

**hooks/**: `use-deal-state`, `use-deal-search`, `use-lead-search`, `use-materials`, `use-ppt-generator`, `use-is-narrow`.

**scripts/** — dev tooling (`benchmark-enrichment.ts`, `make-pptx-template.mjs`); not in build.
**docs/** — reference docs (HubSpot properties, solutions map). Not in build.

## Key rules
- Path alias `@/*` → project root. Every server module: `import "server-only"` at top.
- Add/swap a provider = **one file + one registry line**. Active provider via `.env`: `LLM_PROVIDER`, `ENRICHMENT_PROVIDER`, `ENRICHMENT_LLM_PROVIDER` (splits enrichment LLM from chat LLM), `CRM_PROVIDER`. Unknown provider → 400.
- Add an LLM task = **one `lib/llm/generations/<task>/` dir** with `prompt.ts` + `structured-output.ts`. Never inline prompts in adapters.
- Shared types → `types/index.ts`. Shared constants → `lib/constants.ts`. Don't redeclare locally.
- Strategic data carries provenance (`source · sourceType · confidence · timestamp · status`); confidence is computed, not LLM-self-reported.
- One responsibility per module. Reuse before adding — check existing seams first.

## Workflow
- This is Next.js 16 with breaking changes — read `node_modules/next/dist/docs/` before writing Next code.
- Don't commit or push unless asked.

## Gotchas
- `generate` is **`schema` XOR `tools`**: `schema` → `generateObject` (no tools); no schema → `generateText` (tools allowed). Web search + structured output = **two calls** — see `llm-websearch.ts`.
- OpenRouter web search via `openrouter:web_search` server tool (in `llm-websearch.ts`) ≠ the Exa `web` plugin used in `signals-adapter.ts`. They are different mechanisms.
- PPT: template is preserved byte-for-byte except `{{token}}` fields. Bad body → `ValidationError` → 400.
- `deals/search`: `maxDuration = 300` (Cassidy can take minutes). `signals`: `maxDuration = 120`.
- `hubspot-deals.ts` filters BDR-pipeline deals; BDR pipeline ID is in `env.ts`.
