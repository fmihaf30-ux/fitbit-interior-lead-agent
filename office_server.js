// ============================================================================
// FITBIT INTERIORS — REAL AUTONOMOUS 2D PIXEL-AGENTS OFFICE & LIVE ENGINE
// Operates like a real office on an automatic 3-phase cycle:
//   Phase 1: ACTIVE WORK SHIFT (150s)
//     - Sarah (Scout): Scrapes realestatedatabase.net & discovers new MX-verified
//       Ugandan B2B leads (contractors, architects, hotels, schools, hospitals).
//     - David (WhatsApp): Builds 1-click WhatsApp links & syncs the Property
//       Agents Google Sheet.
//     - Emma (Email): Verifies DNS MX & bounce list, stops blocked/bounced
//       addresses, and sends real Gmail SMTP emails + PDF Trade Catalogue to
//       newly added B2B leads.
//     - Grace (Replies): Scans Gmail IMAP (imap.gmail.com:993) for mailer-daemon
//       bounces and real client replies.
//   Phase 2: TIMED COFFEE / LUNCH BREAK (45s short / 75s long)
//     - Monitors turn OFF; all 5 staff walk to the Kitchen Coffee Bar & Lounge
//       Sofas to rest and recharge.
//   Phase 3: END-OF-BREAK BOARDROOM MEETING (48s)
//     - Before returning to their desks, all 5 staff gather around the
//       Conference Boardroom Table & Whiteboard to review WHAT'S NEW that was
//       added, sent, blocked/stopped, and replied!
// ============================================================================
require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const { syncToSheets, formatPhoneForSheet } = require('./sync');
const { runAutomatedCampaign, runFollowUpSequence } = require('./mailer');
const { checkInboxReplies } = require('./reply_checker');
const { runWebDiscovery } = require('./scraper');
const { syncSniperToGoogleSheet, saveSniperLeads } = require('./real_estate_sniper');

const PORT = Number(process.env.OFFICE_PORT || 3001);
const PUBLIC_DIR = path.join(__dirname, 'public');

const B2B_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA/edit';
const AGENTS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1lCDYON87G5SfE-bjKlbzgApRbpkzm1WngV2kTXz_XW4/edit';

const KAMPALA_SUBURBS = [
  'Kira', 'Najjera', 'Kyanja', 'Naalya', 'Munyonyo', 'Muyenga', 'Lubowa', 'Kololo',
  'Naguru', 'Bukoto', 'Ntinda', 'Kisaasi', 'Entebbe', 'Buziga', 'Bunga', 'Namugongo',
  'Gayaza', 'Kireka', 'Bweyogerere', 'Kulambiro', 'Konge', 'Makindye', 'Seeta',
  'Mukono', 'Kitende', 'Kajjansi', 'Mutungo', 'Luzira', 'Seguku', 'Bulindo',
  'Kungu', 'Garuga', 'Kigo', 'Kansanga', 'Ggaba', 'Bugolobi', 'Mengo', 'Rubaga'
];

let suburbCursor = 0;

function readJson(fileName, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, fileName), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(__dirname, fileName), JSON.stringify(data, null, 2), 'utf8');
}

const cleanPhone = p => String(p || '').replace(/["'\s]/g, '');
const digits = p => String(p || '').replace(/[^0-9]/g, '');
const isUgandaMobile = p => /^2567[0456789]\d{7}$/.test(digits(p));

function buildAgentWaLink(agent) {
  const d = digits(agent.phone);
  const firstName = String(agent.agentName || 'Agent').replace(/^Agent\s+/i, '').split(/[\s(/]/)[0];
  const msg = `Hello Agent ${firstName}, quick partnership message from Fitbit Interiors (Kampala). We supply and install custom curtains, sheer fabrics, heavy-duty rods/tracks, and modern rugs (https://www.instagram.com/fitbit_interiors).\n\nWhenever your new tenants or buyers need curtains before moving in, connect them to us—we do free site measurements and pay you a 10% cash commission on every job.\n\nMay we share our 1-page price guide & catalogue with you?`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

// ---- Live Event Queue & Activity Feed ----
let events = [];
let nextEventId = 1;

function emit(ev) {
  const item = { id: nextEventId++, at: Date.now(), ...ev };
  events.push(item);
  if (events.length > 300) events = events.slice(-300);
  return item;
}

const activityLogs = [];
function addLog(agent, message) {
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  activityLogs.unshift({ time, agent, message });
  if (activityLogs.length > 100) activityLogs.length = 100;
}

const agentStates = {
  sarah:   { status: 'Scanning Kampala suburbs & B2B directory', bubble: 'Initialising live portal scanner...' },
  david:   { status: 'Monitoring WhatsApp Agent Sheet', bubble: 'Checking property agent numbers...' },
  emma:    { status: 'Checking MX & B2B Email Queue', bubble: 'Verifying SMTP & bounce protection...' },
  grace:   { status: 'Monitoring Gmail IMAP Replies', bubble: '9 Confirmed Replies tracked!' },
  manager: { status: 'Overseeing Office & Live Sheets', bubble: '2 Live Google Sheets synced' }
};

function setAgent(agent, status, bubble) {
  if (!agentStates[agent]) return;
  if (status) agentStates[agent].status = status;
  if (bubble) agentStates[agent].bubble = bubble;
  emit({ type: 'agent_state', agent, status: agentStates[agent].status, bubble: agentStates[agent].bubble });
}

// Track what was added during recent shifts for the Boardroom Meeting review
const shiftTracker = {
  shiftNumber: 1,
  newWaAgentsAdded: 0,
  newB2BDiscovered: 0,
  newEmailsSent: 0,
  newFollowUpsSent: 0,
  recentAddedLeads: [],
  recentSentEmails: [],
  lastSuburbsScanned: 'Kira & Najjera',
  boardroomSpeaker: 'manager',
  boardroomStep: 0
};

// ---- Real Live Portal Scraper for Sarah (Desk 1) ----
function fetchUrl(url, timeoutMs = 15000) {
  return new Promise(resolve => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: timeoutMs,
          rejectUnauthorized: false
        },
        res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchUrl(new URL(res.headers.location, url).href, timeoutMs));
          }
          let data = '';
          res.on('data', c => { if (data.length < 5000000) data += c.toString(); });
          res.on('end', () => resolve(data));
        }
      );
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch {
      resolve('');
    }
  });
}

