const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Pattern: agent name, phone, listing title/location
// Search for listing containers or anchors
const regex = /AgentImagePanel_\d+"[^>]*title="([^:"]+)\s*:\s*([^"]+)"[\s\S]*?(?:Details\.aspx\?HouseID=\d+[^>]*>([^<]+)<\/a>|Title[^>]*>([^<]+)<)/gi;

const matches = [];
let m;
while ((m = regex.exec(html1)) !== null) {
  matches.push({
    agent: m[1].trim(),
    phone: m[2].trim(),
    title: (m[3] || m[4] || '').trim()
  });
}
console.log('Total extracted with listings:', matches.length);
console.log(matches.slice(0, 10));
