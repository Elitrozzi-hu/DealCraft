require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabase');
const { enrichCompany } = require('./enrichment');
const { buildStakeholderProfiles } = require('./stakeholder-intel');
const { generateAEBrief, generateDeckContent } = require('./ai-engine');
const { writeToSheet, triggerAppsScript } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Helpers ────────────────────────────────────────────────────────────────

// ── 2. Pre-classify contacts by job title ────────────────────────────────────
const CHAMPION_KEYWORDS = ['hr', 'human resource', 'people', 'talent', 'culture', 'engagement', 'employee experience', 'hrbp', 'chief people'];
const DM_KEYWORDS = ['ceo', 'coo', 'cfo', 'chief', 'president', 'vp', 'vice president', 'director', 'managing director', 'general manager', 'owner', 'founder'];
const INFLUENCER_KEYWORDS = ['manager', 'coordinator', 'specialist', 'analyst', 'consultant', 'lead', 'supervisor', 'communications', 'internal comms', 'learning', 'training', 'ops', 'operations'];
const BLOCKER_KEYWORDS = ['it', 'tech', 'security', 'procurement', 'legal', 'compliance', 'finance', 'cto', 'ciso'];

function classifyContact(jobTitle) {
  if (!jobTitle) return 'unknown';
  const t = jobTitle.toLowerCase();
  if (DM_KEYWORDS.some((k) => t.includes(k))) return 'decision_maker';
  if (CHAMPION_KEYWORDS.some((k) => t.includes(k))) return 'champion';
  if (BLOCKER_KEYWORDS.some((k) => t.includes(k))) return 'blocker';
  if (INFLUENCER_KEYWORDS.some((k) => t.includes(k))) return 'influencer';
  return 'unknown';
}

function classifyContacts(contacts) {
  return contacts.map((c) => ({
    ...c,
    stakeholder_type: classifyContact(c.job_title),
    full_name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || null,
  }));
}

// ── 3. Deal velocity & engagement score ──────────────────────────────────────
function calculateDealVelocity(deal, meetings, transcripts, notes) {
  const now = new Date();

  const createdAt = deal.create_date ? new Date(deal.create_date) : null;
  const lastActivity = deal.last_activity_date
    ? new Date(deal.last_activity_date)
    : deal.notes_last_contacted
    ? new Date(deal.notes_last_contacted)
    : null;
  const lastMeeting = meetings?.[0]?.start_time ? new Date(meetings[0].start_time) : null;

  const daysSinceCreation = createdAt ? Math.round((now - createdAt) / 86400000) : null;
  const daysSinceLastActivity = lastActivity ? Math.round((now - lastActivity) / 86400000) : null;
  const daysSinceLastMeeting = lastMeeting ? Math.round((now - lastMeeting) / 86400000) : null;

  // Engagement score (0–100)
  let score = 0;
  if (meetings?.length >= 5) score += 30;
  else if (meetings?.length >= 2) score += 20;
  else if (meetings?.length >= 1) score += 10;

  if (transcripts?.length >= 3) score += 30;
  else if (transcripts?.length >= 1) score += 20;

  if (notes?.length >= 5) score += 20;
  else if (notes?.length >= 1) score += 10;

  if (daysSinceLastActivity !== null) {
    if (daysSinceLastActivity <= 7) score += 20;
    else if (daysSinceLastActivity <= 30) score += 10;
    else if (daysSinceLastActivity > 90) score -= 20;
  }

  score = Math.max(0, Math.min(100, score));

  const heat = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

  return {
    days_since_creation: daysSinceCreation,
    days_since_last_activity: daysSinceLastActivity,
    days_since_last_meeting: daysSinceLastMeeting,
    meeting_count: meetings?.length || 0,
    transcript_count: transcripts?.length || 0,
    note_count: notes?.length || 0,
    engagement_score: score,
    deal_heat: heat,
    velocity_signal:
      heat === 'hot'
        ? 'High engagement — prospect is actively involved'
        : heat === 'warm'
        ? 'Moderate engagement — deal needs a push'
        : 'Low engagement — deal may be stalling or cold',
  };
}

