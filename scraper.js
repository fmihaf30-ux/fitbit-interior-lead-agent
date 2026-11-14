const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const { formatPhoneForSheet, syncToSheets } = require('./sync');
const { hasAlreadyBeenContacted, isEmailBlockedOrBounced, loadSentHistory } = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');

async function hasValidMxRecord(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    const valid = (mx || []).filter(
      m => m && m.exchange && m.exchange !== '.' && !m.exchange.toLowerCase().includes('ghs.google.com')
    );
    return valid.length > 0;
  } catch {
    return false;
  }
}

const VERIFIED_UGANDA_B2B_DIRECTORY = [
  {
    name: 'Seyani Brothers & Co (U) Ltd',
    category: 'Real Estate Developers & Property Managers',
    city: 'Kololo / Industrial Area, Kampala',
    email: 'info@seyani.com',
    phone: '"+256312261334"',
    website: 'https://seyani.com',
    pitch_angle: 'Subcontractor for Window Curtains, Heavy-Duty Tracks & Floor Rugs on Handovers',
    notes: 'Tier-1 commercial & residential construction contractor in Kampala.'
  },
  {
    name: 'Excel Construction Ltd',
    category: 'Real Estate Developers & Property Managers',
    city: 'Kampala & Jinja, Uganda',
    email: 'info@excelconstruction.org',
    phone: '"+256414231099"',
    website: 'https://excelconstruction.org',
    pitch_angle: 'Commercial Fit-Out Curtains, Tracks & Acoustic Rugs Partner',
    notes: 'Major Ugandan building and civil engineering contractor.'
  },
  {
    name: 'Cementers Uganda Ltd',
    category: 'Real Estate Developers & Property Managers',
    city: 'Seventh Street Industrial Area, Kampala',
    email: 'info@cementers.com',
    phone: '"+256414345633"',
    website: 'https://cementers.com',
    pitch_angle: 'Turnkey Apartment & Office Window Treatment Subcontractor',
    notes: 'Leading construction & interior fit-out contractor for commercial towers and estates.'
  },
  {
    name: 'FBW Group Architects & Engineers Uganda',
    category: 'Interior Designers & Decorators',
    city: 'Clement Hill Road, Nakasero, Kampala',
    email: 'info@fbwgroup.com',
    phone: '"+256414258492"',
    website: 'https://fbwgroup.com',
    pitch_angle: 'Architectural Drapery, Motorized Tracks & Soft-Furnishing Specification',
    notes: 'Multidisciplinary architecture and interior design practice in East Africa.'
  },
  {
    name: 'Arch Forum Ltd Architects',
    category: 'Interior Designers & Decorators',
    city: 'Bukoto, Kampala',
    email: 'info@archforumltd.com',
    phone: '"+256414531845"',
    website: 'https://archforumltd.com',
    pitch_angle: 'Trade Account & Subcontracting — Bespoke Drapery, Tracks & Rugs',
    notes: 'Ugandan architectural & project management consultancy.'
  },
  {
    name: 'Knight Frank Uganda (Property Management)',
    category: 'Real Estate Developers & Property Managers',
    city: 'Course View Towers, Nakasero, Kampala',
    email: 'uganda@knightfrank.com',
    phone: '"+256414344365"',
    website: 'https://knightfrank.ug',
    pitch_angle: 'Show-House Staging & Move-In Curtain Packages for Managed Estates',
    notes: 'Manages top residential apartments and commercial properties across Kampala.'
  },
  {
    name: 'Broll Property Group Uganda',
    category: 'Real Estate Developers & Property Managers',
    city: 'Lugogo Bypass, Kampala',
    email: 'info@broll.co.ug',
    phone: '"+256312516600"',
    website: 'https://broll.com',
    pitch_angle: 'Corporate & Residential Property Window Sheers, Tracks & Rugs',
    notes: 'Commercial and residential property management firm in Kampala.'
  },
  {
    name: 'National Housing & Construction Company (NHCC)',
    category: 'Real Estate Developers & Property Managers',
    city: 'Crested Towers, Kampala',
    email: 'info@nhcc.co.ug',
    phone: '"+256414330002"',
    website: 'https://nhcc.co.ug',
    pitch_angle: 'Show-House Staging & Move-In Curtain Packages for Condominium Buyers',
    notes: 'Largest residential estate developer in Naalya, Namungoona, Lubowa & Bugolobi.'
  },
  {
    name: 'Fairway Hotel & Spa Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kafu Road, Nakasero, Kampala',
    email: 'info@fairwayhotel.co.ug',
    phone: '"+256414259571"',
    website: 'https://fairwayhotel.co.ug',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    notes: 'Boutique hotel & conference center in Nakasero.'
  },
  {
    name: 'Golf Course Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Yusuf Lule Road, Kololo, Kampala',
    email: 'info@golfcoursehotel.com',
    phone: '"+256414563500"',
    website: 'https://golfcoursehotel.com',
    pitch_angle: 'Hospitality-Grade 100% Blackout Drapery & Acoustic Area Rugs',
    notes: 'Luxury hotel and serviced apartments in Kololo.'
  },
  {
    name: 'The Emin Pasha Hotel & Spa',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Akii Bua Road, Nakasero, Kampala',
    email: 'info@eminpasha.com',
    phone: '"+256414236977"',
    website: 'https://eminpasha.com',
    pitch_angle: 'Bespoke Boutique Hotel Drapery, Linen Sheers & Area Rugs',
    notes: 'Premier boutique luxury hotel in Nakasero, Kampala.'
  },
  {
    name: 'The Boma Hotel Entebbe',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'JuliaSebutinde Road, Entebbe',
    email: 'info@boma.co.ug',
    phone: '"+256772467929"',
    website: 'https://boma.co.ug',
    pitch_angle: '100% Blackout Curtains, Sheer Fabrics & Woven Rugs for Guest Suites',
    notes: 'Upscale boutique hotel in Entebbe.'
  },
  {
    name: '2 Friends Beach Hotel Entebbe',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bendegereza Road, Entebbe',
    email: 'info@2friendshotel.com',
    phone: '"+256772410386"',
    website: 'https://2friendshotel.com',
    pitch_angle: 'Lakefront Suite Blackout Curtains, Heavy Tracks & Washable Rugs',
    notes: 'Popular boutique lakeside hotel in Entebbe.'
  },
  {
    name: 'Hotel No.5 Entebbe',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Edna Road, Entebbe',
    email: 'info@hotelno5.com',
    phone: '"+256797282908"',
    website: 'https://hotelno5.com',
    pitch_angle: 'Luxury Suite Drapery, Concealed Tracks & Designer Area Rugs',
    notes: 'Award-winning luxury boutique hotel & apartments in Entebbe.'
  },
  {
    name: 'Onomo Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Akii Bua Road, Nakasero, Kampala',
    email: 'info@onomo.com',
    phone: '"+256313332100"',
    website: 'https://onomohotels.com',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    notes: 'Modern executive hotel and suites in Nakasero.'
  },
  {
    name: 'Munyonyo Commonwealth Resort',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Munyonyo, Kampala',
    email: 'info@munyonyocommonwealth.com',
    phone: '"+256414227111"',
    website: 'https://munyonyocommonwealth.com',
    pitch_angle: 'VIP Villa & Suite Blackout Drapery, Heavy-Duty Tracks & Rugs',
    notes: 'Lakeside resort & presidential suites in Munyonyo.'
  },
  {
    name: 'Sheraton Kampala Hotel',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Ternan Avenue, Nakasero, Kampala',
    email: 'info@sheratonkampala.com',
    phone: '"+256414420000"',
    website: 'https://marriott.com',
    pitch_angle: 'Hospitality-Grade 100% Blackout Drapery & Acoustic Area Rugs',
    notes: '5-star hotel & conference suites in central Kampala.'
  },
  {
    name: 'Imperial Royale Hotel Kampala',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kintu Road, Nakasero, Kampala',
    email: 'info@imperialhotels.co.ug',
    phone: '"+256417111000"',
    website: 'https://imperialhotels.co.ug',
    pitch_angle: 'Conference Hall Drapery, Guest Room Curtains & Heavy Tracks',
    notes: 'Large hotel and convention center in Kampala.'
  },
  {
    name: 'Nakasero Hospital Kampala',
    category: 'Corporate Offices & Commercial Spaces',
    city: 'Akii Bua Road, Nakasero, Kampala',
    email: 'info@nakaserohospital.com',
    phone: '"+256312531400"',
    website: 'https://nakaserohospital.com',
    pitch_angle: 'Hospital Privacy Cubicle Curtains, Ceiling Tracks & VIP Ward Blackout Drapery',
    notes: 'Leading private hospital in Kampala with VIP private wards.'
  },
  {
    name: 'TMR International Hospital Naalya',
    category: 'Corporate Offices & Commercial Spaces',
    city: 'ira-Naalya Road, Kampala',
    email: 'info@TMRinternational.org',
    phone: '"+256775205774"',
    website: 'https://tmrinternational.org',
    pitch_angle: 'Hospital Privacy Cubicle Curtains, Ceiling Tracks & Blackout Drapery',
    notes: 'Private specialist hospital in Naalya, Kampala.'
  },
  {
    name: 'Kampala International School Uganda (KISU)',
    category: 'Corporate Offices & Commercial Spaces',
    city: 'Bukoto, Kampala',
    email: 'info@kampalainternationalschool.com',
    phone: '"+256752711882"',
    website: 'https://kisu.com',
    pitch_angle: 'Classroom Glare-Control Curtains, Stage Drapery & Office Window Treatments',
    notes: 'Premier international school campus in Bukoto, Kampala.'
  },
  {
    name: 'Wildplaces Africa Luxury Lodges',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bugolobi, Kampala',
    email: 'info@wildplacesafrica.com',
    phone: '"+256414251182"',
    website: 'https://wildplacesafrica.com',
    pitch_angle: 'Bespoke Safari Lodge Drapery, Linen Sheers & Woven Area Rugs',
    notes: 'Operates luxury boutique lodges and hotels across Uganda.'
  },
  {
    name: 'Marasa Africa Hotels & Lodges Uganda',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kampala, Uganda',
    email: 'info@marasa.net',
    phone: '"+256312260260"',
    website: 'https://marasa.net',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    notes: 'Hospitality group operating lodges and hotels in Uganda.'
  },
  {
    name: 'Volcanoes Safaris Lodges Uganda',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kololo, Kampala',
    email: 'info@volcanoessafaris.com',
    phone: '"+256414346464"',
    website: 'https://volcanoessafaris.com',
    pitch_angle: 'Luxury Suite Drapery, Linen Sheers & Handwoven Floor Rugs',
    notes: 'Luxury eco-lodges with head office in Kololo, Kampala.'
  },
  {
    name: 'Great Lakes Safaris & Uganda Lodges',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Mutungo Hill, Kampala',
    email: 'info@ugandalodges.com',
    phone: '"+256393267153"',
    website: 'https://ugandalodges.com',
    pitch_angle: 'Turnkey Lodge & Guest Room Curtains, Rods & Washable Rugs',
    notes: 'Hospitality group operating boutique lodges across Uganda.'
  },
  {
    name: 'Kyaninga Lodge Fort Portal',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Fort Portal / Kampala Office',
    email: 'info@kyaningalodge.com',
    phone: '"+256772999750"',
    website: 'https://kyaningalodge.com',
    pitch_angle: 'Luxury Cottage Drapery, Heavy-Duty Brass Rods & Area Rugs',
    notes: 'Luxury boutique lodge in Western Uganda.'
  },
  {
    name: 'Entebbe Palm Hotel',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Circular Road, Entebbe',
    email: 'info@entebbepalm.com',
    phone: '"+256782030284"',
    website: 'https://entebbepalm.com',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    notes: 'Boutique hotel in Entebbe.'
  }
];