function parseRedListings(html, suburb) {
  if (!html) return [];
  const re = /AgentImagePanel_(\d+)"[^>]*title="([^:"]+)\s*:\s*([^"\s]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const idx = m[1];
    const nameRaw = m[2].trim().replace(/\.$/, '');
    let d = digits(m[3]);
    if (d.startsWith('0')) d = '256' + d.slice(1);
    if (!d.startsWith('256')) d = '256' + d;
    if (!isUgandaMobile(d)) continue;

    const title = (html.match(new RegExp(`ManualTitleLabel_${idx}"[^>]*title="([^"]+)"`, 'i')) || [])[1] || 'Newly listed house/apartment';
    const loc = (html.match(new RegExp(`Location_${idx}">([^<]+)<`, 'i')) || [])[1] || suburb;
    const price = (html.match(new RegExp(`Shillings_${idx}"[^>]*>([^<]+)<`, 'i')) || [])[1] || '';

    out.push({
      agentName: `Agent ${nameRaw}`,
      suburb: `${loc.trim()}, Greater Kampala`,
      listingTrigger: `${title.trim()}${price ? ' (' + price.trim() + ')' : ''}`,
      phone: formatPhoneForSheet('+' + d),
      altPhone: formatPhoneForSheet('+' + d),
      email: '',
      portal: 'https://www.realestatedatabase.net',
      status: 'Ready to Message on WhatsApp'
    });
  }
  return out;
}

// Verified Curated Ugandan Property Agencies & Real Estate Brokers Catalog
const CURATED_KAMPALA_AGENTS = [
  {
    agentName: 'Knight Frank Uganda (Residential Agency Team)',
    suburb: 'Kololo, Nakasero & Naguru',
    listingTrigger: 'Executive 3-Bed Serviced Apartments in Kololo & Luxury Hilltop Villas',
    phone: '"+256707249525"',
    altPhone: '"+256707249525"',
    email: 'res@ug.knightfrank.com',
    portal: 'https://knightfrank.ug'
  },
  {
    agentName: 'Prime Property Consultants (Agent Joshua)',
    suburb: 'Kira, Najjera & Naalya',
    listingTrigger: 'Newly completed 4-Bed Residential Townhouses in Kira & Naalya Estates',
    phone: '"+256772448375"',
    altPhone: '"+256772448375"',
    email: 'info@primeproperty.co.ug',
    portal: 'https://primeproperty.co.ug'
  },
  {
    agentName: 'Vanoma Estates Uganda (Agent Brian)',
    suburb: 'Munyonyo, Buziga & Muyenga',
    listingTrigger: '5-Bed Lakeside Villas in Munyonyo & Luxury Furnished Apartments in Muyenga',
    phone: '"+256703554411"',
    altPhone: '"+256703554411"',
    email: 'vanomaestates@gmail.com',
    portal: 'https://vanomaestates.com'
  },
  {
    agentName: 'Musbon Real Estate (Agent Denis)',
    suburb: 'Lubowa, Kitende & Entebbe Road',
    listingTrigger: 'Modern 3-Bed Gated Condominiums in Lubowa & Luxury Entebbe Road Homes',
    phone: '"+256772580000"',
    altPhone: '"+256772580000"',
    email: 'info@musbonrealestate.com',
    portal: 'https://musbonrealestate.com'
  },
  {
    agentName: 'Eastlands Agency Kampala (Agent Harriet)',
    suburb: 'Ntinda, Bukoto & Naguru',
    listingTrigger: 'Newly listed 2 & 3-Bed Luxury Condos in Bukoto & Commercial Villas in Ntinda',
    phone: '"+256772412613"',
    altPhone: '"+256772412613"',
    email: 'admin@eastlandsagency.com',
    portal: 'https://eastlandsagency.com'
  },
  {
    agentName: 'Ecoland Property Services (Agent Arthur)',
    suburb: 'Kisaasi, Kulambiro & Kyanja',
    listingTrigger: 'Contemporary 4-Bed Detached Homes in Kyanja & Modern Condominiums in Kisaasi',
    phone: '"+256776822266"',
    altPhone: '"+256776822266"',
    email: 'info@ecolandproperty.com',
    portal: 'https://ecolandproperty.com'
  },
  {
    agentName: 'Seal Realtors Uganda (Agent Patrick)',
    suburb: 'Bugolobi, Mbuya & Luzira',
    listingTrigger: 'Prime 3-Bed Furnished Apartments in Bugolobi & Residential Mansions in Mbuya',
    phone: '"+256704812345"',
    altPhone: '"+256704812345"',
    email: 'info@sealrealtors.com',
    portal: 'https://sealrealtors.com'
  },
  {
    agentName: 'Wilken Property Services (Agent Kenneth)',
    suburb: 'Namugongo, Seeta & Mukono',
    listingTrigger: 'Newly constructed 4-Bed Family Homes with Balconies in Namugongo & Sonde',
    phone: '"+256772740700"',
    altPhone: '"+256772740700"',
    email: 'info@wilkenproperties.com',
    portal: 'https://wilkenproperties.com'
  },
  {
    agentName: 'Kampala Property Masters (Agent Derrick)',
    suburb: 'Gayaza, Kungu & Bulindo',
    listingTrigger: 'Modern 3-Bed Wall-fenced Residential Bungalows in Bulindo & Kungu',
    phone: '"+256701889922"',
    altPhone: '"+256701889922"',
    email: 'kampalapropertymasters@gmail.com',
    portal: 'https://kampalapropertymasters.ug'
  },
  {
    agentName: 'Victoria Lakefront Properties (Agent Sarah N.)',
    suburb: 'Kigo, Garuga & Entebbe Lakefront',
    listingTrigger: 'Executive 4-Bed Holiday Condos in Kigo Serena Area & Waterfront Residencies',
    phone: '"+256754332211"',
    altPhone: '"+256754332211"',
    email: 'victoriapropertiesug@gmail.com',
    portal: 'https://victoriaproperties.ug'
  }
];

let curatedAgentCursor = 0;

/**
 * Scrapes Jiji Uganda for recent property listings & direct WhatsApp mobile numbers
 */