function getSizeBand(employeeCount) {
  const n = Number(employeeCount);
  if (n <= 50) return { min: 1, max: 50, label: 'SMB (1–50 employees)' };
  if (n <= 200) return { min: 51, max: 200, label: 'Small (51–200 employees)' };
  if (n <= 1000) return { min: 201, max: 1000, label: 'Mid-market (201–1,000 employees)' };
  if (n <= 5000) return { min: 1001, max: 5000, label: 'Mid-enterprise (1,001–5,000 employees)' };
  if (n <= 20000) return { min: 5001, max: 20000, label: 'Enterprise (5,001–20,000 employees)' };
  return { min: 20001, max: 10000000, label: 'Large enterprise (20,000+ employees)' };
}

function extractDomain(deal) {
  const raw =
    deal.domain ||
    deal.website ||
    deal.company_website ||
    deal.company?.domain ||
    '';
  if (!raw) return null;
  return raw.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
}

// Fetch contacts linked to a deal via deal_contacts junction table
async function getDealContacts(dealId) {
  try {
    const { data, error } = await supabase
      .from('deal_contacts')
      .select('contact_id')
      .eq('deal_id', dealId);

    if (error || !data?.length) return [];

    const contactIds = data.map((r) => r.contact_id);
    const { data: contacts, error: err2 } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, job_title, lifecycle_stage, owner_id')
      .in('id', contactIds);

    return err2 ? [] : contacts || [];
  } catch (_) {
    return [];
  }
}

// Fetch meetings linked to a deal via meeting_deals junction table
async function getDealMeetings(dealId) {
  try {
    const { data, error } = await supabase
      .from('meeting_deals')
      .select('meeting_id')
      .eq('deal_id', dealId);

    if (error || !data?.length) return [];

    const meetingIds = data.map((r) => r.meeting_id);
    const { data: meetings, error: err2 } = await supabase
      .from('meetings')
      .select('id, title, start_time, end_time, outcome, body_preview')
      .in('id', meetingIds)
      .order('start_time', { ascending: false })
      .limit(10);

    return err2 ? [] : meetings || [];
  } catch (_) {
    return [];
  }
}

// Fetch call transcripts — full transcript for most recent, summaries for the rest
async function getDealCallTranscripts(dealId) {
  try {
    const { data, error } = await supabase
      .from('call_transcript_deals')
      .select('call_transcript_id')
      .eq('deal_id', dealId);

    if (error || !data?.length) return [];

    const transcriptIds = data.map((r) => r.call_transcript_id);

    // Fetch all with summary
    const { data: transcripts, error: err2 } = await supabase
      .from('call_transcripts')
      .select('id, title, started_at, duration_seconds, summary, transcript, calendar_invitees')
      .in('id', transcriptIds)
      .order('started_at', { ascending: false })
      .limit(5);

    if (err2 || !transcripts?.length) return [];

    // Most recent gets full transcript text, rest get summary only
    return transcripts.map((t, i) => ({
      id: t.id,
      title: t.title,
      started_at: t.started_at,
      duration_seconds: t.duration_seconds,
      summary: t.summary,
      calendar_invitees: t.calendar_invitees,
      // Include full transcript text only for most recent call (index 0)
      full_transcript:
        i === 0 && Array.isArray(t.transcript)
          ? t.transcript
              .map((line) => `[${line.timestamp || ''}] ${line.speaker_name}: ${line.text}`)
              .join('\n')
              .slice(0, 3000) // cap at 3k chars to manage tokens
          : null,
    }));
  } catch (_) {
    return [];
  }
}

// Fetch notes linked to a deal
async function getDealNotes(dealId) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('id, body, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(10);

    return error ? [] : data || [];
  } catch (_) {
    return [];
  }
}

// Get company data for a deal
async function getDealCompany(companyId) {
  if (!companyId) return null;
  try {
    const { data, error } = await supabase
      .from('companies')
      .select(
        'id, name, domain, industry, city, state, country, number_of_employees, annual_revenue, lifecycle_stage, web_technologies, hs_num_decision_makers, hs_num_blockers, hs_total_deal_value, total_active_arr, deal_stage'
      )
      .eq('id', companyId)
      .single();

    return error ? null : data;
  } catch (_) {
    return null;
  }
}

