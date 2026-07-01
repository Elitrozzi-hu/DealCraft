@AGENTS.md

# DealCraft

AI sales copilot for Humand: resolve a lead/company, enrich + analyze the deal (pains → solution graph → modules, stakeholders, dealscore with provenance), and generate `.pptx` decks. A Vite + React Router SPA with Vercel serverless functions (`api/*`) acting as a BFF in front of swappable LLM, enrichment, and CRM providers.

## Stack
- TypeScript 5 (strict, no `any`), Vite 8 + React 19.2 + React Router v6 (declarative `<BrowserRouter>`), Tailwind CSS v4
- Runtime / package manager: `bun`. Backend: Vercel serverless functions (`api/*.ts`, `@vercel/node`); local dev via `vercel dev`
- AI: Vercel AI SDK (`ai` v6) + `@openrouter/ai-sdk-provider`; `zod` v4; `jszip` for `.pptx`; `@tanstack/react-query` (provider mounted in `App.tsx`; the existing hooks still use plain `fetch`)
- CRM: `@hubspot/api-client` (runs only inside `api/*` functions)
- Tests: Vitest 4 unit suite under `tests/` (mirrors `src/`), covering the highest-risk pure logic (enrichment normalization, the `enrichment-to-deal` adapter). Verify with lint + type check + tests.

## Commands
- Dev, full stack (SPA + `api/*` on one origin): `bun run dev:full` (= `vercel dev`) → http://localhost:3000
- Dev, frontend only: `bun dev` (= `vite`) → http://localhost:5173 (`/api/*` returns 404 here)
- Build: `bun run build` (= `vite build`) → `dist/`
- Lint: `bun run lint` | Type check: `bunx tsc --noEmit`
- Test: `bun run test` (= `vitest run`) | watch: `bun run test:watch`
- Before saying "done": run lint + tsc + test, show the output.
- `vercel dev` requires the Vercel CLI + `vercel login` + a linked project (writes `.vercel/`, gitignored).
- CI (`.github/workflows/test.yml`) runs lint + tsc + test on every `pull_request` to `main` (and re-runs on each push to a branch with an open PR).

## Architecture

**BFF functions** (`api/*.ts`, `@vercel/node` `(req, res)` default export): `chat`, `materials`, `generate-ppt`, `deals/search`, `leads/search`, `signals`, `pre-call-brief`, `notion-webhook/success-cases`. Handlers stay thin: parse → call one `src/lib/` function → map errors. Per-function `export const config = { maxDuration }`; asset-reading functions get `includeFiles` in `vercel.json`.

**`src/lib/` layers** (dependency flows downward — never skip or reverse):
- `lib/llm/` — `generate` abstraction (`generate.ts` + `registry.ts`; only OpenRouter). `generations/<task>/` holds named LLM tasks: each has `prompt.ts` (exports `render*Prompt()`) + `structured-output.ts` (Zod schema). Current tasks: `company-research/`, `company-signals/`.
- `lib/enrichment/` — provider registry (`llm-websearch`, `classidy`, `lusha`, `mock`); `result-schema.ts` = `NormalizedEnrichment` zod contract + provenance helpers; `types.ts` = input contract.
- `lib/crm/` — `getCrmProvider()` registry (`hubspot`, `mock`); `hubspot-deals.ts` = isolated deal-lookup (batch contact→deal, pipeline/stage resolution, BDR-pipeline filtering); `hubspot-auth.ts`. Runs only inside `api/*`.
- `lib/ppt/` — `{{token}}`-fill pipeline: `validate` / `tokens` / `templates` / `fill` / `xml` / `logo`; `generate.ts` orchestrates; `index.ts` = public entry.
- `lib/server/` — server-side adapters the `api/*` functions call: `deals-adapter`, `enrichment-to-deal`, `materials-adapter`, `pre-call-brief-adapter`, `signals-adapter` (`fetchSignals`: web search + structured LLM → buying signals). Plus `env.ts` (only place that reads `process.env`), `config.ts`, `logger.ts`.
- `lib/api-client.ts` (client → BFF, plain `fetch`), `lib/constants.ts`, `lib/fixtures.ts`.

**`src/types/index.ts`** — barrel over all `*.types.ts` siblings (provenance, stage, stakeholder, pain, deal, scoring, input, material, lead, deck, common, signal, success-case). Always import via `@/types`.

