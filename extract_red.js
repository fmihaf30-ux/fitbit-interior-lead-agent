const fs = require('fs');
const path = require('path');

function isUgandaMobile(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return /^2567[0456789]\d{7}$/.test(digits);
}

function extractFromRedHtml(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const html = fs.readFileSync(filePath, 'utf8');
  const agentRegex = /AgentImagePanel_(\d+)"[^>]*title="([^:"]+)\s*:\s*([^"\s]+)"/g;
  let m;
  const uniqueByPhone = new Map();

  while ((m = agentRegex.exec(html)) !== null) {
    const idx = m[1];
    let agentName = m[2].trim().replace(/\.$/, '');
    let phone = m[3].trim();
    let cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.startsWith('0')) cleanDigits = '256' + cleanDigits.slice(1);
    if (!cleanDigits.startsWith('256')) cleanDigits = '256' + cleanDigits;

    if (!isUgandaMobile(cleanDigits)) continue;

    const titleRegex = new RegExp(`ManualTitleLabel_${idx}"[^>]*title="([^"]+)"`, 'i');
    const locRegex = new RegExp(`Location_${idx}">([^<]+)<`, 'i');
    const priceRegex = new RegExp(`Shillings_${idx}"[^>]*>([^<]+)<`, 'i');

    const titleMatch = html.match(titleRegex);
    const locMatch = html.match(locRegex);
    const priceMatch = html.match(priceRegex);

    const title = titleMatch ? titleMatch[1].trim() : 'House in Ntinda';
    const loc = locMatch ? locMatch[1].trim() : 'Ntinda';
    const price = priceMatch ? priceMatch[1].trim() : '';

    if (!uniqueByPhone.has(cleanDigits)) {
      uniqueByPhone.set(cleanDigits, {
        agentName: `Agent ${agentName} (Real Estate Database)`,
        suburb: `${loc}, Greater Kampala`,
        listingTrigger: `${title} (${price})`.trim(),
        phone: `+${cleanDigits}`,
        altPhone: `+${cleanDigits}`,
        email: '',
        portal: 'https://www.realestatedatabase.net',
        status: 'Ready to Message on WhatsApp'
      });
    }
  }
  return Array.from(uniqueByPhone.values());
}

const site1Path = path.join(__dirname, 'scratch_site1.html');
const leads = extractFromRedHtml(site1Path);
console.log('Unique verified mobile agents extracted:', leads.length);
leads.forEach(l => console.log(l.agentName, '|', l.phone, '|', l.suburb, '|', l.listingTrigger.slice(0, 45)));

fs.writeFileSync(path.join(__dirname, 'red_extracted_leads.json'), JSON.stringify(leads, null, 2), 'utf8');
