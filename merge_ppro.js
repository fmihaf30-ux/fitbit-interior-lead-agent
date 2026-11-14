const fs = require('fs');
const path = require('path');

function isUgandaMobile(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return /^2567[0456789]\d{7}$/.test(digits);
}

const html = fs.readFileSync(path.join(__dirname, 'scratch_site2.html'), 'utf8');
const telRegex = /href="tel:\s*([^"]+)"/gi;
let m;
const pproUnique = new Map();

while ((m = telRegex.exec(html)) !== null) {
  let raw = m[1].trim();
  let cleanDigits = raw.replace(/[^0-9]/g, '');
  if (cleanDigits.startsWith('0')) cleanDigits = '256' + cleanDigits.slice(1);
  if (!cleanDigits.startsWith('256')) cleanDigits = '256' + cleanDigits;

  if (!isUgandaMobile(cleanDigits)) continue;

  if (!pproUnique.has(cleanDigits)) {
    pproUnique.set(cleanDigits, {
      agentName: 'Property Agent (PropertyPro Uganda)',
      suburb: 'Kampala, Greater Kampala',
      listingTrigger: 'Active Flat / Apartment Listing on PropertyPro.co.ug',
      phone: '+' + cleanDigits,
      altPhone: '+' + cleanDigits,
      email: '',
      portal: 'https://propertypro.co.ug',
      status: 'Ready to Message on WhatsApp'
    });
  }
}

console.log('PropertyPro unique verified mobile agents:', pproUnique.size);
for (const [k, v] of pproUnique.entries()) {
  console.log(v.phone);
}

const current = JSON.parse(fs.readFileSync(path.join(__dirname, 'real_estate_leads.json'), 'utf8'));
const phoneSet = new Set(current.map(x => String(x.phone).replace(/[^0-9]/g, '')));
let added = 0;

for (const [k, v] of pproUnique.entries()) {
  if (!phoneSet.has(k)) {
    phoneSet.add(k);
    current.push(v);
    added++;
  }
}

console.log('Added from PropertyPro:', added);
console.log('Total property agents in sniper list now:', current.length);
fs.writeFileSync(path.join(__dirname, 'real_estate_leads.json'), JSON.stringify(current, null, 2), 'utf8');
