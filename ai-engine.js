require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';
const MODEL_FALLBACK = 'claude-haiku-4-5-20251001';

// Load knowledge base files
let solutionsMap = {};
let deckPromptTemplate = '';

try {
  solutionsMap = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'humand_solutions_map.json'), 'utf8')
  );
  console.log('[AI] humand_solutions_map.json loaded ✓');
} catch (e) {
  console.warn('[AI] humand_solutions_map.json not found:', e.message);
}

try {
  deckPromptTemplate = fs.readFileSync(
    path.join(__dirname, 'humand_sales_deck_prompt_EN.txt'),
    'utf8'
  );
  console.log('[AI] humand_sales_deck_prompt_EN.txt loaded ✓');
} catch (e) {
  console.warn('[AI] humand_sales_deck_prompt_EN.txt not found:', e.message);
}

// ── 6. Pre-match modules by industry keywords ────────────────────────────────
const INDUSTRY_MODULE_HINTS = {
  transportation: ['communications', 'shift', 'safety', 'mobile', 'frontline'],
  logistics: ['shift', 'warehouse', 'communications', 'operations', 'scheduling'],
  healthcare: ['compliance', 'onboarding', 'certification', 'learning', 'forms'],
  manufacturing: ['communications', 'safety', 'supervisor', 'forms', 'skills'],
  retail: ['engagement', 'recognition', 'onboarding', 'frontline', 'communities'],
  hospitality: ['engagement', 'onboarding', 'recognition', 'communications', 'retention'],
  food: ['shift', 'communications', 'onboarding', 'compliance', 'engagement'],
  construction: ['safety', 'forms', 'certification', 'field', 'documents'],
  insurance: ['compliance', 'learning', 'onboarding', 'forms', 'people ops'],
  technology: ['engagement', 'culture', 'people ops', 'talent', 'learning'],
};

function getModuleHintsForIndustry(industry) {
  if (!industry || !Object.keys(solutionsMap).length) return null;
  const ind = industry.toLowerCase();

  const matchedKeywords = Object.entries(INDUSTRY_MODULE_HINTS).reduce((acc, [key, keywords]) => {
    if (ind.includes(key)) acc.push(...keywords);
    return acc;
  }, []);

  if (!matchedKeywords.length) return null;

  // Find modules in solutionsMap that match the keywords
  const matched = [];
  const modules = Array.isArray(solutionsMap) ? solutionsMap : Object.values(solutionsMap);

  modules.forEach((mod) => {
    const modText = JSON.stringify(mod).toLowerCase();
    const hits = matchedKeywords.filter((k) => modText.includes(k)).length;
    if (hits >= 2) matched.push({ module: mod, relevance_hits: hits });
  });

  return matched
    .sort((a, b) => b.relevance_hits - a.relevance_hits)
    .slice(0, 5)
    .map((m) => m.module);
}

const AE_BRIEF_SYSTEM_PROMPT = `You are DealCraft AI, a sales intelligence engine for Humand's Account Executives. Write like a senior AE briefing a colleague — direct, specific, no fluff.

HUMAND: Mobile-first employee experience platform for frontline/deskless workers. 4 pillars: Communications (news feed, push notifications, multi-language), Culture & Engagement (recognition, surveys, onboarding, gamification), People Operations (digital forms, shift management, workflows), Talent & Development (microlearning, certifications, skills matrix).

INDUSTRY PAINS:
- Transport/Logistics: shift chaos, safety comms gaps, driver turnover
- Healthcare: compliance docs, onboarding speed, multi-site coordination
- Manufacturing: comms silos, safety reporting, skills tracking
- Retail/Hospitality: frontline engagement, seasonal onboarding, recognition
- Construction/Field: document distribution, certification tracking

DATA HIERARCHY (weight accordingly):
1. VERIFIED: CRM data, transcripts, notes → assert confidently
2. ENRICHED: Lusha, role playbooks → qualify with "likely"
3. INFERRED: web/industry generalizations → flag explicitly, never assert

KEY RULES:
- Stakeholder profiles are the primary input. For each person: pull their pitch angle, questions, objections, red flags from the provided playbook. Extract their specific quotes from transcripts.
- Pain hypotheses: frame from the stakeholder's perspective, always link to a Humand module, max 3.
- Historical patterns: synthesize into one actionable insight + one tactical warning. Use the best available tier.
- Return ONLY valid JSON. No markdown, no preamble, no explanation.`;

