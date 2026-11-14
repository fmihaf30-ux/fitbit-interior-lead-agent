const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url, timeoutMs = 9000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
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
            if (data.length < 3000000) data += chunk.toString();
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

function extractUgandaMobilePhones(text) {
  const regex = /(?:\+256|0)[\s-]?7\d{2}[\s-]?\d{3}[\s-]?\d{3}/g;
  const matches = text.match(regex) || [];
  const phones = [];
  for (const m of matches) {
    let digits = m.replace(/[\s-]/g, '');
    if (digits.startsWith('0')) digits = '256' + digits.slice(1);
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (!digits.startsWith('256')) digits = '256' + digits;
    if (isUgandaMobile(digits)) phones.push(digits);
  }
  return Array.from(new Set(phones));
}

async function scrapeUgandaPropertyCentre() {
  const pages = [
    'https://ugandapropertycentre.com/for-rent/flats-apartments/kampala',
    'https://ugandapropertycentre.com/for-rent/houses/kampala',
    'https://ugandapropertycentre.com/for-sale/flats-apartments/kampala',
    'https://ugandapropertycentre.com/for-sale/houses/kampala',
    'https://ugandapropertycentre.com/for-rent/commercial-property/kampala',
    'https://ugandapropertycentre.com/for-rent/flats-apartments/wakiso',
    'https://ugandapropertycentre.com/for-rent/houses/wakiso'
  ];

  const leadsFile = path.join(__dirname, 'real_estate_leads.json');
  const currentLeads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
  const knownPhones = new Set(currentLeads.map(l => String(l.phone).replace(/[^0-9]/g, '')));

  console.log(`[+] Crawling Uganda Property Centre across ${pages.length} property categories...`);

  let added = 0;

  for (const pageUrl of pages) {
    console.log(`[*] Requesting: ${pageUrl} ...`);
    const html = await fetchUrl(pageUrl);
    if (!html) continue;

    // Look for property listings on UPC
    // UPC usually contains property cards with a title, phone button or tel link
    const telLinks = html.match(/href="tel:([^"]+)"/gi) || [];
    const waLinks = html.match(/href="https?:\/\/wa\.me\/([^"?]+)/gi) || [];

    const foundNumbers = [];
    telLinks.forEach(t => {
      const match = t.match(/tel:([^"]+)/i);
      if (match) foundNumbers.push(match[1]);
    });
    waLinks.forEach(w => {
      const match = w.match(/wa\.me\/([^"?]+)/i);
      if (match) foundNumbers.push(match[1]);
    });

    // Also extract raw mobile patterns in property descriptions
    const textPhones = extractUgandaMobilePhones(html);
    foundNumbers.push(...textPhones);

    const uniqueNumbers = Array.from(new Set(foundNumbers));

    for (const raw of uniqueNumbers) {
      let digits = String(raw).replace(/[^0-9]/g, '');
      if (digits.startsWith('0')) digits = '256' + digits.slice(1);
      if (!digits.startsWith('256')) digits = '256' + digits;

      if (!isUgandaMobile(digits)) continue;

      if (!knownPhones.has(digits)) {
        knownPhones.add(digits);
        currentLeads.push({
          agentName: 'Property Agent (Uganda Property Centre)',
          suburb: pageUrl.includes('wakiso') ? 'Wakiso & Greater Kampala' : 'Kampala, Uganda',
          listingTrigger: 'Active Verified Property Listing on UgandaPropertyCentre.com',
          phone: `"+${digits}"`,
          altPhone: `"+${digits}"`,
          email: '',
          portal: pageUrl,
          status: 'Ready to Message on WhatsApp'
        });
        added++;
      }
    }
  }

  console.log(`[+] UPC Crawl Finished. Added ${added} new verified agents.`);
  console.log(`[+] Total list now: ${currentLeads.length}`);
  fs.writeFileSync(leadsFile, JSON.stringify(currentLeads, null, 2), 'utf8');
}

scrapeUgandaPropertyCentre().catch(console.error);
