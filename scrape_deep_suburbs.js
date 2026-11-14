const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: timeoutMs,
          rejectUnauthorized: false
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = new URL(res.headers.location, url).href;
            return resolve(fetchUrl(redirectUrl, timeoutMs));
          }
          let data = '';
          res.on('data', chunk => {
            if (data.length < 5000000) data += chunk.toString();
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

function isUgandaMobile(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return /^2567[0456789]\d{7}$/.test(digits);
}

function extractFromRedHtml(html, defaultSuburb = 'Kampala') {
  if (!html) return [];
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

    const title = titleMatch ? titleMatch[1].trim() : 'House/Apartment listing';
    const loc = locMatch ? locMatch[1].trim() : defaultSuburb;
    const price = priceMatch ? priceMatch[1].trim() : '';

    list.push({
      agentName: `Agent ${agentName}`,
      suburb: `${loc}, Greater Kampala`,
      listingTrigger: `${title} (${price})`.trim(),
      phone: `"+${cleanDigits}"`,
      altPhone: `"+${cleanDigits}"`,
      email: '',
      portal: 'https://www.realestatedatabase.net',
      status: 'Ready to Message on WhatsApp'
    });
  }
  return list;
}

async function scrapeMoreSuburbs() {
  const suburbs = [
    'Munyonyo',
    'Entebbe',
    'Najjera',
    'Kisaasi',
    'Bukoto',
    'Muyenga',
    'Buziga',
    'Bunga',
    'Namugongo',
    'Gayaza',
    'Kireka',
    'Bweyogerere',
    'Kulambiro',
    'Konge',
    'Makindye'
  ];

  const leadsFile = path.join(__dirname, 'real_estate_leads.json');
  const currentLeads = fs.existsSync(leadsFile) ? JSON.parse(fs.readFileSync(leadsFile, 'utf8')) : [];
  const knownPhones = new Set(currentLeads.map(l => String(l.phone).replace(/[^0-9]/g, '')));

  console.log(`[+] Starting deep sniper crawl across ${suburbs.length} high-potential suburbs...`);
  console.log(`[+] Known phone database count: ${knownPhones.size}`);

  let totalNew = 0;

  for (const sub of suburbs) {
    const url = `https://www.realestatedatabase.net/FindAHouse/Houselist.aspx?PropertyType=House&Location=${encodeURIComponent(sub)}&Title=Houses+for+rent+and+sale`;
    console.log(`[*] Scraping: ${sub} ...`);
    const html = await fetchUrl(url);
    if (!html || html.length < 5000) {
      console.log(`    [-] No listings or small response for ${sub}`);
      continue;
    }

    const items = extractFromRedHtml(html, sub);
    let subNew = 0;
    for (const item of items) {
      const d = String(item.phone).replace(/[^0-9]/g, '');
      if (!knownPhones.has(d)) {
        knownPhones.add(d);
        currentLeads.push(item);
        subNew++;
        totalNew++;
      }
    }
    console.log(`    [+] Found ${items.length} listings in ${sub} (${subNew} brand new agents)`);
  }

  console.log(`\n=============================================================`);
  console.log(`[+] Deep crawl complete! Found ${totalNew} brand new verified mobile agents.`);
  console.log(`[+] Total Property Agent list size: ${currentLeads.length}`);
  console.log(`=============================================================\n`);

  fs.writeFileSync(leadsFile, JSON.stringify(currentLeads, null, 2), 'utf8');
}

scrapeMoreSuburbs().catch(console.error);