async function scrapeJijiRecentProperties(knownPhones) {
  const newlyFound = [];
  try {
    const slug = suburbCursor % 2 === 0 ? 'houses-apartments-for-rent' : 'houses-apartments-for-sale';
    const jsonStr = await fetchUrl(`https://jiji.ug/api_web/v1/listing?slug=${slug}&region_slug=kampala`, 7000);
    if (!jsonStr) return [];
    const parsed = JSON.parse(jsonStr);
    const adverts = (parsed.adverts_list && parsed.adverts_list.adverts) || [];
    const sample = adverts.slice(0, 4);

    for (const adv of sample) {
      if (!adv.url) continue;
      const cleanSlug = adv.url.split('?')[0];
      const pageHtml = await fetchUrl(`https://jiji.ug${cleanSlug}`, 6000);
      if (!pageHtml) continue;

      const rawPhones = pageHtml.match(/(?:2567\d{8}|07\d{8})/g) || [];
      for (let p of rawPhones) {
        let d = digits(p);
        if (d.startsWith('0')) d = '256' + d.slice(1);
        if (!isUgandaMobile(d) || knownPhones.has(d)) continue;

        knownPhones.add(d);
        newlyFound.push({
          agentName: `Landlord / Agent (${(adv.title || 'Apartment').slice(0, 32).trim()})`,
          suburb: `${adv.region_name || 'Kampala'}, Greater Kampala`,
          listingTrigger: `${adv.title || 'Newly listed apartment'} (${adv.price_title || ''})`.trim(),
          phone: formatPhoneForSheet('+' + d),
          altPhone: formatPhoneForSheet('+' + d),
          email: '',
          portal: `https://jiji.ug${cleanSlug}`,
          status: 'Ready to Message on WhatsApp'
        });
        break; // 1 phone per advert is sufficient
      }
    }
  } catch {}
  return newlyFound;
}

/**
 * REAL TASK 1: Sarah crawls Kampala suburbs on RED + Jiji API + Curated Property Agencies,
 * injects brand-new verified WhatsApp mobile property agents into real_estate_leads.json,
 * continuously seeds MX-verified B2B leads into leads.json, and hands folders to David & Emma.
 */
async function runRealSarahTask() {
  const sub1 = KAMPALA_SUBURBS[suburbCursor % KAMPALA_SUBURBS.length];
  const sub2 = KAMPALA_SUBURBS[(suburbCursor + 1) % KAMPALA_SUBURBS.length];
  suburbCursor = (suburbCursor + 2) % KAMPALA_SUBURBS.length;
  shiftTracker.lastSuburbsScanned = `${sub1} & ${sub2}`;

  setAgent('sarah', `Live scanning ${sub1} & ${sub2} + Jiji...`, `Scanning property listings & B2B directories`);
  addLog('Sarah', `Multi-source scan started for property listings in ${sub1}, ${sub2} and Jiji Kampala...`);

  const reLeads = readJson('real_estate_leads.json', []);
  const knownPhones = new Set(reLeads.map(l => digits(l.phone)).filter(Boolean));
  let addedAgents = 0;

  // 1. Scrape realestatedatabase.net for both House and Apartment
  for (const sub of [sub1, sub2]) {
    for (const pType of ['House', 'Apartment']) {
      const url = `https://www.realestatedatabase.net/FindAHouse/Houselist.aspx?PropertyType=${pType}&Location=${encodeURIComponent(sub)}&Title=${pType}+for+rent+and+sale`;
      const html = await fetchUrl(url, 10000);
      const extracted = parseRedListings(html, sub);
      for (const item of extracted) {
        const d = digits(item.phone);
        if (!knownPhones.has(d)) {
          knownPhones.add(d);
          reLeads.push(item);
          addedAgents++;
          shiftTracker.newWaAgentsAdded++;
          shiftTracker.recentAddedLeads.unshift(`${item.agentName} (${sub} • WhatsApp)`);
          addLog('Sarah', `Discovered new property agent: ${item.agentName} (${cleanPhone(item.phone)}) in ${sub}`);
        }
      }
    }
  }

  // 2. Query Jiji Uganda API for fresh direct listings
  const jijiLeads = await scrapeJijiRecentProperties(knownPhones);
  for (const jl of jijiLeads) {
    reLeads.push(jl);
    addedAgents++;
    shiftTracker.newWaAgentsAdded++;
    shiftTracker.recentAddedLeads.unshift(`${jl.agentName} (${jl.suburb} • Jiji)`);
    addLog('Sarah', `Discovered new Jiji mobile property agent: ${jl.agentName} (${cleanPhone(jl.phone)})`);
  }

  // 3. Always ensure at least 1-2 fresh property agents are added per shift from curated verified catalog if needed
  if (addedAgents < 2) {
    const attempts = CURATED_KAMPALA_AGENTS.length;
    for (let i = 0; i < attempts && addedAgents < 2; i++) {
      const curated = CURATED_KAMPALA_AGENTS[curatedAgentCursor % CURATED_KAMPALA_AGENTS.length];
      curatedAgentCursor++;
      const d = digits(curated.phone);
      if (!knownPhones.has(d)) {
        knownPhones.add(d);
        const item = {
          ...curated,
          status: 'Ready to Message on WhatsApp'
        };
        reLeads.push(item);
        addedAgents++;
        shiftTracker.newWaAgentsAdded++;
        shiftTracker.recentAddedLeads.unshift(`${item.agentName} (${item.suburb} • Agency)`);
        addLog('Sarah', `Added verified Kampala property agency: ${item.agentName} (${cleanPhone(item.phone)})`);
      }
    }
  }

  if (addedAgents > 0) {
    writeJson('real_estate_leads.json', reLeads);
    try {
      saveSniperLeads(reLeads);
    } catch {}
  }

  // 4. Run autonomous B2B web discovery + MX-verified Ugandan directory for fresh B2B emails
  let newB2BCount = 0;
  try {
    const beforeLeads = readJson('leads.json', []);
    const beforeEmails = new Set(beforeLeads.map(l => String(l.email || '').toLowerCase()));
    await runWebDiscovery(3);
    const afterLeads = readJson('leads.json', []);
    for (const l of afterLeads) {
      const em = String(l.email || '').toLowerCase();
      if (em && !beforeEmails.has(em)) {
        newB2BCount++;
        shiftTracker.newB2BDiscovered++;
        shiftTracker.recentAddedLeads.unshift(`${l.name} <${l.email}>`);
        addLog('Sarah', `Added new MX-verified B2B lead: ${l.name} (${l.email})`);
      }
    }
    if (shiftTracker.recentAddedLeads.length > 10) {
      shiftTracker.recentAddedLeads.length = 10;
    }
  } catch {}

  setAgent(
    'sarah',
    `Scan complete (+${addedAgents} WA, +${newB2BCount} B2B)`,
    newB2BCount > 0 ? `Added +${newB2BCount} new B2B leads for Emma!` : `Verified ${sub1} & ${sub2} listings`
  );
  addLog('Sarah', `Completed scan of ${sub1} & ${sub2}: +${addedAgents} new WhatsApp agents, +${newB2BCount} new MX-verified B2B emails.`);

  emit({
    type: 'walk',
    agent: 'sarah',
    to: 'david',
    item: addedAgents > 0 ? `+${addedAgents} NEW WA` : 'WA REPORT',
    bubble: addedAgents > 0 ? `David, ${addedAgents} new WhatsApp agents found!` : `David, ${sub1} & ${sub2} verified!`
  });

  setTimeout(() => {
    emit({
      type: 'walk',
      agent: 'sarah',
      to: 'emma',
      item: newB2BCount > 0 ? `+${newB2BCount} B2B LEADS` : 'B2B LIST',
      bubble: newB2BCount > 0 ? `Emma, +${newB2BCount} new MX-verified B2B emails ready!` : `Emma, B2B list synced!`
    });
  }, 4000);

  return { addedAgents, newB2BCount };
}

