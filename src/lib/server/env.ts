// Single source of truth for environment variables. Add or remove a var HERE
// and import the const where you need it — nothing else reads `process.env`
// directly. Server-only: several of these are vendor credentials that must
// never reach the client (BFF rule).
//
// Values are exported raw (`string | undefined`); each consumer applies its own
// default (e.g. the registries' `?? "openrouter"`), so presence/fallback logic
// stays next to the code that depends on it.

// --- LLM (OpenRouter) ---
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
export const LLM_PROVIDER = process.env.LLM_PROVIDER;

// --- AI Gateway (GLaDOS) ---
export const GLADOS_API_URL = process.env.GLADOS_API_URL;

// --- Enrichment ---
export const ENRICHMENT_PROVIDER = process.env.ENRICHMENT_PROVIDER;
/** LLM provider (registry key) used by the `llm-websearch` enrichment, kept
 *  separate from the chat `LLM_PROVIDER`. Defaults to `openrouter`. */
export const ENRICHMENT_LLM_PROVIDER = process.env.ENRICHMENT_LLM_PROVIDER;
export const CLASSIDY_WEBHOOK_URL = process.env.CLASSIDY_WEBHOOK_URL;
export const CLASSIDY_API_KEY = process.env.CLASSIDY_API_KEY;
export const LUSHA_API_KEY = process.env.LUSHA_API_KEY;
export const CASSIDY_SUCCESS_CASE_WEBHOOK_URL = process.env.CASSIDY_SUCCESS_CASE_WEBHOOK_URL;
/** Shared secret expected in the `token` header of inbound Notion webhooks. */
export const NOTION_WEBHOOK_TOKEN = process.env.NOTION_WEBHOOK_TOKEN;

// --- Auth / Janus ---
export const JANUS_URL = process.env.JANUS_URL;
export const HUMAND_CLIENT_ID = process.env.HUMAND_CLIENT_ID;
export const HUMAND_CLIENT_SECRET = process.env.HUMAND_CLIENT_SECRET;

// --- CRM (pre-existing seam) ---
export const CRM_PROVIDER = process.env.CRM_PROVIDER;
/** HubSpot access token (server-only); passed directly as the SDK's `accessToken` bearer. */
export const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// --- Logging ---
/** Minimum level the logger emits: `debug | info | warn | error | silent`.
 *  `silent` turns logging off. Default (resolved in `logger.ts`): `info` in
 *  production, `debug` in development. */
export const LOG_LEVEL = process.env.LOG_LEVEL;
/** Log output shape: `pretty` (colorized single line) | `json` (one object per
 *  line). Default (resolved in `logger.ts`): `json` in production, `pretty` in
 *  development. */
export const LOG_FORMAT = process.env.LOG_FORMAT;
/** Standard Node env; read here so `process.env` access stays in this one module. */
export const NODE_ENV = process.env.NODE_ENV;
