require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadSentHistory } = require('./sent_tracker');

const SPREADSHEET_ID = '1DccztSapaRwXO2Vf30RA7LWVvBGcBD7ctJSbKPE7bWA';
const SHEET_NAME = 'Sheet1';
const BUSINESS_NAME = 'Fitbit Interiors Kampala';
const BUSINESS_WEBSITE = 'https://fmihaf30-ux.github.io/fitbit-interiors-website/';
const BUSINESS_INSTAGRAM = 'https://www.instagram.com/fitbit_interiors';

function getBusinessEmail() {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  return process.env.SMTP_EMAIL || 'sseguyafahim1@gmail.com';
}

function getBusinessWhatsApp() {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true, quiet: true });
  return (process.env.BUSINESS_WHATSAPP || '+256751567860').replace(/["'\s-]/g, '');
}

function formatPhoneForSheet(rawPhone) {
  if (!rawPhone) return '""';
  const cleaned = String(rawPhone).replace(/["'\s-]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  return `"${withPlus}"`;
}

function generateWhatsAppLeadLink(prospect) {
  const digits = String(prospect.phone || '').replace(/[^0-9]/g, '');
  if (!digits || digits.endsWith('000000')) return '';
  const msg = `Hello ${prospect.name} Team, I am reaching out from ${BUSINESS_NAME}. We supply and install custom curtains, sheer fabrics, heavy-duty curtain rods/tracks, and modern rugs (${BUSINESS_WEBSITE}). May we drop off our free fabric sample book at your office or share our 1-page price guide?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

function getBusinessWhatsAppLink(prospectName) {
  const digits = getBusinessWhatsApp().replace(/[^0-9]/g, '');
  const msg = `Hello Fitbit Interiors, this is ${prospectName}. Please share your curtain & rug price guide / fabric samples.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

/**
 * High-Deliverability 3-Sentence Conversational B2B Email Generator.
 * Avoids heavy cold attachments and spammy HTML tables so corporate mail filters
 * (Microsoft 365, Mimecast, Cloudflare) deliver directly to the primary inbox.
 */
function generateEmail(prospect) {
  const { category = '', name = 'Team', city = 'Kampala' } = prospect;
  const businessEmail = getBusinessEmail();
  const businessWhatsApp = getBusinessWhatsApp();

  let subject = '';
  let line1 = '';
  let line2 = '';

  if (category.includes('Interior Designer') || category.includes('Architect')) {
    subject = `Fabric sample book for ${name}`;
    line1 = `I hope your week is going well at ${name} in ${city}. I am writing from ${BUSINESS_NAME}—we supply, tailor, and install custom blackout curtains, sheer fabrics, silent ceiling tracks, rods, and modern rugs for residential and commercial interior projects.`;
    line2 = `Our technician will be around ${city} this week—would it be alright if we dropped off a complimentary physical fabric sample book at your office for your design library?`;
  } else if (category.includes('Serviced Apartments') || category.includes('Hotel') || category.includes('Hospitality') || category.includes('Lodge')) {
    subject = `Curtains, tracks & rugs inquiry — ${name}`;
    line1 = `I hope everything is going well at ${name} in ${city}. At ${BUSINESS_NAME}, we supply and install washable 100% blackout curtains, daylight sheers, heavy-duty ceiling tracks, and modern rugs for hotels and serviced apartments across Uganda.`;
    line2 = `Whenever you are refreshing rooms or replacing worn curtains, may we visit with fabric swatches and share a free measurement and B2B trade quote?`;
  } else {
    subject = `Custom curtains, rods & rugs for ${name}`;
    line1 = `I hope your week is going well at ${name} in ${city}. I am reaching out from ${BUSINESS_NAME} regarding our supply, tailoring, and installation of custom blackout curtains, sheer nets, heavy-duty rods/tracks, and modern rugs.`;
    line2 = `Would you be open to us dropping off a free physical fabric sample book at your office, or sharing a quick quotation for any upcoming project?`;
  }

  const body = `Hello ${name} Team,

${line1}

${line2}

You can view our starting UGX price guide and instant window calculator on our website (${BUSINESS_WEBSITE}) or reach us directly on WhatsApp at ${businessWhatsApp}.

Warm regards,

Fahim
${BUSINESS_NAME}
WhatsApp / Call: ${businessWhatsApp}
Website: ${BUSINESS_WEBSITE}`;

  const html = buildSimpleHtml({
    name,
    line1,
    line2,
    businessWhatsApp,
    businessEmail
  });

  return { subject, body, html };
}

function generateFollowUpEmail(prospect) {
  const { name = 'Team', city = 'Kampala' } = prospect;
  const baseEmail = generateEmail(prospect);
  const businessWhatsApp = getBusinessWhatsApp();
  const businessEmail = getBusinessEmail();

  const subject = `Re: ${baseEmail.subject}`;
  const line1 = `I am briefly following up on my note regarding ${BUSINESS_NAME} (custom curtains, sheer fabrics, heavy-duty tracks/rods, and modern rugs).`;
  const line2 = `Our team will be in ${city} this week—please let me know if we may pass by your office to drop off a complimentary fabric sample book for your records.`;

  const body = `Hello ${name} Team,

${line1}

${line2}

Warm regards,

Fahim
${BUSINESS_NAME}
WhatsApp / Call: ${businessWhatsApp}
Website: ${BUSINESS_WEBSITE}`;

  const html = buildSimpleHtml({
    name,
    line1,
    line2,
    businessWhatsApp,
    businessEmail
  });

  return { subject, body, html };
}

function buildSimpleHtml({ name, line1, line2, businessWhatsApp }) {
  return `<div dir="ltr" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222;">
  <p style="margin: 0 0 12px 0;">Hello ${name} Team,</p>
  <p style="margin: 0 0 12px 0;">${line1}</p>
  <p style="margin: 0 0 12px 0;">${line2}</p>
  <p style="margin: 0 0 16px 0;">
    You can view our starting UGX price guide on our website:
    <a href="${BUSINESS_WEBSITE}" style="color: #1a56db;">${BUSINESS_WEBSITE}</a>
    or message us on WhatsApp at <strong>${businessWhatsApp}</strong>.
  </p>
  <p style="margin: 0;">
    Warm regards,<br>
    <strong>Fahim — ${BUSINESS_NAME}</strong><br>
    Custom Curtains, Sheer Fabrics, Rods &amp; Modern Rugs | Kampala, Uganda<br>
    WhatsApp / Call: ${businessWhatsApp}
  </p>
</div>`;
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

function syncToSheets() {
  const leadsPath = path.join(__dirname, 'leads.json');
  const rawLeads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const sentHistory = loadSentHistory();

  // Remove any bounced/blocked entries before exporting
  const leads = rawLeads.filter(l => {
    const em = (l.email || '').trim().toLowerCase();
    if (!em) return false;
    if (l.bounced || /blocked|bounced|invalid/i.test(l.status || '')) return false;
    return true;
  });

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

    if (emailKey && sentHistory[emailKey] && !sentHistory[emailKey].bounced) {
      const st = String(lead.status || '');
      if (!st.startsWith('Replied') && !st.startsWith('Follow-Up') && !st.startsWith('Automated')) {
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
  console.log(`[+] Exported ${leads.length} clean deliverable leads to ${csvPath}`);

  if (leads.length > 0) {
    const sample = generateEmail(leads[0]);
    const previewPath = path.join(__dirname, 'sample_email_preview.html');
    fs.writeFileSync(previewPath, sample.html, 'utf8');
  }

  try {
    execSync(`gsheets mutate import-csv ${SPREADSHEET_ID} "${csvPath}" --sheet "${SHEET_NAME}"`, { stdio: 'pipe' });
  } catch {
    return;
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