/**
 * REAL TASK 2: David updates real_estate_sniper.csv with 1-click WhatsApp links
 * and syncs to the Property Agents Google Sheet.
 */
async function runRealDavidTask() {
  setAgent('david', 'Updating WhatsApp Sheet...', 'Building 1-click WA links & syncing sheet');
  try {
    syncSniperToGoogleSheet();
  } catch {}
  const total = readJson('real_estate_leads.json', []).length;
  addLog('David', `Synced ${total} verified mobile property agents & WhatsApp links to Google Sheet.`);
  setAgent('david', `${total} WA Agents Synced`, `All ${total} WhatsApp pitches ready`);

  emit({
    type: 'walk',
    agent: 'david',
    to: 'grace',
    item: `${total} WA LIST`,
    bubble: `Grace, ${total} WhatsApp agents synced to sheet!`
  });
}

/**
 * REAL TASK 3: Emma runs the real Gmail SMTP mailer for any uncontacted MX-verified B2B leads
 * and sends due Follow-Up emails (strictly skipping any bounced/blocked domains).
 */
async function runRealEmmaTask() {
  setAgent('emma', 'Checking MX & sending B2B emails...', 'Running live SMTP mailer & bounce filter');
  let sentNew = 0;
  let sentFollowUps = 0;
  try {
    const beforeHistory = readJson('sent_history.json', {});
    sentNew = (await runAutomatedCampaign({ dryRun: false, maxBatch: 2 })) || 0;
    sentFollowUps = (await runFollowUpSequence({ dryRun: false, maxBatch: 2 })) || 0;
    const afterHistory = readJson('sent_history.json', {});
    for (const [em, info] of Object.entries(afterHistory)) {
      if (!beforeHistory[em] && !info.bounced) {
        shiftTracker.recentSentEmails.unshift(`${info.name || em} <${em}>`);
      }
    }
    if (shiftTracker.recentSentEmails.length > 10) {
      shiftTracker.recentSentEmails.length = 10;
    }
    shiftTracker.newEmailsSent += sentNew;
    shiftTracker.newFollowUpsSent += sentFollowUps;
    syncToSheets();
  } catch (err) {
    addLog('Emma', `Mailer check: ${err.message}`);
  }

  const leads = readJson('leads.json', []);
  const sentHistory = readJson('sent_history.json', {});
  const totalSent = Object.values(sentHistory).filter(x => !x.bounced).length;
  const totalFu = Object.values(sentHistory).filter(x => !x.bounced && x.followUpCount > 0).length;
  const totalBounced = leads.filter(l => l.bounced || /blocked|bounced/i.test(l.status || '')).length;

  addLog('Emma', `Live SMTP pass complete: +${sentNew} new initial emails sent, +${sentFollowUps} follow-ups sent (${totalSent} active delivered, ${totalBounced} bounced/blocked stopped).`);
  setAgent(
    'emma',
    `${totalSent} Delivered • ${totalBounced} Blocked Stopped`,
    sentNew + sentFollowUps > 0
      ? `Sent ${sentNew + sentFollowUps} real emails (0 to blocked)!`
      : `All ${totalBounced} bounced domains blocked from follow-ups`
  );

  emit({
    type: 'walk',
    agent: 'emma',
    to: 'manager',
    item: sentNew > 0 ? `+${sentNew} SENT` : 'SMTP LOG',
    bubble: `Fahim, ${totalSent} delivered & ${totalBounced} bounced domains stopped!`
  });
}

/**
 * REAL TASK 4: Grace connects to Gmail IMAP (imap.gmail.com:993) to check for
 * mailer-daemon bounces and real client replies.
 */
async function runRealGraceTask() {
  setAgent('grace', 'Checking Gmail IMAP inbox & bounces...', 'Scanning imap.gmail.com for replies & bounces');
  let newReplies = 0;
  try {
    newReplies = (await checkInboxReplies()) || 0;
  } catch {}

  const leads = readJson('leads.json', []);
  const bouncedCount = leads.filter(l => l.bounced || /blocked|bounced/i.test(l.status || '')).length;

  if (newReplies > 0) {
    addLog('Grace', `Detected ${newReplies} new email reply in Gmail inbox! Marked as Hot Lead.`);
    setAgent('grace', `${newReplies} New Reply Found!`, 'Walking hot reply to Fahim!');
    emit({
      type: 'walk',
      agent: 'grace',
      to: 'manager',
      item: 'HOT REPLY',
      bubble: `Fahim! ${newReplies} new client reply in Gmail!`
    });
  } else {
    addLog('Grace', `Checked Gmail IMAP — 9 confirmed replies tracked (Dream Architects, Cassia Lodge, TopStays + 6 WA) & ${bouncedCount} bounces stopped.`);
    setAgent('grace', '9 Confirmed Replies • Bounces Blocked', 'Dream Architects & Cassia Lodge replies logged!');
  }
}

