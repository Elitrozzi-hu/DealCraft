# DealCraft AI — Frontend Integration Guide

This document is for the designer/developer building the DealCraft frontend.
It covers: the backend API contract, every endpoint, the complete data schema for the AE Brief, and everything needed to connect a new frontend to the existing backend.

---

## 1. Backend connection

The backend is a Node.js/Express REST API.

### Base URL
```
http://localhost:3001
```

For production, replace with the deployed URL. All CORS origins are currently allowed (`*`), so no special headers are needed.

### Headers required for all requests
```
Content-Type: application/json
```

### Health check
```
GET /health
```
Returns:
```json
{
  "status": "ok",
  "service": "DealCraft API",
  "timestamp": "2026-03-19T...",
  "env": {
    "supabase": true,
    "google_ai": true,
    "lusha": true
  }
}
```
Use this on app load to verify the backend is reachable.

---

## 2. API Endpoints

---

### `GET /api/deals`

Lists deals from the CRM for the deal selector UI.

**Query params (all optional):**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by company name, deal name, or industry |
| `limit` | number | Max results (default: 80) |

**Response:**
```json
{
  "deals": [
    {
      "id": "uuid",
      "deal_name": "string",
      "deal_stage": "string",
      "amount": 50000,
      "close_date": "2026-04-01",
      "company_id": "uuid",
      "company_name": "string",
      "industry": "string",
      "domain": "string",
      "employee_count": 1200,
      "location": "Buenos Aires, AR",
      "display_name": "string",
      "display_stage": "string"
    }
  ],
  "count": 42
}
```

Use `display_name` and `display_stage` for rendering. Use `id` when calling `/api/brief`.

---

### `GET /api/deals/:id`

Fetches full deal data with all related records.

**Response:**
```json
{
  "deal": {
    "id": "uuid",
    "deal_name": "string",
    "deal_stage": "string",
    "amount": 50000,
    "company": {
      "name": "string",
      "industry": "string",
      "number_of_employees": 1200,
      "domain": "string",
      "city": "string",
      "country": "string",
      "annual_revenue": 5000000,
      "web_technologies": ["HubSpot", "Workday"]
    },
    "contacts": [
      {
        "id": "uuid",
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "job_title": "string",
        "lifecycle_stage": "string",
        "stakeholder_type": "champion | decision_maker | influencer | blocker | unknown",
        "full_name": "string"
      }
    ],
    "meetings": [
      {
        "id": "uuid",
        "title": "string",
        "start_time": "2026-02-15T10:00:00Z",
        "end_time": "2026-02-15T11:00:00Z",
        "outcome": "string",
        "body_preview": "string"
      }
    ],
    "call_transcripts": [
      {
        "id": "uuid",
        "title": "string",
        "started_at": "2026-02-15T...",
        "duration_seconds": 2400,
        "summary": { ... },
        "calendar_invitees": [...]
      }
    ],
    "notes": [
      {
        "id": "uuid",
        "body": "string",
        "created_at": "2026-02-10T..."
      }
    ]
  }
}
```

---

### `POST /api/brief`

**The main endpoint.** Generates the full AE Brief for a prospect.

**Request body (option A — from existing CRM deal):**
```json
{
  "deal_id": "uuid"
}
```

**Request body (option B — new prospect not in CRM):**
```json
{
  "deal_data": {
    "company_name": "Acme Corp",
    "company": {
      "domain": "acmecorp.com",
      "industry": "Logistics",
      "number_of_employees": 1500
    }
  }
}
```

**Request body (option C — deal + additional context):**
```json
{
  "deal_id": "uuid",
  "additional_context": "They mentioned they are evaluating 3 competitors. Key decision expected end of Q2."
}
```

**Response:**
```json
{
  "brief": { ... },   // Full AE Brief — see Section 3
  "enrichment": {
    "lusha": { ... }, // Company data from Lusha API
    "scrape": { ... } // Website scrape fallback
  }
}
```

This call typically takes 15–45 seconds (AI generation). Show a loading state.

---

### `POST /api/deck`

Generates sales deck content from an existing brief.

