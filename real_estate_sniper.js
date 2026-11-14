require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { formatPhoneForSheet, syncToSheets } = require('./sync');
const { hasAlreadyBeenContacted } = require('./sent_tracker');

const SPREADSHEET_ID = '1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA';
const SNIPER_SHEET_NAME = 'Real Estate Sniper';
// Standalone spreadsheet (shows up on its own in Google Drive / Sheets home)
const SNIPER_SPREADSHEET_ID = '1lCDYON87G5SfE-bjKlbzgApRbpkzm1WngV2kTXz_XW4';
const SNIPER_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SNIPER_SPREADSHEET_ID}/edit`;
const sniperDataPath = path.join(__dirname, 'real_estate_leads.json');
const leadsPath = path.join(__dirname, 'leads.json');

const BUSINESS_NAME = 'Fitbit Interiors';
const BUSINESS_INSTAGRAM = 'https://www.instagram.com/fitbit_interiors';

function getBusinessWhatsApp() {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  return (process.env.BUSINESS_WHATSAPP || '+256751567860').replace(/["'\s-]/g, '');
}

/**
 * Verified initial seed of active Ugandan property listings, agents, and developers
 * with newly built apartments, condominiums, and houses across Greater Kampala.
 */
const INITIAL_SNIPER_LEADS = [
  {
    agentName: 'Grace and Truth Real Estates (Agent Grace)',
    suburb: 'Kira, Naalya & Munyonyo Kigo',
    listingTrigger: 'Newly built 2-Bed Condo in Naalya (345M), 4-Bed House in Kira (500M) & 5-Bed Luxury House in Munyonyo',
    phone: '"+256706886449"',
    altPhone: '"+256706886449"',
    email: 'graceandtruthestates@gmail.com',
    portal: 'https://ugandapropertycentre.com',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Mega Property Services',
    suburb: 'Kyanja & Kisaasi-Kyanja Road',
    listingTrigger: 'Brand new 1-Bed & 2-Bed Modern Apartments in Kyanja with open-plan kitchens & balconies',
    phone: '"+256705218332"',
    altPhone: '"+256780983661"',
    email: '',
    portal: 'https://realestatedatabase.net',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Vaniland Property Consultants (Agent Ivan)',
    suburb: 'Kisaasi & Bukoto, Kampala',
    listingTrigger: 'Newly built 3-Bedroom Luxury Apartments in Kisaasi (1.5M/mo) & Bukoto (2.5M/mo)',
    phone: '"+256758589258"',
    altPhone: '"+256758589258"',
    email: '',
    portal: 'https://realestatedatabase.net',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Rawlings Property Services',
    suburb: 'Naguru & Kololo Hill, Kampala',
    listingTrigger: 'Brand new 3-Bedroom High-End Apartments in Naguru overlooking Kololo ($2,500/mo)',
    phone: '"+256704699563"',
    altPhone: '"+256704699563"',
    email: '',
    portal: 'https://realestatedatabase.net',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Sacred Property Services Uganda Ltd',
    suburb: 'Kira & Greater Kampala',
    listingTrigger: 'Newly completed 5-Bedroom Luxury Gated Community Houses in Kira (780M)',
    phone: '"+256706415648"',
    altPhone: '"+256706415648"',
    email: '',
    portal: 'https://ugandapropertycentre.com',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Henley Property Developers / Skyline Estates',
    suburb: 'Najjera, Kira & Ntinda, Kampala',
    listingTrigger: 'Newly built Condominiums & Residential Townhouses across Najjera and Kira',
    phone: '"+256781569822"',
    altPhone: '"+256775971822"',
    email: 'skylineestates0@gmail.com',
    portal: 'https://ugandapropertycentre.com',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Olinga Simon Peter (Independent Property Agent)',
    suburb: 'Kampala (Ntinda, Bukoto, Kyanja)',
    listingTrigger: 'Active residential rentals & newly completed family homes in Northern Kampala suburbs',
    phone: '"+256752988428"',
    altPhone: '"+256772869557"',
    email: '',
    portal: 'https://ugandapropertycentre.com',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Villa Real Estates Property (U) Ltd',
    suburb: 'Kololo, Muyenga & Bugolobi',
    listingTrigger: 'Executive newly built apartments and standalone villas in upscale Kampala suburbs',
    phone: '"+256772459292"',
    altPhone: '"+256701459290"',
    email: 'info@villarealestateuganda.com',
    portal: 'https://realestatedatabase.net',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Renewills Real Estate Uganda',
    suburb: 'Kampala & Wakiso (Lubowa, Muyenga, Kira)',
    listingTrigger: 'Modern standalone houses and newly built apartment blocks for sale & rent',
    phone: '"+256782920250"',
    altPhone: '"+256392002472"',
    email: 'info@renewills.com',
    portal: 'https://realestatedatabase.net',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Spectrum Properties Uganda',
    suburb: 'Lubowa, Kololo & Nakasero',
    listingTrigger: 'Luxury 3-Bedroom Condominiums in Lubowa & high-end Kololo residences',
    phone: '"+256752700800"',
    altPhone: '"+256772700800"',
    email: 'info@spectrumproperties.co.ug',
    portal: 'https://spectrumproperties.co.ug',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Nas Realtors Uganda',
    suburb: 'Kololo, Naguru & Bugolobi, Kampala',
    listingTrigger: 'Brand new furnished & unfurnished 2-to-3 Bedroom Luxury Apartments ($2,500-$3,800/mo)',
    phone: '"+256700900100"',
    altPhone: '"+256772900100"',
    email: 'info@nasrealtors.com',
    portal: 'https://nasrealtors.com',
    status: 'Ready to Message on WhatsApp'
  },
  {
    agentName: 'Buildnet Condominiums Sales Desk',
    suburb: 'Naalya, Najjera, Kira & Kololo',
    listingTrigger: 'Multi-block newly completed condominium apartments handing over to buyers',
    phone: '"+256393240240"',
    altPhone: '"+256772240240"',
    email: 'sales@buildnet.co.ug',
    portal: 'https://buildnet.co.ug',
    status: 'Ready to Message on WhatsApp'
  }
];

function fetchHtml(url, timeoutMs = 9000) {
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
            if (data.length < 400000) data += chunk.toString();
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

/**
 * True only for active Ugandan MOBILE numbers (MTN 76/77/78/79, Airtel 70/74/75).
 * Landlines (+25631x, +25639x, +25641x...) and dead prefixes (71/72/73) can't use WhatsApp.
 */
function isUgandaMobile(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return /^2567[0456789]\d{7}$/.test(digits);
}

function extractUgandaPhones(html) {
  const regex = /(?:\+256|0)[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
  const matches = html.match(regex) || [];
  const phones = [];
  for (const m of matches) {
    let digits = m.replace(/[\s-]/g, '');
    if (digits.startsWith('0')) {
      digits = '+256' + digits.slice(1);
    }
    if (isUgandaMobile(digits)) phones.push(formatPhoneForSheet(digits));
  }
  return Array.from(new Set(phones));
}

/** Short plain SMS pitch for numbers that are not on WhatsApp. */
function buildSmsPitch(item) {
  const agentDisplay = (item.agentName || 'Partner').replace(/^(Agent\s+)+/i, 'Agent ');
  return `Hello ${agentDisplay}, quick partnership message from ${BUSINESS_NAME} Kampala. We make & install curtains, rods & rugs for new homes. We pay agents 10% cash commission on every client referred. WhatsApp/Call: ${getBusinessWhatsApp()}`;
}

/** Removes snippet noise and landlines; promotes a mobile alt number to primary. */
function cleanSniperLeads(list) {
  const cleaned = [];
  for (const l of list) {
    if (l.portal === 'Uganda Property Portal Snippet') continue; // unnamed search-result numbers
    const nums = [l.phone, l.altPhone].filter(Boolean);
    const mobiles = nums.filter(isUgandaMobile);
    if (mobiles.length > 0) {
      l.phone = mobiles[0];
      l.altPhone = mobiles[1] || nums.find(n => n !== mobiles[0]) || mobiles[0];
    } else if (!l.email) {
      continue; // no mobile and no email = unreachable
    } else {
      l.status = 'Landline Only - Call or Email';
    }
    cleaned.push(l);
  }
  return cleaned;
}

function extractEmails(html) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(regex) || [];
  const blocked = ['example.com', 'sentry.io', 'wixpress.com', 'google.com', 'bing.com', 'duckduckgo.com', '.png', '.jpg', '.svg', '.css', '.js'];
  const valid = new Set();
  for (const raw of matches) {
    const e = raw.toLowerCase().replace(/\.$/, '');
    if (blocked.some(b => e.includes(b))) continue;
    if (e.length > 5 && e.length < 60) valid.add(e);
  }
  return Array.from(valid);
}

/**
 * Generates a high-converting WhatsApp pitch specifically tailored for Ugandan Real Estate Agents,
 * Landlords, and Developers (including the 10% Agent Referral Commission hook!).
 */
function buildRealEstateWhatsAppLink(item) {
  const digits = String(item.phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const agentDisplay = (item.agentName || 'Partner').replace(/^(Agent\s+)+/i, 'Agent ');
  const msg = `Hello ${agentDisplay}, quick partnership message from ${BUSINESS_NAME} (Kampala). We supply and install custom curtains, sheer fabrics, heavy-duty rods/tracks, and modern rugs (${BUSINESS_INSTAGRAM}).

