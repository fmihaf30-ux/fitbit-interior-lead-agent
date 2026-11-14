const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

const idx = html1.indexOf('AgentImagePanel_1');
if (idx !== -1) {
  console.log('Behind HTML for AgentImagePanel_1 (up to 2000 chars before):');
  console.log(html1.slice(Math.max(0, idx - 2000), idx));
}
