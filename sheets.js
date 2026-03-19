require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

const SPREADSHEET_ID = '1usk5_kJKArQs2PtKqoUG3yxc3t6yftFPBo4L_PaGaQ0';

// ─── Pricing constants (demo values) ─────────────────────────────────────────
const COST_USER_MONTH = 1.5;
const COST_U_M_A = 1.5;
const COST_U_M_B = 1.0;
const DISC_PCT = 0.25;

// ─── All module slide keys (order matches sheet) ──────────────────────────────
const ALL_MODULE_SLIDES = [
  'feed_groups', 'magazine', 'documents_signature', 'kudos', 'profile_directory',
  'surveys', 'forms_workflows', 'training', 'onboarding', 'files', 'widgets',
  'intranet', 'time_off', 'org_chart', 'marketplace', 'performance_review',
  'employee_dev', 'birthdays_anniv', 'time_tracking', 'people_exp', 'goals',
  'live_streaming', 'videocalls', 'service_mgmt',
];

// Keywords to match module names from the AI brief → slide key
const MODULE_KEYWORD_MAP = {
  feed_groups:           ['feed', 'social', 'communications', 'communication', 'internal channel', 'news', 'updates', 'community'],
  magazine:              ['magazine', 'editorial', 'content hub'],
  documents_signature:   ['document', 'signature', 'sign', 'acknowledgment'],
  kudos:                 ['kudos', 'recognition', 'award', 'culture', 'peer recognition'],
  profile_directory:     ['directory', 'profile', 'people directory', 'employee directory'],
  surveys:               ['survey', 'poll', 'feedback', 'sentiment', 'pulse'],
  forms_workflows:       ['form', 'workflow', 'process', 'digitization', 'request', 'approval', 'digitalization'],
  training:              ['training', 'learning', 'l&d', 'development course', 'e-learning'],
  onboarding:            ['onboarding', 'new hire', 'new employee'],
  files:                 ['files', 'file storage', 'file management'],
  widgets:               ['widget', 'dashboard', 'home screen', 'quick access'],
  intranet:              ['intranet', 'knowledge base', 'information hub', 'knowledge management'],
  time_off:              ['time off', 'pto', 'leave', 'vacation', 'absence', 'time-off'],
  org_chart:             ['org chart', 'organizational chart', 'hierarchy', 'org structure'],
  marketplace:           ['marketplace', 'benefits', 'perks', 'employee marketplace'],
  performance_review:    ['performance', 'review', 'appraisal', 'evaluation', 'performance management'],
  employee_dev:          ['employee dev', 'career', 'growth', 'competencies', 'career development'],
  birthdays_anniv:       ['birthday', 'anniversary', 'milestone', 'celebration'],
  time_tracking:         ['time tracking', 'attendance', 'clock in', 'clock-in', 'shift tracking', 'timesheet'],
  people_exp:            ['people experience', 'employee experience', 'engagement', 'people exp'],
  goals:                 ['goals', 'okr', 'objectives', 'kpi', 'goal setting'],
  live_streaming:        ['streaming', 'live stream', 'broadcast', 'town hall', 'live event'],
  videocalls:            ['video call', 'video meeting', 'video conference', 'videocall'],
  service_mgmt:          ['service management', 'ticketing', 'helpdesk', 'help desk', 'it support', 'hr ticket', 'internal ticket', 'service desk'],
};

