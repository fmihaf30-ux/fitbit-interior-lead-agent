const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Check the text around Cathy or Ivan
const idx = html1.indexOf('AgentImagePanel_0');
console.log('Surrounding 1500 chars before and after AgentImagePanel_0:');
console.log(html1.slice(Math.max(0, idx - 1000), idx + 500));
