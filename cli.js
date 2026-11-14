require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const {
  syncToSheets,
  generateEmail,
  generateFollowUpEmail,
  formatPhoneForSheet,
  generateWhatsAppLeadLink
} = require('./sync');
const { sendTestEmail, runAutomatedCampaign, runFollowUpSequence } = require('./mailer');
const { scrapeWebsiteUrl, runWebDiscovery } = require('./scraper');
const { checkInboxReplies } = require('./reply_checker');
const { generateTradeCataloguePdf, CATALOG_PATH } = require('./catalog_generator');
const { runDailyAutonomousCycle } = require('./scheduler');
const { scrapeRealEstatePortals, loadSniperLeads, buildRealEstateWhatsAppLink } = require('./real_estate_sniper');
const { generateQuotationPdf, PRICING_RATES } = require('./quote_generator');
const { dispatchWhatsAppOutreach } = require('./whatsapp_dispatcher');
const { scrapeJijiPropertyLeads } = require('./jiji_scraper');

const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA/edit';
const leadsPath = path.join(__dirname, 'leads.json');
const envPath = path.join(__dirname, '.env');
const previewHtmlPath = path.join(__dirname, 'sample_email_preview.html');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function loadLeads() {
  return JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
}

function saveLeads(leads) {
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
}

function saveEnvVar(key, val) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${val}`);
  } else {
    content += `\n${key}=${val}\n`;
  }
  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
  process.env[key] = val;
}

async function ensureAppPassword() {
  if (process.env.SMTP_APP_PASSWORD && process.env.SMTP_APP_PASSWORD !== 'your_16_char_app_password_here') {
    return process.env.SMTP_APP_PASSWORD;
  }

  console.log('\n[!] Gmail App Password is required for live email sending & IMAP reply detection.');
  console.log('    1. Go to: https://myaccount.google.com/apppasswords');
  console.log('    2. Create an App Password (requires 2-Step Verification enabled on your Google Account).');
  const entered = (await prompt('    Paste your 16-character Gmail App Password (or press Enter to cancel): ')).trim();
  if (!entered) return null;

  const cleanPass = entered.replace(/\s+/g, '');
  saveEnvVar('SMTP_EMAIL', process.env.SMTP_EMAIL || 'sseguyafahim1@gmail.com');
  saveEnvVar('SMTP_APP_PASSWORD', cleanPass);
  console.log('[+] Saved credentials to .env for future automated runs.');
  return cleanPass;
}

async function listLeads() {
  const leads = loadLeads();
  console.log(`\n======================================================================`);
  console.log(`   FITBIT INTERIORS — CLIENT LEADS (${leads.length} Active Prospects)`);
  console.log(`======================================================================`);
  leads.forEach((l, i) => {
    const waLink = generateWhatsAppLeadLink(l);
    console.log(`${(i + 1).toString().padStart(2, ' ')}. [${l.status || 'Ready'}] ${l.name} (${l.category})`);
    console.log(`    Location : ${l.city} | Email: ${l.email} | Phone: ${l.phone}`);
    console.log(`    WhatsApp : ${waLink.slice(0, 68)}...`);
    console.log(`    Angle    : ${l.pitch_angle}\n`);
  });
}

async function previewPitch() {
  const leads = loadLeads();
  console.log(`\nSelect preview mode:`);
  console.log(`  - Enter lead number (1-${leads.length}) for Initial Email`);
  console.log(`  - Type 'f1' for Day-4 Follow-Up #1 sample`);
  console.log(`  - Type 'f2' for Day-10 Follow-Up #2 sample`);
  console.log(`  - Type 'html' to open the visual HTML email in your browser`);
  console.log(`  - Type 'pdf' to open the 1-Page PDF Trade Catalogue`);
  const ans = (await prompt('> ')).trim().toLowerCase();

  if (ans === 'html') {
    const sample = generateEmail(leads[0]);
    fs.writeFileSync(previewHtmlPath, sample.html, 'utf8');
    console.log(`Opening visual email preview in browser: ${previewHtmlPath}`);
    exec(`start "" "${previewHtmlPath}"`);
    return;
  }

  if (ans === 'pdf') {
    await generateTradeCataloguePdf(process.env.BUSINESS_WHATSAPP || '+256751567860');
    console.log(`Opening 1-Page PDF Catalogue: ${CATALOG_PATH}`);
    exec(`start "" "${CATALOG_PATH}"`);
    return;
  }

  if (ans === 'f1' || ans === 'f2') {
    const step = ans === 'f1' ? 1 : 2;
    const sampleLead = leads[0];
    const { subject, body } = generateFollowUpEmail(sampleLead, step);
    console.log('\n' + '='.repeat(72));
    console.log(`FOLLOW-UP STEP #${step} SAMPLE FOR: ${sampleLead.name} <${sampleLead.email}>`);
    console.log(`SUBJECT: ${subject}`);
    console.log('-'.repeat(72));
    console.log(body);
    console.log('='.repeat(72));
    return;
  }

  const idx = parseInt(ans, 10) - 1;
  if (idx >= 0 && idx < leads.length) {
    const l = leads[idx];
    const { subject, body } = generateEmail(l);
    console.log('\n' + '='.repeat(72));
    console.log(`TO      : ${l.name} <${l.email}>`);
    console.log(`CATEGORY: ${l.category}`);
    console.log(`LOCATION: ${l.city}`);
    console.log(`SUBJECT : ${subject}`);
    console.log(`ATTACHED: Fitbit_Interiors_Trade_Catalogue_2026.pdf`);
    console.log('-'.repeat(72));
    console.log(body);
    console.log('='.repeat(72));
  } else {
    console.log('[!] Invalid selection.');
  }
}