// ─── Pricing slide options ────────────────────────────────────────────────────
const PRICING_SLIDE_KEYS = [
  'single_pricing', 'alternative_pricing',
  'single_urgency_pricing', 'alternative_urgency_pricing',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatCurrency(value) {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// Returns dd/mm/yyyy
function formatDateDMY(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// Returns e.g. "April and May"
function pilotMonthsText(fromDate) {
  const m1 = addMonths(fromDate, 1);
  const m2 = addMonths(fromDate, 2);
  return `${MONTHS_EN[m1.getMonth()]} and ${MONTHS_EN[m2.getMonth()]}`;
}

// Match recommended_modules array from brief → top-5 slide keys
function resolveModuleSlides(recommendedModules) {
  if (!Array.isArray(recommendedModules) || !recommendedModules.length) return {};

  const matched = new Set();

  for (const mod of recommendedModules) {
    if (matched.size >= 5) break;

    // Normalize the module name/description to lowercase for matching
    const needle = [
      mod.module_name || '',
      mod.why_relevant || '',
      mod.name || '',
    ].join(' ').toLowerCase();

    for (const [slideKey, keywords] of Object.entries(MODULE_KEYWORD_MAP)) {
      if (matched.has(slideKey)) continue;
      if (keywords.some((kw) => needle.includes(kw))) {
        matched.add(slideKey);
        break;
      }
    }
  }

  const result = {};
  ALL_MODULE_SLIDES.forEach((key) => {
    result[`show_slide_${key}`] = matched.has(key) ? 'true' : 'false';
  });
  return result;
}

// Pick one pricing slide at random; set rest to false
function resolvePricingSlide() {
  const chosen = PRICING_SLIDE_KEYS[Math.floor(Math.random() * PRICING_SLIDE_KEYS.length)];
  const result = {};
  PRICING_SLIDE_KEYS.forEach((key) => {
    result[`show_slide_${key}`] = key === chosen ? 'true' : 'false';
  });
  return result;
}

// ─── Build row ────────────────────────────────────────────────────────────────

function buildSheetRow(hubspotDealId, deckContent, dealData = {}, briefData = {}) {
  const { visibility, ...aiFields } = deckContent;
  const now = new Date();

  // ── Users / pricing ───────────────────────────────────────────────────────
  const users = Number(
    dealData.company?.number_of_employees ||
    dealData.employee_count ||
    0
  );

  const mrr       = users ? formatCurrency(COST_USER_MONTH * users) : '';
  const mrr_a     = users ? formatCurrency(COST_U_M_A * users)      : '';
  const mrr_b     = users ? formatCurrency(COST_U_M_B * users)      : '';

  const cost_u_m_disc   = formatCurrency(COST_USER_MONTH * (1 - DISC_PCT));
  const cost_u_m_disc_a = formatCurrency(COST_U_M_A     * (1 - DISC_PCT));
  const cost_u_m_disc_b = formatCurrency(COST_U_M_B     * (1 - DISC_PCT));
  const mrr_disc        = users ? formatCurrency(COST_USER_MONTH * (1 - DISC_PCT) * users) : '';
  const mrr_disc_a      = users ? formatCurrency(COST_U_M_A     * (1 - DISC_PCT) * users) : '';
  const mrr_disc_b      = users ? formatCurrency(COST_U_M_B     * (1 - DISC_PCT) * users) : '';

  // ── Dates ─────────────────────────────────────────────────────────────────
  const urgencyDate = addMonths(now, 1);

  // ── Module + pricing slides ───────────────────────────────────────────────
  const moduleSlides  = resolveModuleSlides(briefData?.recommended_modules);
  const pricingSlides = resolvePricingSlide();

  const row = {
    hubspot_deal_id: hubspotDealId,

    // ── From deal / CRM data ────────────────────────────────────────────────
    client_name:   dealData.company_name || dealData.company?.name || String(hubspotDealId),
    logo:          dealData.logo || dealData.company?.logo || '',
    current_month: `${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}`,

    // ── AI-generated fields ─────────────────────────────────────────────────
    ...aiFields,

    // ── Module slides (24 keys, all set explicitly) ─────────────────────────
    ...moduleSlides,

    // ── Pricing slide (1 of 4 randomly chosen) ──────────────────────────────
    ...pricingSlides,

    // ── Pilot slide ──────────────────────────────────────────────────────────
    show_slide_pilot: 'true',

    // ── Pricing values ───────────────────────────────────────────────────────
    cost_user_month: COST_USER_MONTH,
    users:           users || '',
    mrr,
    cost_u_m_a:  COST_U_M_A,
    cost_u_m_b:  COST_U_M_B,
    users_a:     users || '',
    users_b:     users || '',
    mrr_a,
    mrr_b,
    disc:        '25%',
    cost_u_m_disc,
    mrr_disc,
    urgency_date: formatDateDMY(urgencyDate),
    cost_u_m_disc_a,
    cost_u_m_disc_b,
    mrr_disc_a,
    mrr_disc_b,

    // ── Pilot ────────────────────────────────────────────────────────────────
    pilot_time:        '2-month',
    pilot_months_text: pilotMonthsText(now),

    // ── Static Humand credentials ────────────────────────────────────────────
    active_clients: '1,500+',
    paying_users:   '1.5M+',
    countries:      '40+',
    employees:      '200+',
    mini_apps_q:    '20+',
    native_int_q:   '20+',
    other_int_q:    '8,000+',

    // ── AE contact info ───────────────────────────────────────────────────────
    ae_name:  dealData.ae_name  || 'Gavin',
    ae_role:  dealData.ae_role  || 'Account Executive',
    ae_email: dealData.ae_email || 'gavin@humand.co',
    ae_phone: dealData.ae_phone || '',
  };

  // ── Flatten visibility → show_slide_context/pain/opportunity ───────────────
  if (visibility) {
    Object.entries(visibility).forEach(([key, val]) => {
      row[`show_slide_${key}`] = String(val);
    });
  }

  return row;
}

// ─── Write to Google Sheets ───────────────────────────────────────────────────

async function writeToSheet(hubspotDealId, deckContent, dealData = {}, briefData = {}) {
  const rowData = buildSheetRow(hubspotDealId, deckContent, dealData, briefData);

  const headers = Object.keys(rowData);
  const values  = headers.map((h) => rowData[h]);

  try {
    const sheets = google.sheets({ version: 'v4' });

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:A',
      key: process.env.GOOGLE_API_KEY,
    });

    const rows = readRes.data.values || [];
    let targetRow = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === String(hubspotDealId)) {
        targetRow = i + 1;
        break;
      }
    }

    const range = targetRow
      ? `Sheet1!A${targetRow}`
      : `Sheet1!A${rows.length + 1}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      key: process.env.GOOGLE_API_KEY,
      requestBody: { values: [values] },
    });

    return { success: true, row: rowData, spreadsheet_id: SPREADSHEET_ID };
  } catch (err) {
    console.warn('[Sheets] Google API write failed, returning row data:', err.message);
    return {
      success: false,
      error: err.message,
      row: rowData,
      spreadsheet_id: SPREADSHEET_ID,
      note: 'Google Sheets API not configured. Row data returned for manual entry.',
    };
  }
}

// ─── Trigger Apps Script ──────────────────────────────────────────────────────

async function triggerAppsScript(appsScriptUrl, hubspotDealId, rowData = {}) {
  if (!appsScriptUrl) return { triggered: false, reason: 'No Apps Script URL provided' };

  try {
    const response = await axios.post(
      appsScriptUrl,
      { hubspot_deal_id: hubspotDealId, ...rowData },
      { timeout: 60000 }
    );
    return { triggered: true, response: response.data };
  } catch (err) {
    return { triggered: false, error: err.message };
  }
}

module.exports = { writeToSheet, triggerAppsScript, buildSheetRow };
