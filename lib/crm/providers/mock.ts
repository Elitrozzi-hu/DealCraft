import "server-only";

import type { CrmProvider, LeadSearchInput } from "@/lib/crm/types";
import type { LeadCandidate, LeadSearchResult } from "@/types";

// Mock CRM provider: returns a fixed set of lead candidates without touching
// HubSpot. Enables route/UI smoke tests offline and without a token.

const MOCK_CANDIDATES: LeadCandidate[] = [
  {
    id: "mock-lead-1",
    fullName: "Jane Doe",
    jobTitle: "VP of People",
    contactEmail: "jane.doe@acme.com",
    companyName: "Acme Corp",
    companyDomain: "acme.com",
    region: "AMER",
    state: "California",
    country: "United States",
    zip: "94105",
    lifecycleStage: "opportunity",
    pipeline: "contacts-lifecycle-pipeline",
    scoringTier: "tier_1",
    predictiveScore: "0.82",
    deals: [
      {
        id: "mock-deal-1",
        name: "Acme Corp — Humand rollout",
        stageLabel: "Final Negotiation",
        amount: 24000,
        industry: "Software",
        segment: null,
        painDetected: null,
        integraciones: null,
        integrationModules: null,
        modulosDeInteres: null,
      },
    ],
  },
  {
    id: "mock-lead-2",
    fullName: "Carlos Ruiz",
    jobTitle: "Head of HR",
    contactEmail: "carlos@globex.io",
    companyName: "Globex",
    companyDomain: "globex.io",
    region: "LATAM",
    state: "Buenos Aires",
    country: "Argentina",
    zip: "C1000",
    lifecycleStage: "lead",
    pipeline: "contacts-lifecycle-pipeline",
    scoringTier: "tier_3",
    predictiveScore: "0.41",
    deals: [],
  },
  {
    id: "mock-lead-3",
    fullName: "info@initech.com",
    jobTitle: null,
    contactEmail: "info@initech.com",
    companyName: "Initech",
    companyDomain: "initech.com",
    region: null,
    state: null,
    country: "United States",
    zip: null,
    lifecycleStage: "subscriber",
    pipeline: "contacts-lifecycle-pipeline",
    scoringTier: "tier_4",
    predictiveScore: "0.12",
    deals: [],
  },
];

export const mockCrmProvider: CrmProvider = {
  name: "mock",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async searchLeads(_input: LeadSearchInput): Promise<LeadSearchResult> {
    return {
      provider: "mock",
      total: MOCK_CANDIDATES.length,
      candidates: MOCK_CANDIDATES,
    };
  },
};
