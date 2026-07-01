

export interface LeadSearchRequest {
  email: string;
}


export interface LeadDeal {
  id: string;
  name: string | null; // dealname
  stageLabel: string | null; // dealstage → resolved label (never the id)
  amount: number | null; // amount
  industry: string | null; // industria_hu
  segment: string | null; // segment_v2
  painDetected: string | null; // pain_detected
  integraciones: string | null; // integraciones
  integrationModules: string | null; // integration_modules
  modulosDeInteres: string | null; // modulos_que_les_interesan
}


export interface LeadCandidate {
  id: string;
  fullName: string | null; // hs_full_name_or_email
  jobTitle: string | null; // jobtitle
  contactEmail: string | null; // email
  companyName: string | null; // company
  companyDomain: string | null; // hs_email_domain
  region: string | null; // region
  state: string | null; // state
  country: string | null; // country
  zip: string | null; // zip
  lifecycleStage: string | null; // lifecyclestage
  pipeline: string | null; // hs_pipeline
  scoringTier: string | null; // hs_predictivescoringtier
  predictiveScore: string | null; // hs_predictivecontactscore_v2
  // Associated deals, resolved at search time (empty when the contact has none).
  deals: LeadDeal[];
}

export interface LeadSearchResult {
  provider: string;
  total: number;
  candidates: LeadCandidate[];
}
