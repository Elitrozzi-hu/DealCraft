// Central barrel for DealCraft's domain & BFF contract types — the single source
// of truth consumed by `lib/`, `hooks/`, `components/` and the `app/api/*` routes.
// Types are organized by feature in `*.types.ts` siblings; always import via
// `@/types` (never a deep path), so this split stays an internal detail.

export * from "./provenance.types.js";
export * from "./stage.types.js";
export * from "./stakeholder.types.js";
export * from "./deal.types.js";
export * from "./scoring.types.js";
export * from "./success-case.types.js";
export * from "./input.types.js";
export * from "./material.types.js";
export * from "./lead.types.js";
export * from "./deck.types.js";
export * from "./common.types.js";
export * from "./signal.types.js";
export * from "./pre-call-brief.types.js";
export * from "./language.types.js";