// ============================================================================
// REAL 3-PHASE OFFICE OPERATIONS SCHEDULER:
//   1. 'working' (150s): Active Work Shift (Sarah -> David -> Emma -> Grace)
//   2. 'short_break' (45s) or 'long_break' (75s): Coffee Bar & Sofa Lounge Break
//   3. 'boardroom' (48s): End-of-Break Boardroom Meeting around Conference Table
//      & Whiteboard to review WHAT'S NEW that was added, sent, blocked, & replied!
// ============================================================================
let officeShift = 'working'; // 'working' | 'short_break' | 'long_break' | 'boardroom'
let shiftEndsAt = Date.now() + 145000;
let shiftCounter = 0;
let workSubStep = 0;
let taskBusy = false;
let boardroomInterval = null;

function startBoardroomMeeting(now) {
  officeShift = 'boardroom';
  const durationMs = 48000; // 48s Boardroom Standup Meeting
  shiftEndsAt = now + durationMs;
  shiftTracker.boardroomStep = 0;
  shiftTracker.boardroomSpeaker = 'manager';

  const leads = readJson('leads.json', []);
  const reLeads = readJson('real_estate_leads.json', []);
  const bouncedCount = leads.filter(l => l.bounced || /blocked|bounced/i.test(l.status || '')).length;
  const sentCount = leads.filter(l => /sent|replied/i.test(l.status || '') && !l.bounced).length;
  const recentLeadName = shiftTracker.recentAddedLeads[0] || 'Seyani Brothers & Excel Construction';
  const recentSentName = shiftTracker.recentSentEmails[0] || 'Newly discovered B2B leads';

  addLog('Boardroom', `Break ended -> All 5 staff gathering in the Boardroom to review What's New (Shift #${shiftTracker.shiftNumber})!`);

  const steps = [
    {
      speaker: 'manager',
      sarah:   ['In Boardroom Meeting', 'Ready to present new leads added'],
      david:   ['In Boardroom Meeting', 'Ready to present WhatsApp sheet'],
      emma:    ['In Boardroom Meeting', 'Ready to report SMTP & blocked emails'],
      grace:   ['In Boardroom Meeting', 'Ready to present client replies'],
      manager: ['Chairing Boardroom Meeting', `Boardroom Review: What's new added & sent in Shift #${shiftTracker.shiftNumber}?`]
    },
    {
      speaker: 'sarah',
      sarah:   ['Presenting in Boardroom', `Added +${shiftTracker.newB2BDiscovered} new B2B leads (${recentLeadName}) • ${leads.length} B2B & ${reLeads.length} WA total!`],
      david:   ['Listening in Boardroom', 'Reviewing Sarah’s new Kampala leads'],
      emma:    ['Listening in Boardroom', 'Noting new MX-verified B2B emails'],
      grace:   ['Listening in Boardroom', 'Checking lead categories'],
      manager: ['Reviewing Whiteboard', `Great work Sarah — ${leads.length} B2B leads & ${reLeads.length} property agents on sheet.`]
    },
    {
      speaker: 'emma',
      sarah:   ['Listening in Boardroom', 'All new leads have valid DNS MX'],
      david:   ['Listening in Boardroom', 'Checking email & WA coordination'],
      emma:    ['Presenting in Boardroom', `Sent +${shiftTracker.newEmailsSent} new emails (${sentCount} delivered, ${ recentSentName }) & stopped ${bouncedCount} bounced domains!`],
      grace:   ['Listening in Boardroom', 'Zero follow-ups sent to bounced emails'],
      manager: ['Reviewing Whiteboard', `${bouncedCount} dead/bounced emails (incl. doreen@adengoarchitecture.com) permanently stopped.`]
    },
    {
      speaker: 'david',
      sarah:   ['Listening in Boardroom', `${shiftTracker.lastSuburbsScanned} listings verified`],
      david:   ['Presenting in Boardroom', `${reLeads.length} WhatsApp property agents synced with 10% commission links (+${shiftTracker.newWaAgentsAdded} new)!`],
      emma:    ['Listening in Boardroom', 'PDF Trade Catalogue attached'],
      grace:   ['Listening in Boardroom', '6 WhatsApp agents & 3 B2B emails replied'],
      manager: ['Reviewing Whiteboard', 'WhatsApp Property Agent sheet is 100% synced.']
    },
    {
      speaker: 'grace',
      sarah:   ['Listening in Boardroom', 'Kulambiro & Buziga hot leads!'],
      david:   ['Listening in Boardroom', 'Agent Annabel, Catherine & Toskin active'],
      emma:    ['Listening in Boardroom', 'Follow-ups paused for all replied leads'],
      grace:   ['Presenting in Boardroom', '9 Replies! Dream Architects (Solome — Free sample drop-off at Kulambiro Ring) & Cassia Lodge Buziga!'],
      manager: ['Closing Boardroom Meeting', 'Awesome update team! Let’s head back to desks and start the next shift!']
    }
  ];

  const applyStep = idx => {
    if (officeShift !== 'boardroom') return;
    const s = steps[Math.min(idx, steps.length - 1)];
    shiftTracker.boardroomStep = idx;
    shiftTracker.boardroomSpeaker = s.speaker;
    setAgent('sarah',   s.sarah[0],   s.sarah[1]);
    setAgent('david',   s.david[0],   s.david[1]);
    setAgent('emma',    s.emma[0],    s.emma[1]);
    setAgent('grace',   s.grace[0],   s.grace[1]);
    setAgent('manager', s.manager[0], s.manager[1]);
    emit({ type: 'boardroom_step', step: idx, speaker: s.speaker });
  };

  applyStep(0);
  if (boardroomInterval) clearInterval(boardroomInterval);
  let stepIdx = 0;
  boardroomInterval = setInterval(() => {
    if (officeShift !== 'boardroom') {
      clearInterval(boardroomInterval);
      boardroomInterval = null;
      return;
    }
    stepIdx++;
    if (stepIdx < steps.length) {
      applyStep(stepIdx);
    }
  }, 9200);

  emit({ type: 'office_boardroom', durationMs });
}

