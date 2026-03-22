require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// Job title keywords that indicate a relevant stakeholder for Humand
const RELEVANT_TITLE_KEYWORDS = [
  'hr', 'human resource', 'people', 'talent', 'culture', 'engagement',
  'employee experience', 'hrbp', 'chief people', 'chro',
  'coo', 'chief operating', 'operations director', 'vp operations', 'head of operations',
  'ceo', 'chief executive', 'president', 'founder', 'general manager',
  'internal comms', 'communications', 'comms director',
  'learning', 'training', 'l&d',
  'cfo', 'chief financial',
];

function isRelevantTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return RELEVANT_TITLE_KEYWORDS.some((k) => t.includes(k));
}

async function enrichWithLusha(domain) {
  try {
    const response = await axios.get('https://api.lusha.com/v2/company', {
      params: { domain },
      headers: { api_key: process.env.LUSHA_API_KEY },
      timeout: 8000,
    });
    const d = response.data?.data || response.data;
    console.log('[Lusha] Company response keys:', JSON.stringify(Object.keys(d)));
    console.log('[Lusha] Company ID candidates:', JSON.stringify({ lushaCompanyId: d.lushaCompanyId, id: d.id, companyId: d.companyId, lushaId: d.lushaId }));
    return {
      source: 'lusha',
      lusha_company_id: d.lushaCompanyId || d.id || d.companyId || d.lushaId || null,
      company_name: d.name || null,
      industry: d.mainIndustry || d.industry || null,
      employee_count: d.employeesInLinkedin || null,
      employee_range: d.employees || null,
      revenue_range: d.revenueRange?.length ? d.revenueRange : null,
      founded: d.founded || null,
      hq_location: d.location?.fullLocation || null,
      description: d.description || null,
      website: d.domain || domain,
      linkedin_url: d.social?.linkedin?.url || null,
    };
  } catch (err) {
    console.warn(`[Lusha] Company failed for "${domain}": ${err.message}`);
    return null;
  }
}

async function searchLushaStakeholders(lushaCompanyId) {
  if (!lushaCompanyId) return [];
  try {
    const response = await axios.get(
      'https://api.lusha.com/v2/company/employees',
      {
        params: { lushaCompanyId: String(lushaCompanyId) },
        headers: { api_key: process.env.LUSHA_API_KEY },
        timeout: 10000,
      }
    );

    const employees = response.data?.data || response.data?.employees || response.data || [];
    if (!Array.isArray(employees)) return [];

    // Filter to relevant stakeholders only
    const relevant = employees.filter((e) => isRelevantTitle(e.jobTitle || e.job_title || e.title));

    return relevant.slice(0, 8).map((e) => ({
      full_name: [e.firstName || e.first_name, e.lastName || e.last_name].filter(Boolean).join(' ') || e.fullName || e.name || null,
      job_title: e.jobTitle || e.job_title || e.title || null,
      linkedin_url: e.linkedinUrl || e.linkedin_url || e.social?.linkedin?.url || null,
      email: e.email || e.emails?.[0]?.email || null,
      phone: e.phone || e.phones?.[0]?.number || null,
      city: e.city || e.location?.city || null,
      country: e.country || e.location?.country || null,
    }));
  } catch (err) {
    if (err.response?.status === 429) {
      console.warn('[Lusha] Rate limit reached for stakeholder search');
    } else {
      console.warn(`[Lusha] Stakeholder search failed: ${err.message}`);
      console.warn(`[Lusha] Status: ${err.response?.status}, Body: ${JSON.stringify(err.response?.data)}`);
      console.warn(`[Lusha] URL called: /v2/company/${lushaCompanyId}/employees`);
    }
    return [];
  }
}

async function scrapeWebsite(domain) {
  const urls = [
    `https://${domain}`,
    `https://www.${domain}`,
    `http://${domain}`,
  ];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DealCraftBot/1.0; +https://humand.co)',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      const title = $('title').text().trim();
      const metaDesc =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';
      const h1 = $('h1').first().text().trim();
      const h2s = $('h2')
        .map((_, el) => $(el).text().trim())
        .get()
        .slice(0, 5)
        .join(' | ');

      // grab some body text
      $('script, style, nav, footer, header').remove();
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);

      return {
        source: 'scrape',
        url,
        title,
        meta_description: metaDesc,
        h1,
        h2s,
        body_excerpt: bodyText,
      };
    } catch (_) {
      // try next url
    }
  }

  console.warn(`[Scraper] Could not scrape domain: ${domain}`);
  return null;
}

async function enrichCompany(domain, companyName) {
  if (!domain && !companyName) {
    return { lusha: null, scrape: null };
  }

  const cleanDomain = domain
    ? domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toLowerCase()
    : null;

  const [lushaData, scrapeData] = await Promise.all([
    cleanDomain ? enrichWithLusha(cleanDomain) : Promise.resolve(null),
    cleanDomain ? scrapeWebsite(cleanDomain) : Promise.resolve(null),
  ]);

  // If we got a Lusha company ID, fetch relevant stakeholders
  let stakeholders = [];
  if (lushaData?.lusha_company_id) {
    stakeholders = await searchLushaStakeholders(lushaData.lusha_company_id);
    if (stakeholders.length) {
      console.log(`[Lusha] Found ${stakeholders.length} relevant stakeholders for ${cleanDomain}`);
    }
  }

  return {
    lusha: lushaData,
    scrape: scrapeData,
    stakeholders: stakeholders.length ? stakeholders : null,
  };
}

module.exports = { enrichCompany, enrichWithLusha, searchLushaStakeholders, scrapeWebsite };
