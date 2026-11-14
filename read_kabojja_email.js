const tls = require('tls');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const email = process.env.SMTP_EMAIL;
const pass = (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
  let step = 0;
  let buffer = '';

  socket.on('data', d => {
    buffer += d.toString('utf8');
    if (step === 0 && buffer.includes('* OK')) {
      step = 1;
      socket.write(`A1 LOGIN ${email} ${pass}\r\n`);
    } else if (step === 1 && buffer.includes('A1 OK')) {
      step = 2;
      buffer = '';
      socket.write('A2 SELECT INBOX\r\n');
    } else if (step === 2 && buffer.includes('A2 OK')) {
      step = 3;
      buffer = '';
      socket.write('A3 SEARCH FROM "info@kabojjainternational.com"\r\n');
    } else if (step === 3 && buffer.includes('A3 OK')) {
      const match = buffer.match(/\* SEARCH\s+([\d\s]+)/);
      const msgIds = match ? match[1].trim().split(/\s+/).filter(Boolean) : [];
      if (msgIds.length > 0) {
        const lastId = msgIds[msgIds.length - 1];
        step = 4;
        buffer = '';
        socket.write(`A4 FETCH ${lastId} (BODY[HEADER.FIELDS (SUBJECT DATE FROM)] BODY[TEXT])\r\n`);
      } else {
        console.log('No message found from Kabojja');
        socket.end();
      }
    } else if (step === 4 && buffer.includes('A4 OK')) {
      console.log('=== KABOJJA REPLY PREVIEW ===');
      console.log(buffer.slice(0, 2000));
      socket.end();
    }
  });
});
