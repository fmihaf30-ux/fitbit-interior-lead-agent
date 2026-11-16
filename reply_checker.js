require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const dns = require('dns');
const { syncToSheets } = require('./sync');
const {
  reconcileSentLeadsWithGmail,
  recordEmailReplied,
  recordEmailBounced
} = require('./sent_tracker');

const leadsPath = path.join(__dirname, 'leads.json');
const DEFAULT_EMAIL = 'sseguyafahim1@gmail.com';

/**
 * Checks if an email domain has valid MX records.
 * Only returns false on explicit DNS ENOTFOUND / ENODATA or invalid web-only records
 * (never on temporary local network timeouts).
 */
async function hasValidMxRecord(email) {
  const domain = String(email || '').split('@')[1]?.trim().toLowerCase();
  if (!domain) return false;
  if (domain === 'gmail.com' || domain === 'yahoo.com' || domain === 'outlook.com' || domain === 'hotmail.com') {
    return true;
  }
  try {
    const mx = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise(resolve => setTimeout(() => resolve('TIMEOUT'), 4500))
    ]);
    if (mx === 'TIMEOUT') return true; // Do not penalize temporary DNS latency
    if (!Array.isArray(mx) || mx.length === 0) return false;
    return mx.some(r => r && r.exchange && r.exchange !== '.' && !/^ghs\.google\.com\.?$/i.test(r.exchange));
  } catch (err) {
    if (err && (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL')) {
      return false;
    }
    return true;
  }
}

/**
 * Connects to Gmail IMAP (imap.gmail.com:993):
 * 1. Scans INBOX for any `mailer-daemon` / `postmaster` bounce notifications,
 *    extracts ONLY `X-Failed-Recipients`, and automatically deletes the bounce
 *    emails from INBOX so the user's inbox stays clean.
 * 2. Scans INBOX for genuine human replies from contacted leads.
 */
function checkImapForBouncesAndReplies(user, pass, candidateEmails) {
  return new Promise(resolve => {
    if (!candidateEmails.length) return resolve({ replied: [], bounced: [] });

    const replied = [];
    const bouncedSet = new Set();
    const candidateSet = new Set(candidateEmails.map(e => e.toLowerCase()));
    const socket = tls.connect(993, 'imap.gmail.com', { servername: 'imap.gmail.com' });
    let buffer = '';
    let step = 'GREET';
    let currentIdx = 0;
    let bounceIds = [];

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({ replied, bounced: [...bouncedSet] });
    }, 30000);

    function sendCmd(tag, cmd) {
      socket.write(`${tag} ${cmd}\r\n`);
    }

    function startCandidateSearch() {
      while (currentIdx < candidateEmails.length && bouncedSet.has(candidateEmails[currentIdx].toLowerCase())) {
        currentIdx++;
      }
      if (currentIdx >= candidateEmails.length) {
        step = 'LOGOUT';
        sendCmd('A99', 'LOGOUT');
        return;
      }
      step = 'SEARCH_REPLY';
      sendCmd(`S${currentIdx}`, `SEARCH FROM "${candidateEmails[currentIdx]}"`);
    }

    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');

      if (step === 'GREET' && buffer.includes('* OK')) {
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
          const recentIds = bounceIds.slice(-30).join(',');
          sendCmd('B02', `FETCH ${recentIds} (BODY.PEEK[HEADER.FIELDS (X-FAILED-RECIPIENTS)])`);
        } else {
          startCandidateSearch();
        }
      } else if (step === 'FETCH_BOUNCES' && /B02 OK/i.test(buffer)) {
        const failedMatches = [...buffer.matchAll(/X-Failed-Recipients:\s*([^\r\n]+)/gi)];
        for (const match of failedMatches) {
          const lower = match[1].trim().toLowerCase();
          if (candidateSet.has(lower)) {
            bouncedSet.add(lower);
          }
        }
        buffer = '';
        // Automatically move bounce emails to Trash & expunge from INBOX
        step = 'DELETE_BOUNCES';
        sendCmd('B03', `STORE ${bounceIds.join(',')} +FLAGS (\\Deleted \\Seen)`);
      } else if (step === 'DELETE_BOUNCES' && /B03 OK/i.test(buffer)) {
        buffer = '';
        step = 'EXPUNGE_BOUNCES';
        sendCmd('B04', 'EXPUNGE');
      } else if (step === 'EXPUNGE_BOUNCES' && /B04 OK/i.test(buffer)) {
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

  let leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  let updatedCount = 0;

  if (!pass || pass === 'your_16_char_app_password_here') {
    return 0;
  }

  await reconcileSentLeadsWithGmail();

  const candidateLeads = leads.filter(
    l =>
      l.email &&
      !l.bounced &&
      (String(l.status).startsWith('Sent') ||
        String(l.status).startsWith('Follow-Up') ||
        String(l.status).startsWith('Replied'))
  );
  const candidateEmails = candidateLeads.map(l => l.email.trim());

  const { replied: repliedEmails, bounced: bouncedEmails } = await checkImapForBouncesAndReplies(
    user,
    pass,
    candidateEmails
  );
  const repliedSet = new Set(repliedEmails.map(e => e.toLowerCase()));
  const bouncedSet = new Set(bouncedEmails.map(e => e.toLowerCase()));

  // Remove any bounced leads completely so we never keep or retry dead emails
  if (bouncedSet.size > 0) {
    const beforeLen = leads.length;
    for (const bEmail of bouncedSet) {
      recordEmailBounced(bEmail, 'Removed (Bounced)');
      console.log(`[-] Deleted bounced email from leads database: ${bEmail}`);
    }
    leads = leads.filter(l => !bouncedSet.has((l.email || '').trim().toLowerCase()));
    if (leads.length !== beforeLen) {
      fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
    }
  }

  for (const lead of leads) {
    const emailLower = (lead.email || '').trim().toLowerCase();
    if (repliedSet.has(emailLower) && !String(lead.status).startsWith('Replied')) {
      const dateStr = new Date().toISOString().slice(0, 10);
      lead.status = `Replied - Hot Lead (${dateStr})`;
      recordEmailReplied(lead.email, lead.status);
      updatedCount++;
      triggerHotLeadAlert(lead);
    }
  }

  if (updatedCount > 0 || bouncedSet.size > 0) {
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
    syncToSheets();
  }

  return updatedCount;
}

if (require.main === module) {
  checkInboxReplies().catch(err => console.error('[!] Reply check error:', err.message));
}

module.exports = { checkInboxReplies, hasValidMxRecord };
