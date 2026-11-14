require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const sentHistoryPath = path.join(__dirname, 'sent_history.json');
const leadsPath = path.join(__dirname, 'leads.json');

function loadSentHistory() {
  if (!fs.existsSync(sentHistoryPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(sentHistoryPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveSentHistory(history) {
  fs.writeFileSync(sentHistoryPath, JSON.stringify(history, null, 2), 'utf8');
}

function recordEmailSent(email, status, sentAtIso = null, followUpCount = 0, bounced = false) {
  if (!email) return;
  const key = email.trim().toLowerCase();
  const history = loadSentHistory();
  const nowIso = sentAtIso || new Date().toISOString();
  const prev = history[key] || {};
  const isBounce = Boolean(bounced || prev.bounced || /^(Blocked|Bounced|Invalid)/i.test(String(status || '')));
  history[key] = {
    email: key,
    status: status || prev.status || `Sent (${nowIso.slice(0, 16).replace('T', ' ')})`,
    sentAt: prev.sentAt || nowIso,
    lastContactedAt: nowIso,
    followUpCount: Math.max(Number(prev.followUpCount || 0), Number(followUpCount || 0)),
    bounced: isBounce
  };
  saveSentHistory(history);
}

function recordEmailBounced(email, reason = 'Blocked / Bounced (Stopped)') {
  if (!email) return;
  const key = email.trim().toLowerCase();
  const history = loadSentHistory();
  const nowIso = new Date().toISOString();
  const prev = history[key] || {};
  history[key] = {
    email: key,
    status: reason,
    sentAt: prev.sentAt || nowIso,
    lastContactedAt: prev.lastContactedAt || nowIso,
    followUpCount: Number(prev.followUpCount || 0),
    bounced: true
  };
  saveSentHistory(history);
}

function hasAlreadyBeenContacted(email) {
  if (!email) return false;
  const key = email.trim().toLowerCase();
  const history = loadSentHistory();
  return Boolean(history[key]);
}

function isEmailBlockedOrBounced(email) {
  if (!email) return true;
  const key = email.trim().toLowerCase();
  const history = loadSentHistory();
  const entry = history[key];
  if (!entry) return false;
  return Boolean(entry.bounced || /^(Blocked|Bounced|Invalid)/i.test(String(entry.status || '')));
}

function checkGmailSentFolder(user, pass, candidateEmails) {
  return new Promise((resolve) => {
    if (!pass || candidateEmails.length === 0) {
      return resolve([]);
    }

    const socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false });
    let buffer = '';
    let step = 'GREETING';
    let currentIdx = 0;
    const alreadySentEmails = [];

    const sendCmd = (tag, cmd) => {
      socket.write(`${tag} ${cmd}\r\n`);
    };

    const timeout = setTimeout(() => {
      try { socket.destroy(); } catch {}
      resolve(alreadySentEmails);
    }, 15000);

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
          return resolve(alreadySentEmails);
        }
        buffer = '';
        step = 'SELECT_SENT';
        sendCmd('A02', 'SELECT "[Gmail]/Sent Mail"');
      } else if (step === 'SELECT_SENT' && (buffer.includes('A02 OK') || buffer.includes('A02 NO'))) {
        if (!buffer.includes('A02 OK')) {
          clearTimeout(timeout);
          socket.end();
          return resolve(alreadySentEmails);
        }
        buffer = '';
        step = 'SEARCH';
        sendCmd(`S${currentIdx}`, `SEARCH TO "${candidateEmails[currentIdx]}"`);
      } else if (step === 'SEARCH' && buffer.includes(`S${currentIdx} OK`)) {
        const searchMatch = buffer.match(/\* SEARCH ([0-9\s]+)/);
        if (searchMatch && searchMatch[1] && searchMatch[1].trim().length > 0) {
          alreadySentEmails.push(candidateEmails[currentIdx]);
        }
        buffer = '';
        currentIdx++;
        if (currentIdx < candidateEmails.length) {
          sendCmd(`S${currentIdx}`, `SEARCH TO "${candidateEmails[currentIdx]}"`);
        } else {
          step = 'LOGOUT';
          sendCmd('A99', 'LOGOUT');
        }
      } else if (step === 'LOGOUT') {
        clearTimeout(timeout);
        socket.end();
        resolve(alreadySentEmails);
      }
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(alreadySentEmails);
    });
  });
}

