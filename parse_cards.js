const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Notice each listing card uses ContentPlaceHolder1_ListingsDataList_ctlXX or similar.
// Let's split by the table cells or listing items
const items = html1.split(/id="ContentPlaceHolder1_ListingsDataList_/g);
console.log('Items found:', items.length);

const results = [];
for (let i = 1; i < items.length; i++) {
  const block = items[i];
  const agentMatch = block.match(/title="([^:"]+)\s*:\s*([^"]+)"/i);
  if (!agentMatch) continue;

  const agentName = agentMatch[1].trim();
  const phone = agentMatch[2].trim();

  // Look for title / description / price in the block
  const titleMatch = block.match(/<a[^>]*title="([^"]+)"[^>]*Details\.aspx/i) || block.match(/Details\.aspx[^>]*>([^<]+)<\/a>/i);
  const locationMatch = block.match(/(?:Ntinda|Kira|Kyanja|Kololo|Naguru|Bukoto|Naalya|Lubowa|Muyenga|Kisaasi)[^<,\n]*/i);
  
  results.push({
    agentName,
    phone,
    title: titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : 'House for rent/sale in Ntinda',
    location: locationMatch ? locationMatch[0].trim() : 'Ntinda, Kampala'
  });
}

console.log('Extracted items:', results.length);
console.log(results.slice(0, 10));
