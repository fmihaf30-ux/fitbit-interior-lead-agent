const fs = require('fs');
const path = require('path');

const file2 = path.join(__dirname, 'scratch_site2.html');
if (fs.existsSync(file2)) {
  const html2 = fs.readFileSync(file2, 'utf8');
  console.log('Site 2 length:', html2.length);
  // look for phone numbers, agent names, property titles
  const cards = html2.match(/<div[^>]*class="[^"]*property[^"]*"[^>]*>[\s\S]*?<\/div>/gi) || [];
  console.log('Property cards:', cards.length);

  // find any tel links and their parent text
  const telRegex = /href="tel:([^"]+)"/gi;
  let m;
  const phones = [];
  while ((m = telRegex.exec(html2)) !== null) {
    phones.push(m[1].trim());
  }
  console.log('PropertyPro tel links:', phones);
}

const file3 = path.join(__dirname, 'scratch_site3.html');
if (fs.existsSync(file3)) {
  const html3 = fs.readFileSync(file3, 'utf8');
  console.log('Site 3 length:', html3.length);
  const telRegex3 = /href="tel:([^"]+)"/gi;
  let m;
  const phones3 = [];
  while ((m = telRegex3.exec(html3)) !== null) {
    phones3.push(m[1].trim());
  }
  console.log('Rentify tel links:', phones3);
}
