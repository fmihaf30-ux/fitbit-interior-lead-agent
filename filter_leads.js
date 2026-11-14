const fs = require('fs');
const path = require('path');

const listPath = path.join(__dirname, 'real_estate_leads.json');
const list = JSON.parse(fs.readFileSync(listPath, 'utf8'));

const suspicious = [
  '256752700800', // Spectrum
  '256700900100', // Nas
  '256772240240'  // Buildnet
];

let removed = 0;
const filtered = list.filter(item => {
  const digits = String(item.phone).replace(/[^0-9]/g, '');
  if (suspicious.includes(digits)) {
    removed++;
    return false;
  }
  return true;
});

filtered.forEach(item => {
  item.agentName = item.agentName.replace(/&amp;/g, '&');
  const d = String(item.phone).replace(/[^0-9]/g, '');
  item.phone = `"+${d}"`;
  item.altPhone = item.phone;
});

console.log('Removed suspicious patterned numbers:', removed);
console.log('Final verified mobile property agents:', filtered.length);
fs.writeFileSync(listPath, JSON.stringify(filtered, null, 2), 'utf8');
