require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

const SPREADSHEET_ID = '1usk5_kJKArQs2PtKqoUG3yxc3t6yftFPBo4L_PaGaQ0';

function buildSheetRow(hubspotDealId, deckContent, dealData = {}) {
  const d = deckContent;
  const now = new Date();
  const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Flatten visibility object to individual columns
  const vis = d.visibility || {};

  return {
    hubspot_deal_id: hubspotDealId,
    client_name: dealData.company_name || d.client_name || '',
    current_month: d.current_month || currentMonth,
    users: d.users || dealData.employee_count || '',
    cost_user_month: d.cost_user_month || '',
    mrr: d.mrr || '',
    ae_name: d.ae_name || 'Gavin',
    ae_role: d.ae_role || 'Account Executive',
    ae_email: d.ae_email || 'gavin@humand.co',

    // Exec summary
    exec_summ_client_context: d.exec_summ_client_context || '',
    exec_summ_humand_value_proposition: d.exec_summ_humand_value_proposition || '',
    exec_summ_humand_credentials: d.exec_summ_humand_credentials || '',
    exec_summ_key_takeway: d.exec_summ_key_takeway || '',
    positioning: d.positioning || '',

    // Context (3)
    context_title_1: d.context_title_1 || '',
    context_description_1: d.context_description_1 || '',
    context_title_2: d.context_title_2 || '',
    context_description_2: d.context_description_2 || '',
    context_title_3: d.context_title_3 || '',
    context_description_3: d.context_description_3 || '',

    // Pain (3)
    pain_title_1: d.pain_title_1 || '',
    pain_description_1: d.pain_description_1 || '',
    pain_title_2: d.pain_title_2 || '',
    pain_description_2: d.pain_description_2 || '',
    pain_title_3: d.pain_title_3 || '',
    pain_description_3: d.pain_description_3 || '',

    // Opportunity (3)
    opportunity_title_1: d.opportunity_title_1 || '',
    opportunity_description_1: d.opportunity_description_1 || '',
    opportunity_title_2: d.opportunity_title_2 || '',
    opportunity_description_2: d.opportunity_description_2 || '',
    opportunity_title_3: d.opportunity_title_3 || '',
    opportunity_description_3: d.opportunity_description_3 || '',

    // Visibility flags
    context_1: vis.context_1 !== undefined ? String(vis.context_1) : 'true',
    context_2: vis.context_2 !== undefined ? String(vis.context_2) : 'true',
    context_3: vis.context_3 !== undefined ? String(vis.context_3) : 'true',
    pain_1: vis.pain_1 !== undefined ? String(vis.pain_1) : 'true',
    pain_2: vis.pain_2 !== undefined ? String(vis.pain_2) : 'true',
    pain_3: vis.pain_3 !== undefined ? String(vis.pain_3) : 'true',
    opportunity_1: vis.opportunity_1 !== undefined ? String(vis.opportunity_1) : 'true',
    opportunity_2: vis.opportunity_2 !== undefined ? String(vis.opportunity_2) : 'true',
    opportunity_3: vis.opportunity_3 !== undefined ? String(vis.opportunity_3) : 'true',

    updated_at: now.toISOString(),
  };
}

async function writeToSheet(hubspotDealId, deckContent, dealData = {}) {
  const rowData = buildSheetRow(hubspotDealId, deckContent, dealData);

  // Column order must match the sheet headers exactly
  const headers = Object.keys(rowData);
  const values = headers.map((h) => rowData[h]);

  // Use googleapis with API key if available, otherwise return row data for manual use
  try {
    const sheets = google.sheets({ version: 'v4' });

    // First, read the sheet to find if this deal_id already exists
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:A',
      key: process.env.GOOGLE_API_KEY,
    });

    const rows = readRes.data.values || [];
    let targetRow = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === String(hubspotDealId)) {
        targetRow = i + 1; // 1-indexed
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
    // Return the data anyway so the frontend can show it
    return {
      success: false,
      error: err.message,
      row: rowData,
      spreadsheet_id: SPREADSHEET_ID,
      note: 'Google Sheets API not configured. Row data returned for manual entry.',
    };
  }
}

async function triggerAppsScript(appsScriptUrl, hubspotDealId) {
  if (!appsScriptUrl) return { triggered: false, reason: 'No Apps Script URL provided' };

  try {
    const response = await axios.post(
      appsScriptUrl,
      { hubspot_deal_id: hubspotDealId },
      { timeout: 30000 }
    );
    return { triggered: true, response: response.data };
  } catch (err) {
    return { triggered: false, error: err.message };
  }
}

module.exports = { writeToSheet, triggerAppsScript, buildSheetRow };
