require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { generateEmail, generateFollowUpEmail, syncToSheets } = require('./sync');
const { generateTradeCataloguePdf, CATALOG_PATH, CATALOG_FILENAME } = require('./catalog_generator');
const { checkInboxReplies, hasValidMxRecord } = require('./reply_checker');
const {
  reconcileSentLeadsWithGmail,
  hasAlreadyBeenContacted,
  isEmailBlockedOrBounced,
  recordEmailSent,
  recordEmailBounced
} = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');
const DEFAULT_SENDER_EMAIL = 'sseguyafahim1@gmail.com';
const BUSINESS_NAME = 'Fitbit Interiors';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureCatalogAttachment() {
  if (!fs.existsSync(CATALOG_PATH)) {
    await generateTradeCataloguePdf(process.env.BUSINESS_WHATSAPP || '+256751567860');
  }
  return [
    {
      filename: CATALOG_FILENAME,
      path: CATALOG_PATH,
      contentType: 'application/pdf'
    }
  ];
}

function createTransporter(customEmail, customAppPassword) {
  const user = customEmail || process.env.SMTP_EMAIL || DEFAULT_SENDER_EMAIL;
  const pass = (customAppPassword || process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!pass || pass === 'your_16_char_app_password_here') {
    throw new Error(
      'Missing Gmail App Password. Set SMTP_APP_PASSWORD in your .env file (16-character Google App Password).'
    );
  }

  return {
    user,
    transporter: nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass }
    })
  };
}

async function sendTestEmail(targetEmail = DEFAULT_SENDER_EMAIL, appPassword = null) {
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const sampleLead = leads[0];
  const { subject, body, html } = generateEmail(sampleLead);
  const attachments = await ensureCatalogAttachment();

  const { user, transporter } = createTransporter(null, appPassword);
  const info = await transporter.sendMail({
    from: `"${BUSINESS_NAME}" <${user}>`,
    to: targetEmail,
    subject: `[SAMPLE PREVIEW] ${subject}`,
    text: body,
    html: html,
    attachments
  });

  return info;
}

/**
 * Automatically dispatches initial outreach emails (with PDF Catalogue attached)
 * ONLY to verified MX leads that have NEVER been contacted before and are NOT blocked/bounced.
 */
async function runAutomatedCampaign({ dryRun = false, appPassword = null, delayMs = 3500, maxBatch = 25 } = {}) {
  await reconcileSentLeadsWithGmail();
  if (!dryRun) {
    await checkInboxReplies(appPassword);
  }

  const attachments = await ensureCatalogAttachment();
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));

  const pendingLeads = leads.filter(l => {
    const emailKey = (l.email || '').trim().toLowerCase();
    if (!emailKey || !emailKey.includes('@')) return false;
    if (l.bounced || isEmailBlockedOrBounced(emailKey)) return false;
    if (hasAlreadyBeenContacted(emailKey)) return false;

    const st = String(l.status || '');
    return (
      !st.startsWith('Sent') &&
      !st.startsWith('Follow-Up') &&
      !st.startsWith('Replied') &&
      !st.startsWith('Blocked') &&
      !st.startsWith('Bounced') &&
      !st.startsWith('Invalid') &&
      !st.startsWith('Error') &&
      !st.startsWith('Opted Out') &&
      !st.startsWith('Automated') &&
      !st.startsWith('WhatsApp')
    );
  });

  if (pendingLeads.length === 0) {
    return 0;
  }

  const batch = pendingLeads.slice(0, maxBatch);

  let transporter = null;
  let senderUser = process.env.SMTP_EMAIL || DEFAULT_SENDER_EMAIL;

  if (!dryRun) {
    const setup = createTransporter(senderUser, appPassword);
    transporter = setup.transporter;
    senderUser = setup.user;
    await transporter.verify();
  }

  let sentCount = 0;
  const sentInThisRun = new Set();

  for (const lead of batch) {
    const emailKey = (lead.email || '').trim().toLowerCase();
    if (hasAlreadyBeenContacted(emailKey) || isEmailBlockedOrBounced(emailKey) || sentInThisRun.has(emailKey)) {
      continue;
    }

    // Verify DNS MX record before sending so Gmail never gets a Delivery Incomplete bounce
    const validMx = await hasValidMxRecord(emailKey);
    if (!validMx) {
      lead.status = 'Blocked / Invalid Domain (Stopped)';
      lead.bounced = true;
      recordEmailBounced(lead.email, lead.status);
      fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
      console.log(`[!] Skipped ${lead.email} — domain has no valid MX mail server.`);
      continue;
    }

    const { subject, body, html } = generateEmail(lead);
    const nowIso = new Date().toISOString();
    const timestamp = nowIso.slice(0, 16).replace('T', ' ');

    if (dryRun) {
      sentCount++;
      sentInThisRun.add(emailKey);
    } else {
      try {
        console.log(`[*] Sending (${sentCount + 1}/${batch.length}) to ${lead.name} <${lead.email}>...`);
        await transporter.sendMail({
          from: `"${BUSINESS_NAME}" <${senderUser}>`,
          to: lead.email,
          replyTo: senderUser,
          subject,
          text: body,
          html,
          attachments
        });
        lead.status = `Sent (${timestamp})`;
        lead.sentAt = nowIso;
        lead.lastContactedAt = nowIso;
        lead.followUpCount = 0;

        recordEmailSent(lead.email, lead.status, nowIso, 0, false);
        sentInThisRun.add(emailKey);
        sentCount++;
        console.log(`[+] Delivered to ${lead.email} & locked in sent_history.json`);

        fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');

        if (sentCount < batch.length) {
          await sleep(delayMs);
        }
      } catch (err) {
        console.error(`[!] Failed sending to ${lead.email}: ${err.message}`);
        lead.status = `Blocked / Bounced (Stopped)`;
        lead.bounced = true;
        recordEmailBounced(lead.email, lead.status);
        fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
      }
    }
  }

  if (!dryRun && sentCount > 0) {
    syncToSheets();
  }

  return sentCount;
}

