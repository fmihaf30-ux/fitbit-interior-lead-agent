require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadSentHistory } = require('./sent_tracker');

const SPREADSHEET_ID = '1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA';
const SHEET_NAME = 'Sheet1';
const BUSINESS_NAME = 'Fitbit Interiors';
const BUSINESS_INSTAGRAM = 'https://www.instagram.com/fitbit_interiors';

function getBusinessEmail() {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  return process.env.SMTP_EMAIL || 'sseguyafahim1@gmail.com';
}

function getBusinessWhatsApp() {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  return (process.env.BUSINESS_WHATSAPP || '+256751567860').replace(/["'\s-]/g, '');
}

/**
 * Ensures phone numbers are stripped of spaces and wrapped in literal quotes
 * e.g. "+256751231234" so Google Sheets never interprets a leading '+' as a math formula.
 */
function formatPhoneForSheet(rawPhone) {
  if (!rawPhone) return '""';
  const cleaned = String(rawPhone).replace(/["'\s-]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  return `"${withPlus}"`;
}

/**
 * Builds a 1-click WhatsApp outreach link TO the prospect's phone number.
 */
function generateWhatsAppLeadLink(prospect) {
  const digits = String(prospect.phone || '').replace(/[^0-9]/g, '');
  if (!digits || digits.endsWith('000000')) return '';
  const msg = `Hello ${prospect.name} Team, I am reaching out from ${BUSINESS_NAME} (Kampala). We supply and install custom curtains, sheer fabrics, heavy-duty curtain rods/tracks, and modern rugs (${BUSINESS_INSTAGRAM}). May we share our catalogue or drop off fabric samples at your office?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/**
 * Builds a 1-click WhatsApp reply link FOR the email recipient to message Fitbit Interiors directly.
 */
function getBusinessWhatsAppLink(prospectName) {
  const digits = getBusinessWhatsApp().replace(/[^0-9]/g, '');
  const msg = `Hello Fitbit Interiors, this is ${prospectName}. Please share your curtain & rug catalogue / fabric samples.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/**
 * Generates a simple, clean, natural, and professional B2B email (Plain Text + Clean HTML).
 */
function generateEmail(prospect) {
  const { category = '', name = 'Team', city = 'Kampala' } = prospect;
  const waReplyUrl = getBusinessWhatsAppLink(name);
  const businessEmail = getBusinessEmail();
  const businessWhatsApp = getBusinessWhatsApp();

  let subject = '';
  let introLine = '';
  let bullets = [];
  let closingLine = '';

  if (category.includes('Interior Designer') || category.includes('Architect')) {
    subject = `Custom Curtains, Rods & Rugs Partner — ${BUSINESS_NAME}`;
    introLine = `We appreciate the design and interior projects your team at ${name} delivers in ${city}. I am reaching out from ${BUSINESS_NAME} to introduce our curtain, rod, and rug supply and installation services for your client projects.`;
    bullets = [
      `Trade Partner Pricing: Discounted partner rates on custom curtains, sheer fabrics, rods/tracks, and rugs.`,
      `Sample Books to Your Office: We bring physical fabric swatches directly to your office or project site.`,
      `Full Measurement & Fitting: Free site measurements, neat tailoring, and reliable installation by our technicians.`
    ];
    closingLine = `Would you be open to us dropping off a fabric sample book at your office next week, or sending a quote for any upcoming project?`;

  } else if (category.includes('Serviced Apartments') || category.includes('Hotel') || category.includes('Hospitality') || category.includes('Lodge')) {
    subject = `Blackout Curtains, Curtain Tracks & Rugs for ${name}`;
    introLine = `I hope everything is going well at ${name} in ${city}. I am writing from ${BUSINESS_NAME}—we supply, tailor, and install durable curtains, curtain rods/tracks, and modern rugs for hotels, guest houses, and serviced apartments.`;
    bullets = [
      `100% Blackout & Sheer Curtains: Washable, sun-resistant fabrics that keep guest rooms cool, dark, and comfortable.`,
      `Heavy-Duty Rods & Ceiling Tracks: Smooth, strong tracks and rods designed for daily guest use.`,
      `Modern Rugs & Quick Installation: Easy-to-clean bedroom and lounge rugs, plus fast fitting between guest checkouts.`
    ];
    closingLine = `Whenever you are refreshing your rooms or replacing worn curtains, we would be happy to bring fabric samples to your property and provide a free quotation.`;

  } else if (category.includes('Real Estate') || category.includes('Property') || category.includes('Construction')) {
    subject = `Curtains, Rods & Rugs for ${name} Properties`;
    introLine = `I hope your week is going well. I am reaching out from ${BUSINESS_NAME} regarding custom curtains, sheer fabrics, heavy-duty rods/tracks, and rugs for your residential and commercial properties in ${city}.`;
    bullets = [
      `Show-House & Apartment Packages: Competitive bulk pricing for staged show-units, furnished rentals, and offices.`,
      `Move-In Packages for Buyers & Tenants: Ready-to-install curtain and rod packages for new occupants.`,
      `Complete Site Service: Free site measurements, custom tailoring, and clean installation across Kampala and countrywide.`
    ];
    closingLine = `We would be glad to share our price guide or provide a free measurement and quotation for any of your current properties.`;

  } else {
    subject = `Curtains, Sheer Fabrics, Rods & Rugs — ${BUSINESS_NAME}`;
    introLine = `I hope you are doing well. I am writing from ${BUSINESS_NAME} in Kampala to introduce our supply and installation of custom curtains, sheer fabrics, heavy-duty curtain rods/tracks, and area rugs for your premises in ${city}.`;
    bullets = [
      `Custom Curtains & Sheers: Tailored blackout curtains, daylight sheers, and privacy screens.`,
      `Heavy-Duty Rods & Tracks: Durable wall rods and ceiling tracks installed neatly by our team.`,
      `Free Site Measurement: Fast turnaround from measurement to tailoring and fitting.`
    ];
    closingLine = `Please let us know if we can share a quotation or visit your premises with fabric samples.`;
  }

  const body = `Hello ${name} Team,

${introLine}

How we can support you:
• ${bullets[0]}
• ${bullets[1]}
• ${bullets[2]}

${closingLine}

We have attached our 1-page catalogue (PDF), and you can also view our recent installations on Instagram:
${BUSINESS_INSTAGRAM}

Best regards,

${BUSINESS_NAME}
Custom Curtains, Rods, Sheers & Rugs | Kampala, Uganda
WhatsApp / Call: ${businessWhatsApp} (${waReplyUrl})
Email: ${businessEmail}`;

  const html = buildSimpleHtml({
    name,
    introLine,
    bullets,
    closingLine,
    businessWhatsApp,
    businessEmail,
    waReplyUrl
  });

  return { subject, body, html };
}

/**
 * Simple, polite 2-step follow-up email generator.
 */
function generateFollowUpEmail(prospect, followUpStep = 1) {
  const { name = 'Team', city = 'Kampala' } = prospect;
  const baseEmail = generateEmail(prospect);
  const waReplyUrl = getBusinessWhatsAppLink(name);
  const businessWhatsApp = getBusinessWhatsApp();
  const businessEmail = getBusinessEmail();

  if (followUpStep === 1) {
    const subject = `Re: ${baseEmail.subject}`;
    const introLine = `I am briefly following up on my previous email regarding ${BUSINESS_NAME} (custom curtains, sheers, curtain rods/tracks, and rugs).`;
    const closingLine = `Our team will be around ${city} this week—would it be alright if we dropped off a free fabric sample book at your office so you have our contacts and samples on hand for future needs?`;

    const body = `Hello ${name} Team,

${introLine}

${closingLine}

You can reply directly to this email or reach us on WhatsApp at ${businessWhatsApp}:
${waReplyUrl}

Best regards,

${BUSINESS_NAME}
WhatsApp / Call: ${businessWhatsApp}
Instagram: ${BUSINESS_INSTAGRAM}`;

    const html = buildSimpleHtml({
      name,
      introLine,
      bullets: [],
      closingLine,
      businessWhatsApp,
      businessEmail,
      waReplyUrl
    });

    return { subject, body, html };
  } else {
    const subject = `Following up: ${BUSINESS_NAME} Catalogue for ${name}`;
    const introLine = `I know you are busy, so I will keep this brief. I have re-attached our 1-page catalogue for custom curtains, rods/tracks, and rugs so your team can keep our contact on file.`;
    const closingLine = `Whenever you need a fast quotation or free site measurement in ${city} or countrywide, feel free to call or WhatsApp us at ${businessWhatsApp}.`;

    const body = `Hello ${name} Team,

${introLine}

${closingLine}

Best regards,

${BUSINESS_NAME}
WhatsApp / Call: ${businessWhatsApp} (${waReplyUrl})
Instagram: ${BUSINESS_INSTAGRAM}`;

    const html = buildSimpleHtml({
      name,
      introLine,
      bullets: [],
      closingLine,
      businessWhatsApp,
      businessEmail,
      waReplyUrl
    });

    return { subject, body, html };
  }
}

/**
 * Clean, lightweight, natural HTML layout that looks like a real personal business email.
 */
function buildSimpleHtml({ name, introLine, bullets, closingLine, businessWhatsApp, businessEmail, waReplyUrl }) {
  const bulletsHtml =
    bullets && bullets.length > 0
      ? `<p style="margin: 14px 0 6px 0; font-weight: 600; color: #111827;">How we can support you:</p>
         <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #374151; line-height: 1.6;">
           ${bullets.map(b => {
             const [title, ...rest] = b.split(':');
             return `<li style="margin-bottom: 6px;"><strong>${title}:</strong>${rest.join(':')}</li>`;
           }).join('')}
         </ul>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; line-height: 1.6; color: #1F2937;">
  <div style="max-width: 600px;">
    <p style="margin: 0 0 14px 0;">Hello ${name} Team,</p>

    <p style="margin: 0 0 14px 0;">${introLine}</p>

    ${bulletsHtml}

    <p style="margin: 0 0 14px 0;">${closingLine}</p>

    <p style="margin: 0 0 18px 0;">
      We have attached our 1-page catalogue (PDF), and you can also see our recent installations on Instagram:
      <a href="${BUSINESS_INSTAGRAM}" style="color: #0F172A; font-weight: 600;">@fitbit_interiors</a>
    </p>

    <p style="margin: 0 0 4px 0;">Best regards,</p>
    <p style="margin: 6px 0 0 0; font-weight: 700; color: #111827;">${BUSINESS_NAME}</p>
    <p style="margin: 2px 0 0 0; font-size: 13px; color: #4B5563;">
      Custom Curtains, Sheer Fabrics, Curtain Rods &amp; Area Rugs | Kampala, Uganda<br>
      WhatsApp / Call: <a href="${waReplyUrl}" style="color: #15803D; font-weight: 600; text-decoration: none;">${businessWhatsApp} (Click to Chat on WhatsApp)</a><br>
      Email: <a href="mailto:${businessEmail}" style="color: #374151; text-decoration: none;">${businessEmail}</a> |
      Instagram: <a href="${BUSINESS_INSTAGRAM}" style="color: #374151; text-decoration: none;">@fitbit_interiors</a>
    </p>
  </div>
</body>
</html>`;
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

function syncToSheets() {
  const leadsPath = path.join(__dirname, 'leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const sentHistory = loadSentHistory();

  const headers = [
    'Lead Name',
    'Category',
    'City / Area',
    'Contact Email',
    'Phone / WhatsApp',
    'Website / Social',
    'Status',
    'Pitch Angle',
    'Subject Line',
    'Drafted Email',
    'Notes',
    '1-Click WhatsApp Pitch Link'
  ];

  const csvRows = [headers.map(escapeCsvField).join(',')];

  for (const lead of leads) {
    lead.phone = formatPhoneForSheet(lead.phone);
    const emailKey = (lead.email || '').trim().toLowerCase();

    // ALWAYS preserve permanent Sent status from sent_history.json so no sent lead is ever reset!
    if (emailKey && sentHistory[emailKey]) {
      const st = String(lead.status || '');
      if (!st.startsWith('Replied') && !st.startsWith('Follow-Up')) {
        lead.status = sentHistory[emailKey].status;
      }
      lead.sentAt = lead.sentAt || sentHistory[emailKey].sentAt;
      lead.lastContactedAt = lead.lastContactedAt || sentHistory[emailKey].lastContactedAt;
      lead.followUpCount = Math.max(Number(lead.followUpCount || 0), Number(sentHistory[emailKey].followUpCount || 0));
    }

    const { subject, body } = generateEmail(lead);
    const status = lead.status || 'Ready for Automated Dispatch';
    const waLeadLink = generateWhatsAppLeadLink(lead);

    const row = [
      lead.name,
      lead.category,
      lead.city,
      lead.email,
      lead.phone,
      lead.website,
      status,
      lead.pitch_angle,
      subject,
      body,
      lead.notes,
      waLeadLink
    ];
    csvRows.push(row.map(escapeCsvField).join(','));
  }

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');

  const csvPath = path.join(__dirname, 'leads.csv');
  fs.writeFileSync(csvPath, csvRows.join('\r\n'), 'utf8');
  console.log(`[+] Exported ${leads.length} leads to ${csvPath}`);

  if (leads.length > 0) {
    const sample = generateEmail(leads[0]);
    const previewPath = path.join(__dirname, 'sample_email_preview.html');
    fs.writeFileSync(previewPath, sample.html, 'utf8');
    console.log(`[+] Saved clean & simple HTML preview: ${previewPath}`);
  }

  console.log(`[*] Pushing to Google Sheet: ${SPREADSHEET_ID}...`);
  try {
    execSync(`gsheets mutate import-csv ${SPREADSHEET_ID} "${csvPath}" --sheet "${SHEET_NAME}"`, { stdio: 'pipe' });
  } catch {
    console.log('[i] Google Sheets sync is only available when run through the Antigravity agent.');
    console.log('    Your local leads.csv is up to date - ask the agent to "sync the sheet" to push it online.');
    return;
  }
  try {
    console.log('[+] Data imported successfully!');

    execSync(`gsheets mutate format ${SPREADSHEET_ID} --sheet-id 0 --start-row 0 --end-row 1 --start-col 0 --end-col 12 --bold --align CENTER --bg-color "#1E293B" --fg-color "#FFFFFF"`, { stdio: 'inherit' });
    execSync(`gsheets mutate freeze ${SPREADSHEET_ID} --sheet-id 0 --rows 1`, { stdio: 'inherit' });

    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 0 --end-col 1 --pixels 220`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 1 --end-col 2 --pixels 220`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 3 --end-col 4 --pixels 230`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 4 --end-col 5 --pixels 160`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 6 --end-col 7 --pixels 220`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 8 --end-col 9 --pixels 290`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 9 --end-col 10 --pixels 440`);
    execSync(`gsheets mutate set-col-width ${SPREADSHEET_ID} --sheet-id 0 --start-col 11 --end-col 12 --pixels 320`);
    console.log('[+] Google Sheet fully formatted and styled!');
  } catch (err) {
    console.error('[!] Failed to sync to Google Sheet:', err.message);
  }
}

if (require.main === module) {
  syncToSheets();
}

module.exports = {
  syncToSheets,
  generateEmail,
  generateFollowUpEmail,
  formatPhoneForSheet,
  generateWhatsAppLeadLink
};
