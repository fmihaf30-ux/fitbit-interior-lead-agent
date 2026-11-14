require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true, quiet: true });
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { buildRealEstateWhatsAppLink, loadSniperLeads } = require('./real_estate_sniper');

const TRACKER_PATH = path.join(__dirname, 'whatsapp_sent_tracker.json');

function loadTracker() {
  if (!fs.existsSync(TRACKER_PATH)) {
    fs.writeFileSync(TRACKER_PATH, JSON.stringify({ sentPhones: [], log: [] }, null, 2), 'utf8');
    return { sentPhones: [], log: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(TRACKER_PATH, 'utf8'));
  } catch {
    return { sentPhones: [], log: [] };
  }
}

function saveTracker(tracker) {
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2), 'utf8');
}

function openUrl(url) {
  return new Promise((resolve) => {
    // Windows default browser launch
    const startCmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
    exec(startCmd, (err) => {
      resolve(!err);
    });
  });
}

async function dispatchWhatsAppOutreach({ count = 1, dryRun = false } = {}) {
  const leads = loadSniperLeads();
  const tracker = loadTracker();
  const sentSet = new Set(tracker.sentPhones);

  const pending = leads.filter(l => {
    const d = String(l.phone).replace(/[^0-9]/g, '');
    return d && !sentSet.has(d) && l.status !== 'No WhatsApp - Call or SMS';
  });

  console.log(`\n========================================================================`);
  console.log(`   FITBIT INTERIORS — WHATSAPP LEAD DISPATCHER`);
  console.log(`   Pending Uncontacted Leads: ${pending.length} / ${leads.length}`);
  console.log(`   Mode: ${dryRun ? 'DRY-RUN PREVIEW' : 'LIVE BROWSER DISPATCH'}`);
  console.log(`========================================================================\n`);

  if (pending.length === 0) {
    console.log(`[+] All ${leads.length} leads in your sniper list have already been contacted!`);
    console.log(`    Run "npm run sniper" to discover fresh new property leads.`);
    return;
  }

  const batch = pending.slice(0, count);

  for (let i = 0; i < batch.length; i++) {
    const lead = batch[i];
    const waLink = buildRealEstateWhatsAppLink(lead);
    const cleanPhone = String(lead.phone).replace(/[^0-9]/g, '');

    console.log(`[${i + 1}/${batch.length}] Target: ${lead.agentName}`);
    console.log(`     Phone:    ${lead.phone}`);
    console.log(`     Location: ${lead.suburb}`);
    console.log(`     Listing:  ${lead.listingTrigger.slice(0, 65)}...`);
    console.log(`     Link:     ${waLink.slice(0, 80)}...`);

    if (!dryRun) {
      console.log(`     -> Opening in WhatsApp Web...`);
      await openUrl(waLink);

      // Track as sent
      tracker.sentPhones.push(cleanPhone);
      tracker.log.push({
        phone: cleanPhone,
        agentName: lead.agentName,
        sentAt: new Date().toISOString()
      });
      saveTracker(tracker);

      if (i < batch.length - 1) {
        console.log(`     Waiting 3 seconds before next lead...\n`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    console.log('');
  }

  console.log(`[+] Processed ${batch.length} lead(s). Total contacted: ${tracker.sentPhones.length}/${leads.length}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const countIdx = args.indexOf('--count');
  let count = 1;
  if (countIdx !== -1 && args[countIdx + 1]) {
    count = parseInt(args[countIdx + 1], 10) || 1;
  } else if (args.includes('--all')) {
    count = 100;
  }

  dispatchWhatsAppOutreach({ count, dryRun: isDryRun });
}

module.exports = { dispatchWhatsAppOutreach };
