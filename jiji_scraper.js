require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const https = require('https');
const path = require('path');
const fs = require('fs');
const { formatPhoneForSheet } = require('./sync');
const { loadSniperLeads, saveSniperLeads, syncSniperToGoogleSheet } = require('./real_estate_sniper');

function fetch(url, headers = {}) {
  return new Promise((resolve) => {
    try {
      https.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            ...headers
          },
          timeout: 10000
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        }
      ).on('error', () => resolve(''));
    } catch {
      resolve('');
    }
  });
}

function isUgandaMobile(digits) {
  const d = String(digits).replace(/[^0-9]/g, '');
  return /^2567[0456789]\d{7}$/.test(d);
}

/**
 * Scrapes Jiji Uganda for direct landlord and agent listings in Kampala and Wakiso
 */
async function scrapeJijiPropertyLeads({ maxListings = 20 } = {}) {
  console.log(`\n========================================================================`);
  console.log(`   JIJI UGANDA — DIRECT LANDLORD & APARTMENT SNIPER`);
  console.log(`   Targeting: Kampala & Wakiso Rentals, Condos & Luxury Homes`);
  console.log(`========================================================================\n`);

  const categories = [
    { slug: 'houses-apartments-for-rent', name: 'Apartments & Houses for Rent' },
    { slug: 'houses-apartments-for-sale', name: 'Houses & Apartments for Sale' }
  ];

  const sniperLeads = loadSniperLeads();
  const existingPhones = new Set(sniperLeads.map((l) => String(l.phone).replace(/[^0-9]/g, '')));
  let newlyFound = 0;

  for (const cat of categories) {
    console.log(`[*] Querying Jiji Uganda API for: ${cat.name}...`);
    const apiUrl = `https://jiji.ug/api_web/v1/listing?slug=${cat.slug}&region_slug=kampala`;
    const rawJson = await fetch(apiUrl, { Accept: 'application/json' });
    let adverts = [];
    try {
      const parsed = JSON.parse(rawJson);
      adverts = (parsed.adverts_list && parsed.adverts_list.adverts) || [];
    } catch {
      continue;
    }

    console.log(`    Found ${adverts.length} listings in category. Inspecting WhatsApp contacts...`);
    const sample = adverts.slice(0, maxListings);

    for (const adv of sample) {
      if (!adv.url) continue;
      const cleanUrlSlug = adv.url.split('?')[0];
      const pageUrl = `https://jiji.ug${cleanUrlSlug}`;

      const pageHtml = await fetch(pageUrl);
      if (!pageHtml) continue;

      // Extract direct WhatsApp link on page
      const waMatch = pageHtml.match(/href="https:\/\/wa\.me\/(2567\d{8})/i);
      if (!waMatch) continue;

      const rawDigits = waMatch[1];
      if (!isUgandaMobile(rawDigits) || existingPhones.has(rawDigits)) continue;

      existingPhones.add(rawDigits);
      const safePhone = formatPhoneForSheet(`+${rawDigits}`);

      // Detect location
      let suburb = adv.region_name || 'Kampala';
      const knownSuburbs = [
        'Naguru', 'Kololo', 'Lubowa', 'Kyanja', 'Kira', 'Najjera', 'Bukoto', 'Ntinda',
        'Muyenga', 'Munyonyo', 'Naalya', 'Bugolobi', 'Mbuya', 'Kyebando'
      ];
      for (const s of knownSuburbs) {
        if (new RegExp(s, 'i').test(adv.title + ' ' + (adv.short_description || ''))) {
          suburb = `${s}, Greater Kampala`;
          break;
        }
      }

      const newLead = {
        agentName: `Landlord / Agent (${adv.title.slice(0, 35).trim()})`,
        suburb,
        listingTrigger: `${adv.title} (${adv.price_title || ''})`.trim(),
        phone: safePhone,
        altPhone: safePhone,
        email: '',
        portal: pageUrl,
        status: 'Ready to Message on WhatsApp'
      };

      sniperLeads.push(newLead);
      newlyFound++;
      console.log(`   [+] Sniped Jiji Lead: ${newLead.phone} | ${newLead.suburb} | ${newLead.listingTrigger.slice(0, 50)}...`);
    }
  }

  saveSniperLeads(sniperLeads);
  console.log(`\n[+] Jiji Sniper complete! Total Leads in Pool: ${sniperLeads.length} (+${newlyFound} new).`);
  syncSniperToGoogleSheet();
  return sniperLeads;
}

if (require.main === module) {
  scrapeJijiPropertyLeads().catch((err) => console.error('[!] Jiji Sniper Error:', err.message));
}

module.exports = { scrapeJijiPropertyLeads };
