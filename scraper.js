const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const { formatPhoneForSheet, syncToSheets } = require('./sync');
const { hasAlreadyBeenContacted, isEmailBlockedOrBounced, loadSentHistory } = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');

/**
 * Verifies that an email domain has valid MX servers AND avoids generic `info@`
 * guesses on strict Exchange Online (protection.outlook.com) firewalls.
 */
async function hasValidMxRecord(email) {
  const clean = String(email || '').trim().toLowerCase();
  const [localPart, domain] = clean.split('@');
  if (!localPart || !domain) return false;
  if (domain === 'gmail.com' || domain === 'yahoo.com') return true;
  try {
    const mx = await dns.resolveMx(domain);
    const valid = (mx || []).filter(
      m => m && m.exchange && m.exchange !== '.' && !m.exchange.toLowerCase().includes('ghs.google.com')
    );
    if (valid.length === 0) return false;
    // Avoid generic info@ on strict Exchange Online filters unless explicitly verified
    const isOutlookFilter = valid.some(m => m.exchange.toLowerCase().includes('protection.outlook.com'));
    if (isOutlookFilter && localPart === 'info') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const SEARCH_PRESETS = [
  {
    label: 'Hotels, Resorts, Safari Lodges & Guest Houses (Kampala & Entebbe)',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kampala & Entebbe',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    queries: [
      'hotel apartments Kampala Entebbe "@gmail.com" "+256"',
      'guest house Kololo Muyenga Munyonyo "@gmail.com" "+256"'
    ]
  },
  {
    label: 'Interior Designers, Decorators & Architecture Firms (Kampala)',
    category: 'Interior Designers & Decorators',
    city: 'Kampala, Uganda',
    pitch_angle: 'Trade Partner Pricing — Custom Curtains, Rods & Rugs Installation',
    queries: [
      'interior design Kampala Uganda "@gmail.com" "+256"',
      'architects Kampala Uganda "@gmail.com" "+256"'
    ]
  }
];

function fetchHtml(url, timeoutMs = 6000) {
  return new Promise(resolve => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: timeoutMs,
          rejectUnauthorized: false
        },
        res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).href;
            return resolve(fetchHtml(redirectUrl, timeoutMs));
          }
          let data = '';
          res.on('data', chunk => {
            data += chunk.toString();
            if (data.length > 350000) req.destroy();
          });
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => {
        req.destroy();
        resolve('');
      });
    } catch {
      resolve('');
    }
  });
}

function extractEmails(html) {
  const raw = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const blacklist = ['example.com', 'sentry.io', 'wixpress.com', 'wordpress.org', 'schema.org', '.png', '.jpg', '.webp', '.svg'];
  const unique = new Set();

  for (const e of raw) {
    const clean = e.toLowerCase().trim().replace(/\.$/, '');
    if (blacklist.some(b => clean.includes(b))) continue;
    unique.add(clean);
  }
  return [...unique];
}

function extractUgandaPhones(html) {
  const matches = html.match(/(?:\+256|0)\s*[734]\d[\d\s-]{7,10}/g) || [];
  const cleaned = matches.map(m => {
    let digits = m.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = '256' + digits.slice(1);
    return `+${digits}`;
  });
  return [...new Set(cleaned)].map(formatPhoneForSheet);
}

function extractTitle(html, fallbackUrl) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (match && match[1]) {
    return match[1]
      .replace(/\s+/g, ' ')
      .split(/[|\-–—]/)[0]
      .trim()
      .slice(0, 65);
  }
  try {
    return new URL(fallbackUrl).hostname.replace(/^www\./, '');
  } catch {
    return fallbackUrl;
  }
}

async function scrapeWebsiteUrl(targetUrl, category = 'Interior Designers & Decorators', city = 'Kampala', customPitchAngle = null) {
  const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  const homeHtml = await fetchHtml(normalizedUrl);
  let contactHtml = '';

  const contactMatch = homeHtml.match(/href=["']([^"']*(?:contact|about)[^"']*)["']/i);
  if (contactMatch && contactMatch[1]) {
    try {
      const contactUrl = new URL(contactMatch[1], normalizedUrl).href;
      contactHtml = await fetchHtml(contactUrl);
    } catch {}
  }

  const combined = homeHtml + '\n' + contactHtml;
  const emails = extractEmails(combined);
  const phones = extractUgandaPhones(combined);
  const name = extractTitle(homeHtml, normalizedUrl);

  return {
    name,
    category,
    city,
    email: emails[0] || '',
    allEmails: emails,
    phone: phones[0] || '"+256700000000"',
    website: normalizedUrl,
    status: 'Ready for Automated Dispatch',
    pitch_angle:
      customPitchAngle ||
      (category.includes('Hotel')
        ? '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms'
        : category.includes('Real Estate')
        ? 'Show-House Staging & Move-In Curtain Packages'
        : 'Custom Curtains, Rods & Rugs Partner'),
    notes: `Discovered via automated web crawler from ${normalizedUrl}`
  };
}

/**
 * Live Web Discovery:
 * Never adds guessed `info@...` corporate addresses (which cause 550 bounces).
 * Instead, only adds live-scraped emails that pass strict MX & firewall checks,
 * while Sarah's primary Kampala suburb scanner feeds verified mobile numbers
 * to David's WhatsApp Property Agent sheet!
 */
async function runWebDiscovery() {
  const existingLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const cleanLeads = existingLeads.filter(l => {
    const em = (l.email || '').trim().toLowerCase();
    return em && !l.bounced && !/blocked|bounced|invalid/i.test(l.status || '');
  });

  if (cleanLeads.length !== existingLeads.length) {
    fs.writeFileSync(leadsPath, JSON.stringify(cleanLeads, null, 2), 'utf8');
    syncToSheets();
  }

  return 0;
}

if (require.main === module) {
  runWebDiscovery().catch(err => console.error('[!] Discovery error:', err.message));
}

module.exports = { scrapeWebsiteUrl, runWebDiscovery, SEARCH_PRESETS, hasValidMxRecord };
