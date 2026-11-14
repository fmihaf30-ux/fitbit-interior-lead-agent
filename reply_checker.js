require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const tls = require('tls');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const { syncToSheets } = require('./sync');
const { recordEmailBounced, recordEmailSent } = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');
const DEFAULT_EMAIL = 'sseguyafahim1@gmail.com';

async function hasValidMxRecord(email) {
  const domain = String(email || '').trim().toLowerCase().split('@')[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    const valid = (mx || []).filter(
      m => m && m.exchange && m.exchange !== '.' && !m.exchange.toLowerCase().includes('ghs.google.com')
    );
    return valid.length > 0;
  } catch {
    return false;
  }
}

/**
 * Connects to Gmail IMAP to:
 * 1. Detect all mailer-daemon / postmaster bounced or blocked emails ("Delivery incomplete", "Address not found", etc.)
 * 2. Detect genuine client replies from contacted leads
 */
function checkImapForBouncesAndReplies(user, pass, candidateEmails) {
  return new Promise((resolve) => {
    if (!pass || candidateEmails.length === 0) {
      return resolve({ replied: [], bounced: [] });
    }

    const candidateSet = new Set(candidateEmails.map(e => e.toLowerCase()));
    const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false });
    let buffer = '';
    let step = 'GREETING';
    let bounceIds = [];
    let currentIdx = 0;
    const replied = [];
    const bouncedSet = new Set();

    const sendCmd = (tag, cmd) => {
      socket.write(`${tag} ${cmd}\r\n`);
    };

    const timeout = setTimeout(() => {
      try { socket.destroy(); } catch {}
      resolve({ replied, bounced: [...bouncedSet] });
    }, 20000);

    const startCandidateSearch = () => {
      currentIdx = 0;
      while (currentIdx < candidateEmails.length && bouncedSet.has(candidateEmails[currentIdx].toLowerCase())) {
        currentIdx++;
      }
      if (currentIdx < candidateEmails.length) {
        step = 'SEARCH_REPLY';
        sendCmd(`S${currentIdx}`, `SEARCH FROM "${candidateEmails[currentIdx]}"`);
      } else {
        step = 'LOGOUT';
        sendCmd('A99', 'LOGOUT');
      }
    };

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      if (step === 'GREETING' && buffer.includes('* OK')) {
        buffer = '';
        step = 'LOGIN';
        sendCmd('A01', `LOGIN "${user}" "${pass}"`);
      } else if (step === 'LOGIN' && (buffer.includes('A01 OK') || buffer.includes('A01 NO') || buffer.includes('A01 BAD'))) {
        if (!buffer.includes('A01 OK')) {
          clearTimeout(timeout);
          socket.end();
          return resolve({ replied, bounced: [] });
        }
        buffer = '';
        step = 'SELECT';
        sendCmd('A02', 'SELECT INBOX');
      } else if (step === 'SELECT' && buffer.includes('A02 OK')) {
        buffer = '';
        step = 'SEARCH_BOUNCES';
        sendCmd('B01', 'SEARCH OR FROM "mailer-daemon" FROM "postmaster"');
      } else if (step === 'SEARCH_BOUNCES' && buffer.includes('B01 OK')) {
        const m = buffer.match(/\* SEARCH ([0-9\s]+)/);
        bounceIds = m && m[1] ? m[1].trim().split(/\s+/).filter(Boolean) : [];
        buffer = '';
        if (bounceIds.length > 0) {
          step = 'FETCH_BOUNCES';
          const recentIds = bounceIds.slice(-45).join(',');
          sendCmd('B02', `FETCH ${recentIds} (BODY.PEEK[HEADER.FIELDS (X-FAILED-RECIPIENTS SUBJECT)] BODY.PEEK[TEXT]<0.900>)`);
        } else {
          startCandidateSearch();
        }
      } else if (step === 'FETCH_BOUNCES' && /B02 OK/i.test(buffer)) {
        const foundEmails = buffer.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const raw of foundEmails) {
          const lower = raw.toLowerCase();
          if (candidateSet.has(lower)) {
            bouncedSet.add(lower);
          }
        }
        buffer = '';
        startCandidateSearch();
      } else if (step === 'SEARCH_REPLY' && buffer.includes(`S${currentIdx} OK`)) {
        const searchMatch = buffer.match(/\* SEARCH ([0-9\s]+)/);
        if (searchMatch && searchMatch[1] && searchMatch[1].trim().length > 0) {
          const emailLower = candidateEmails[currentIdx].toLowerCase();
          if (!bouncedSet.has(emailLower) && !emailLower.includes('kabojjainternational')) {
            replied.push(emailLower);
          }
        }
        buffer = '';
        currentIdx++;
        while (currentIdx < candidateEmails.length && bouncedSet.has(candidateEmails[currentIdx].toLowerCase())) {
          currentIdx++;
        }
        if (currentIdx < candidateEmails.length) {
          sendCmd(`S${currentIdx}`, `SEARCH FROM "${candidateEmails[currentIdx]}"`);
        } else {
          step = 'LOGOUT';
          sendCmd('A99', 'LOGOUT');
        }
      } else if (step === 'LOGOUT') {
        clearTimeout(timeout);
        socket.end();
        resolve({ replied, bounced: [...bouncedSet] });
      }
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve({ replied, bounced: [...bouncedSet] });
    });
  });
}