**Request body:**
```json
{
  "brief": { ... },         // The brief object returned by /api/brief
  "deal_data": { ... },     // The deal_data used to generate the brief
  "apps_script_url": "https://script.google.com/..." // Optional: triggers Google Apps Script
}
```

**Response:**
```json
{
  "deck_content": { ... },
  "sheet": { ... },
  "apps_script": { ... },
  "deal_id": "string"
}
```

---

### `POST /api/generate`

Full pipeline: brief + optional deck in a single call.

**Request body:**
```json
{
  "deal_id": "uuid",
  "deal_data": { ... },
  "additional_context": "string",
  "generate_deck": false,
  "apps_script_url": "https://..."
}
```

**Response:**
```json
{
  "brief": { ... },
  "enrichment": { ... },
  "deck": null
}
```

---

## 3. AE Brief — Complete Output Schema

This is the full structure of the `brief` object returned by `/api/brief` and `/api/generate`.

---

### `company_snapshot`

```json
{
  "name": "Acme Logistics",
  "industry": "Logistics",
  "employee_count": "1,200 employees",
  "workforce_type": "Frontline/Deskless | Mixed | Office-based",
  "geographic_footprint": "12 distribution centers across Argentina and Brazil",
  "operational_structure": "Shift-based operations, distributed facilities, 80% blue-collar workforce",
  "summary": "2-3 sentence paragraph written like a senior AE summarizing the company for a colleague"
}
```

---

### `deal_velocity`

Real-time engagement signal. Use this to set the context before everything else — the AE needs to know immediately if this deal is hot or stalling.

```json
{
  "engagement_score": 72,
  "deal_heat": "hot | warm | cold",
  "signal": "High engagement — prospect has been active in the last 7 days and has 4 recorded meetings",
  "days_since_last_activity": 5,
  "meeting_count": 4,
  "transcript_count": 2,
  "recommended_urgency": "act now | follow up soon | re-engage | nurture"
}
```

Suggested UI treatment:
- `hot` → green badge
- `warm` → amber badge
- `cold` → grey badge
- Show `signal` as a one-liner under the badge
- Show `meeting_count` and `transcript_count` as small stat chips

---

### `pain_hypotheses`

Array of hypotheses about what the prospect is struggling with.

```json
[
  {
    "pain": "Our frontline workers don't get safety updates until it's too late",
    "confidence": "high | medium | low",
    "rationale": "Company has 12 distributed sites. Based on the Feb 15 call, Maria (HR Director) mentioned they rely on WhatsApp groups for safety communication.",
    "validation_question": "How do you currently ensure a safety bulletin reaches every worker across all your sites within the hour?",
    "if_confirmed": {
      "push_opportunity": "Position Humand's push notifications + read receipts as the auditable safety communication layer",
      "show_module": "Communications module",
      "highlight_impact": [
        "Delivery confirmation at the individual level",
        "Segmented by site, shift, or role"
      ]
    },
    "if_not_confirmed": {
      "fallback_question": "How do you handle compliance documentation when regulations change?",
      "alternative_path": "Pivot to onboarding and compliance tracking"
    }
  }
]
```

---

### `opportunity_areas`

High-level opportunity areas, scored by relevance.

```json
[
  {
    "id": "frontline-comms",
    "title": "Replace fragmented WhatsApp groups with auditable frontline communication",
    "score": 0.92,
    "rationale": "Strong evidence from transcripts + industry pattern"
  }
]
```

`score` is 0–1. Use it to sort or visually weight the opportunities.

---

### `recommended_modules`

```json
[
  {
    "module_id": "MOD-001",
    "module_name": "Communications",
    "why_relevant": "12 distributed sites with no unified comms channel — this is the entry point",
    "priority": "primary | secondary"
  }
]
```

---

### `stakeholder_map`

The most important section. Contains a full profile per contact in the deal.