function buildBriefUserMessage(dealData, enrichData, historicalDeals) {
  const sections = [];

  sections.push('=== DEAL / PROSPECT DATA ===');
  sections.push(JSON.stringify(dealData, null, 2));

  // ── 6. Pre-matched modules for this industry ──────────────────────────────
  const industry =
    dealData.company?.industry ||
    dealData.industry ||
    enrichData?.lusha?.industry ||
    '';
  const moduleHints = getModuleHintsForIndustry(industry);
  if (moduleHints?.length) {
    sections.push('\n=== PRE-MATCHED MODULES FOR THIS INDUSTRY (prioritize these) ===');
    sections.push(JSON.stringify(moduleHints, null, 2));
  }

  if (enrichData?.lusha) {
    sections.push('\n=== LUSHA ENRICHMENT (confidence: medium — third-party data) ===');
    sections.push(JSON.stringify(enrichData.lusha, null, 2));
  }

  if (enrichData?.stakeholders?.length) {
    sections.push('\n=== LUSHA STAKEHOLDERS — REAL PEOPLE AT THIS COMPANY (confidence: medium) ===');
    sections.push('These are verified employees found at this company via Lusha. Use their job_title directly. If full_name is null, set name to "Name not available — Lusha credit required" — do NOT invent a name. Do NOT invent contacts beyond this list.');
    sections.push(JSON.stringify(enrichData.stakeholders, null, 2));
  }

  if (enrichData?.scrape) {
    sections.push('\n=== WEBSITE SCRAPE (confidence: low — public information) ===');
    sections.push(JSON.stringify(enrichData.scrape, null, 2));
  }

  // Stakeholder profiles — highest priority section
  if (dealData.stakeholder_profiles?.length) {
    sections.push('\n=== STAKEHOLDER PROFILES (use as primary input for stakeholder analysis) ===');
    sections.push('Each profile contains: internal signals (confidence: high), role playbook (confidence: medium), web intel (confidence: low).');
    sections.push('Extract specific concerns, objections, and language from transcripts for each person.');
    sections.push(JSON.stringify(dealData.stakeholder_profiles, null, 2));
  }

  if (historicalDeals?.tiers) {
    const { tier_1_exact, tier_2_strong, tier_3_moderate, tier_4_weak } = historicalDeals.tiers;

    sections.push('\n=== HISTORICAL DEAL INTELLIGENCE (tiered by industry + company size match) ===');
    sections.push(`
TIERED SIMILARITY SYSTEM — weight tiers in order. Use only as much data as needed:
- Tier 1 (EXACT match — same industry + same size band): Highest signal. Assert patterns confidently if sample_size >= 5.
- Tier 2 (STRONG match — same industry + adjacent size): Strong directional signal. Use "likely" or "tends to".
- Tier 3 (MODERATE match — same industry OR same size): Weaker signal. Flag as partial match in rationale.
- Tier 4 (WEAK match — adjacent size only, different industry): Treat as anecdotal. Only use if no better tier available.

CONFIDENCE WEIGHTING BY SAMPLE SIZE (applies within each tier):
- 20+ deals: assert confidently
- 5-19 deals: qualify with "likely" or "tends to"
- 1-4 deals: anecdotal only, do NOT draw statistical conclusions, flag explicitly

TIER 1 — Exact (same industry + same size band):
${JSON.stringify(tier_1_exact, null, 2)}

TIER 2 — Strong (same industry + adjacent size):
${JSON.stringify(tier_2_strong, null, 2)}

TIER 3 — Moderate (same industry OR same size):
${JSON.stringify(tier_3_moderate, null, 2)}

TIER 4 — Weak (adjacent size, different industry):
${JSON.stringify(tier_4_weak, null, 2)}`);
  }

  // Full solutions map omitted — pre-matched modules above are sufficient for the AI

  sections.push(`
=== OUTPUT INSTRUCTIONS ===
Return ONLY a valid JSON object. No markdown. No explanation. Strict limits: max 3 pain_hypotheses, max 3 next_actions, max 3 recommended_modules, max 2 missing stakeholders.

CRITICAL — stakeholder_map.present: You will receive up to 5 real Lusha contacts. Include ALL of them, classified by relevance. COPY the exact full_name from the Lusha data as the "name" field — do NOT invent, modify, or fabricate names. If a person doesn't fit champion/dm/influencer/blocker, assign type "unknown". If no Lusha contacts provided, return an empty array [].

{
  "company_snapshot": {
    "name": "string",
    "industry": "string",
    "employee_count": "string",
    "workforce_type": "Classify as one of: 'Desk-based' (mostly office/remote knowledge workers), 'Deskless' (mostly frontline — manufacturing, retail, logistics, healthcare, field), or 'Mixed' (significant portion of both). Pick based on industry and operational context.",
    "geographic_footprint": "string",
    "hq_country": "string — short country or region name, e.g. 'Argentina', 'Mexico', 'Brazil', 'LatAm', 'USA'",
    "operational_structure": "string",
    "tech_stack": ["string — inferred tools the company likely uses, e.g. SAP, Workday, WhatsApp, Excel, Salesforce. Max 6 items."],
    "summary": "2-3 sentences"
  },
  "pain_hypotheses": [
    {
      "pain": "string — as the prospect would name it",
      "confidence": "high | medium | low",
      "rationale": "string — cite transcript if available",
      "validation_question": "string",
      "if_confirmed": { "push_opportunity": "string", "show_module": "string", "highlight_impact": ["string"] },
      "if_not_confirmed": { "fallback_question": "string", "alternative_path": "string" }
    }
  ],
  "recommended_modules": [
    { "module_name": "string", "why_relevant": "string", "priority": "primary | secondary" }
  ],
  "stakeholder_map": {
    "present": [
      {
        "name": "string — real name only, from Lusha or CRM data",
        "role": "string",
        "type": "champion | decision_maker | influencer | blocker | unknown",
        "likely_priority": "string — one sentence",
        "engagement_status": "pending | contacted | engaged",
        "linkedin_url": "string or null — copy exactly from Lusha stakeholders if available",
        "has_email": "boolean — copy from Lusha has_email flag",
        "has_phone": "boolean — copy from Lusha has_phone flag"
      }
    ],
    "missing": [{ "role": "string", "why_important": "string", "recommended_action": "string" }],
    "coverage_score": 65,
    "coverage_risk": "low | medium | high"
  },
  "deal_strategy": {
    "sales_stage": "lead | discovery | champion_identified | decision_maker_engaged | procurement",
    "primary_positioning": "string",
    "suggested_demo_flow": ["string", "string", "string"],
    "key_risks": ["string"],
    "next_actions": [{ "action": "string", "priority": "high | medium", "rationale": "string" }]
  },
  "historical_patterns": {
    "best_available_tier": "Tier 1 — Exact | Tier 2 — Strong | Tier 3 — Moderate | Tier 4 — Weak | No data",
    "sample_size": 0,
    "confidence": "high | medium | low | none",
    "win_rate_pct": null,
    "avg_deal_amount": null,
    "top_loss_reasons": ["string"],
    "key_insight": "one sentence",
    "watch_out": "one sentence"
  },
  "opportunities": ["string — concrete sales opportunity to push, derived from confirmed pain hypotheses. Max 4 bullets."]
}`);

  return sections.join('\n');
}

