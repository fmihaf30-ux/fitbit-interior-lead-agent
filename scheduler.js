require('dotenv').config();
const { checkInboxReplies } = require('./reply_checker');
const { runWebDiscovery } = require('./scraper');
const { runAutomatedCampaign, runFollowUpSequence } = require('./mailer');
const { syncToSheets } = require('./sync');

/**
 * Full Autonomous Pipeline for Fitbit Interiors:
 * 1. Checks Gmail Inbox (IMAP) for client replies & auto-stops follow-ups for hot leads
 * 2. Crawls web directories for new hospitality, real estate, and interior design leads
 * 3. Sends Day-4 and Day-10 follow-up emails to non-replied prospects
 * 4. Sends a safe daily batch (up to 20 emails) to new prospects with PDF Catalogue attached
 * 5. Syncs all statuses, drafts, and 1-Click WhatsApp links to Google Sheets
 */
async function runDailyAutonomousCycle({ dryRun = false } = {}) {
  const startTime = new Date().toISOString();
  console.log(`\n======================================================================`);
  console.log(`   FITBIT INTERIORS — FULL AUTONOMOUS DAILY PIPELINE`);
  console.log(`   Started At: ${startTime} | Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`======================================================================\n`);

  // Step 1: Check Inbox Replies
  console.log(`[STEP 1/4] Checking Gmail Inbox for Client Replies...`);
  if (!dryRun) {
    await checkInboxReplies();
  } else {
    console.log(`   [Dry-Run] Would connect to imap.gmail.com:993 to detect client replies.`);
  }

  // Step 2: Discover New Leads Across Uganda
  console.log(`\n[STEP 2/4] Running Multi-Sector Web Lead Discovery...`);
  await runWebDiscovery(0); // Hospitality & Serviced Apartments

  // Step 3: Process Due Follow-Ups (Day 4 & Day 10)
  console.log(`\n[STEP 3/4] Running 2-Step Follow-Up Sequence (Day 4 & Day 10)...`);
  await runFollowUpSequence({ dryRun, forceDue: false });

  // Step 4: Send Daily Batch of New Outreach Emails (Max 20/day for high inbox reputation)
  console.log(`\n[STEP 4/4] Dispatching Daily Batch of Initial Outreach Emails (with PDF Catalogue)...`);
  await runAutomatedCampaign({ dryRun, maxBatch: 20 });

  // Final Sync
  syncToSheets();
  console.log(`\n[+] Daily Autonomous Cycle Complete!`);
}

async function startDailyDaemon() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  console.log(`[*] Starting Fitbit Interiors 24-Hour Autonomous Outreach Scheduler...`);
  await runDailyAutonomousCycle({ dryRun: false });
  console.log(`[*] Next automated cycle scheduled in 24 hours. Keep this terminal open or use Windows Task Scheduler.`);
  setInterval(() => {
    runDailyAutonomousCycle({ dryRun: false }).catch(err =>
      console.error(`[!] Scheduled Cycle Error: ${err.message}`)
    );
  }, INTERVAL_MS);
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  const isDaemon = process.argv.includes('--daemon');
  if (isDaemon) {
    startDailyDaemon().catch(err => console.error('[!] Scheduler Error:', err.message));
  } else {
    runDailyAutonomousCycle({ dryRun: isDryRun }).catch(err => console.error('[!] Pipeline Error:', err.message));
  }
}

module.exports = { runDailyAutonomousCycle, startDailyDaemon };