const SEARCH_PRESETS = [
  {
    label: 'Hotels, Resorts, Safari Lodges & Guest Houses (Kampala, Entebbe, Jinja, Mbarara, Fort Portal)',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Uganda (Countrywide Hospitality)',
    pitch_angle: '100% Blackout Curtains, Curtain Tracks & Rugs for Guest Rooms',
    queries: [
      'hotel resort Kampala Entebbe contact email reservations@ info@',
      'guest house apartments Kololo Muyenga Munyonyo Bugolobi email'
    ]
  },
  {
    label: 'Airbnb, Furnished Apartments & Short-Stay Suites (Greater Kampala & Entebbe)',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Greater Kampala & Entebbe',
    pitch_angle: 'Turnkey Apartment Curtains, Sheers, Rods & Washable Rugs',
    queries: [
      'serviced apartments Kololo Naguru Bukoto Ntinda email "+256"'
    ]
  },
  {
    label: 'Real Estate Developers, Condominiums & Property Management Agencies',
    category: 'Real Estate Developers & Property Managers',
    city: 'Kampala & Wakiso',
    pitch_angle: 'Show-House Staging & Move-In Curtain Packages for Buyers/Tenants',
    queries: [
      'real estate property developers Kampala Uganda email info@ sales@'
    ]
  },
  {
    label: 'Interior Designers, Decorators & Architecture Firms',
    category: 'Interior Designers & Decorators',
    city: 'Kampala, Uganda',
    pitch_angle: 'Trade Partner Pricing — Custom Curtains, Rods & Rugs Installation',
    queries: [
      'interior design company Kampala Uganda email info@',
      'architects architectural firm Kampala Uganda contact email'
    ]
  }
];