Whenever your new tenants or buyers need curtains before moving in, connect them to us—we do free site measurements and pay you a 10% cash commission on every job.

May we share our 1-page price guide & catalogue with you?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function loadSniperLeads() {
  if (!fs.existsSync(sniperDataPath)) {
    fs.writeFileSync(sniperDataPath, JSON.stringify(INITIAL_SNIPER_LEADS, null, 2), 'utf8');
    return INITIAL_SNIPER_LEADS;
  }
  try {
    return cleanSniperLeads(JSON.parse(fs.readFileSync(sniperDataPath, 'utf8')));
  } catch {
    return INITIAL_SNIPER_LEADS;
  }
}

function saveSniperLeads(list) {
  fs.writeFileSync(sniperDataPath, JSON.stringify(list, null, 2), 'utf8');
}

/**
 * Live scrapes Ugandan real estate search results & portals for newly built houses/apartments
 * in target suburbs (Kira, Najjera, Kyanja, Naalya, Lubowa, Muyenga, Kololo, Munyonyo, Bukoto, Ntinda).
 */
async function scrapeRealEstatePortals(customSuburb = null) {
  const sniperLeads = loadSniperLeads();
  const existingPhones = new Set(sniperLeads.map(l => String(l.phone).replace(/[^0-9]/g, '')));
  let newlyFound = 0;

  console.log(`\n========================================================================`);
  console.log(`   UGANDAN REAL ESTATE & NEW-BUILD PORTAL SNIPER`);
  console.log(`   Targeting: Uganda Property Centre | Real Estate Database | Agencies`);
  console.log(`========================================================================\n`);

  // 1. Direct Portal Scan: Uganda Property Centre (Live multi-page feed)
  const upcPages = customSuburb
    ? [
        `https://ugandapropertycentre.com/for-rent?search=${encodeURIComponent(customSuburb)}`,
        `https://ugandapropertycentre.com/for-sale?search=${encodeURIComponent(customSuburb)}`
      ]
    : [
        'https://ugandapropertycentre.com/for-rent',
        'https://ugandapropertycentre.com/for-rent?page=2',
        'https://ugandapropertycentre.com/for-rent?page=3',
        'https://ugandapropertycentre.com/for-sale',
        'https://ugandapropertycentre.com/for-sale?page=2',
        'https://ugandapropertycentre.com/for-sale?page=3'
      ];

  console.log(`[*] Scraping Uganda Property Centre direct feeds (${upcPages.length} pages)...`);
  for (const pageUrl of upcPages) {
    const pageHtml = await fetchHtml(pageUrl, 7000);
    if (!pageHtml) continue;

    const cardRegex = /<h3[^>]*class="[^"]*text-foreground-strong[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*class="[^"]*text-foreground-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
    let m;
    while ((m = cardRegex.exec(pageHtml)) !== null) {
      const title = m[1].trim();
      const desc = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      const phoneRegex = /(?:\+?256|0)[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
      const found = desc.match(phoneRegex) || [];
      for (const rawPhone of found) {
        let d = rawPhone.replace(/[\s-]/g, '');
        if (d.startsWith('0')) d = '256' + d.slice(1);
        if (d.startsWith('+')) d = d.slice(1);
        
        if (isUgandaMobile(d) && !existingPhones.has(d)) {
          existingPhones.add(d);
          const safePhone = formatPhoneForSheet(`+${d}`);
          
          // Determine suburb / location from title and description
          let detectedSuburb = 'Greater Kampala';
          const suburbsList = ['Ntinda', 'Kira', 'Najjera', 'Kyanja', 'Kololo', 'Naguru', 'Bukoto', 'Naalya', 'Lubowa', 'Muyenga', 'Kisaasi', 'Kitende', 'Munyonyo', 'Bugolobi', 'Makindye'];
          for (const sub of suburbsList) {
            if (new RegExp(sub, 'i').test(title + ' ' + desc)) {
              detectedSuburb = `${sub}, Greater Kampala`;
              break;
            }
          }

          const newLead = {
            agentName: `Agent (${title.split(/[|\-–]/)[0].trim().slice(0, 35)})`,
            suburb: detectedSuburb,
            listingTrigger: `${title}: ${desc.slice(0, 95)}...`,
            phone: safePhone,
            altPhone: safePhone,
            email: '',
            portal: 'https://ugandapropertycentre.com',
            status: 'Ready to Message on WhatsApp'
          };

          sniperLeads.push(newLead);
          newlyFound++;
          console.log(`   [+] Sniped New Contact: ${newLead.phone} | ${newLead.suburb} | ${newLead.listingTrigger.slice(0, 50)}...`);
        }
      }
    }
  }

  // 2. Also import any pre-parsed verified agents from red_all_agents.json
  const redPath = path.join(__dirname, 'red_all_agents.json');
  if (fs.existsSync(redPath)) {
    try {
      const redAgents = JSON.parse(fs.readFileSync(redPath, 'utf8'));
      for (const ra of redAgents) {
        const d = String(ra.phone).replace(/[^0-9]/g, '');
        if (isUgandaMobile(d) && !existingPhones.has(d)) {
          existingPhones.add(d);
          ra.phone = formatPhoneForSheet(ra.phone);
          ra.altPhone = formatPhoneForSheet(ra.altPhone || ra.phone);
          sniperLeads.push(ra);
          newlyFound++;
          console.log(`   [+] Imported RED Agent: ${ra.agentName} | ${ra.phone} | ${ra.suburb}`);
        }
      }
    } catch {}
  }

  saveSniperLeads(sniperLeads);
  console.log(`\n[+] Real Estate Sniper finished! Total Property/Landlord Leads: ${sniperLeads.length} (+${newlyFound} new).`);
  syncSniperToGoogleSheet();
  return sniperLeads;
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Creates/updates a dedicated "Real Estate Sniper" tab in your Google Sheet
 * AND merges any agents with email addresses into your main Sheet1 email tracker.
 */
function syncSniperToGoogleSheet() {
  const sniperLeads = loadSniperLeads();

  // 1. Also add any sniper leads that have an email address into main leads.json (if not already present)
  const mainLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const existingMainEmails = new Set(mainLeads.map(l => (l.email || '').toLowerCase()).filter(Boolean));
  let addedToMain = 0;

  for (const sl of sniperLeads) {
    const em = (sl.email || '').trim().toLowerCase();
    if (em && !existingMainEmails.has(em) && !hasAlreadyBeenContacted(em)) {
      existingMainEmails.add(em);
      mainLeads.push({
        name: sl.agentName,
        category: 'Real Estate Developers & Property Managers',
        city: sl.suburb,
        email: sl.email,
        phone: formatPhoneForSheet(sl.phone),
        website: sl.portal,
        status: 'Ready for Automated Dispatch',
        pitch_angle: `New-Build Curtain Packages & 10% Agent Referral (${sl.listingTrigger.slice(0, 50)})`,
        notes: `Sniped from Real Estate Portal: ${sl.listingTrigger}`
      });
      addedToMain++;
    }
  }

  if (addedToMain > 0) {
    fs.writeFileSync(leadsPath, JSON.stringify(mainLeads, null, 2), 'utf8');
    console.log(`[+] Merged ${addedToMain} email-enabled property agents into main email campaign list.`);
    syncToSheets();
  }

  // 2. Build CSV for the dedicated "Real Estate Sniper" tab
  const headers = [
    'Agent / Landlord / Company',
    'Suburb / Area',
    'Active Newly-Built Property Listing',
    'Primary Phone / WhatsApp',
    'Alt Phone',
    'Email (If Listed)',
    'Source Portal',
    'Status',
    '1-Click WhatsApp Pitch (10% Referral Offer)',
    'SMS Pitch (If Not on WhatsApp)'
  ];

  const rows = [headers.map(escapeCsvField).join(',')];

  for (const item of sniperLeads) {
    const safePhone = formatPhoneForSheet(item.phone);
    const safeAlt = formatPhoneForSheet(item.altPhone || item.phone);
    const noWa = String(item.status || '').startsWith('No WhatsApp') || String(item.status || '').startsWith('Landline');
    const waLink = noWa ? 'Not on WhatsApp - use SMS/Call' : buildRealEstateWhatsAppLink(item);

    const row = [
      item.agentName,
      item.suburb,
      item.listingTrigger,
      safePhone,
      safeAlt,
      item.email || 'WhatsApp / Direct Call Only',
      item.portal,
      item.status || 'Ready to Message on WhatsApp',
      waLink,
      buildSmsPitch(item)
    ];
    rows.push(row.map(escapeCsvField).join(','));
  }

  const sniperCsvPath = path.join(__dirname, 'real_estate_sniper.csv');
  fs.writeFileSync(sniperCsvPath, rows.join('\r\n'), 'utf8');

  console.log(`[+] Saved ${sniperLeads.length} property leads locally: ${sniperCsvPath}`);
  console.log(`[*] Syncing to Google Sheet "Fitbit Interiors - Real Estate & New-Build Property Sniper"...`);
  try {
    execSync(`gsheets mutate import-csv ${SNIPER_SPREADSHEET_ID} "${sniperCsvPath}" --sheet "Sheet1"`, { stdio: 'pipe' });
    console.log(`[+] Google Sheet updated: ${SNIPER_SHEET_URL}`);
  } catch {
    console.log(`[i] Google Sheets sync is only available when run through the Antigravity agent.`);
    console.log(`    Your local file is up to date - open real_estate_sniper.csv, or ask the agent to "sync the sheet".`);
  }
}

if (require.main === module) {
  const customArea = process.argv[2] || null;
  const noWaIdx = process.argv.indexOf('--no-wa');
  if (noWaIdx !== -1) {
    // Usage: node real_estate_sniper.js --no-wa 0705218332 0758589258
    const targets = process.argv.slice(noWaIdx + 1).map(p => p.replace(/[^0-9]/g, '').replace(/^0/, '256'));
    const list = loadSniperLeads();
    let marked = 0;
    for (const l of list) {
      const d = String(l.phone).replace(/[^0-9]/g, '');
      if (targets.includes(d)) {
        l.status = 'No WhatsApp - Call or SMS';
        marked++;
      }
    }
    saveSniperLeads(list);
    console.log(`[+] Marked ${marked} number(s) as "No WhatsApp - Call or SMS".`);
    syncSniperToGoogleSheet();
  } else if (process.argv.includes('--sync-only')) {
    syncSniperToGoogleSheet();
  } else {
    scrapeRealEstatePortals(customArea).catch(err => console.error('[!] Sniper Error:', err.message));
  }
}

module.exports = {
  loadSniperLeads,
  saveSniperLeads,
  scrapeRealEstatePortals,
  syncSniperToGoogleSheet,
  buildRealEstateWhatsAppLink
};
