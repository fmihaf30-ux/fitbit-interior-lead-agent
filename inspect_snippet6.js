const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Look at the beginning of ContentPlaceHolder1_ListingsDataList
const idx = html1.indexOf('ContentPlaceHolder1_ListingsDataList_ctl00');
console.log('Index of ctl00:', idx);
if (idx !== -1) {
  console.log('Next 1200 chars:');
  console.log(html1.slice(idx, idx + 1200));
}