function fetchHtml(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
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
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).href;
            return resolve(fetchHtml(redirectUrl, timeoutMs));
          }
          let data = '';
          res.on('data', chunk => {
            if (data.length < 300000) data += chunk.toString();
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
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(regex) || [];
  const blockedDomains = [
    'example.com', 'sentry.io', 'wixpress.com', 'w3.org', 'schema.org',
    'duckduckgo.com', 'bing.com', 'microsoft.com', 'google.com', 'cloudflare.com',
    'wordpress.org', 'jquery.com', 'bootstrap.com'
  ];
  const blockedExt = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.ttf'];

  const cleaned = new Set();
  for (const raw of matches) {
    const email = raw.toLowerCase().replace(/\.$/, '');
    if (blockedExt.some(ext => email.endsWith(ext))) continue;
    if (blockedDomains.some(d => email.includes(d))) continue;
    if (email.length > 5 && email.length < 65) {
      cleaned.add(email);
    }
  }
  return Array.from(cleaned);
}

function extractUgandaPhones(html) {
  const regex = /(?:\+256|0)[\s-]?[2347]\d{1,2}[\s-]?\d{3}[\s-]?\d{3}/g;
  const matches = html.match(regex) || [];
  const phones = [];
  for (const m of matches) {
    let digits = m.replace(/[\s-]/g, '');
    if (digits.startsWith('0')) {
      digits = '+256' + digits.slice(1);
    }
    phones.push(formatPhoneForSheet(digits));
  }
  return Array.from(new Set(phones));
}

function extractTitle(html, fallbackUrl) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const raw = titleMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .split(/[|\-–—]/)[0]
      .trim();
    if (raw.length > 2 && raw.length < 75) return raw;
  }
  try {
    return new URL(fallbackUrl).hostname.replace(/^www\./, '');
  } catch {
    return fallbackUrl;
  }
}

