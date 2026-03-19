require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// ── Role Playbook Library ────────────────────────────────────────────────────
// Each entry covers: what they care about, their KPIs, pitch angle for Humand,
// opening questions, likely objections + responses, and what NOT to do.

const ROLE_PLAYBOOKS = {
  // ── C-Suite ────────────────────────────────────────────────────────────────
  ceo: {
    label: 'CEO / President / Founder',
    keywords: ['ceo', 'chief executive', 'president', 'founder', 'owner', 'managing director', 'general manager'],
    what_they_care_about: [
      'Revenue growth and operational efficiency',
      'Employee productivity and retention',
      'Company culture and employer brand',
      'Scalability without proportional headcount increase',
      'Risk management and compliance',
    ],
    their_kpis: ['Revenue per employee', 'Employee turnover rate', 'Operational margin', 'NPS / employer brand scores'],
    humand_pitch_angle:
      'Position Humand as a strategic enabler — not an HR tool. Frame it as: "Your frontline workforce IS your product. Humand makes sure they show up informed, engaged, and ready." Focus on business outcomes (retention, productivity, scale) not features.',
    opening_questions: [
      'What does your frontline workforce represent in terms of your operational capacity?',
      'How much is employee turnover currently costing you annually?',
      'When you think about scaling operations, what breaks first — people, process, or technology?',
    ],
    discovery_questions: [
      'How do you currently cascade company strategy down to frontline workers?',
      'What\'s your biggest operational bottleneck that\'s people-related?',
      'If you could solve one workforce problem this year, what would it be?',
    ],
    likely_objections: [
      { objection: 'We already have tools for this', response: 'Most companies do — but they were built for desk workers. Humand is built for the 80% of your workforce that doesn\'t sit at a computer. What tool do your drivers/nurses/operators use today?' },
      { objection: 'This is not a priority right now', response: 'Understood. What IS the priority? Usually it\'s retention or productivity — and that\'s exactly what Humand moves the needle on.' },
      { objection: 'Too expensive', response: 'What\'s your current cost per hire? Humand typically pays back in retention alone within the first year.' },
    ],
    red_flags: [
      'Don\'t go into feature details — they don\'t care',
      'Don\'t position it as an "HR platform" — frame as business infrastructure',
      'Don\'t show a product demo cold — anchor to their specific business problem first',
    ],
    engagement_style: 'Direct, strategic, business-outcome focused. No fluff. Lead with ROI.',
  },

  coo: {
    label: 'COO / VP Operations / Head of Operations',
    keywords: ['coo', 'chief operating', 'vp operations', 'head of operations', 'operations director', 'director of operations'],
    what_they_care_about: [
      'Operational efficiency and process standardization',
      'Workforce coordination across sites/shifts',
      'Reducing operational downtime and errors',
      'Compliance and safety protocols reaching workers',
      'Real-time visibility into workforce status',
    ],
    their_kpis: ['OEE / operational efficiency', 'Incident rate', 'Shift fill rate', 'Process adherence %', 'Time to resolve operational issues'],
    humand_pitch_angle:
      'Frame Humand as the operating system for your frontline. "Right now, your supervisors are managing communication through WhatsApp groups and printed checklists. Humand gives you one channel, with delivery confirmation, targeted by site/shift/role." Focus on control, visibility, and standardization.',
    opening_questions: [
      'How do you currently communicate shift changes or safety alerts to workers across your sites?',
      'When something goes wrong operationally, how long does it take to get the right information to the right people?',
      'How do you ensure compliance procedures actually reach your frontline, not just management?',
    ],
    discovery_questions: [
      'How many different tools do your supervisors use to communicate with their teams?',
      'What percentage of your operational issues are caused by communication failures?',
      'How do you handle onboarding for seasonal or part-time workers at scale?',
    ],
    likely_objections: [
      { objection: 'We use WhatsApp / email', response: 'We hear that a lot. The issue isn\'t that those tools don\'t work — it\'s that they\'re not auditable, not segmented, and not built for shift workers. Can you confirm who read a safety update on WhatsApp?' },
      { objection: 'Our supervisors handle communication', response: 'Exactly — and that\'s the bottleneck. Humand doesn\'t replace supervisors, it gives them a professional tool so communication is consistent, trackable, and doesn\'t depend on one person.' },
    ],
    red_flags: [
      'Don\'t lead with "culture" or "engagement" — that\'s not their lens',
      'Don\'t abstract — use operational examples specific to their industry',
      'Don\'t skip the integration question — they\'ll block if it touches their ops systems',
    ],
    engagement_style: 'Pragmatic, process-oriented, skeptical. Show proof, not promises.',
  },

  chro: {
    label: 'CHRO / Chief People Officer / VP People',
    keywords: ['chro', 'chief human resource', 'chief people', 'vp people', 'vp hr', 'head of people', 'people officer'],
    what_they_care_about: [
      'Employee experience and engagement across all worker types',
      'Retention and reducing voluntary turnover',
      'Scalable onboarding that drives time-to-productivity',
      'Building culture in distributed/shift-based organizations',
      'HR compliance and documentation at scale',
    ],
    their_kpis: ['Employee NPS (eNPS)', 'Voluntary turnover rate', 'Time to full productivity', 'Onboarding completion rate', 'Training completion %'],
    humand_pitch_angle:
      'This is your natural champion. Humand solves their biggest unsolved problem: how do you create a great employee experience for workers who never log into a computer? Lead with the employee journey — onboarding, communications, recognition, learning — and show them what it looks like from the worker\'s perspective.',
    opening_questions: [
      'What does the employee experience look like for your frontline workers on day one?',
      'How do you measure engagement for workers who aren\'t at a desk?',
      'What\'s your biggest challenge in building culture across multiple sites or shifts?',
    ],
    discovery_questions: [
      'How are you currently running onboarding for frontline roles — is it standardized across locations?',
      'When you run an engagement survey, what percentage of your frontline actually responds?',
      'How do managers currently recognize good performance for shift workers?',
    ],
    likely_objections: [
      { objection: 'We already have an intranet / LMS', response: 'Intranets and LMS platforms were designed for office workers. What percentage of your frontline workforce logs into it at least once a week? Most companies tell us it\'s under 10%.' },
      { objection: 'We need to check with IT', response: 'Absolutely — we\'ll bring them in. Humand is mobile-first, works on personal devices, and has enterprise-grade security. We\'ve done this integration dozens of times.' },
    ],
    red_flags: [
      'Don\'t position Humand as an HR system of record — it\'s not an HRIS',
      'Don\'t skip the frontline-specific angle — generic "employee experience" tools already exist',
      'Don\'t present without a mobile demo — the UI is a key differentiator',
    ],
    engagement_style: 'Empathetic, vision-led, people-first. They want to believe in the solution. Show them the worker experience first.',
  },

  cfo: {
    label: 'CFO / VP Finance / Finance Director',
    keywords: ['cfo', 'chief financial', 'vp finance', 'finance director', 'head of finance', 'controller'],
    what_they_care_about: [
      'ROI and measurable business impact',
      'Total cost of ownership vs. alternatives',
      'Risk reduction (compliance failures, legal exposure)',
      'Headcount efficiency and cost per FTE',
      'Budget predictability (SaaS pricing, not surprise costs)',
    ],
    their_kpis: ['Cost per hire', 'Revenue per employee', 'Training spend per FTE', 'Compliance penalty exposure', 'HR tech stack consolidation savings'],
    humand_pitch_angle:
      'Build the business case before the meeting. "High turnover in frontline roles costs you 30-50% of annual salary per departure. If Humand reduces turnover by 15%, what does that save you?" Lead with numbers. Have a simple ROI calculator ready.',
    opening_questions: [
      'Have you quantified the cost of your current turnover rate?',
      'How many HR/ops tools are you currently paying for that overlap in functionality?',
      'What\'s your current spend on onboarding and training per new hire?',
    ],
    discovery_questions: [
      'What\'s your all-in cost per hire for frontline roles?',
      'Have you had any compliance issues related to communication or training documentation?',
      'What would a 10% improvement in first-year retention mean in dollar terms for your business?',
    ],
    likely_objections: [
      { objection: 'Too expensive / not in budget', response: 'What\'s the cost of one compliance incident? One unfair dismissal claim? One seasonal onboarding failure? Most of our customers find Humand pays for itself in the first quarter.' },
      { objection: 'We need to see the ROI', response: 'Good — I\'d expect nothing less. Let\'s build the model together. What\'s your current voluntary turnover rate for frontline roles?' },
    ],
    red_flags: [
      'Never pitch to a CFO without a number — they won\'t engage',
      'Don\'t show features — show financial outcomes',
      'Don\'t underestimate procurement complexity — they will involve legal',
    ],
    engagement_style: 'Number-driven, skeptical, risk-aware. Bring data. Be concise.',
  },

  cto_cio: {
    label: 'CTO / CIO / VP Technology / IT Director',
    keywords: ['cto', 'cio', 'chief technology', 'chief information', 'vp technology', 'it director', 'head of it', 'head of technology', 'technology director'],
    what_they_care_about: [
      'Security, compliance, and data privacy (GDPR, SOC2)',
      'Integration with existing tech stack (HRIS, payroll, identity providers)',
      'Scalability and reliability (uptime, performance)',
      'Implementation complexity and IT burden',
      'Vendor stability and support quality',
    ],
    their_kpis: ['System uptime', 'Security incident rate', 'Integration success rate', 'IT ticket volume', 'Vendor compliance certifications'],
    humand_pitch_angle:
      'Position Humand as the easy win, not the scary project. "Mobile-first, deploys in weeks not months, integrates via API with your existing HRIS/AD, works on personal devices so no MDM required." Have your security documentation ready before the meeting.',
    opening_questions: [
      'What\'s your current HRIS/payroll stack? We\'ll need to understand the integration landscape.',
      'What are your security and compliance requirements for employee-facing apps?',
      'Do you manage MDM for frontline devices, or is BYOD your model?',
    ],
    discovery_questions: [
      'Who owns the employee app landscape in your org — IT or HR?',
      'What\'s your SSO/identity provider? We support SAML, Azure AD, Okta.',
      'What\'s your typical deployment timeline expectation for a new app rollout?',
    ],
    likely_objections: [
      { objection: 'Security concerns / data privacy', response: 'Humand is SOC 2 compliant, GDPR-ready, and we\'ve passed security reviews at Fortune 500 companies. I can share our security documentation and arrange a call with our security team.' },
      { objection: 'Integration complexity', response: 'We have pre-built connectors for the major HRIS platforms and a well-documented API. Most integrations take 2-4 weeks. What\'s your core system of record?' },
      { objection: 'We\'re building something internally', response: 'What\'s your timeline and estimated cost? Humand\'s been 8 years in development with 300+ enterprise customers. We can be live in 6 weeks.' },
    ],
    red_flags: [
      'Don\'t skip security before this meeting — they WILL ask',
      'Don\'t oversell integration simplicity — be specific about what\'s supported',
      'Don\'t bring a business outcome pitch — they want technical specs',
    ],
    engagement_style: 'Technical, detail-oriented, risk-averse. Bring docs. Be specific. Don\'t hand-wave.',
  },

  hr_director: {
    label: 'HR Director / HR Manager / HR Business Partner',
    keywords: ['hr director', 'hr manager', 'human resources director', 'human resources manager', 'hrbp', 'hr business partner', 'people manager', 'people director', 'hr lead'],
    what_they_care_about: [
      'Reducing administrative burden and manual HR processes',
      'Onboarding quality and speed for high-volume roles',
      'Compliance documentation and audit readiness',
      'Employee communication that actually reaches workers',
      'Visibility into engagement and sentiment',
    ],
    their_kpis: ['Onboarding completion rate', 'Turnover in first 90 days', 'Training compliance %', 'HR ticket volume', 'Engagement survey participation'],
    humand_pitch_angle:
      'They live the pain daily. Lead with empathy: "How much time per week does your team spend chasing employees for signed documents, managing WhatsApp groups, or re-onboarding people who got lost?" Show the before/after workflow. They need to see themselves in the solution.',
    opening_questions: [
      'Walk me through your current onboarding process for a new frontline hire — from day one to week four.',
      'How do you communicate policy updates to workers who don\'t have a company email?',
      'What\'s your biggest administrative headache right now?',
    ],
    discovery_questions: [
      'How many hours per week does your HR team spend on things that should be automated?',
      'When was the last time you ran an engagement survey, and what was the response rate?',
      'How do you currently track training completion for frontline workers?',
    ],
    likely_objections: [
      { objection: 'We don\'t have the bandwidth to implement this', response: 'We get it — that\'s why our implementation team does the heavy lifting. Most customers are live in 6-8 weeks with minimal IT involvement. What would you need to free up to make this happen?' },
      { objection: 'Employees won\'t use it', response: 'That\'s the most common concern — and the most consistently proven wrong. Our activation rate averages 87% in the first 30 days because the app is genuinely useful to workers, not just management.' },
    ],
    red_flags: [
      'Don\'t pitch to HR if you haven\'t identified their biggest pain first',
      'Don\'t use enterprise/corporate language — they deal with real people daily',
      'Don\'t oversell — HR practitioners are skeptical of vendor promises',
    ],
    engagement_style: 'Practical, empathetic, show-don\'t-tell. Demo the worker experience. Let them imagine their own employees using it.',
  },

  internal_comms: {
    label: 'Internal Communications / Comms Manager',
    keywords: ['internal communications', 'internal comms', 'communications manager', 'communications director', 'comms lead', 'employee communications'],
    what_they_care_about: [
      'Reaching ALL employees — especially those without email',
      'Message segmentation (by site, shift, department, language)',
      'Engagement metrics — did people actually read it?',
      'Content creation workflow and approval processes',
      'Multi-language communication for diverse workforces',
    ],
    their_kpis: ['Message open rate', 'Content engagement rate', 'Employee reach %', 'Multi-language coverage', 'Response to surveys/polls'],
    humand_pitch_angle:
      'This is their dream tool. Show the communications module first — targeted push notifications, read receipts, video, multi-language, content calendar. Emphasize: "You\'ll finally know if the message landed."',
    opening_questions: [
      'What percentage of your workforce doesn\'t have a company email — and how do you reach them today?',
      'When you send an important announcement, how do you know it was actually read?',
      'How do you handle communication in multiple languages across your workforce?',
    ],
    discovery_questions: [
      'How many channels are you currently managing to reach frontline workers (email, WhatsApp, posters, supervisor cascade)?',
      'What\'s your biggest challenge in creating content that frontline workers actually engage with?',
      'Do you have the ability to segment messages by location, shift, or role today?',
    ],
    likely_objections: [
      { objection: 'We use email', response: 'What\'s the open rate for your emails to frontline workers? Most companies tell us it\'s under 20% — because frontline workers don\'t have work email or don\'t check it.' },
    ],
    red_flags: [
      'Don\'t skip the mobile-first angle — it\'s their core problem',
      'Don\'t forget analytics — they NEED to prove impact to leadership',
    ],
    engagement_style: 'Creative, metrics-aware, audience-focused. Show beautiful content examples. Make the demo visual.',
  },

  learning_development: {
    label: 'L&D / Training Manager / Talent Development',
    keywords: ['learning', 'l&d', 'training manager', 'talent development', 'learning development', 'learning officer', 'training director', 'enablement'],
    what_they_care_about: [
      'Training completion rates for compliance and skills',
      'Microlearning and mobile-first content delivery',
      'Certification tracking and renewal management',
      'Skills gap analysis and development pathways',
      'Reducing time away from the floor for training',
    ],
    their_kpis: ['Training completion %', 'Certification renewal rate', 'Time-to-competency for new hires', 'Skills coverage %', 'L&D cost per employee'],
    humand_pitch_angle:
      'Lead with the frontline training problem: "Your workers can\'t leave the floor for 2-hour training sessions. Humand delivers 5-minute microlearning modules on their phone, in their language, during their break." Show a learning path end-to-end.',
    opening_questions: [
      'How do you currently deliver mandatory compliance training to shift workers?',
      'What\'s your training completion rate for frontline roles — and what happens when someone doesn\'t complete?',
      'How do you track which certifications are expiring for field workers?',
    ],
    discovery_questions: [
      'What\'s your current LMS — and what percentage of frontline workers actually log in?',
      'How much does it cost you per employee to run in-person compliance training annually?',
      'When a regulation changes, how quickly can you update and re-certify your frontline?',
    ],
    likely_objections: [
      { objection: 'We already have an LMS', response: 'What\'s the mobile experience like? And what percentage of your frontline workers logs in at least once a month? Most LMS platforms were built for desk workers — Humand is built for the floor.' },
    ],
    red_flags: [
      'Don\'t lead with the full feature list — show one great learning module demo',
      'Don\'t ignore compliance angle — it\'s usually the budget unlock',
    ],
    engagement_style: 'Content-focused, metrics-driven, practical. They want to see the learning experience, not hear about it.',
  },
};

