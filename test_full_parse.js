const fs = require('fs');
const path = require('path');

function parseRealEstateDatabase(html) {
  // Find all AgentImagePanel_X and look backwards for ManualTitleLabel_X and Location_X
  const agentRegex = /AgentImagePanel_(\d+)"[^>]*title="([^:"]+)\s*:\s*([^"]+)"/g;
  let m;
  const leads = [];

  while ((m = agentRegex.exec(html)) !== null) {
    const idx = m[1];
    const agentName = m[2].trim();
    const phone = m[3].trim();

    // Look for ManualTitleLabel_idx and Location_idx
    const titleRegex = new RegExp(`ManualTitleLabel_${idx}"[^>]*title="([^"]+)"`, 'i');
    const locRegex = new RegExp(`Location_${idx}">([^<]+)<`, 'i');
    const priceRegex = new RegExp(`Shillings_${idx}"[^>]*>([^<]+)<`, 'i');

    const titleMatch = html.match(titleRegex);
    const locMatch = html.match(locRegex);
    const priceMatch = html.match(priceRegex);

    const title = titleMatch ? titleMatch[1].trim() : 'House in Ntinda';
    const loc = locMatch ? locMatch[1].trim() : 'Ntinda, Kampala';
    const price = priceMatch ? priceMatch[1].trim() : '';

    leads.push({
      agentName,
      phone,
      title: `${title} (${price})`.trim(),
      location: `${loc}, Greater Kampala`
    });
  }
  return leads;
}

const file1 = path.join(__dirname, 'scratch_site1.html');
const leads = parseRealEstateDatabase(fs.readFileSync(file1, 'utf8'));
console.log('Total leads parsed from realestatedatabase.net:', leads.length);
console.log('Sample leads:');
console.log(leads.slice(0, 5));
