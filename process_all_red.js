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
  const list = [];

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

    const title = titleMatch ? titleMatch[1].trim() : 'House listing';
    const loc = locMatch ? locMatch[1].trim() : 'Kampala';
    const price = priceMatch ? priceMatch[1].trim() : '';

    list.push({
      agentName: `Agent ${agentName}`,
      suburb: `${loc}, Greater Kampala`,
      listingTrigger: `${title} (${price})`.trim(),
      phone: `+${cleanDigits}`,
      altPhone: `+${cleanDigits}`,
      email: '',
      portal: 'https://www.realestatedatabase.net',
      status: 'Ready to Message on WhatsApp'
    });
  }
  return list;
}

function processAll() {
  const allFiles = [
    'scratch_site1.html',
    'scratch_red_2.html',
    'scratch_red_3.html',
    'scratch_red_4.html',
    'scratch_red_5.html',
    'scratch_red_6.html',
    'scratch_red_7.html'
  ];

  const unique = new Map();

  for (const f of allFiles) {
    const p = path.join(__dirname, f);
    const items = extractFromRedHtml(p);
    console.log(`Extracted from ${f}: ${items.length} raw`);
    for (const item of items) {
      const ph = item.phone;
      if (!unique.has(ph)) {
        unique.set(ph, item);
      }
    }
  }

  console.log(`Total unique mobile agents found across all RED suburbs: ${unique.size}`);
  const result = Array.from(unique.values());
  fs.writeFileSync(path.join(__dirname, 'red_all_agents.json'), JSON.stringify(result, null, 2), 'utf8');

  result.slice(0, 15).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.agentName} | ${item.phone} | ${item.suburb} | ${item.listingTrigger.slice(0, 45)}...`);
  });
}

processAll();
