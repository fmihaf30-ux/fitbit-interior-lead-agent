const fs = require('fs');
const path = require('path');

const file2 = path.join(__dirname, 'scratch_site2.html');
const html2 = fs.readFileSync(file2, 'utf8');

// Find all matches for tel:
const telRegex = /href="tel:\s*([^"]+)"/gi;
let m;
const leads = [];
while ((m = telRegex.exec(html2)) !== null) {
  const phone = m[1].trim();
  const idx = m.index;
  // look at the preceding 1200 characters for title and agent
  const snippet = html2.slice(Math.max(0, idx - 1200), idx + 200);
  const titleMatch = snippet.match(/title="([^"]+)"/i);
  const agentMatch = snippet.match(/alt="([^"]+)"/i);
  const locMatch = snippet.match(/<h3>([^<]+)<\/h3>/i) || snippet.match(/<span>([^<]*(?:Kampala|Wakiso|Kira|Naguru|Kololo|Ntinda|Kyanja|Naalya|Bukoto|Muyenga|Lubowa)[^<]*)<\/span>/i);

  leads.push({
    phone,
    agent: agentMatch ? agentMatch[1].trim() : 'Property Agent',
    title: titleMatch ? titleMatch[1].trim() : 'Apartment for rent in Kampala',
    location: locMatch ? locMatch[1].trim() : 'Kampala, Uganda'
  });
}

console.log('Total PropertyPro leads:', leads.length);
console.log(leads.slice(0, 5));
