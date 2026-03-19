require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

async function enrichWithLusha(domain) {
  try {
    const response = await axios.get('https://api.lusha.com/company', {
      params: { domain },
      headers: { api_key: process.env.LUSHA_API_KEY },
      timeout: 8000,
    });
    const d = response.data;
    return {
      source: 'lusha',
      company_name: d.name || null,
      industry: d.industry || null,
      employee_count: d.employeeCount || d.employee_count || null,
      employee_range: d.employeeCountRange || null,
      revenue: d.revenue || null,
      founded: d.founded || null,
      hq_location: d.hqCity
        ? `${d.hqCity}, ${d.hqCountry || ''}`.trim()
        : d.hqCountry || null,
      description: d.description || null,
      website: d.website || domain,
      linkedin_url: d.linkedinUrl || null,
    };
  } catch (err) {
    console.warn(`[Lusha] Failed for domain "${domain}": ${err.message}`);
    return null;
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

  return { lusha: lushaData, scrape: scrapeData };
}

module.exports = { enrichCompany, enrichWithLusha, scrapeWebsite };