```json
{
  "present": [
    {
      "name": "Maria González",
      "role": "HR Director",
      "type": "champion | decision_maker | influencer | blocker | unknown",
      "likely_priority": "Reducing first-90-day turnover and automating onboarding paperwork",
      "engagement_status": "pending | contacted | engaged",
      "pitch_angle": "Lead with the employee experience on day one. Show what onboarding looks like from the worker's phone. Maria needs to see her own employees in the demo.",
      "opening_questions": [
        "Walk me through your current onboarding process for a new warehouse hire — from day one to week four.",
        "When you send a policy update, how do you know it was actually read by frontline workers?"
      ],
      "key_objections": [
        {
          "objection": "We don't have bandwidth to implement this",
          "response": "We do the heavy lifting — most customers are live in 6–8 weeks with minimal IT involvement. What would you need to free up to make this happen?"
        }
      ],
      "red_flags": [
        "Don't position Humand as an HRIS or system of record — it's not",
        "Don't use corporate/enterprise language — she deals with real people daily",
        "Don't skip the mobile demo — the UI is a key differentiator for her"
      ],
      "transcript_signals": [
        "On the Feb 15 call, Maria said: 'Our biggest problem is that new hires in the warehouse don't know who to call when something goes wrong'",
        "Maria mentioned they've tried using email but less than 15% of frontline workers check it"
      ]
    }
  ],
  "missing": [
    {
      "role": "COO or VP Operations",
      "why_important": "Operational buy-in is required for a platform that touches shift scheduling and safety protocols",
      "recommended_action": "Ask Maria to introduce us to whoever owns operational processes"
    }
  ],
  "coverage_score": 65,
  "coverage_risk": "low | medium | high"
}
```

**Notes for the designer:**
- `coverage_score` is 0–100. Suggest a progress bar or score chip.
- `coverage_risk` indicates whether key roles are missing. Highlight `high` in red.
- `transcript_signals` may be an empty array if no transcripts exist for that person.
- `type` drives the visual badge per contact: champion = green, decision_maker = blue, blocker = red, influencer = grey.

---

### `deal_strategy`

```json
{
  "sales_stage": "lead | discovery | champion_identified | decision_maker_engaged | procurement",
  "primary_positioning": "Position Humand as the operational communications backbone for their frontline, not an HR add-on.",
  "suggested_demo_flow": [
    "Open with the communications module — show a targeted push notification by site and shift",
    "Show read receipts and delivery analytics — this is what differentiates from WhatsApp",
    "Close with onboarding journey from the worker's perspective — let Maria see her own people in it"
  ],
  "key_risks": [
    "No IT stakeholder engaged yet — CTO/CIO could block on security grounds",
    "Budget cycle ends in Q2 — if we don't get to procurement by April, deal slips to next year"
  ],
  "next_actions": [
    {
      "action": "Send pre-meeting email with the 3 questions we want to explore in the next call",
      "priority": "high",
      "rationale": "Deal has been warm for 3 weeks with no meeting booked — this re-engages without pressure"
    }
  ]
}
```

---

### `historical_patterns`

Synthesized insight from Humand's historical deal data — similar industry and company size.

```json
{
  "best_available_tier": "Tier 1 — Exact | Tier 2 — Strong | Tier 3 — Moderate | Tier 4 — Weak | No data",
  "sample_size": 14,
  "confidence": "high | medium | low | none",
  "win_rate_pct": 64,
  "avg_deal_amount": 41000,
  "top_loss_reasons": ["Price sensitivity", "No internal champion secured", "Lost to competitor"],
  "key_insight": "In similar logistics companies of this size, deals typically close in 90–120 days and hinge on securing an operational sponsor (COO or VP Ops) alongside the HR champion.",
  "watch_out": "Price sensitivity is the top loss reason in this segment — come prepared with an ROI model anchored to turnover cost before procurement discussions start."
}
```

**Notes for the designer:**
- `best_available_tier` indicates data quality. Display it prominently so the AE understands how reliable these numbers are.
- If `confidence = "none"` or `sample_size = 0`, hide the numeric stats and show only the tier label.
- `key_insight` and `watch_out` are plain-language sentences — display them as highlighted callout boxes.

---

### `pre_meeting_emails`

