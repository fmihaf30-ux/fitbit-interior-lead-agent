const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

const idx = html1.indexOf('AgentImagePanel_0');
console.log('Chars -8000 to -4000 before AgentImagePanel_0:');
console.log(html1.slice(Math.max(0, idx - 8000), idx - 4000));