// ── Map job title to playbook ─────────────────────────────────────────────────
function getPlaybookForRole(jobTitle) {
  if (!jobTitle) return null;
  const t = jobTitle.toLowerCase();

  // Match longest keyword first to avoid partial matches (e.g. 'hr director' before 'director')
  const allMatches = [];
  for (const [key, playbook] of Object.entries(ROLE_PLAYBOOKS)) {
    for (const keyword of playbook.keywords) {
      if (t.includes(keyword)) {
        allMatches.push({ key, playbook, matchLength: keyword.length });
      }
    }
  }

  if (allMatches.length > 0) {
    allMatches.sort((a, b) => b.matchLength - a.matchLength);
    const best = allMatches[0];
    return { role_key: best.key, ...best.playbook };
  }

  // Fallback: generic stakeholder profile
  return {
    role_key: 'unknown',
    label: jobTitle,
    what_they_care_about: ['Unclear — research this role before the meeting'],
    humand_pitch_angle: 'Understand their primary mandate before pitching. Ask: "What does success look like in your role this year?"',
    opening_questions: [
      'What are your top priorities for this year?',
      'What does your relationship with frontline workers look like day-to-day?',
    ],
    discovery_questions: ['What would make this a priority for you?'],
    likely_objections: [],
    red_flags: ['Don\'t assume — ask first'],
    engagement_style: 'Curious, open-ended. Let them tell you what matters.',
  };
}