async function discoverMoreLeadsMenu() {
  console.log('\n--- Wide Market Web Lead Discovery Engine (8 Sectors Across Uganda) ---');
  console.log('1. Search ALL 8 Sectors Across Uganda');
  console.log('2. Hotels, Resorts, Safari Lodges & Guest Houses (Kampala, Entebbe, Jinja, Mbarara, Fort Portal)');
  console.log('3. Airbnb, Furnished Apartments & Short-Stay Suites');
  console.log('4. Real Estate Developers, Condominiums & Property Agencies');
  console.log('5. Interior Designers, Decorators & Architecture Studios');
  console.log('6. Construction Companies & Commercial Fit-Out Contractors');
  console.log('7. Private Hospitals, Specialist Clinics & Medical Centers');
  console.log('8. International Schools, Universities & Boarding Schools');
  console.log('9. Corporate Offices, NGOs & Event/Conference Venues');
  console.log('10. Scan a Specific Website URL to Extract Emails & Phone Numbers');
  const sub = (await prompt('Select discovery mode (1-10): ')).trim();

  if (sub === '1') {
    await runWebDiscovery(null);
  } else if (['2', '3', '4', '5', '6', '7', '8', '9'].includes(sub)) {
    await runWebDiscovery(parseInt(sub, 10) - 2);
  } else if (sub === '10') {
    const targetUrl = (await prompt('Enter website URL (e.g. https://imperialhotels.co.ug): ')).trim();
    if (!targetUrl) return;
    const city = (await prompt('City / Area (default: Kampala): ')).trim() || 'Kampala, Uganda';
    const scraped = await scrapeWebsiteUrl(targetUrl, 'Serviced Apartments & Boutique Hotels', city);
    console.log(`\n[+] Scan Result for ${scraped.name}:`);
    console.log(`    Emails Found: ${scraped.allEmails.join(', ') || 'None found on page'}`);
    console.log(`    Phone Found : ${scraped.phone}`);
    if (scraped.email) {
      const saveAns = (await prompt('Add this lead to database and sync to Google Sheets? (y/n): ')).trim().toLowerCase();
      if (saveAns === 'y') {
        const leads = loadLeads();
        leads.push({
          name: scraped.name,
          category: scraped.category,
          city: scraped.city,
          email: scraped.email,
          phone: scraped.phone,
          website: scraped.website,
          status: 'Ready for Automated Dispatch',
          pitch_angle: scraped.pitch_angle,
          notes: scraped.notes
        });
        saveLeads(leads);
        syncToSheets();
      }
    }
  }
}