async function reconcileSentLeadsWithGmail() {
  const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
  const history = loadSentHistory();

  // 1. Sync statuses from leads.json into sent_history.json (including Blocked/Bounced/Replied)
  for (const lead of leads) {
    const st = String(lead.status || '');
    const key = (lead.email || '').trim().toLowerCase();
    if (!key) continue;

    const isBlocked = Boolean(lead.bounced || /^(Blocked|Bounced|Invalid)/i.test(st));
    if (
      isBlocked ||
      st.startsWith('Sent') ||
      st.startsWith('Follow-Up') ||
      st.startsWith('Replied') ||
      st.startsWith('Automated')
    ) {
      history[key] = {
        email: key,
        status: isBlocked ? (st.startsWith('Blocked') ? st : 'Blocked / Bounced (Stopped)') : lead.status,
        sentAt: lead.sentAt || history[key]?.sentAt || new Date().toISOString(),
        lastContactedAt: lead.lastContactedAt || history[key]?.lastContactedAt || new Date().toISOString(),
        followUpCount: Math.max(Number(lead.followUpCount || 0), Number(history[key]?.followUpCount || 0)),
        bounced: isBlocked || Boolean(history[key]?.bounced)
      };
    }
  }
  saveSentHistory(history);

  // 2. Only check Gmail "[Gmail]/Sent Mail" via IMAP for leads NOT YET in history
  const user = process.env.SMTP_EMAIL || 'sseguyafahim1@gmail.com';
  const pass = (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, '');

  const uncheckedEmails = leads
    .map(l => (l.email || '').trim().toLowerCase())
    .filter(e => e && e.includes('@') && !history[e]);

  if (pass && pass !== 'your_16_char_app_password_here' && uncheckedEmails.length > 0) {
    console.log(`[*] Verifying ${uncheckedEmails.length} new leads against Gmail "[Gmail]/Sent Mail"...`);
    const foundInGmailSent = await checkGmailSentFolder(user, pass, uncheckedEmails);
    const foundSet = new Set(foundInGmailSent.map(e => e.toLowerCase()));

    for (const email of foundSet) {
      if (!history[email]) {
        const nowIso = new Date().toISOString();
        history[email] = {
          email,
          status: `Sent (Verified in Gmail Sent Mail)`,
          sentAt: nowIso,
          lastContactedAt: nowIso,
          followUpCount: 0,
          bounced: false
        };
      }
    }
    saveSentHistory(history);
  }

  // 3. Apply permanent history back onto leads.json (never downgrading Blocked/Bounced or Replied)
  let restoredCount = 0;
  for (const lead of leads) {
    const key = (lead.email || '').trim().toLowerCase();
    if (key && history[key]) {
      const h = history[key];
      if (h.bounced || /^(Blocked|Bounced|Invalid)/i.test(h.status)) {
        lead.status = h.status.startsWith('Blocked') ? h.status : 'Blocked / Bounced (Stopped)';
        lead.bounced = true;
      } else if (/^Replied/i.test(lead.status)) {
        // Keep Replied status
      } else {
        lead.status = h.status;
      }
      lead.sentAt = lead.sentAt || h.sentAt;
      lead.lastContactedAt = lead.lastContactedAt || h.lastContactedAt;
      lead.followUpCount = Math.max(Number(lead.followUpCount || 0), Number(h.followUpCount || 0));
    }
  }

  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2), 'utf8');
  return { totalSentLocked: Object.keys(history).length, restoredCount };
}

module.exports = {
  loadSentHistory,
  saveSentHistory,
  recordEmailSent,
  recordEmailBounced,
  hasAlreadyBeenContacted,
  isEmailBlockedOrBounced,
  reconcileSentLeadsWithGmail
};
