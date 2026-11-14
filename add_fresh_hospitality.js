const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36'
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
            if (data.length < 2000000) data += chunk.toString();
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

function extractEmails(html) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(regex) || [];
  const blocked = ['example.com', 'sentry.io', 'wixpress.com', 'google.com', 'bing.com', 'duckduckgo.com', '.png', '.jpg', '.svg', '.css', '.js'];
  const valid = new Set();
  for (const raw of matches) {
    const e = raw.toLowerCase().replace(/\.$/, '');
    if (blocked.some(b => e.includes(b))) continue;
    if (e.length > 5 && e.length < 50) valid.add(e);
  }
  return Array.from(valid);
}

// Curated verified B2B targets in Greater Kampala & Entebbe (Hospitality & Developers)
const FRESH_HOSPITALITY_DEVELOPER_LEADS = [
  {
    name: 'Latitude 0 Degrees Hotel',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Makindye, Kampala',
    email: 'reservations.uganda@thelatitudehotels.com',
    phone: '"+256312418300"',
    website: 'https://thelatitudehotels.com/kampala',
    pitch_angle: 'Luxury Hotel Drapery, Sheers & Bespoke Suite Rugs',
    notes: 'Luxury boutique hotel on Makindye hill.'
  },
  {
    name: 'Protea Hotel by Marriott Entebbe',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Entebbe',
    email: 'info@proteaebb.co.ug',
    phone: '"+256414323600"',
    website: 'https://marriott.com',
    pitch_angle: 'Hospitality 100% Blackout Linings & Corridor Heavy-Duty Tracks',
    notes: 'Major beachfront hotel in Entebbe.'
  },
  {
    name: 'Kensington Luxury Heights',
    category: 'Real Estate Developers, Condominiums & Property Management Agencies',
    city: 'Kyanja, Kampala',
    email: 'sales@kensingtonproperties.com',
    phone: '"+256752763300"',
    website: 'https://kensingtonproperties.com',
    pitch_angle: 'Gated Estate Turnkey Move-In Curtain & Rug Bundles',
    notes: 'Large residential estate developer in Kyanja.'
  },
  {
    name: 'Forest Cottages Bukoto',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bukoto, Kampala',
    email: 'info@forest-cottages.com',
    phone: '"+256414445000"',
    website: 'https://forest-cottages.com',
    pitch_angle: 'Resort Cottages Curtains, Mosquito Drapes & Lounge Rugs',
    notes: 'Boutique eco-friendly cottages in Bukoto.'
  },
  {
    name: 'Kabira Country Club Suites',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bukoto, Kampala',
    email: 'info@kabiracountryclub.com',
    phone: '"+256312227222"',
    website: 'https://kabiracountryclub.com',
    pitch_angle: 'Club Suites & Apartment Blackout Curtains and Smooth Pelmet Tracks',
    notes: 'Extensive serviced suites and leisure club.'
  },
  {
    name: 'Speke Apartments Wampewo',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Kololo / Wampewo, Kampala',
    email: 'info@spekeapartments.com',
    phone: '"+256752711004"',
    website: 'https://spekeapartments.com',
    pitch_angle: 'Luxury Serviced Apartment Window Treatments & Stain-Resistant Rugs',
    notes: 'Premier serviced apartments in Kololo.'
  },
  {
    name: 'Dolphin Suites Bugolobi',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bugolobi, Kampala',
    email: 'info@dolphinsuites.co.ug',
    phone: '"+256414220365"',
    website: 'https://dolphinsuites.co.ug',
    pitch_angle: 'Boutique Hotel Curtains, Blackout Replacement & Living Room Rugs',
    notes: 'Popular serviced suites and hotel in Bugolobi.'
  },
  {
    name: 'Victoria Rock Resort & Apartments',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Entebbe',
    email: 'info@victoriarockresort.com',
    phone: '"+256772400330"',
    website: 'https://victoriarockresort.com',
    pitch_angle: 'Lake-facing Villa Daylight Sheers, Blackouts & Heavy-Duty Tracks',
    notes: 'Lakefront serviced suites and resort near airport.'
  },
  {
    name: 'Bukoto Heights Apartments',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Bukoto, Kampala',
    email: 'info@bukotoheights.com',
    phone: '"+256752711750"',
    website: 'https://bukotoheights.com',
    pitch_angle: 'Serviced Apartment Blackouts & Easy-Clean High Traffic Rugs',
    notes: 'Modern multi-story residential serviced apartments.'
  },
  {
    name: 'Le Petit Village Boutique Hotel',
    category: 'Serviced Apartments & Boutique Hotels',
    city: 'Nsambya / Ggaba Rd, Kampala',
    email: 'info@lepetitvillage.net',
    phone: '"+256414266887"',
    website: 'https://lepetitvillage.net',
    pitch_angle: 'Thatched Cottage Voiles, High-End Textured Blackouts & Decor Rugs',
    notes: 'Charming European-style boutique suites.'
  }
];

function addNewBusinessLeads() {
  const leadsPath = path.join(__dirname, 'leads.json');
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const existingEmails = new Set(leads.map(l => (l.email || '').toLowerCase().trim()));

  let added = 0;
  for (const item of FRESH_HOSPITALITY_DEVELOPER_LEADS) {
    const em = item.email.toLowerCase().trim();
    if (!existingEmails.has(em)) {
      existingEmails.add(em);
      leads.push({
        ...item,
        status: 'Ready for Automated Dispatch',
        sentAt: null,
        lastContactedAt: null,
        followUpCount: 0
      });
      added++;
    }
  }

  console.log(`[+] Added ${added} new high-end Hospitality & Real Estate B2B leads to leads.json.`);
  console.log(`[+] Total B2B leads in database: ${leads.length}`);
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
}

addNewBusinessLeads();