// ── Web intel for role + industry ─────────────────────────────────────────────
async function fetchWebIntelForRole(jobTitle, industry) {
  if (!jobTitle) return null;

  const query = encodeURIComponent(`${jobTitle} ${industry || ''} priorities challenges 2025`);

  const sources = [
    `https://duckduckgo.com/html/?q=${query}`,
  ];

  for (const url of sources) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DealCraftBot/1.0)',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract result snippets from DuckDuckGo HTML
      const snippets = [];
      $('.result__snippet').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) snippets.push(text);
        if (snippets.length >= 5) return false;
      });

      if (snippets.length > 0) {
        return {
          source: 'web_search',
          confidence: 'low',
          confidence_note: 'Public web — directional only, not verified',
          query: `${jobTitle} ${industry} priorities challenges 2025`,
          intel: snippets.join(' | ').slice(0, 1500),
        };
      }
    } catch (_) {
      // continue
    }
  }

  return null;
}

// ── Build full stakeholder profile ───────────────────────────────────────────
async function buildStakeholderProfile(contact, industry) {
  const playbook = getPlaybookForRole(contact.job_title);

  // Extract what we know from internal sources
  const internalSignals = [];
  if (contact.lifecycle_stage) internalSignals.push(`Lifecycle stage: ${contact.lifecycle_stage}`);
  if (contact.stakeholder_type && contact.stakeholder_type !== 'unknown') {
    internalSignals.push(`Pre-classified as: ${contact.stakeholder_type}`);
  }

  return {
    contact_id: contact.id,
    name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
    email: contact.email,
    job_title: contact.job_title,
    stakeholder_type: contact.stakeholder_type || playbook?.role_key || 'unknown',
    internal_signals: internalSignals,
    // Condensed playbook — only the fields the AI needs to act on
    playbook: playbook
      ? {
          humand_pitch_angle: playbook.humand_pitch_angle,
          opening_questions: playbook.opening_questions,
          likely_objections: playbook.likely_objections,
          red_flags: playbook.red_flags,
          engagement_style: playbook.engagement_style,
        }
      : null,
  };
}

// ── Enrich all contacts in a deal ────────────────────────────────────────────
async function buildStakeholderProfiles(contacts, industry) {
  if (!contacts?.length) return [];

  // Cap at 5 contacts to control prompt size
  return Promise.all(contacts.slice(0, 5).map((c) => buildStakeholderProfile(c, industry)));
}

module.exports = { buildStakeholderProfiles, getPlaybookForRole, ROLE_PLAYBOOKS };
