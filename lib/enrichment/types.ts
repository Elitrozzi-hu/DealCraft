// The shared enrichment abstraction. Consumers (routes) depend only on these
// types and the registry — never on a concrete provider. Every provider
// normalizes its vendor-specific response into one `EnrichmentResult` shape.

/** What we know about a contact to enrich: any one of these is enough. */
export interface EnrichmentInput {
  email?: string;
  domain?: string;
  fullName?: string;
  /** Contact's job title (CRM `jobtitle`); part of Classidy's webhook body. */
  jobTitle?: string;
  /** Company name (CRM `company`); part of Classidy's webhook body. */
  companyName?: string;
}

/** The common, provider-agnostic enrichment result. */
export interface EnrichmentResult {
  /** Which provider produced this result. */
  provider: string;
  /** Normalized, structured enrichment data (see each provider's schema). */
  data: Record<string, unknown>;
  /** Raw vendor response, kept for debugging/provenance. */
  raw?: unknown;
  /** Provider-specific metadata (cost, latency, token usage, etc.) not part of
   *  the normalized data. Consumers (e.g. benchmark scripts) may read this. */
  meta?: Record<string, unknown>;
}

/** Strategy interface implemented by every enrichment provider. */
export interface EnrichmentProvider<Options = unknown> {
  readonly name: string;
  enrich(input: EnrichmentInput, options?: Options): Promise<EnrichmentResult>;
}