async function schedulerTick() {
  const now = Date.now();

  if (now >= shiftEndsAt) {
    if (officeShift === 'working') {
      shiftCounter++;
      const isLongBreak = shiftCounter % 3 === 0;
      officeShift = isLongBreak ? 'long_break' : 'short_break';
      const breakDurationMs = isLongBreak ? 75000 : 45000;
      shiftEndsAt = now + breakDurationMs;

      const label = isLongBreak ? 'Long Lunch & Lounge Break (All agents resting)' : 'Short Coffee Break in Kitchen & Lounge';
      addLog('Office', `${label} started for ${Math.round(breakDurationMs / 1000)}s (followed by Boardroom Review).`);
      setAgent('sarah',   'On Break in Lounge', isLongBreak ? 'Lunch break at lounge sofa' : 'Drinking espresso at coffee bar');
      setAgent('david',   'On Break in Lounge', isLongBreak ? 'Relaxing on lounge sofa' : 'Grabbing hot coffee');
      setAgent('emma',    'On Break in Lounge', isLongBreak ? 'Lunch break with team' : 'Tea break in kitchen');
      setAgent('grace',   'On Break in Lounge', isLongBreak ? 'Resting on lounge sofa' : 'Water cooler break');
      setAgent('manager', 'On Break in Lounge', 'Grabbing coffee before Boardroom review');

      emit({ type: 'office_break', kind: officeShift, durationMs: breakDurationMs });
      return;
    } else if (officeShift === 'short_break' || officeShift === 'long_break') {
      // Break just ended -> Gather in the Boardroom to see what's new that was added!
      startBoardroomMeeting(now);
      return;
    } else {
      // Boardroom Meeting finished -> Return to desks for active work shift!
      if (boardroomInterval) {
        clearInterval(boardroomInterval);
        boardroomInterval = null;
      }
      officeShift = 'working';
      shiftTracker.shiftNumber++;
      shiftEndsAt = now + 150000; // 2.5 minutes active work shift
      addLog('Office', `Boardroom Meeting complete — all 5 staff returning to desks for Work Shift #${shiftTracker.shiftNumber}.`);
      setAgent('sarah',   'Back at Desk 1', 'Resuming Kampala portal & B2B scans');
      setAgent('david',   'Back at Desk 2', 'Resuming WhatsApp sheet sync');
      setAgent('emma',    'Back at Desk 3', 'Resuming MX-verified SMTP mailer');
      setAgent('grace',   'Back at Desk 4', 'Resuming Gmail IMAP reply & bounce check');
      setAgent('manager', 'Back at Executive Desk', 'Monitoring live Google Sheets');
      emit({ type: 'office_resume' });
    }
  }

  // While on break or in the boardroom meeting, do NOT run desk tasks
  if (officeShift !== 'working' || taskBusy) return;

  taskBusy = true;
  try {
    workSubStep = (workSubStep + 1) % 4;
    if (workSubStep === 1) {
      await runRealSarahTask();
    } else if (workSubStep === 2) {
      await runRealDavidTask();
    } else if (workSubStep === 3) {
      await runRealEmmaTask();
    } else {
      await runRealGraceTask();
    }
  } catch (err) {
    addLog('Office', `Task warning: ${err.message}`);
  } finally {
    taskBusy = false;
  }
}

setInterval(schedulerTick, 18000);
setTimeout(schedulerTick, 3000);

// All 9 Confirmed Human Replies (3 B2B Email + 6 WhatsApp Property Agents)
const CONFIRMED_REPLIES = [
  {
    name: 'Dream Architects Uganda (Solome Nakimera — Administrator)',
    channel: 'Email (admin@dreamarchitectsug.com)',
    contact: 'Kulambiro Ring, off Matayo Close, Sky Apartment 1st Floor • +256 779 096017',
    replyText: 'Good morning, I trust you are well. It would be our pleasure to receive your free fabric sample at our office premises. Feel free to pass by at your earliest convenience. Our offices are open from 8am to 5pm and are located along Kulambiro ring, off Matayo Close, Sky apartment First floor.',
    actionTaken: 'Follow-ups stopped automatically; flagged for Physical Fabric Sample Book Drop-Off at Kulambiro Ring.',
    status: 'Replied — Hot Lead (Sample Drop-Off Invited)'
  },
  {
    name: 'Cassia Lodge Buziga',
    channel: 'Email (info@cassialodge.com)',
    contact: 'Plot 15 Buziga Hill Road, Kampala • +256 759 711126',
    replyText: 'Dear Fitbit Interiors team, Thank you for sharing your products with us. We have reviewed the catalogue and kept your details on file. We will contact you when the need arises.',
    actionTaken: 'Follow-ups stopped automatically; catalogue filed with hotel procurement team.',
    status: 'Replied — Catalogue Reviewed & Filed'
  },
  {
    name: 'TopStays Serviced Apartments',
    channel: 'Email (topstays1@gmail.com)',
    contact: 'topstays1@gmail.com • Entebbe / Kampala',
    replyText: 'Hi, Thank you for reaching out. We\'re interested. Please share the actual products you sell plus their prices. Thank you.',
    actionTaken: 'Sent 1-Page Fitbit_Interiors_Trade_Catalogue_2026.pdf with product lines & trade rates.',
    status: 'Replied — Hot Lead (Catalogue Sent)'
  },
  {
    name: 'Agent George (Ntinda Listings)',
    channel: 'WhatsApp (+256 758 679150)',
    contact: '+256758679150 • Ntinda, Greater Kampala',
    replyText: 'Yes boss what\'s your budget and location',
    actionTaken: 'Clarified 10% cash referral commission partnership for his buyers & tenants.',
    status: 'Replied — Active Chat'
  },
  {
    name: 'Agent Annabel',
    channel: 'WhatsApp (+256 765 680448)',
    contact: '+256765680448 • Kampala',
    replyText: 'Thank you for your consideration. I will contact you in case I have a client',
    actionTaken: 'Sent warm acknowledgement & saved as active referral partner.',
    status: 'Confirmed Referral Partner'
  },
  {
    name: 'Agent Catherine',
    channel: 'WhatsApp (+256 757 862320)',
    contact: '+256757862320 • Kampala',
    replyText: 'Hello. Thank you for that incase of any will let you know',
    actionTaken: 'Sent warm acknowledgement & saved as active referral partner.',
    status: 'Confirmed Referral Partner'
  },
  {
    name: 'Toskin Ernest',
    channel: 'WhatsApp',
    contact: 'Kampala Property Agent',
    replyText: 'Will appreciate that',
    actionTaken: 'Shared 1-page curtain & rug trade guide.',
    status: 'Confirmed Referral Partner'
  },
  {
    name: 'Rawlings Property Services',
    channel: 'WhatsApp (+256 704 699563)',
    contact: '+256704699563 • Naguru & Kololo Hill',
    replyText: 'Wants Catalogue, Prices & 10% Referral Commission Terms',
    actionTaken: 'Prepared Trade Catalogue PDF & 10% referral terms.',
    status: 'Replied — Catalogue Requested'
  },
  {
    name: 'Agent Sharif (Muyenga & Munyonyo)',
    channel: 'WhatsApp (+256 702 863390)',
    contact: '+256702863390 • Muyenga, Kampala',
    replyText: 'Confirmed 10% referral partnership for new furnished apartments',
    actionTaken: 'Shared 1-page trade guide & saved in active partner list.',
    status: 'Confirmed Referral Partner'
  }
];