/**
 * Checks Gmail inbox for replies AND mailer-daemon bounces first, then sends Step 1 (Day 4)
 * and Step 2 (Day 10) follow-up emails ONLY to valid, non-bounced, non-replied prospects.
 */
async function runFollowUpSequence({ dryRun = false, forceDue = false, appPassword = null, delayMs = 3500 } = {}) {
  if (!dryRun) {
    await checkInboxReplies(appPassword);
  }

  const attachments = await ensureCatalogAttachment();
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const nowMs = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const dueLeads = [];
  for (const lead of leads) {
    const emailKey = (lead.email || '').trim().toLowerCase();
    if (!emailKey || lead.bounced || isEmailBlockedOrBounced(emailKey)) continue;

    const st = String(lead.status || '');
    if (
      st.startsWith('Blocked') ||
      st.startsWith('Bounced') ||
      st.startsWith('Invalid') ||
      st.startsWith('Error') ||
      st.startsWith('Replied') ||
      st.startsWith('Opted Out') ||
      st.startsWith('Automated') ||
      st.startsWith('WhatsApp') ||
      /kabojja|topstays|renewills|rawlings|dream architects|cassia/i.test(lead.name)
    ) {
      continue;
    }
    if (!st.startsWith('Sent') && !st.startsWith('Follow-Up')) continue;

    const stepCount = Number(lead.followUpCount || 0);
    if (stepCount >= 2) continue;

    const lastDateMs = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : 0;
    const daysElapsed = lastDateMs ? (nowMs - lastDateMs) / DAY_MS : 999;

    const requiredDays = stepCount === 0 ? 4 : 6;
    if (forceDue || daysElapsed >= requiredDays) {
      dueLeads.push({ lead, nextStep: stepCount + 1 });
    }
  }

  if (dueLeads.length === 0) {
    return 0;
  }

  let transporter = null;
  let senderUser = process.env.SMTP_EMAIL || DEFAULT_SENDER_EMAIL;

  if (!dryRun) {
    const setup = createTransporter(senderUser, appPassword);
    transporter = setup.transporter;
    senderUser = setup.user;
    await transporter.verify();
  }

  let sentCount = 0;

  for (const { lead, nextStep } of dueLeads) {
    const validMx = await hasValidMxRecord(lead.email);
    if (!validMx) {
      lead.status = 'Blocked / Invalid Domain (Stopped)';
      lead.bounced = true;
      recordEmailBounced(lead.email, lead.status);
      fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
      continue;
    }

    const { subject, body, html } = generateFollowUpEmail(lead, nextStep);
    const nowIso = new Date().toISOString();
    const dateShort = nowIso.slice(0, 10);

    if (dryRun) {
      sentCount++;
    } else {
      try {
        console.log(`[*] Sending Follow-Up #${nextStep} to ${lead.name} <${lead.email}>...`);
        await transporter.sendMail({
          from: `"${BUSINESS_NAME}" <${senderUser}>`,
          to: lead.email,
          replyTo: senderUser,
          subject,
          text: body,
          html,
          attachments
        });
        lead.followUpCount = nextStep;
        lead.lastContactedAt = nowIso;
        lead.status = `Follow-Up #${nextStep} Sent (${dateShort})`;
        recordEmailSent(lead.email, lead.status, lead.sentAt || nowIso, nextStep, false);
        sentCount++;
        fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
        await sleep(delayMs);
      } catch (err) {
        console.error(`[!] Failed follow-up to ${lead.email}: ${err.message}`);
        lead.status = 'Blocked / Bounced (Stopped)';
        lead.bounced = true;
        recordEmailBounced(lead.email, lead.status);
        fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
      }
    }
  }

  if (!dryRun && sentCount > 0) {
    syncToSheets();
  }

  return sentCount;
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  const isFollowUp = process.argv.includes('--followup');
  if (isFollowUp) {
    runFollowUpSequence({ dryRun: isDryRun, forceDue: isDryRun }).catch(err => {
      console.error(`\n[!] Follow-Up Error: ${err.message}`);
      process.exit(1);
    });
  } else {
    runAutomatedCampaign({ dryRun: isDryRun }).catch(err => {
      console.error(`\n[!] Automated Mailer Error: ${err.message}`);
      process.exit(1);
    });
  }
}

module.exports = { sendTestEmail, runAutomatedCampaign, runFollowUpSequence };
