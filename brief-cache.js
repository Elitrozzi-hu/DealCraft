require('dotenv').config();
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

// ── Fallback: local JSON file (used if Apps Script URL not configured) ─────────
const CACHE_FILE = path.join(__dirname, 'data', 'cached-briefs.json');

function ensureDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readLocalCache() {
  try {
    ensureDir();
    if (!fs.existsSync(CACHE_FILE)) return [];
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_) { return []; }
}

function writeLocalCache(entries) {
  ensureDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
}

// ── Google Sheets via Apps Script ─────────────────────────────────────────────

async function saveBrief({ company_name, domain, brief, enrichment }) {
  const industry      = brief?.company_snapshot?.industry || null;
  const employee_count = brief?.company_snapshot?.employee_count || null;

  // Try Apps Script first
  if (APPS_SCRIPT_URL) {
    try {
      await axios.post(APPS_SCRIPT_URL, {
        action: 'save_brief',
        company_name,
        domain: domain || null,
        industry,
        employee_count,
        brief,
        enrichment,
      }, { timeout: 15000 });
      console.log(`[Cache] Brief saved to Sheets for "${company_name}"`);
      return;
    } catch (err) {
      console.warn(`[Cache] Sheets save failed, falling back to file: ${err.message}`);
    }
  }

  // Fallback: local JSON file
  const entries = readLocalCache();
  const key     = (company_name || '').toLowerCase().trim();
  const now     = new Date().toISOString();
  const idx     = entries.findIndex(e => e.key === key);
  const entry   = {
    key, company_name, domain: domain || null, industry, employee_count,
    brief, enrichment,
    created_at: idx >= 0 ? entries[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) entries[idx] = entry; else entries.unshift(entry);
  writeLocalCache(entries.slice(0, 10));
  console.log(`[Cache] Brief saved to file for "${company_name}"`);
}

async function getRecent() {
  if (APPS_SCRIPT_URL) {
    try {
      const res = await axios.get(APPS_SCRIPT_URL, { timeout: 10000 });
      return res.data?.entries || [];
    } catch (err) {
      console.warn(`[Cache] Sheets read failed, falling back to file: ${err.message}`);
    }
  }
  return readLocalCache().map(({ brief, enrichment, ...meta }) => meta);
}

async function getByKey(key) {
  if (APPS_SCRIPT_URL) {
    try {
      const res = await axios.get(APPS_SCRIPT_URL, {
        params: { key },
        timeout: 10000,
      });
      if (res.data?.error) return null;
      return res.data;
    } catch (err) {
      console.warn(`[Cache] Sheets getByKey failed, falling back to file: ${err.message}`);
    }
  }
  const entry = readLocalCache().find(e => e.key === key);
  if (!entry) return null;
  return { brief: entry.brief, enrichment: entry.enrichment, updated_at: entry.updated_at };
}

module.exports = { saveBrief, getRecent, getByKey };