// ── Similarity scoring ────────────────────────────────────────────────────────
// Score a company against target industry + size. Returns 0–4:
//   +2 industry match   +2 exact size band   +1 adjacent size band
function scoreSimilarity(company, targetIndustry, targetSizeBand) {
  let score = 0;
  const industryMatch = targetIndustry &&
    company.industry?.toLowerCase().includes(targetIndustry.toLowerCase());
  if (industryMatch) score += 2;

  if (targetSizeBand && company.number_of_employees) {
    const compBand = getSizeBand(company.number_of_employees);
    if (compBand.label === targetSizeBand.label) {
      score += 2; // exact size band
    } else if (
      compBand.min <= targetSizeBand.max * 2 &&
      compBand.max >= targetSizeBand.min / 2
    ) {
      score += 1; // adjacent size band
    }
  }

  return score;
}

// Build stats summary for a group of deals + their companies
function buildTierStats(deals, companies, tierLabel) {
  if (!deals.length) return null;

  const total = deals.length;
  const won = deals.filter((d) => /won/i.test(d.deal_stage || '')).length;
  const lost = deals.filter((d) => /lost/i.test(d.deal_stage || '')).length;
  const amounts = deals.filter((d) => d.amount > 0).map((d) => Number(d.amount));
  const avgAmount = amounts.length
    ? Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
    : null;
  const sorted = [...amounts].sort((a, b) => a - b);
  const medianAmount = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

  const stageCounts = {};
  deals.forEach((d) => {
    const s = (d.deal_stage || 'unknown').trim();
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });
  const stageDistribution = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => ({ stage, count, pct: Math.round((count / total) * 100) }));

  const noFitReasons = {};
  deals.filter((d) => /lost/i.test(d.deal_stage || '')).forEach((d) => {
    if (d.no_fit_reason) noFitReasons[d.no_fit_reason] = (noFitReasons[d.no_fit_reason] || 0) + 1;
  });
  const topLossReasons = Object.entries(noFitReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count, pct: Math.round((count / (lost || 1)) * 100) }));

  const empCounts = companies.filter((c) => c.number_of_employees).map((c) => c.number_of_employees);
  const avgEmployees = empCounts.length
    ? Math.round(empCounts.reduce((a, b) => a + b, 0) / empCounts.length)
    : null;

  return {
    tier: tierLabel,
    sample_size: total,
    confidence: total >= 20 ? 'high' : total >= 5 ? 'medium' : 'low',
    confidence_note:
      total >= 20
        ? `${total} deals — statistically significant`
        : total >= 5
        ? `${total} deals — directional signal`
        : `${total} deal(s) — anecdotal only`,
    win_rate_pct: total > 0 ? Math.round((won / total) * 100) : null,
    avg_deal_amount: avgAmount,
    median_deal_amount: medianAmount,
    avg_company_employees: avgEmployees,
    stage_distribution: stageDistribution,
    won_count: won,
    lost_count: lost,
    top_loss_reasons: topLossReasons.length ? topLossReasons : null,
  };
}

