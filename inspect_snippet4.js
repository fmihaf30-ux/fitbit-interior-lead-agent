const fs = require('fs');
const path = require('path');

const file1 = path.join(__dirname, 'scratch_site1.html');
const html1 = fs.readFileSync(file1, 'utf8');

// Look for HouseTitle or TitleLinkButton
const titleMatches = html1.match(/id="ContentPlaceHolder1_ListingsDataList_[^"]*Title[^"]*"[^>]*>([^<]+)<\/a>/gi) || [];
console.log('Title matches:', titleMatches.slice(0, 10));

const anyLink = html1.match(/<a[^>]*href="[^"]*Details\.aspx\?HouseID=[^"]*"[^>]*>([^<]+)<\/a>/gi) || [];
console.log('Details link text:', anyLink.slice(0, 10));
