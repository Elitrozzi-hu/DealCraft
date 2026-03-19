const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'data', 'cached-briefs.json');
const MAX_ENTRIES = 10;

function ensureDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readCache() {
  try {
    ensureDir();
    if (!fs.existsSync(CACHE_FILE)) return [];
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function writeCache(entries) {
  ensureDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
}

// Save or update a brief entry (keyed by company_name + domain)
function saveBrief({ company_name, domain, brief, enrichment }) {
  const entries = readCache();
  const key = (company_name || '').toLowerCase().trim();
  const now = new Date().toISOString();

  const existingIdx = entries.findIndex(e => e.key === key);
  const entry = {
    key,
    company_name,
    domain: domain || null,
    industry: brief?.company_snapshot?.industry || null,
    employee_count: brief?.company_snapshot?.employee_count || null,
    brief,
    enrichment,
    created_at: existingIdx >= 0 ? entries[existingIdx].created_at : now,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    entries[existingIdx] = entry;
  } else {
    entries.unshift(entry);
  }

  // Keep only the most recent MAX_ENTRIES
  writeCache(entries.slice(0, MAX_ENTRIES));
  console.log(`[Cache] Saved brief for "${company_name}"`);
}

function getRecent() {
  return readCache();
}

module.exports = { saveBrief, getRecent };
