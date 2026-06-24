# Provider abstraction — LLM & enrichment

One stable interface per capability, with the vendor underneath swappable at
runtime. Two capabilities live here:

- **`generate`** (`lib/llm/`) — talk to an LLM.
- **`enrich`** (`lib/enrichment/`) — enrich a contact.

The pattern is **Strategy + Adapter + registry**: each provider implements a
common interface (Strategy), normalizes its vendor response into one shared
shape (Adapter), and is looked up by name in a registry. Consumers (route
handlers) depend only on the abstraction — never on a vendor SDK.

> Every module here starts with `import "server-only"`. Vendor credentials are
> read from `process.env` on the server and never reach the client (BFF rule).

## Layout

```
lib/llm/
  registry.ts        # provider key -> LanguageModel; getModel(); OpenRouter client
  generate.ts        # the single LLM entry point (text | structured)
lib/enrichment/
  types.ts           # EnrichmentInput | EnrichmentResult | EnrichmentProvider
  registry.ts        # provider name -> EnrichmentProvider; getEnrichmentProvider()
  providers/
    llm-websearch.ts # web search via the LLM's own server tool (+ resultSchema)
    classidy.ts      # synchronous third-party workflow
    mock.ts          # deterministic, offline, for smoke tests
app/api/
  chat/route.ts      # POST /api/chat   -> { text }
  enrich/route.ts    # POST /api/enrich -> EnrichmentResult
```

## Adding a provider (the golden rule)

A new provider = **one new file + one registry line**. Nothing else.

LLM provider — add to `lib/llm/registry.ts`:

```ts
export const providers = {
  openrouter: (model?) => getOpenRouterProvider()(model ?? process.env.OPENROUTER_MODEL ?? ""),
  anthropic: (model?) => /* createAnthropic(...)(model ?? ...) */,  // <- one line
} satisfies Record<string, (model?: string) => LanguageModel>;
```

Enrichment provider — write `providers/<name>.ts` exporting an
`EnrichmentProvider`, then add to `lib/enrichment/registry.ts`:

```ts
const providers: Record<string, EnrichmentProvider> = {
  "llm-websearch": llmWebSearchProvider,
  classidy: classidyProvider,
  mock: mockEnrichmentProvider,
  lusha: lushaProvider,   // <- one line
};
```

Each enrichment provider must normalize its vendor response into the shared
`resultSchema` shape (exported from `providers/llm-websearch.ts`).

## Switching the active provider

- **Default, from config:** set `LLM_PROVIDER` / `OPENROUTER_MODEL` and
  `ENRICHMENT_PROVIDER` in `.env` (see `.env.example`).
- **Per request, on the fly:** pass `provider` / `model` (chat) or `provider` /
  `options` (enrich) in the POST body. A request override always wins over the
  env default; an unknown provider is a `400`, not a crash.

Because `llm-websearch` calls `generate` (it has no private model wiring),
swapping `LLM_PROVIDER`/`OPENROUTER_MODEL` swaps the model behind **both** chat
and web-search enrichment at once.

## `generate` → `enrich` composition (one-directional)

`enrich` may depend on `generate`; **never the reverse**. `llm-websearch`
imports `generate`; nothing in `lib/llm/` imports from `lib/enrichment/`. This
is what makes "swap the LLM, and enrichment follows" hold.

Hard rule inside `generate`: **`schema` XOR `tools`**. With a `schema` it runs
`generateObject` (structured, no tools); without one it runs `generateText`
(free text, tools allowed). Web search + structured output is therefore **two
calls** — search first (tools), then structure (schema) — as `llm-websearch`
does.

## OpenRouter web search (the only vendor contract, isolated)

Web search uses OpenRouter's **server tool** `openrouter:web_search`, built via
`openrouter.tools.webSearch(...)` and passed in `generate`'s `tools`. The whole
contract (param names + placement) lives only in `llm-websearch.ts`.

`WebSearchOptions` → server-tool params (`mapToOpenRouter`):

| Option              | Server-tool param      | Notes                              |
| ------------------- | ---------------------- | ---------------------------------- |
| `maxResults`        | `max_results`          | result cap                         |
| `searchContextSize` | `search_context_size`  | `low` \| `medium` \| `high`        |
| `includeDomains`    | `allowed_domains`      | restrict to these domains          |
| `excludeDomains`    | `excluded_domains`     | exclude these domains              |
| `searchPrompt`      | `search_prompt`        | steer how results fold into output |

**Domain steering note.** These are the **current server-tool** names. The
deprecated *web plugin* used `include_domains` and had per-model restrictions
(Anthropic: include/exclude mutually exclusive; Google: unsupported; OpenAI:
include only). The server tool does **not** carry those per-model limits —
filtering happens at the search (Exa) layer, so `allowed_domains`/
`excluded_domains` work regardless of the underlying model (including the
default `google/gemini-2.5-flash`). The provider tool's typed args only declare
`maxResults`/`searchPrompt`/`engine`; the extra keys pass through at runtime
(the factory snake-cases every arg onto the tool descriptor), so a small cast is
used in `llm-websearch.ts`. The optional `engine` (`auto`|`native`|`exa`) knob
is supported by the tool but not yet exposed in `WebSearchOptions` (one-line
add when needed).

## Out of scope (later slices)

Anthropic LLM provider · Lusha & Apollo enrichment providers · side-by-side
provider comparison/scoring · streaming (`/api/chat` is non-streaming until a
chat UI exists). Each is a one-file + one-line addition under this same
structure.
