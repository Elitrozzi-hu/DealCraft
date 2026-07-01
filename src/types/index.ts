// Central barrel for DealCraft's domain & BFF contract types — the single source
// of truth consumed by `lib/`, `hooks/`, `components/` and the `app/api/*` routes.
// Types are organized by feature in `*.types.ts` siblings; always import via
// `@/types` (never a deep path), so this split stays an internal detail.

export * from "./provenance.types";
export * from "./stage.types";
export * from "./stakeholder.types";
export * from "./pain.types";
export * from "./deal.types";
export * from "./scoring.types";
export * from "./success-case.types";
export * from "./input.types";
export * from "./material.types";
export * from "./lead.types";
export * from "./deck.types";
export * from "./common.types";
export * from "./signal.types";
export * from "./pre-call-brief.types";
export * from "./language.types";
