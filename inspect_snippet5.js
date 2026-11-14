const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Look for HouseID=
const idx = html1.indexOf('HouseID=');
console.log('HouseID index:', idx);
if (idx !== -1) {
  console.log('Around HouseID:');
  console.log(html1.slice(idx - 200, idx + 400));
}
