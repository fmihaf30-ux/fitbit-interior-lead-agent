const fs = require('fs');
const path = require('path');

function inspectSites() {
  const file1 = path.join(__dirname, 'scratch_site1.html');
  const file2 = path.join(__dirname, 'scratch_site2.html');
  const file3 = path.join(__dirname, 'scratch_site3.html');

  if (fs.existsSync(file1)) {
    const html1 = fs.readFileSync(file1, 'utf8');
    const regex1 = /title="([^:"]+)\s*:\s*(\+?256[0-9]+|07[0-9]+)"/gi;
    let m;
    const site1Agents = [];
    while ((m = regex1.exec(html1)) !== null) {
      site1Agents.push({ name: m[1].trim(), phone: m[2].trim() });
    }
    console.log('Site 1 (realestatedatabase.net) Agents found:', site1Agents.length);
    console.log(site1Agents.slice(0, 15));
  }

  if (fs.existsSync(file2)) {
    const html2 = fs.readFileSync(file2, 'utf8');
    // propertypro.co.ug inspection
    const waMatches = html2.match(/https?:\/\/wa\.me\/[0-9]+/gi) || [];
    const telMatches = html2.match(/href="tel:[^"]+"/gi) || [];
    console.log('Site 2 (propertypro.co.ug) WA links:', waMatches.slice(0, 5));
    console.log('Site 2 (propertypro.co.ug) Tel links:', telMatches.slice(0, 5));
  }

  if (fs.existsSync(file3)) {
    const html3 = fs.readFileSync(file3, 'utf8');
    // rentify.co.ug inspection
    const waMatches3 = html3.match(/https?:\/\/wa\.me\/[0-9]+/gi) || [];
    const telMatches3 = html3.match(/href="tel:[^"]+"/gi) || [];
    console.log('Site 3 (rentify.co.ug) WA links:', waMatches3.slice(0, 5));
    console.log('Site 3 (rentify.co.ug) Tel links:', telMatches3.slice(0, 5));
  }
}

inspectSites();