// Find and tier similar deals by industry + size simultaneously
async function findSimilarDeals(industry, excludeDealId, employeeCount = null) {
  if (!industry && !employeeCount) return { tiers: null };

  try {
    const targetSizeBand = employeeCount ? getSizeBand(employeeCount) : null;

    // Fetch ALL companies — we'll score each one
    const { data: allCompanies, error } = await supabase
      .from('companies')
      .select('id, name, industry, number_of_employees, annual_revenue, lifecycle_stage');

    if (error || !allCompanies?.length) return { tiers: null };

    // Score every company
    const scored = allCompanies.map((c) => ({
      ...c,
      similarity_score: scoreSimilarity(c, industry, targetSizeBand),
    }));

    // Bucket into tiers
    // Tier 1 (score 4): same industry + same size band  → strongest signal
    // Tier 2 (score 3): same industry + adjacent size   → strong signal
    // Tier 3 (score 2): same industry only OR same size only → moderate signal
    // Tier 4 (score 1): adjacent size only              → weak signal
    const tier1Companies = scored.filter((c) => c.similarity_score === 4);
    const tier2Companies = scored.filter((c) => c.similarity_score === 3);
    const tier3Companies = scored.filter((c) => c.similarity_score === 2);
    const tier4Companies = scored.filter((c) => c.similarity_score === 1);

    // Fetch deals for all non-zero-scored companies in one query
    const relevantIds = scored.filter((c) => c.similarity_score > 0).map((c) => c.id);
    if (!relevantIds.length) return { tiers: null };

    let dealsQuery = supabase
      .from('deals')
      .select('id, deal_name, deal_stage, amount, close_date, company_id, hs_deal_score, no_fit_reason')
      .in('company_id', relevantIds);
    if (excludeDealId) dealsQuery = dealsQuery.neq('id', excludeDealId);

    const { data: allDeals } = await dealsQuery;
    if (!allDeals?.length) return { tiers: null };

    const companyMap = Object.fromEntries(allCompanies.map((c) => [c.id, c]));

    function dealsForCompanies(companyList) {
      const ids = new Set(companyList.map((c) => c.id));
      return allDeals.filter((d) => ids.has(d.company_id));
    }

    function sampleDeals(deals, companies, limit = 5) {
      return deals.slice(0, limit).map((d) => {
        const c = companyMap[d.company_id] || {};
        return {
          company_name: c.name,
          industry: c.industry,
          employee_count: c.number_of_employees,
          deal_stage: d.deal_stage,
          amount: d.amount,
        };
      });
    }

    const t1Deals = dealsForCompanies(tier1Companies);
    const t2Deals = dealsForCompanies(tier2Companies);
    const t3Deals = dealsForCompanies(tier3Companies);
    const t4Deals = dealsForCompanies(tier4Companies);

    const tiers = {
      matching_criteria: {
        industry: industry || null,
        size_band: targetSizeBand?.label || null,
        employee_count: employeeCount || null,
      },
      tier_1_exact: t1Deals.length ? {
        description: `Same industry (${industry}) + same size band (${targetSizeBand?.label})`,
        weight: 'PRIMARY — use for confident assertions',
        stats: buildTierStats(t1Deals, tier1Companies, 'tier_1_exact'),
        sample_deals: sampleDeals(t1Deals, tier1Companies),
      } : null,
      tier_2_strong: t2Deals.length ? {
        description: `Same industry (${industry}) + adjacent size band`,
        weight: 'STRONG — directional, qualify with "tends to"',
        stats: buildTierStats(t2Deals, tier2Companies, 'tier_2_strong'),
        sample_deals: sampleDeals(t2Deals, tier2Companies),
      } : null,
      tier_3_moderate: t3Deals.length ? {
        description: industry && targetSizeBand
          ? `Same industry OR same size band only`
          : industry
          ? `Same industry (${industry}), size unknown`
          : `Same size band (${targetSizeBand?.label}), industry unknown`,
        weight: 'MODERATE — use as supporting context only',
        stats: buildTierStats(t3Deals, tier3Companies, 'tier_3_moderate'),
      } : null,
      tier_4_weak: t4Deals.length ? {
        description: `Adjacent size band only`,
        weight: 'WEAK — anecdotal, only use if no better tier available',
        stats: buildTierStats(t4Deals, tier4Companies, 'tier_4_weak'),
      } : null,
    };

    return { tiers };
  } catch (_) {
    return { tiers: null };
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DealCraft API',
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      google_ai: !!process.env.GOOGLE_API_KEY,
      lusha: !!process.env.LUSHA_API_KEY,
    },
  });
});

// Debug — inspect tables
app.get('/api/debug/tables', async (req, res) => {
  const tables = ['deals', 'contacts', 'companies', 'call_transcripts', 'meetings', 'notes', 'deal_contacts', 'meeting_deals', 'call_transcript_deals'];
  const results = {};

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);

    if (!error) {
      results[table] = {
        columns: data?.[0] ? Object.keys(data[0]) : [],
        row_count: count,
      };
    } else {
      results[table] = { error: error.message };
    }
  }

  res.json({ tables: results });
});

