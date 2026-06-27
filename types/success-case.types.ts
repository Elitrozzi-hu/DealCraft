export interface Metric {
  value: string;
  label: string;
}

/** A published Humand customer case study, sourced from data/success-cases.json. */
export interface PublishedSuccessCase {
  id: string;
  slug: string;
  company: string;
  country: string;
  industry: string;
  industry_en: string;
  users: number | null;
  link_web: string | null;
  link_youtube: string | null;
  link_video: null;
  link_doc: string | null;
  tagline: string | null;
  description: string | null;
  pains: string[];
  solution_narrative: string | null;
  modules: string[];
  metrics: Metric[];
  quote: string | null;
  quote_author: string | null;
  quote_author_role: string | null;
  company_description: string | null;
  synced_at: string;
}