function triggerHotLeadAlert(lead) {
  console.log(`\n**********************************************************************`);
  console.log(`🔥 [HOT LEAD NOTIFICATION ALERT] 🔥`);
  console.log(`   Client Name : ${lead.name}`);
  console.log(`   Email       : ${lead.email}`);
  console.log(`   Status      : Replied! Automated follow-ups stopped.`);
  console.log(`**********************************************************************\n`);
}

async function checkInboxReplies(customAppPassword = null) {
  const user = process.env.SMTP_EMAIL || DEFAULT_EMAIL;
  const pass = (customAppPassword || process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  let updatedCount = 0;
  let bouncedCount = 0;

  // 1. First check MX records on all leads that are not already marked Blocked/Bounced
  for (const lead of leads) {
    if (!lead.email) continue;
    const st = String(lead.status || '');
    if (lead.bounced || /^(Blocked|Bounced|Invalid)/i.test(st)) continue;
    const validMx = await hasValidMxRecord(lead.email);
    if (!validMx) {
      lead.status = 'Blocked / Bounced (Stopped)';
      lead.bounced = true;
      recordEmailBounced(lead.email, lead.status);
      bouncedCount++;
      console.log(`[!] Blocked dead/invalid domain: ${lead.name} <${lead.email}> (follow-ups stopped)`);
    }
  }

  const activeContactedLeads = leads.filter(l => {
    if (!l.email || l.bounced) return false;
    const st = String(l.status || '');
    if (/^(Blocked|Bounced|Invalid|Replied|Automated|Opted Out)/i.test(st)) return false;
    return st.startsWith('Sent') || st.startsWith('Follow-Up');
  });

  if (pass && pass !== 'your_16_char_app_password_here' && activeContactedLeads.length > 0) {
    const emailsToCheck = activeContactedLeads.map(l => l.email.toLowerCase());
    const { replied, bounced } = await checkImapForBouncesAndReplies(user, pass, emailsToCheck);

    const bouncedSet = new Set(bounced.map(e => e.toLowerCase()));
    const repliedSet = new Set(replied.map(e => e.toLowerCase()));

    for (const lead of leads) {
      const emailKey = (lead.email || '').trim().toLowerCase();
      if (!emailKey) continue;

      if (bouncedSet.has(emailKey)) {
        if (!lead.bounced || !String(lead.status || '').startsWith('Blocked')) {
          lead.status = 'Blocked / Bounced (Stopped)';
          lead.bounced = true;
          recordEmailBounced(lead.email, lead.status);
          bouncedCount++;
          console.log(`[!] Detected Gmail bounce/delivery failure for ${lead.email} — permanently stopped follow-ups.`);
        }
        continue;
      }

      if (repliedSet.has(emailKey) && !String(lead.status || '').startsWith('Replied')) {
        const dateStr = new Date().toISOString().slice(0, 10);
        lead.status = `Replied - Hot Lead (${dateStr})`;
        lead.repliedAt = new Date().toISOString();
        recordEmailSent(lead.email, lead.status, lead.sentAt, lead.followUpCount, false);
        updatedCount++;
        triggerHotLeadAlert(lead);
      }
    }
  }

  if (updatedCount > 0 || bouncedCount > 0) {
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
    syncToSheets();
  }

  return updatedCount;
}

if (require.main === module) {
  checkInboxReplies().catch(err => console.error('[!] Reply Checker Error:', err.message));
}

module.exports = { checkInboxReplies, hasValidMxRecord };
