// Typed mock fixtures ported from the PoC's hardcoded data. Clearly `MOCK_`-
// prefixed so the UI renders before the BFF endpoints are real. These seed the
// client state and back the stub route handlers. See PLAN Task 3.

import type {
  Deal,
  DealSearchRequest,
  RecentDeal,
  SearchExample,
  Stakeholder,
} from "@/types";

export const MOCK_INITIAL_QUERY: DealSearchRequest = {
  name: "Distribuidora Patagonia",
  website: "distpatagonia.com",
  email: "m.gomez@distpatagonia.com",
};

export const MOCK_DEAL: Deal = {
  entity: {
    resolved: "Distribuidora Patagonia S.A. — división Operaciones (AR)",
    confidence: 0.86,
    candidates: [
      {
        name: "Distribuidora Patagonia S.A. (holding) — AR",
        note: "matriz, incluye retail",
      },
      {
        name: "Patagonia Logística (subsidiaria) — CL",
        note: "razón social distinta",
      },
    ],
  },
  stage: "champion",
  region: "Argentina (AR)",
  firmographics: {
    summary: {
      value:
        "Distribución de alimentos y bebidas a retail. 2 plantas + 5 centros de distribución, flota propia. Workforce mayormente deskless (choferes, depósito, repositores) en operaciones rotativas.",
      prov: {
        source: "Web + Clearbit",
        sourceType: "enriquecido",
        confidence: 0.82,
        status: "inferred",
      },
    },
    industry: {
      value: "Consumo masivo · Distribución / Logística",
      prov: {
        source: "HubSpot",
        sourceType: "declarado",
        confidence: 0.95,
        status: "validated",
      },
    },
    regionProv: {
      source: "LinkedIn",
      sourceType: "declarado",
      confidence: 0.9,
      status: "validated",
      url: "https://www.linkedin.com/company/patagonia-distribucion",
    },
    headcount: 485,
    headcountProv: {
      source: "HubSpot vs Lusha",
      sourceType: "conflicto",
      confidence: 0.6,
      status: "inferred",
    },
    deskless: {
      value: "≈82% deskless",
      detail:
        "Choferes, depósito y repositores sin email corporativo. ~18% de oficina.",
      prov: {
        source: "LinkedIn + heurística",
        sourceType: "inferido",
        confidence: 0.78,
        status: "inferred",
      },
    },
    tech: [
      { t: "SharePoint (intranet)", kind: "desplazar" },
      { t: "WhatsApp (grupos)", kind: "desplazar" },
      { t: "BambooHR", kind: "integrar" },
      { t: "SAP", kind: "integrar" },
      { t: "Microsoft Teams", kind: "coexistir" },
      { t: "Salesforce", kind: "coexistir" },
    ],
    techProv: {
      source: "BuiltWith + call",
      sourceType: "mixto",
      confidence: 0.7,
      status: "inferred",
    },
  },
  hubspot: {
    dealStage: "Champion identified",
    amount: 28800,
    lastActivity: "2026-06-17 · call de discovery (37 min)",
    notes:
      "Diego confirmó dolor de comunicación con choferes. Mariana quiere medir alcance. Falta involucrar a CFO.",
    segment: null,
    integraciones: null,
  },
};

export const MOCK_STAKEHOLDERS: Stakeholder[] = [
  {
    id: "sh1",
    name: "Diego Ferrer",
    title: "Gerente de RRHH",
    role: "Champion",
    conf: 0.8,
    source: "call",
    evidence:
      "Pidió la demo, respondió 3 emails, articuló el dolor en discovery.",
    validated: true,
  },
  {
    id: "sh2",
    name: "Mariana Gómez",
    title: "CHRO",
    role: "Decision Maker",
    conf: 0.65,
    source: "firmographic",
    evidence:
      "Nueva, con mandato de modernizar. Mencionada por Diego, aún sin contacto directo.",
    validated: false,
  },
  {
    id: "sh3",
    name: "Laura Quiroga",
    title: "Gerente de Operaciones",
    role: "Influencer",
    conf: 0.55,
    source: "firmographic",
    evidence:
      "Dueña de la adopción de choferes; riesgo si no ve valor operativo.",
    validated: false,
  },
  {
    id: "sh4",
    name: "Roberto Salas",
    title: "CFO",
    role: "Economic Buyer",
    conf: 0.5,
    source: "firmographic",
    evidence: "Aprueba presupuesto. Sin engagement — gap crítico.",
    validated: false,
  },
];

export const MOCK_RECENT_DEALS: RecentDeal[] = [
  {
    name: "Distribuidora Patagonia S.A.",
    industry: "Distribución alimentos",
    deskless: 82,
    headcount: 485,
    stageKey: "champion",
    score: 68,
    updated: "hace 2 días",
  },
  {
    name: "Distribuidora Cuyo",
    industry: "Distribución alimentos",
    deskless: 78,
    headcount: 520,
    stageKey: "procurement",
    score: 81,
    updated: "hace 1 semana",
  },
  {
    name: "TransAndes Logística",
    industry: "Logística / transporte",
    deskless: 88,
    headcount: 610,
    stageKey: "md",
    score: 74,
    updated: "hace 3 días",
  },
  {
    name: "Retail Sur",
    industry: "Retail · supermercados",
    deskless: 74,
    headcount: 430,
    stageKey: "discovery",
    score: 52,
    updated: "hace 5 días",
  },
  {
    name: "Café del Norte",
    industry: "Retail · cafeterías",
    deskless: 70,
    headcount: 260,
    stageKey: "discovery",
    score: 48,
    updated: "ayer",
  },
  {
    name: "Bebidas Norte",
    industry: "Distribución bebidas",
    deskless: 80,
    headcount: 390,
    stageKey: "lead",
    score: 39,
    updated: "hace 2 semanas",
  },
];

export const MOCK_SEARCH_EXAMPLES: SearchExample[] = [
  {
    name: "Distribuidora Patagonia",
    website: "distpatagonia.com",
    email: "m.gomez@distpatagonia.com",
    tag: "alta data",
  },
  {
    name: "Café del Norte (cadena)",
    website: "cafedelnorte.com",
    email: "rrhh@cafedelnorte.com",
    tag: "retail",
  },
];