```json
{
  "pre_meeting": {
    "subject": "A few things I want to explore with you on Thursday",
    "body": "Hi Maria,\n\nLooking forward to our call on Thursday. Based on what you shared last time about your onboarding challenges, I want to make sure we cover three things specifically:\n\n1. How you're currently reaching workers who don't have company email\n2. What your first-90-day retention looks like for warehouse roles\n3. Whether there's appetite to run a small pilot with one site before any broader rollout\n\nSee you then.\n[AE NAME]"
  },
  "post_meeting": {
    "subject": "Next steps from today's call — [COMPANY NAME]",
    "body": "Hi Maria,\n\nThank you for the time today. Really valuable to understand [MAIN PAIN DISCUSSED].\n\nAs discussed, here are the next steps:\n1. [ACTION ITEM 1 — AE]\n2. [ACTION ITEM 2 — PROSPECT]\n\nI'll follow up with [MATERIALS PROMISED] by [DATE].\n\nLooking forward to moving this forward.\n[AE NAME]"
  }
}
```

---

## 4. Error handling

All endpoints return errors in this format:
```json
{
  "error": "Error message string"
}
```

Common HTTP status codes:
| Code | Meaning |
|------|---------|
| `400` | Missing required parameters |
| `404` | Deal not found |
| `500` | Internal server error (AI failure, Supabase unreachable, etc.) |

The AI generation (`/api/brief`) can fail with `500` if all Gemini models are unavailable. Show a retry option.

---

## 5. UX recommendations based on data structure

### Loading state
`/api/brief` takes 15–45 seconds. Show a multi-step progress indicator:
- "Pulling CRM data..." (instant)
- "Enriching company profile..." (2–5s)
- "Analyzing stakeholder profiles..." (5–10s)
- "Generating brief..." (10–30s)

### Tab / section structure (suggested)
Based on the brief structure, a natural tab layout is:

| Tab | Content |
|-----|---------|
| Overview | company_snapshot + deal_velocity |
| Stakeholders | stakeholder_map (full profiles per person) |
| Pain & Strategy | pain_hypotheses + deal_strategy + recommended_modules |
| History | historical_patterns + opportunity_areas |
| Emails | pre_meeting_emails |

### Stakeholder cards
Each entry in `stakeholder_map.present[]` is rich enough to be a full card with expandable sections. Suggested card layout:
- Header: name, role, type badge, engagement_status
- Section 1: likely_priority + pitch_angle
- Section 2: opening_questions (bulleted)
- Section 3: key_objections (accordion per objection)
- Section 4: red_flags (warning-style list)
- Section 5: transcript_signals (quoted, italicized — only if non-empty)

### Confidence indicators
`pain_hypotheses[].confidence` and `historical_patterns.confidence` should be visually distinct:
- `high` → solid color chip
- `medium` → outlined chip
- `low` → grey chip with a "⚠" icon

### Null handling
Many fields can be `null` or empty arrays when data is unavailable. Always check before rendering. Specifically:
- `historical_patterns.win_rate_pct` can be null
- `stakeholder_map.present[].transcript_signals` can be `[]`
- `deal_velocity.days_since_last_activity` can be null

---

## 6. Configuration checklist for connecting a new frontend

- [ ] Set the base URL to `http://localhost:3001` (dev) or the production URL when deployed
- [ ] Use `GET /health` on app mount to confirm the backend is reachable
- [ ] Use `GET /api/deals?search=` for the deal search/selector component
- [ ] Pass `deal_id` (from the deals list) to `POST /api/brief` to generate the brief
- [ ] Handle the 15–45 second loading time with a meaningful progress UI
- [ ] Handle `500` errors on brief generation with a retry button
- [ ] All requests need `Content-Type: application/json`
- [ ] The `brief` object in the response is the full AE Brief — no additional API calls needed
- [ ] The `enrichment` object in the response is supplementary (Lusha data, web scrape) — use it only if you want to show raw company data

---

## 7. Data sources and confidence labels (display guidance)

The brief is built from three tiers of data. If you want to show data provenance in the UI:

| Source | Label | Confidence |
|--------|-------|------------|
| Internal CRM (deals, contacts, transcripts, notes) | "From your CRM" | High |
| Lusha API | "Enriched via Lusha" | Medium |
| Web scraping / DuckDuckGo | "From public web" | Low |

The AI is instructed to weight these accordingly and flag inferred data. The `rationale` fields in `pain_hypotheses` will often cite the source (e.g., "Based on the Feb 15 transcript...").