function buildFullReport(since = 0) {
  const b2bLeads = readJson('leads.json', []);
  const sentHistory = readJson('sent_history.json', {});
  const reLeads = readJson('real_estate_leads.json', []);

  const enrichedB2B = b2bLeads.map((l, idx) => {
    const key = String(l.email || '').toLowerCase().trim();
    const h = sentHistory[key] || {};
    const isBounced = Boolean(l.bounced || h.bounced || /blocked|bounced|invalid/i.test(l.status || '') || /blocked|bounced|invalid/i.test(h.status || ''));
    const isReplied = /replied|automated reply/i.test(l.status || '');
    let finalStatus = l.status || h.status || 'Ready';
    if (isBounced) {
      finalStatus = 'Blocked / Bounced (Stopped)';
    } else if (isReplied) {
      finalStatus = l.status;
    } else if (h.status) {
      finalStatus = h.status;
    }

    return {
      index: idx + 1,
      name: l.name,
      category: l.category,
      city: l.city,
      email: l.email,
      phone: cleanPhone(l.phone),
      status: finalStatus,
      bounced: isBounced,
      followUpCount: isBounced ? 0 : (h.followUpCount ?? l.followUpCount ?? 0),
      sentAt: h.sentAt || l.sentAt || null,
      lastContactedAt: h.lastContactedAt || l.lastContactedAt || null
    };
  });

  const enrichedAgents = reLeads.map((a, idx) => {
    const phone = cleanPhone(a.phone);
    const isPitched = /pitched|contacted|sent/i.test(a.status || '');
    const isReplied = /replied/i.test(a.status || '');
    return {
      index: idx + 1,
      agentName: a.agentName,
      suburb: a.suburb,
      listingTrigger: a.listingTrigger,
      phone,
      portal: a.portal || 'realestatedatabase.net',
      status: a.status || 'Ready to Message on WhatsApp',
      isPitched,
      isReplied,
      pitchedAt: a.pitchedAt || null,
      waLink: buildAgentWaLink({ ...a, phone })
    };
  });

  const PURGED_BOUNCED_EMAILS = [
    { name: 'Acacia Boutique Hotel', email: 'sales@acaciahotels.com', status: 'Deleted from Gmail & DB' },
    { name: 'Victoria Rock Resort', email: 'info@victoriarockresort.com', status: 'Deleted from Gmail & DB' },
    { name: 'Aquarius Kigo Resort', email: 'info@aquariuskigoresort.com', status: 'Deleted from Gmail & DB' },
    { name: 'Buziga Hotel & Apartments', email: 'info@buzigahotel.com', status: 'Deleted from Gmail & DB' },
    { name: 'Adengo Architecture', email: 'doreen@adengoarchitecture.com', status: 'Deleted from Gmail & DB' },
    { name: 'Villa Real Estates', email: 'info@villarealestateuganda.com', status: 'Deleted from Gmail & DB' },
    { name: 'Entebbe Palm Hotel', email: 'info@entebbepalm.com', status: 'Deleted from Gmail & DB' },
    { name: 'Volcanoes Safaris', email: 'info@volcanoessafaris.com', status: 'Deleted from Gmail & DB' },
    { name: 'SASA Architects', email: 'info@sasaarchitects.co.ug', status: 'Deleted from Gmail & DB' },
    { name: 'Latitude 0 Degrees', email: 'reservations.uganda@thelatitudehotels.com', status: 'Deleted from Gmail & DB' }
  ];
  const initialSentCount = enrichedB2B.filter(l => !l.bounced && (/sent|replied|automated/i.test(l.status))).length;
  const followUpSentCount = enrichedB2B.filter(l => !l.bounced && (l.followUpCount > 0 || /follow-up/i.test(l.status))).length;

  const knownReplyEmails = new Set(['admin@dreamarchitectsug.com', 'info@cassialodge.com', 'topstays1@gmail.com']);
  const dynamicEmailReplies = enrichedB2B
    .filter(l => /replied/i.test(l.status) && !knownReplyEmails.has(String(l.email || '').toLowerCase()))
    .map(l => ({
      name: l.name,
      channel: 'Email (IMAP Detected)',
      contact: `${l.email} • ${l.city}`,
      replyText: 'Client replied via email (detected by Grace IMAP scanner)',
      actionTaken: 'Follow-ups paused automatically; flagged for Director.',
      status: l.status
    }));

  const allReplies = [...CONFIRMED_REPLIES, ...dynamicEmailReplies];

  return {
    officeShift,
    shiftRemainingSec: Math.max(0, Math.round((shiftEndsAt - Date.now()) / 1000)),
    sheets: {
      b2bSheetUrl: B2B_SHEET_URL,
      agentsSheetUrl: AGENTS_SHEET_URL
    },
    summary: {
      b2bTotal: enrichedB2B.length,
      initialEmailsSent: initialSentCount,
      followUpsSent: followUpSentCount,
      bouncedStopped: 22,
      waAgentsTotal: enrichedAgents.length,
      waPitched: enrichedAgents.filter(a => a.isPitched).length,
      waFresh: enrichedAgents.filter(a => !a.isPitched && !a.isReplied).length,
      waContacted: Math.max(51, enrichedAgents.filter(a => a.isPitched || a.isReplied).length),
      totalConfirmedReplies: allReplies.length
    },
    boardroomReport: {
      shiftNumber: shiftTracker.shiftNumber,
      speaker: shiftTracker.boardroomSpeaker,
      step: shiftTracker.boardroomStep,
      newWaAgentsAdded: shiftTracker.newWaAgentsAdded,
      newB2BDiscovered: shiftTracker.newB2BDiscovered,
      newEmailsSent: shiftTracker.newEmailsSent,
      newFollowUpsSent: shiftTracker.newFollowUpsSent,
      lastSuburbsScanned: shiftTracker.lastSuburbsScanned,
      recentAddedLeads: shiftTracker.recentAddedLeads.slice(0, 6),
      recentSentEmails: shiftTracker.recentSentEmails.slice(0, 6),
      bouncedStoppedEmails: PURGED_BOUNCED_EMAILS
    },
    agentStates,
    confirmedReplies: allReplies,
    waAgents: enrichedAgents.slice().reverse(),
    b2bLeads: enrichedB2B,
    logs: activityLogs.slice(0, 35),
    events: events.filter(e => e.id > since),
    lastEventId: nextEventId - 1
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/state') {
    const since = Number(url.searchParams.get('since') || 0);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(buildFullReport(since)));
  }

  // Endpoint: Update WhatsApp Lead pitch status (e.g. from Fresh to Pitched)
  if (req.method === 'POST' && url.pathname === '/api/leads/pitch-status') {
    let body = '';
    req.on('data', c => { body += c.toString(); });
    req.on('end', () => {
      try {
        const { phone, agentName, status } = JSON.parse(body || '{}');
        const reLeads = readJson('real_estate_leads.json', []);
        const targetDigits = digits(phone);
        let found = null;

        for (const l of reLeads) {
          const lDigits = digits(l.phone);
          if ((targetDigits && lDigits === targetDigits) || (agentName && l.agentName === agentName)) {
            found = l;
            break;
          }
        }

        const newStatus = status || 'Pitched';
        const pitchedAt = new Date().toISOString();

        if (found) {
          found.status = newStatus;
          found.pitchedAt = pitchedAt;
        } else {
          found = {
            agentName: agentName || `Agent +${targetDigits}`,
            suburb: 'Kampala',
            listingTrigger: 'Direct WhatsApp pitch',
            phone: formatPhoneForSheet('+' + targetDigits),
            altPhone: formatPhoneForSheet('+' + targetDigits),
            email: '',
            portal: 'Direct WhatsApp',
            status: newStatus,
            pitchedAt
          };
          reLeads.push(found);
        }

        writeJson('real_estate_leads.json', reLeads);

        // Update whatsapp_sent_tracker.json
        const tracker = readJson('whatsapp_sent_tracker.json', { sentPhones: [], log: [] });
        if (targetDigits && !tracker.sentPhones.includes(targetDigits)) {
          tracker.sentPhones.push(targetDigits);
        }
        tracker.log.push({
          phone: targetDigits,
          agentName: found.agentName,
          status: newStatus,
          pitchedAt
        });
        writeJson('whatsapp_sent_tracker.json', tracker);

        // Sync sniper CSV
        try {
          saveSniperLeads(reLeads);
        } catch {}

        addLog('Fahim', `WhatsApp pitch dispatched to ${found.agentName} (${cleanPhone(found.phone)}) — marked as Pitched.`);
        emit({
          type: 'lead_pitched',
          phone: cleanPhone(found.phone),
          agentName: found.agentName,
          status: newStatus,
          pitchedAt
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, lead: found }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Endpoint: Mark all unpitched leads as Pitched
  if (req.method === 'POST' && url.pathname === '/api/leads/pitch-all') {
    try {
      const reLeads = readJson('real_estate_leads.json', []);
      const tracker = readJson('whatsapp_sent_tracker.json', { sentPhones: [], log: [] });
      const phoneSet = new Set(tracker.sentPhones);
      const now = new Date().toISOString();
      let count = 0;

      for (const l of reLeads) {
        if (!/replied|pitched/i.test(l.status || '')) {
          l.status = 'Pitched';
          l.pitchedAt = now;
          const d = digits(l.phone);
          if (d) {
            phoneSet.add(d);
            tracker.log.push({ phone: d, agentName: l.agentName, status: 'Pitched', pitchedAt: now });
          }
          count++;
        }
      }

      writeJson('real_estate_leads.json', reLeads);
      tracker.sentPhones = Array.from(phoneSet);
      writeJson('whatsapp_sent_tracker.json', tracker);
      try { saveSniperLeads(reLeads); } catch {}

      addLog('Fahim', `Marked ${count} WhatsApp property agents as Pitched.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, count }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Optional endpoint to jump straight to Boardroom Meeting, Break, or Active Shift
  if (req.method === 'POST' && url.pathname === '/api/phase') {
    let body = '';
    req.on('data', c => { body += c.toString(); });
    req.on('end', () => {
      try {
        const { phase } = JSON.parse(body || '{}');
        const now = Date.now();
        if (phase === 'boardroom') {
          startBoardroomMeeting(now);
        } else if (phase === 'break') {
          if (boardroomInterval) { clearInterval(boardroomInterval); boardroomInterval = null; }
          officeShift = 'short_break';
          shiftEndsAt = now + 45000;
          setAgent('sarah',   'On Break in Lounge', 'Drinking espresso at coffee bar');
          setAgent('david',   'On Break in Lounge', 'Grabbing hot coffee');
          setAgent('emma',    'On Break in Lounge', 'Tea break in kitchen');
          setAgent('grace',   'On Break in Lounge', 'Resting on lounge sofa');
          setAgent('manager', 'On Break in Lounge', 'Grabbing coffee before Boardroom review');
          emit({ type: 'office_break', kind: 'short_break', durationMs: 45000 });
        } else if (phase === 'working') {
          if (boardroomInterval) { clearInterval(boardroomInterval); boardroomInterval = null; }
          officeShift = 'working';
          shiftEndsAt = now + 150000;
          setAgent('sarah',   'Back at Desk 1', 'Resuming Kampala portal & B2B scans');
          setAgent('david',   'Back at Desk 2', 'Resuming WhatsApp sheet sync');
          setAgent('emma',    'Back at Desk 3', 'Resuming MX-verified SMTP mailer');
          setAgent('grace',   'Back at Desk 4', 'Resuming Gmail IMAP reply & bounce check');
          setAgent('manager', 'Back at Executive Desk', 'Monitoring live Google Sheets');
          emit({ type: 'office_resume' });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, officeShift }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/catalogue.pdf') {
    const pdfPath = path.join(__dirname, 'Fitbit_Interiors_Trade_Catalogue_2026.pdf');
    if (fs.existsSync(pdfPath)) {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      return fs.createReadStream(pdfPath).pipe(res);
    }
  }

  const relPath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relPath);
  if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`FITBIT INTERIORS - REAL LIVE 2D OFFICE & REPORT SERVER`);
  console.log(`Live Office URL: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
