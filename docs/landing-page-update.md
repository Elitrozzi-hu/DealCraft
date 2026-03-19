# DealCraft AI — Landing Page Update Brief

This document is for whoever is updating the DealCraft landing page copy.
It describes what the product does, what's new, and the key messages to communicate.

---

## What DealCraft is

DealCraft is an AI-powered sales intelligence engine built specifically for Humand's Account Executives.

Before a sales meeting, an AE provides a company name or selects an existing deal from the CRM. DealCraft pulls everything known about that prospect — internal CRM data, call transcripts, meeting history, contact profiles — enriches it with external sources, and generates a battle-ready brief in seconds.

The brief tells the AE exactly who they're walking into a meeting with, what that person cares about, what to ask, what not to say, and what the deal strategy should be.

---

## Core value proposition (use this as the headline area)

> **Stop going into meetings unprepared. DealCraft turns your CRM data into a meeting strategy in seconds.**

Supporting lines:
- Every stakeholder profiled. Every objection anticipated. Every question pre-loaded.
- Built for frontline workforce deals — trained on Humand's own deal history.
- From data to strategy in under 60 seconds.

---

## What DealCraft produces (the AE Brief)

When an AE runs DealCraft on a prospect, they receive a structured brief with 8 sections:

### 1. Company Snapshot
A senior-AE-written summary of the company: industry, size, workforce type (frontline/deskless vs office), geographic footprint, and operational structure.

### 2. Deal Velocity
A real-time signal of how engaged the prospect is. Based on number of meetings, call transcripts, CRM notes, and days since last activity. Output: engagement score (0–100), heat level (hot / warm / cold), and a one-sentence action signal.

### 3. Pain Hypotheses
Hypotheses about what the prospect is struggling with — written in the prospect's own language. Each pain includes:
- Confidence level (high / medium / low)
- The rationale (why this pain likely exists, with transcript evidence where available)
- The exact question to validate it in the meeting
- What to do if confirmed (which Humand module to show, what impact to highlight)
- What to do if not confirmed (fallback question + alternative path)

### 4. Recommended Modules
The specific Humand modules most relevant to this prospect, ranked by priority, with a clear explanation of why each one fits.

### 5. Stakeholder Map
A full profile of every contact in the deal — not just their name and title. For each person:
- Their role in the deal (champion / decision maker / influencer / blocker)
- What they personally prioritize and how they're measured
- The exact pitch angle for Humand from their perspective
- Opening questions tailored to them
- Likely objections they'll raise — with prepared responses
- Red flags: what the AE should never say or do with this person
- Quotes and signals extracted from past call transcripts, attributed by name

Missing stakeholders (roles not yet covered in the deal) are flagged with recommended next steps.

### 6. Deal Strategy
- Current sales stage
- Primary positioning recommendation
- Suggested demo flow (step by step)
- Key risks that could kill the deal
- Prioritized next actions with rationale

### 7. Historical Patterns
What Humand's deal history says about prospects like this one — same industry, same company size. Includes real win rate, average deal size, and the most common reasons deals are lost in this segment. Synthesized into two plain-language sentences: what to expect, and what to proactively address.

### 8. Pre/Post Meeting Emails
Draft emails ready to send — a pre-meeting warm-up and a post-meeting follow-up with placeholders.

---

## How it works (for a "How it works" section)

1. **Select a deal or enter a company** — search existing CRM deals or paste a company name/domain
2. **DealCraft enriches the context** — pulls CRM data, call transcripts, contact profiles, and enriches with Lusha and web data
3. **AI generates the brief** — Google Gemini analyzes everything and produces a structured, actionable brief
4. **AE walks in prepared** — with a stakeholder-by-stakeholder strategy, ready questions, and a clear deal plan

---

## Key differentiators (for a "Why DealCraft" section)

- **Stakeholder-first, not company-first.** Most sales tools profile the company. DealCraft profiles every person in the room — with role-specific pitch angles, objection handling, and red flags.
- **Built on your own deal history.** Patterns and win rates come from Humand's actual CRM data, tiered by industry and company size. Not generic benchmarks.
- **Transcript intelligence.** DealCraft reads your past call transcripts and attributes specific concerns and quotes to specific people. The brief knows what Maria said on the last call.
- **Data confidence labels.** Every piece of information is labeled by source: verified (CRM/transcripts), enriched (Lusha), or inferred (web). The AE always knows how much to trust each signal.
- **Speed.** A complete, meeting-ready brief in under 60 seconds.

---

## Tech stack (for a "Built with" or footer section if needed)

- Backend: Node.js / Express
- Database: Supabase (Humand CRM data)
- AI: Google Gemini
- Enrichment: Lusha API
- Integrations: Google Sheets + Apps Script for deck generation

---

## Tone guidance

- Write like a senior salesperson, not a software company
- Specific and direct — avoid vague claims like "powerful AI"
- The target reader is an Account Executive, not a tech buyer
- Emphasize time savings, meeting confidence, and deal outcomes