// List deals — joined with company for industry/size
app.get('/api/deals', async (req, res) => {
  try {
    const { search, limit = 80 } = req.query;

    let query = supabase
      .from('deals')
      .select('id, deal_name, deal_stage, amount, close_date, company_id')
      .limit(Number(limit))
      .order('id', { ascending: false });

    const { data: deals, error } = await query;
    if (error) throw error;

    // Enrich with company data
    const companyIds = [...new Set((deals || []).map((d) => d.company_id).filter(Boolean))];
    let companiesMap = {};

    if (companyIds.length) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, domain, industry, number_of_employees, city, country')
        .in('id', companyIds);

      (companies || []).forEach((c) => { companiesMap[c.id] = c; });
    }

    let enriched = (deals || []).map((d) => {
      const company = companiesMap[d.company_id] || {};
      return {
        ...d,
        company_name: company.name || d.deal_name?.split(' - ')[0] || 'Unknown',
        industry: company.industry || null,
        domain: company.domain || null,
        employee_count: company.number_of_employees || null,
        location: company.city ? `${company.city}, ${company.country || ''}`.trim() : null,
        display_name: company.name || d.deal_name || 'Unknown',
        display_stage: d.deal_stage || 'unknown',
      };
    });

    // Filter by search if provided
    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (d) =>
          d.display_name?.toLowerCase().includes(q) ||
          d.deal_name?.toLowerCase().includes(q) ||
          d.industry?.toLowerCase().includes(q)
      );
    }

    res.json({ deals: enriched, count: enriched.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single deal — full context
app.get('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deal, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    // Fetch all related data in parallel
    const [company, contacts, meetings, transcripts, notes] = await Promise.all([
      getDealCompany(deal.company_id),
      getDealContacts(id),
      getDealMeetings(id),
      getDealCallTranscripts(id),
      getDealNotes(id),
    ]);

    res.json({ deal: { ...deal, company, contacts, meetings, call_transcripts: transcripts, notes } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contacts for a deal
app.get('/api/deals/:id/contacts', async (req, res) => {
  try {
    const contacts = await getDealContacts(req.params.id);
    res.json({ contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enrich a company
app.post('/api/enrich', async (req, res) => {
  try {
    const { domain, company_name } = req.body;
    if (!domain && !company_name) {
      return res.status(400).json({ error: 'domain or company_name required' });
    }
    const enrichData = await enrichCompany(domain, company_name);
    res.json({ enrichment: enrichData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Build full deal context for AI
async function buildDealContext(dealId, extraDealData = {}) {
  let dealData = { ...extraDealData };
  let contacts = [];
  let transcripts = [];
  let meetings = [];
  let notes = [];

  if (dealId) {
    const { data: deal, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (!error && deal) {
      const [company, dealContacts, dealMeetings, dealTranscripts, dealNotes] = await Promise.all([
        getDealCompany(deal.company_id),
        getDealContacts(dealId),
        getDealMeetings(dealId),
        getDealCallTranscripts(dealId),
        getDealNotes(dealId),
      ]);

      dealData = {
        ...deal,
        company,
        ...extraDealData,
      };

      contacts = dealContacts;
      meetings = dealMeetings;
      transcripts = dealTranscripts;
      notes = dealNotes;
    }
  }

  // ── 2. Pre-classify contacts + build stakeholder profiles ────────────────
  if (contacts.length) {
    const classifiedContacts = classifyContacts(contacts);
    dealData.contacts = classifiedContacts;

    // Build full stakeholder profiles (playbook + web intel)
    const industry = dealData.company?.industry || dealData.industry || '';
    dealData.stakeholder_profiles = await buildStakeholderProfiles(classifiedContacts, industry);
  }

  // ── 3. Deal velocity & engagement score ──────────────────────────────────
  dealData.deal_velocity = calculateDealVelocity(dealData, meetings, transcripts, notes);

  // ── 4. Call transcripts — full for most recent, summary for rest ──────────
  if (transcripts.length) {
    dealData.call_transcripts = transcripts.map((t) => ({
      title: t.title,
      date: t.started_at,
      duration_min: t.duration_seconds ? Math.round(t.duration_seconds / 60) : null,
      summary: t.summary,
      attendees: t.calendar_invitees,
      ...(t.full_transcript ? { full_transcript_most_recent: t.full_transcript } : {}),
    }));
  }

  // ── 5. CRM Notes ─────────────────────────────────────────────────────────
  if (notes.length) {
    dealData.crm_notes = notes.map((n) => ({
      body: n.body,
      created_at: n.created_at,
    }));
  }

  if (meetings.length) dealData.meetings = meetings;

  return dealData;
}

// Generate AE Brief
app.post('/api/brief', async (req, res) => {
  try {
    const { deal_id, deal_data, additional_context } = req.body;

    if (!deal_id && !deal_data?.company_name && !deal_data?.company) {
      return res.status(400).json({ error: 'deal_id or deal_data with company info required' });
    }

    const dealData = await buildDealContext(deal_id, deal_data || {});

    if (additional_context) dealData.additional_context = additional_context;

    // Enrich with Lusha + scraping
    const domain = extractDomain(dealData);
    const enrichData = await enrichCompany(domain, dealData.company?.name || dealData.company_name);

    // Determine industry for similar deals search
    const industry =
      dealData.company?.industry ||
      dealData.industry ||
      enrichData?.lusha?.industry;

    const employeeCount = dealData.company?.number_of_employees || enrichData?.lusha?.employee_count;
    const { tiers } = await findSimilarDeals(industry, dealData.id, employeeCount);

    const brief = await generateAEBrief(dealData, enrichData, { tiers });

    // Inject deal_velocity server-side — no need for the AI to regenerate it
    if (dealData.deal_velocity) {
      brief.deal_velocity = {
        ...dealData.deal_velocity,
        recommended_urgency:
          dealData.deal_velocity.deal_heat === 'hot' ? 'act now' :
          dealData.deal_velocity.deal_heat === 'warm' ? 'follow up soon' :
          dealData.deal_velocity.days_since_last_activity > 60 ? 're-engage' : 'nurture',
      };
    }

    res.json({ brief, enrichment: enrichData });
  } catch (err) {
    console.error('[/api/brief]', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate deck content
app.post('/api/deck', async (req, res) => {
  try {
    const { brief, deal_data } = req.body;
    if (!brief) return res.status(400).json({ error: 'brief is required' });

    const dealData = deal_data || {};
    const deckContent = await generateDeckContent(brief, dealData);
    const dealId = dealData.id || `new_${Date.now()}`;

    const sheetResult = await writeToSheet(dealId, deckContent, dealData, brief);

    let scriptResult = null;
    const scriptUrl = process.env.APPS_SCRIPT_URL;
    if (scriptUrl) {
      // Send full row data so Apps Script can write to sheet itself
      const rowData = sheetResult.row || {};
      scriptResult = await triggerAppsScript(scriptUrl, dealId, rowData);
    }

    res.json({ deck_content: deckContent, sheet: sheetResult, apps_script: scriptResult, deal_id: dealId });
  } catch (err) {
    console.error('[/api/deck]', err);
    res.status(500).json({ error: err.message });
  }
});

// Full pipeline
app.post('/api/generate', async (req, res) => {
  try {
    const { deal_id, deal_data, additional_context, generate_deck = false } = req.body;

    if (!deal_id && !deal_data?.company_name && !deal_data?.company) {
      return res.status(400).json({ error: 'deal_id or deal_data with company info required' });
    }

    const dealData = await buildDealContext(deal_id, deal_data || {});
    if (additional_context) dealData.additional_context = additional_context;

    const domain = extractDomain(dealData);
    const enrichData = await enrichCompany(domain, dealData.company?.name || dealData.company_name);

    const industry =
      dealData.company?.industry ||
      dealData.industry ||
      enrichData?.lusha?.industry;

    const employeeCount = dealData.company?.number_of_employees || enrichData?.lusha?.employee_count;
    const { tiers } = await findSimilarDeals(industry, dealData.id, employeeCount);
    const brief = await generateAEBrief(dealData, enrichData, { tiers });

    if (dealData.deal_velocity) {
      brief.deal_velocity = {
        ...dealData.deal_velocity,
        recommended_urgency:
          dealData.deal_velocity.deal_heat === 'hot' ? 'act now' :
          dealData.deal_velocity.deal_heat === 'warm' ? 'follow up soon' :
          dealData.deal_velocity.days_since_last_activity > 60 ? 're-engage' : 'nurture',
      };
    }

    let deckResult = null;
    if (generate_deck) {
      const deckContent = await generateDeckContent(brief, dealData);
      const dealId = dealData.id || `new_${Date.now()}`;
      const sheetResult = await writeToSheet(dealId, deckContent, dealData, brief);
      let scriptResult = null;
      const scriptUrl = process.env.APPS_SCRIPT_URL;
      if (scriptUrl) scriptResult = await triggerAppsScript(scriptUrl, dealId, sheetResult.row || {});
      deckResult = { deck_content: deckContent, sheet: sheetResult, apps_script: scriptResult };
    }

    res.json({ brief, enrichment: enrichData, deck: deckResult });
  } catch (err) {
    console.error('[/api/generate]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ DealCraft API running on http://localhost:${PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✓' : '✗ missing'}`);
  console.log(`   Google AI: ${process.env.GOOGLE_API_KEY ? '✓' : '✗ missing'}`);
  console.log(`   Lusha: ${process.env.LUSHA_API_KEY ? '✓' : '✗ missing'}`);
});
