const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Look for ContentPlaceHolder1_ListingsDataList_ctl00 (the card container)
const idx = html1.indexOf('ctl00$AgentReview');
if (idx !== -1) {
  console.log('Surrounding 3000 chars before ctl00$AgentReview:');
  console.log(html1.slice(Math.max(0, idx - 2500), idx));
}
