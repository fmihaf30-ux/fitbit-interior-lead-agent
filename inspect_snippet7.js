const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

const idx = html1.indexOf('AgentImagePanel_0');
console.log('Index of AgentImagePanel_0:', idx);
if (idx !== -1) {
  console.log('Chars -4000 to -1000 before AgentImagePanel_0:');
  console.log(html1.slice(Math.max(0, idx - 4000), idx - 1000));
}