**Frontend** — entry `index.html` → `src/main.tsx` → `src/App.tsx` (`QueryClientProvider` > `BrowserRouter` > `Routes`, with `/` → `DealCraftApp`). `src/components/`: `ui/` = stateless primitives (no fetching); `features/` = `deal-analysis/`, `materials/`, `copilot-view`. `src/hooks/`: `use-deal-state`, `use-deal-search`, `use-lead-search`, `use-materials`, `use-ppt-generator`, `use-is-narrow`. Fonts: `@fontsource-variable/geist` (self-hosted, imported in `main.tsx`) feeding the `@theme` `--font-*` chain in `src/index.css`.

## Key rules
- Path alias `@/*` → `./src` (tsconfig `"@/*": ["./src/*"]`; Vite `resolve.alias`). The `api/*` functions resolve `@/lib/...` via the same tsconfig path.
- No `import "server-only"` (it throws outside Next's `react-server` condition and would crash the Vercel functions). The client/server boundary is **by convention**: only `api/*` imports `@/lib/{server,llm,enrichment,crm,ppt}` + `@/lib/cassidy-envelope`. The frontend imports only `@/lib/api-client`, `@/lib/constants`, `@/lib/fixtures`, `@/types`. Unit tests under `tests/` are exempt — they run in Node and are never bundled, so they may import server-side modules (`@/lib/{server,enrichment,llm,...}`) directly to test pure logic.
- Add/swap a provider = **one file + one registry line**. Active provider via env: `LLM_PROVIDER`, `ENRICHMENT_PROVIDER`, `ENRICHMENT_LLM_PROVIDER` (splits enrichment LLM from chat LLM), `CRM_PROVIDER`. Unknown provider → 400.
- Add an LLM task = **one `src/lib/llm/generations/<task>/` dir** with `prompt.ts` + `structured-output.ts`. Never inline prompts in adapters.
- Shared types → `src/types/index.ts`. Shared constants → `src/lib/constants.ts`. Don't redeclare locally.
- Strategic data carries provenance (`source · sourceType · confidence · timestamp · status`); confidence is computed, not LLM-self-reported.
- One responsibility per module. Reuse before adding — check existing seams first.

## Workflow
- The frontend is a single-route SPA: `DealCraftApp`'s internal `input → searching → copilot` view-state machine lives under the `/` route (not real routes). The auth skill later adds `/login` and `/error`.
- The `dev` script is `vite`, NOT `vercel dev`: `vercel dev` runs the project's dev command to serve the frontend, so `dev: vercel dev` recurses fatally. Full stack = `bun run dev:full` / `vercel dev`.
- Tests live in `tests/` mirroring `src/` (e.g. `tests/lib/server/enrichment-to-deal.test.ts`). `vitest.config.ts` reuses the Vite `@` alias via `mergeConfig`; `node` environment, no globals (import `{ describe, it, expect }` from `vitest`). `tests/` is in `tsconfig` `include` and the ESLint glob, so it's type-checked + linted under the same strict rules. Scope is pure logic only — no LLM/CRM/network calls, no jsdom/component rendering.
- Don't commit or push unless asked.

## Gotchas
- `generate` is **`schema` XOR `tools`**: `schema` → `generateObject` (no tools); no schema → `generateText` (tools allowed). Web search + structured output = **two calls** — see `llm-websearch.ts`.
- OpenRouter web search via `openrouter:web_search` server tool (in `llm-websearch.ts`) ≠ the Exa `web` plugin used in `signals-adapter.ts`. They are different mechanisms.
- PPT: template is preserved byte-for-byte except `{{token}}` fields. Bad body → `ValidationError` → 400.
- `maxDuration` via `export const config` per function: `deals/search` & `notion-webhook` = 300 (Cassidy can take minutes), `signals` = 120, `chat` & `leads/search` = 60. 300s needs a Vercel Pro/Enterprise plan.
- Runtime assets stay at the **project root** (`deck-assets/templates/*.pptx`, `data/success-cases.json`), read via `process.cwd()` and bundled for deploy via `vercel.json` `includeFiles`. PRE-EXISTING caveats: `deck-assets/` is gitignored (won't reach a git-based Vercel deploy), and the notion webhook's `fs.writeFileSync` to `data/success-cases.json` won't persist on Vercel's read-only FS.
- `hubspot-deals.ts` filters BDR-pipeline deals; BDR pipeline ID is in `env.ts`.