async function scrapeWebsiteUrl(targetUrl, category = 'Serviced Apartments & Boutique Hotels', city = 'Kampala, Uganda', customPitchAngle = null) {
  const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  const homeHtml = await fetchHtml(normalizedUrl);
  let contactHtml = '';

  for (const subPath of ['/contact', '/contact-us']) {
    try {
      const subUrl = new URL(subPath, normalizedUrl).href;
      const html = await fetchHtml(subUrl, 4000);
      if (html) contactHtml += '\n' + html;
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
 * Discovers MX-verified Ugandan B2B leads from the verified directory & live web crawl,
 * adding up to maxPerRun new leads per shift so Emma continuously has fresh emails to send.
 */
async function runWebDiscovery(presetIndex = null, maxPerRun = 2) {
  const existingLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const sentHistory = loadSentHistory();
  const existingEmails = new Set([
    ...existingLeads.map(l => (l.email || '').toLowerCase()),
    ...Object.keys(sentHistory)
  ]);

  let newlyAdded = 0;

  // 1. Pull up to maxPerRun fresh, MX-verified Ugandan B2B leads from our verified directory pool
  for (const item of VERIFIED_UGANDA_B2B_DIRECTORY) {
    if (newlyAdded >= maxPerRun) break;
    const emailLower = (item.email || '').trim().toLowerCase();
    if (!emailLower || existingEmails.has(emailLower)) continue;
    if (hasAlreadyBeenContacted(emailLower) || isEmailBlockedOrBounced(emailLower)) continue;

    const validMx = await hasValidMxRecord(emailLower);
    if (!validMx) continue;

    existingEmails.add(emailLower);
    existingLeads.push({
      name: item.name,
      category: item.category,
      city: item.city,
      email: item.email,
      phone: item.phone,
      website: item.website,
      status: 'Ready for Automated Dispatch',
      pitch_angle: item.pitch_angle,
      notes: item.notes,
      discoveredAt: new Date().toISOString()
    });
    newlyAdded++;
    console.log(`   [+] Sarah Discovered New B2B Lead: ${item.name} | ${item.email} (MX Verified)`);
  }

  if (newlyAdded > 0) {
    fs.writeFileSync(leadsPath, JSON.stringify(existingLeads, null, 2), 'utf8');
    syncToSheets();
  }

  return newlyAdded;
}

if (require.main === module) {
  runWebDiscovery().catch(err => console.error('[!] Discovery error:', err.message));
}

module.exports = { scrapeWebsiteUrl, runWebDiscovery, SEARCH_PRESETS, hasValidMxRecord };
