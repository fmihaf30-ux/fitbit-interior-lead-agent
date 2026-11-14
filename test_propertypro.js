const fs = require('fs');
const path = require('path');

const file2 = path.join(__dirname, 'scratch_site2.html');
if (fs.existsSync(file2)) {
  const html2 = fs.readFileSync(file2, 'utf8');
  const cards = html2.split(/<div[^>]*class="[^"]*single-room-sale[^"]*"[^>]*>/gi);
  console.log('PropertyPro raw blocks:', cards.length);

  const results = [];
  for (let i = 1; i < cards.length; i++) {
    const block = cards[i];
    const telMatch = block.match(/href="tel:\s*([^"]+)"/i);
    const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    const locMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const agentMatch = block.match(/alt="([^"]+)"\s+title="[^"]*"\s*\/>\s*<\/div>\s*<div[^>]*>\s*([^<]+)/i);

    if (telMatch) {
      results.push({
        phone: telMatch[1].trim(),
        agent: agentMatch ? (agentMatch[1].trim() || agentMatch[2].trim()) : 'Property Agent',
        title: titleMatch ? titleMatch[1].trim() : 'Apartment in Kampala',
        location: locMatch ? locMatch[1].trim() : 'Kampala'
      });
    }
  }
  console.log('Extracted PropertyPro:', results.length);
  console.log(results.slice(0, 5));
}