async function configureWhatsAppAndPdf() {
  console.log('\n--- Configure Fitbit Interiors WhatsApp & Regenerate PDF Catalogue ---');
  const currentWa = process.env.BUSINESS_WHATSAPP || '+256751567860';
  console.log(`Current Business WhatsApp Number: ${currentWa}`);
  const entered = (await prompt('Enter your Fitbit Interiors WhatsApp number (e.g. +256751231234): ')).trim();
  if (entered) {
    const clean = entered.replace(/["'\s-]/g, '');
    const withPlus = clean.startsWith('+') ? clean : `+${clean}`;
    saveEnvVar('BUSINESS_WHATSAPP', withPlus);
    console.log(`[+] Updated BUSINESS_WHATSAPP to ${withPlus}`);
  }
  await generateTradeCataloguePdf(process.env.BUSINESS_WHATSAPP || '+256751567860');
  syncToSheets();
}

async function addNewLead() {
  console.log('\n--- Add New Potential Client ---');
  const name = (await prompt('Company / Business Name: ')).trim();
  if (!name) {
    console.log('[!] Name is required.');
    return;
  }

  console.log('Select Category:');
  console.log('1. Interior Designers & Decorators');
  console.log('2. Serviced Apartments & Boutique Hotels');
  console.log('3. Real Estate Developers & Property Managers');
  console.log('4. Corporate Offices & Commercial Spaces');
  const catChoice = (await prompt('Choice (1-4): ')).trim();
  const catMap = {
    '1': 'Interior Designers & Decorators',
    '2': 'Serviced Apartments & Boutique Hotels',
    '3': 'Real Estate Developers & Property Managers',
    '4': 'Corporate Offices & Commercial Spaces'
  };
  const category = catMap[catChoice] || 'Interior Designers & Decorators';

  const city = (await prompt('City / Area (default: Kampala): ')).trim() || 'Kampala';
  const email = (await prompt('Email address: ')).trim();
  const rawPhone = (await prompt('Phone / WhatsApp (e.g. +256751231234): ')).trim();
  const phone = formatPhoneForSheet(rawPhone);
  const website = (await prompt('Website / Instagram: ')).trim();
  const pitch_angle = (await prompt('Specific pitch angle (optional): ')).trim() || 'Custom Curtain & Soft Furnishing Partnership';
  const notes = (await prompt('Internal notes (optional): ')).trim();

  const leads = loadLeads();
  leads.push({
    name,
    category,
    city,
    email,
    phone,
    website,
    status: 'Ready for Automated Dispatch',
    pitch_angle,
    notes
  });
  saveLeads(leads);
  console.log(`[+] Added '${name}' with safe phone format ${phone}. Syncing to Google Sheets...`);
  syncToSheets();
}

async function realEstateSniperMenu() {
  console.log('\n--- Ugandan Real Estate & New-Build Property Sniper ---');
  console.log('1. List All Sniped Property Agents & Direct WhatsApp Links');
  console.log('2. Live-Scan All Prime Kampala Suburbs for Newly Built Listings');
  console.log('3. Live-Scan a Specific Suburb (e.g. Kira, Najjera, Kyanja, Munyonyo, Entebbe)');
  console.log('4. Open 1-Click WhatsApp Pitch for a Specific Agent in Browser');
  console.log('5. Live-Scan Jiji Uganda for Direct Landlords & Newly Listed Apartments');
  const sub = (await prompt('Select option (1-5): ')).trim();

  if (sub === '1') {
    const list = loadSniperLeads();
    console.log(`\n========================================================================`);
    console.log(`   REAL ESTATE SNIPER LEADS (${list.length} Direct Landlord/Agent Contacts)`);
    console.log(`========================================================================`);
    list.forEach((item, idx) => {
      console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${item.agentName} | ${item.suburb}`);
      console.log(`    Phone  : ${item.phone} (Alt: ${item.altPhone}) | Email: ${item.email || 'WhatsApp Only'}`);
      console.log(`    Listing: ${item.listingTrigger}`);
      console.log(`    WA Link: ${buildRealEstateWhatsAppLink(item).slice(0, 72)}...\n`);
    });
  } else if (sub === '2') {
    await scrapeRealEstatePortals(null);
  } else if (sub === '3') {
    const area = (await prompt('Enter suburb name (e.g. Kyanja, Lubowa, Muyenga, Entebbe): ')).trim();
    if (area) await scrapeRealEstatePortals(area);
  } else if (sub === '4') {
    const list = loadSniperLeads();
    const num = parseInt((await prompt(`Enter agent number (1-${list.length}): `)).trim(), 10) - 1;
    if (num >= 0 && num < list.length) {
      const waUrl = buildRealEstateWhatsAppLink(list[num]);
      console.log(`Opening WhatsApp chat with ${list[num].agentName} (${list[num].phone})...`);
      exec(`start "" "${waUrl}"`);
    }
  } else if (sub === '5') {
    await scrapeJijiPropertyLeads();
  }
}

async function interactiveQuotation() {
  console.log('\n--- Fitbit Interiors Instant Curtain & Rug Quotation Generator ---');
  const clientName = (await prompt('Client Name / Property (e.g. Silver Line Condos / Dr. Patrick): ')).trim() || 'Valued Client';
  const clientPhone = (await prompt('Client Phone / WhatsApp (e.g. +256754123456): ')).trim();
  const clientLocation = (await prompt('Location / Suburb (e.g. Kololo / Kyanja / Kira): ')).trim() || 'Kampala, Uganda';

  const numWindows = parseInt((await prompt('How many windows / rooms to quote? (e.g. 2): ')).trim(), 10) || 1;
  const windows = [];

  for (let i = 0; i < numWindows; i++) {
    console.log(`\n-- Window #${i + 1} Specifications --`);
    const roomName = (await prompt(`Room Name (e.g. Living Room / Master Bedroom) [Window #${i + 1}]: `)).trim() || `Window #${i + 1}`;
    const width = parseFloat((await prompt('Track/Rod Width in meters (e.g. 3.0): ')).trim()) || 2.5;
    const height = parseFloat((await prompt('Drop Height in meters (e.g. 2.7): ')).trim()) || 2.5;
    const sheerAns = (await prompt('Include luxury sheer voile layer? (Y/n): ')).trim().toLowerCase();
    const includeSheer = sheerAns !== 'n';

    windows.push({
      roomName,
      widthMeters: width,
      heightMeters: height,
      includeSheer,
      fabricType: 'blackout_premium',
      sheerType: 'sheer_linen',
      hardwareType: 'double_track_heavy'
    });
  }

  const rugAns = (await prompt('\nAdd modern living room accent rug? (1: 5x7ft [380k], 2: 6x9ft [550k], n: None): ')).trim();
  const addRugs = [];
  if (rugAns === '1') addRugs.push('rug_medium');
  if (rugAns === '2') addRugs.push('rug_large');

  console.log('\n[*] Generating branded PDF estimate...');
  try {
    const quote = await generateQuotationPdf({
      clientName,
      clientPhone,
      clientLocation,
      windows,
      addRugs
    });
    console.log(`[+] Quotation Created: ${quote.fileName}`);
    console.log(`    Total Amount: ${quote.grandTotalFormatted}`);
    console.log(`    Saved Path  : ${quote.filePath}`);
    console.log(`Opening PDF in default viewer...`);
    exec(`start "" "${quote.filePath}"`);
  } catch (err) {
    console.error(`[!] Quotation Error: ${err.message}`);
  }
}

async function interactiveWhatsAppDispatcher() {
  console.log('\n--- WhatsApp Lead Outreach Dispatcher ---');
  console.log('1. Preview Next Lead (Dry-Run)');
  console.log('2. Open Next Lead in WhatsApp Web / Desktop');
  console.log('3. Open Next 5 Leads in WhatsApp');
  const ans = (await prompt('Select option (1-3): ')).trim();

  if (ans === '1') {
    await dispatchWhatsAppOutreach({ count: 1, dryRun: true });
  } else if (ans === '2') {
    await dispatchWhatsAppOutreach({ count: 1, dryRun: false });
  } else if (ans === '3') {
    await dispatchWhatsAppOutreach({ count: 5, dryRun: false });
  }
}

async function main() {
  while (true) {
    const leads = loadLeads();
    const sniperLeads = loadSniperLeads();
    console.log('\n==========================================================================');
    console.log(`   FITBIT INTERIORS — OUTREACH & REAL ESTATE SNIPER (${leads.length} Email | ${sniperLeads.length} RE)`);
    console.log('==========================================================================');
    console.log(' 1. List All Email Leads, Statuses & 1-Click WhatsApp Pitch Links');
    console.log(' 2. Search Web for More Leads (8 Sectors Across Uganda)');
    console.log(' 3. Preview Emails, Follow-Ups, Visual HTML, or 1-Page PDF Catalogue');
    console.log(' 4. Run Initial Automated Email Campaign (Skips Already-Sent Leads)');
    console.log(' 5. Run 2-Step Follow-Up Sequence (Day-4 Swatch Offer & Day-10 Final)');
    console.log(' 6. Check Gmail Inbox for Replies (IMAP Auto-Stop & Hot Lead Detection)');
    console.log(' 7. Run Full Autonomous Daily Pipeline (Reply Check -> Scrape -> Send)');
    console.log(' 8. Send Sample Test Email + PDF Catalogue to Your Own Inbox');
    console.log(' 9. Set Your Business WhatsApp Number & Regenerate PDF Catalogue');
    console.log('10. Sync All Leads, Drafts & WhatsApp Links to Google Sheets');
    console.log('11. Add New Potential Client Manually');
    console.log('12. Open Live Google Sheet Tracker in Browser');
    console.log('13. [HOT] Ugandan Real Estate Portal Sniper (Direct +256 Landlord/Agent Leads)');
    console.log('14. Generate Instant Curtain & Rug Quotation (PDF Estimate)');
    console.log('15. Launch WhatsApp Lead Outreach Dispatcher (Semi-Automated)');
    console.log(' 0. Exit');

    const choice = (await prompt('\nSelect option (0-15): ')).trim();
    if (choice === '1') {
      await listLeads();
    } else if (choice === '2') {
      await discoverMoreLeadsMenu();
    } else if (choice === '3') {
      await previewPitch();
    } else if (choice === '4') {
      console.log('\nChoose mode: [1] Live Automated Dispatch  [2] Dry-Run Simulation');
      const mode = (await prompt('> ')).trim();
      if (mode === '2') {
        await runAutomatedCampaign({ dryRun: true });
      } else {
        const pass = await ensureAppPassword();
        if (pass) await runAutomatedCampaign({ dryRun: false, appPassword: pass });
      }
    } else if (choice === '5') {
      console.log('\nChoose mode: [1] Live Follow-Ups (Due Leads)  [2] Dry-Run Preview of Follow-Ups');
      const mode = (await prompt('> ')).trim();
      if (mode === '2') {
        await runFollowUpSequence({ dryRun: true, forceDue: true });
      } else {
        const pass = await ensureAppPassword();
        if (pass) await runFollowUpSequence({ dryRun: false, appPassword: pass });
      }
    } else if (choice === '6') {
      const pass = await ensureAppPassword();
      if (pass) await checkInboxReplies(pass);
    } else if (choice === '7') {
      console.log('\nChoose mode: [1] Run Live Daily Pipeline  [2] Run Dry-Run Simulation');
      const mode = (await prompt('> ')).trim();
      if (mode === '2') {
        await runDailyAutonomousCycle({ dryRun: true });
      } else {
        const pass = await ensureAppPassword();
        if (pass) await runDailyAutonomousCycle({ dryRun: false });
      }
    } else if (choice === '8') {
      const pass = await ensureAppPassword();
      if (pass) {
        try {
          await sendTestEmail('sseguyafahim1@gmail.com', pass);
        } catch (err) {
          console.error(`[!] Error sending test email: ${err.message}`);
        }
      }
    } else if (choice === '9') {
      await configureWhatsAppAndPdf();
    } else if (choice === '10') {
      syncToSheets();
    } else if (choice === '11') {
      await addNewLead();
    } else if (choice === '12') {
      console.log(`Opening ${SPREADSHEET_URL} ...`);
      exec(`start "" "${SPREADSHEET_URL}"`);
    } else if (choice === '13') {
      await realEstateSniperMenu();
    } else if (choice === '14') {
      await interactiveQuotation();
    } else if (choice === '15') {
      await interactiveWhatsAppDispatcher();
    } else if (choice === '0') {
      console.log('Goodbye! Exiting...');
      rl.close();
      break;
    } else {
      console.log('[!] Invalid option. Try again.');
    }
  }
}

main();
