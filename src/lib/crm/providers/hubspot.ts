import { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter.js";
import type { SimplePublicObject } from "@hubspot/api-client/lib/codegen/crm/contacts/models/SimplePublicObject.js";

import { getHubspotAccessToken } from "./hubspot-auth.js";
import { fetchDealsForContacts } from "./hubspot-deals.js";
import type { CrmProvider, LeadSearchInput } from "../types.js";
import type { LeadCandidate, LeadSearchResult } from "../../../types/index.js";

// HubSpot CRM provider. Resolves the meeting's lead by searching the **Contacts**
// object by exact email (decision: "siempre buscamos por su email"; pivoted from
// the Leads object `0-136` to Contacts because the portal grants
// `crm.objects.contacts.read`, not `crm.objects.leads.read`). The vendor contract
// (object, property names, operator) is isolated to this file; consumers see only
// `CrmProvider`, and results are normalized into the same `LeadCandidate` shape.

// Curated contact properties we read back and normalize into `LeadCandidate`.
const CONTACT_PROPERTIES = [
  "company",
  "email",
  "hs_email_domain",
  "jobtitle",
  "lifecyclestage",
  "hs_full_name_or_email",
  "region",
  "state",
  "country",
  "zip",
  "hs_pipeline",
  "hs_predictivescoringtier",
  "hs_predictivecontactscore_v2",
] as const;

// Reuse one SDK client across calls, refreshing its bearer each time: the token
// may be a static Private App token or a short-lived, cached one minted from a
// personal access key (see `hubspot-auth.ts`). Constructed lazily so importing
// this module (e.g. via the registry while the mock provider is active) needs no
// credentials.
let client: Client | undefined;
async function getAuthedClient(): Promise<Client> {
  const token = await getHubspotAccessToken();
  if (!client) {
    client = new Client({ accessToken: token });
  } else {
    client.setAccessToken(token);
  }
  return client;
}

/** Coerce a HubSpot property value (string | null | undefined) to string-or-null. */
function prop(
  properties: Record<string, string | null>,
  key: string,
): string | null {
  const value = properties[key];
  return value && value.trim() !== "" ? value : null;
}

/** Normalize a HubSpot contact into the provider-agnostic `LeadCandidate`. */
function toCandidate(result: SimplePublicObject): LeadCandidate {
  const p = result.properties;
  return {
    id: result.id,
    fullName: prop(p, "hs_full_name_or_email"),
    jobTitle: prop(p, "jobtitle"),
    contactEmail: prop(p, "email"),
    companyName: prop(p, "company"),
    companyDomain: prop(p, "hs_email_domain"),
    region: prop(p, "region"),
    state: prop(p, "state"),
    country: prop(p, "country"),
    zip: prop(p, "zip"),
    lifecycleStage: prop(p, "lifecyclestage"),
    pipeline: prop(p, "hs_pipeline"),
    scoringTier: prop(p, "hs_predictivescoringtier"),
    predictiveScore: prop(p, "hs_predictivecontactscore_v2"),
    // Populated in a second pass (see `attachDeals`); empty until then.
    deals: [],
  };
}

export const hubspotCrmProvider: CrmProvider = {
  name: "hubspot",
  async searchLeads(input: LeadSearchInput): Promise<LeadSearchResult> {
    const email = input.email.trim();
    if (!email) {
      // Defense in depth — the route already requires a non-empty email.
      throw new Error("HubSpot lead search requires an email.");
    }

    // Resolve the authenticated client first: a missing/unexchangeable credential
    // is a server misconfig (→ 500), distinct from a vendor/network failure below
    // (→ 502).
    const hubspot = await getAuthedClient();

    let response;
    try {
      response = await hubspot.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: FilterOperatorEnum.Eq,
                value: email,
              },
            ],
          },
        ],
        properties: [...CONTACT_PROPERTIES],
        limit: 10,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`HubSpot search failed: ${detail}`);
    }

    const candidates = response.results.map(toCandidate);

    // Second pass: attach each contact's associated deals in one batched lookup
    // (read-only). A deal-side failure surfaces as a vendor error (→ 502) rather
    // than silently dropping the deals.
    if (candidates.length) {
      const dealsByContact = await fetchDealsForContacts(
        candidates.map((c) => c.id),
      );
      for (const candidate of candidates) {
        candidate.deals = dealsByContact.get(candidate.id) ?? [];
      }
    }

    return {
      provider: "hubspot",
      total: response.total,
      candidates,
    };
  },
};