function stripJsonFences(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function callClaude(prompt, systemPrompt) {
  console.log(`[AI] Calling Claude model: ${MODEL}`);

  const messages = [{ role: 'user', content: prompt }];
  const params = {
    model: MODEL,
    max_tokens: 6000,
    temperature: 0.4,
    messages,
  };

  if (systemPrompt) params.system = systemPrompt;

  const response = await anthropic.messages.create(params);
  const text = response.content[0].text;
  console.log(`[AI] Claude response received (${text.length} chars)`);
  return text;
}

async function generateAEBrief(dealData, enrichData = {}, historicalDeals = []) {
  const userMessage = buildBriefUserMessage(dealData, enrichData, historicalDeals);
  const raw = await callClaude(userMessage, AE_BRIEF_SYSTEM_PROMPT);
  const cleaned = stripJsonFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[AI] JSON parse failed. Raw output:', raw.slice(0, 500));
    throw new Error(`AI returned invalid JSON: ${e.message}`);
  }
}

async function streamAEBrief(dealData, enrichData = {}, historicalDeals = [], onToken) {
  console.log(`[AI] Streaming Claude model: ${MODEL}`);
  const userMessage = buildBriefUserMessage(dealData, enrichData, historicalDeals);

  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const model = attempt >= MAX_RETRIES ? MODEL_FALLBACK : MODEL;
    let fullText = '';
    try {
      const stream = anthropic.messages.stream({
        model,
        max_tokens: 6000,
        temperature: 0.4,
        system: AE_BRIEF_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      stream.on('text', (text) => {
        fullText += text;
        if (onToken) onToken(text);
      });

      await stream.finalMessage();
      console.log(`[AI] Stream complete (${fullText.length} chars)`);

      const cleaned = stripJsonFences(fullText);
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.error('[AI] JSON parse failed. Raw output:', fullText.slice(0, 500));
        throw new Error(`AI returned invalid JSON: ${e.message}`);
      }
    } catch (err) {
      const isOverloaded = err?.cause?.message?.includes('overloaded_error') ||
        JSON.stringify(err).includes('overloaded_error');
      if (isOverloaded && attempt < MAX_RETRIES) {
        const delay = attempt * 5000;
        const nextModel = attempt + 1 >= MAX_RETRIES ? MODEL_FALLBACK : MODEL;
      console.warn(`[AI] Claude overloaded, retry ${attempt}/${MAX_RETRIES} in ${delay}ms (next: ${nextModel})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function generateDeckContent(brief, dealData = {}) {
  if (!deckPromptTemplate) {
    throw new Error('humand_sales_deck_prompt_EN.txt not found');
  }

  const userMessage = `
DEAL CONTEXT:
${JSON.stringify(dealData, null, 2)}

AE BRIEF GENERATED:
${JSON.stringify(brief, null, 2)}

${deckPromptTemplate}

Return ONLY the JSON object for the deck variables. No markdown, no explanation.`;

  const raw = await callClaude(userMessage, '');
  const cleaned = stripJsonFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[AI] Deck JSON parse failed. Raw:', raw.slice(0, 500));
    throw new Error(`AI returned invalid deck JSON: ${e.message}`);
  }
}

async function generateStakeholderDetail(stakeholder, companyContext) {
  const prompt = `You are a sales intelligence engine for Humand. Generate a detailed profile for ONE stakeholder to help an Account Executive prepare for a meeting.

COMPANY CONTEXT:
${JSON.stringify(companyContext, null, 2)}

STAKEHOLDER:
name: ${stakeholder.name}
role: ${stakeholder.role}
type: ${stakeholder.type}
likely_priority: ${stakeholder.likely_priority || ''}

Return ONLY valid JSON, no markdown:
{
  "pitch_angle": "string — one sentence on how to position Humand for this person",
  "opening_questions": ["string", "string"],
  "key_objections": [{ "objection": "string", "response": "string" }, { "objection": "string", "response": "string" }],
  "red_flags": ["string"],
  "transcript_signals": []
}`;

  const raw = await callClaude(prompt, '');
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Stakeholder detail parse failed: ${e.message}`);
  }
}

async function generateEmails(brief, dealData) {
  const prompt = `You are a sales email writer for Humand. Write two short, personalized emails based on the deal brief below.

BRIEF SUMMARY:
- Company: ${brief.company_snapshot?.name}
- Industry: ${brief.company_snapshot?.industry}
- Top pain: ${brief.pain_hypotheses?.[0]?.pain || 'N/A'}
- Top module: ${brief.recommended_modules?.[0]?.module_name || 'N/A'}
- Sales stage: ${brief.deal_strategy?.sales_stage || 'lead'}
- Key stakeholder: ${brief.stakeholder_map?.present?.[0]?.name || ''} (${brief.stakeholder_map?.present?.[0]?.role || ''})

DEAL DATA:
${JSON.stringify({ company_name: dealData.company_name || dealData.company?.name, industry: dealData.industry || dealData.company?.industry }, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "pre_meeting": { "subject": "string", "body": "string — 3-4 short paragraphs, conversational, no fluff" },
  "post_meeting": { "subject": "string", "body": "string with [PLACEHOLDERS] for specific details" }
}`;

  const raw = await callClaude(prompt, '');
  const cleaned = stripJsonFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Emails parse failed: ${e.message}`);
  }
}

module.exports = { generateAEBrief, streamAEBrief, generateDeckContent, generateStakeholderDetail, generateEmails };
