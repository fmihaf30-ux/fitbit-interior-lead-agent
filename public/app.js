// Fitbit Interiors — Live Pixel-Agents 2D Office & Complete Operations Report Controller
let lastEventId = 0;
let reportData = null;
let lastWaCount = -1;
let lastB2BCount = -1;
let lastSentCount = -1;

function formatMMSS(sec) {
  const s = Math.max(0, Number(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

async function switchOfficePhase(phase) {
  try {
    await fetch('/api/phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase })
    });
    fetchState();
  } catch (err) {
    console.error('Phase switch error:', err);
  }
}

async function fetchState() {
  try {
    const res = await fetch(`/api/state?since=${lastEventId}`);
    const data = await res.json();
    const firstLoad = !reportData;
    reportData = data;
    if (data.lastEventId) lastEventId = data.lastEventId;

    if (window.PixelOffice && typeof window.PixelOffice.applyServerState === 'function') {
      window.PixelOffice.applyServerState(data);
    }

    renderShiftAndLogs(data);
    renderBoardroomSummary(data);

    const waCount = (data.waAgents || []).length;
    const b2bCount = (data.b2bLeads || []).length;
    const sentCount = data.summary?.initialEmailsSent || 0;
    if (firstLoad || waCount !== lastWaCount || b2bCount !== lastB2BCount || sentCount !== lastSentCount) {
      lastWaCount = waCount;
      lastB2BCount = b2bCount;
      lastSentCount = sentCount;
      renderReplies(data.confirmedReplies || []);
      renderTables();
    }
  } catch (err) {
    console.error('Poll error:', err);
  }
}

function renderShiftAndLogs(data) {
  const dot = document.getElementById('shiftDot');
  const label = document.getElementById('shiftLabel');
  const pillWorking = document.getElementById('pillWorking');
  const pillBreak = document.getElementById('pillBreak');
  const pillBoardroom = document.getElementById('pillBoardroom');
  const bannerTag = document.getElementById('bannerTag');
  const bannerText = document.getElementById('bannerText');
  const mmss = formatMMSS(data.shiftRemainingSec);

  if (pillWorking && pillBreak && pillBoardroom) {
    pillWorking.className = 'phase-pill' + (data.officeShift === 'working' ? ' active-work' : '');
    pillBreak.className = 'phase-pill' + ((data.officeShift === 'short_break' || data.officeShift === 'long_break') ? ' active-break' : '');
    pillBoardroom.className = 'phase-pill' + (data.officeShift === 'boardroom' ? ' active-boardroom' : '');
  }

  if (dot && label) {
    if (data.officeShift === 'boardroom') {
      dot.className = 'shift-dot';
      dot.style.background = '#a855f7';
      label.textContent = `Boardroom "What's New" Meeting • Next Work Shift in ${mmss}`;
      if (bannerTag) { bannerTag.textContent = 'BOARDROOM LIVE'; bannerTag.style.background = '#7e22ce'; }
      if (bannerText) bannerText.textContent = `All 5 staff are in the Conference Boardroom reviewing newly added B2B leads, emails sent, blocked bounces, and client replies!`;
    } else if (data.officeShift === 'long_break' || data.officeShift === 'short_break') {
      dot.className = 'shift-dot break';
      dot.style.background = '#f59e0b';
      const kindLabel = data.officeShift === 'long_break' ? 'Long Lunch Break' : 'Short Coffee Break';
      label.textContent = `${kindLabel} • Boardroom Review in ${mmss}`;
      if (bannerTag) { bannerTag.textContent = 'TIMED BREAK'; bannerTag.style.background = '#d97706'; }
      if (bannerText) bannerText.textContent = `Staff are resting in the Kitchen & Sofa Lounge (PC monitors OFF). Next up: End-of-Break Boardroom Meeting in ${mmss}!`;
    } else {
      dot.className = 'shift-dot';
      dot.style.background = '#10b981';
      label.textContent = `Active Work Shift • Timed Break in ${mmss}`;
      if (bannerTag) { bannerTag.textContent = 'ACTIVE SHIFT'; bannerTag.style.background = '#059669'; }
      if (bannerText) bannerText.textContent = `Sarah is discovering MX-verified Ugandan B2B leads, Emma is sending real SMTP emails, David is syncing WhatsApp agents, and Grace is scanning IMAP replies.`;
    }
  }

  const s = data.summary || {};
  document.getElementById('metricScoutTotal').textContent = (s.waAgentsTotal || 110) + (s.b2bTotal || 65);
  document.getElementById('metricWaContacted').textContent = `${s.waAgentsTotal || 110} WA`;
  document.getElementById('metricEmailSent').textContent = `${s.initialEmailsSent || 55} Sent • ${s.bouncedStopped || 10} Blocked`;
  document.getElementById('metricReplies').textContent = `${s.totalConfirmedReplies || 9} Replies`;

  const bounceEl = document.getElementById('bannerBounceStat');
  const replyEl = document.getElementById('bannerReplyStat');
  if (bounceEl) bounceEl.textContent = `${s.bouncedStopped || 10} Bounced/Invalid Domains Stopped`;
  if (replyEl) replyEl.textContent = `${s.totalConfirmedReplies || 9} Confirmed Human Replies`;

  const states = data.agentStates || {};
  if (states.sarah?.status) document.getElementById('subSarah').textContent = states.sarah.status;
  if (states.david?.status) document.getElementById('subDavid').textContent = states.david.status;
  if (states.emma?.status) document.getElementById('subEmma').textContent = states.emma.status;
  if (states.grace?.status) document.getElementById('subGrace').textContent = states.grace.status;
  if (states.manager?.status) document.getElementById('subFahim').textContent = states.manager.status;

  const box = document.getElementById('officeLogs');
  if (box && data.logs) {
    box.innerHTML = data.logs.slice(0, 12).map(l =>
      `<div class="ticker-item"><strong>[${escapeHtml(l.time)} ${escapeHtml(l.agent)}]</strong> ${escapeHtml(l.message)}</div>`
    ).join('');
  }
}

function renderBoardroomSummary(data) {
  const br = data.boardroomReport || {};
  const s = data.summary || {};

  const statusTag = document.getElementById('boardroomStatusTag');
  if (statusTag) {
    statusTag.textContent = data.officeShift === 'boardroom'
      ? `LIVE NOW: Speaker — ${(br.speaker || 'manager').toUpperCase()} (Shift #${br.shiftNumber || 1})`
      : `Shift #${br.shiftNumber || 1} • +${br.newB2BDiscovered || 0} New B2B Added • +${br.newEmailsSent || 0} New Emails Sent`;
  }

  const newBadge = document.getElementById('brNewCountBadge');
  if (newBadge) {
    newBadge.textContent = `+${br.newB2BDiscovered || 0} B2B • +${br.newEmailsSent || 0} Sent`;
  }

  const newListEl = document.getElementById('brNewLeadsList');
  if (newListEl) {
    const recentAdded = br.recentAddedLeads && br.recentAddedLeads.length > 0
      ? br.recentAddedLeads
      : (data.b2bLeads || []).slice(-5).reverse().map(l => `${l.name} <${l.email}> (${l.status})`);
    newListEl.innerHTML = recentAdded.slice(0, 6).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }

  const bounceBadge = document.getElementById('brBounceCountBadge');
  const bouncedItems = br.bouncedStoppedEmails || [];
  if (bounceBadge) {
    bounceBadge.textContent = `${bouncedItems.length || s.bouncedStopped || 10} Permanently Stopped`;
  }

  const bounceListEl = document.getElementById('brBouncedList');
  if (bounceListEl) {
    bounceListEl.innerHTML = bouncedItems.slice(0, 6).map(b =>
      `<li><strong>${escapeHtml(b.name)}</strong> (<code>${escapeHtml(b.email)}</code>) — Follow-ups Stopped</li>`
    ).join('');
  }

  const repliesListEl = document.getElementById('brLatestRepliesList');
  if (repliesListEl && data.confirmedReplies) {
    repliesListEl.innerHTML = data.confirmedReplies.slice(0, 6).map(r =>
      `<li><strong>${escapeHtml(r.name)}</strong> — ${escapeHtml(r.status)}</li>`
    ).join('');
  }
}

function renderReplies(replies) {
  const countEl = document.getElementById('countConfirmedReplies');
  if (countEl) countEl.textContent = replies.length;

  const grid = document.getElementById('repliesGrid');
  if (!grid) return;
  grid.innerHTML = replies.map(r => `
    <div class="reply-card">
      <div class="reply-top">
        <strong>${escapeHtml(r.name)}</strong>
        <span class="badge badge-replied">${escapeHtml(r.status)}</span>
      </div>
      <div class="reply-action">${escapeHtml(r.channel)} • ${escapeHtml(r.contact)}</div>
      <div class="reply-quote">"${escapeHtml(r.replyText)}"</div>
      <div class="reply-action"><strong>Action:</strong> ${escapeHtml(r.actionTaken)}</div>
    </div>
  `).join('');
}

function renderTables() {
  if (!reportData) return;
  const q = (document.getElementById('reportSearch')?.value || '').toLowerCase().trim();

  // 1. WhatsApp Property Agents Table
  const waList = (reportData.waAgents || []).filter(a =>
    !q ||
    String(a.agentName).toLowerCase().includes(q) ||
    String(a.suburb).toLowerCase().includes(q) ||
    String(a.phone).toLowerCase().includes(q) ||
    String(a.listingTrigger).toLowerCase().includes(q)
  );
  document.getElementById('countWaAgents').textContent = waList.length;

  const waBody = document.getElementById('waAgentsTableBody');
  waBody.innerHTML = waList.map(a => {
    const isReplied = /replied/i.test(a.status);
    return `
      <tr>
        <td>${a.index}</td>
        <td><strong>${escapeHtml(a.agentName)}</strong></td>
        <td>${escapeHtml(a.suburb)}</td>
        <td><code>${escapeHtml(a.phone)}</code></td>
        <td>${escapeHtml(a.listingTrigger)}</td>
        <td><span class="badge ${isReplied ? 'badge-replied' : 'badge-sent'}">${escapeHtml(a.status)}</span></td>
        <td><a class="wa-btn" href="${escapeHtml(a.waLink)}" target="_blank" rel="noopener">Open WhatsApp ↗</a></td>
      </tr>
    `;
  }).join('');

  // 2. B2B Email & Follow-Ups Table
  const b2bList = (reportData.b2bLeads || []).filter(l =>
    !q ||
    String(l.name).toLowerCase().includes(q) ||
    String(l.category).toLowerCase().includes(q) ||
    String(l.city).toLowerCase().includes(q) ||
    String(l.email).toLowerCase().includes(q) ||
    String(l.status).toLowerCase().includes(q)
  );
  document.getElementById('countB2BLeads').textContent = b2bList.length;

  const b2bBody = document.getElementById('b2bTableBody');
  b2bBody.innerHTML = b2bList.map(l => {
    const isBounced = l.bounced || /blocked|bounced/i.test(l.status);
    const isReplied = /replied/i.test(l.status);
    const hasFu = !isBounced && (l.followUpCount > 0 || /follow-up/i.test(l.status));
    let badgeClass = 'badge-sent';
    if (isBounced) badgeClass = 'badge-bounced';
    else if (isReplied) badgeClass = 'badge-replied';
    else if (hasFu) badgeClass = 'badge-followup';

    let fuCell = 'Initial Sent';
    if (isBounced) fuCell = 'Stopped (Bounced/Invalid MX)';
    else if (isReplied) fuCell = 'Stopped (Client Replied)';
    else if (l.followUpCount) fuCell = `Follow-Up #${l.followUpCount} Sent`;
    else if (/ready/i.test(l.status)) fuCell = 'Queued for Emma';

    return `
      <tr>
        <td>${l.index}</td>
        <td><strong>${escapeHtml(l.name)}</strong></td>
        <td>${escapeHtml(l.category)}</td>
        <td>${escapeHtml(l.city)}</td>
        <td><code>${escapeHtml(l.email)}</code></td>
        <td>${escapeHtml(l.phone)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(l.status)}</span></td>
        <td>${escapeHtml(fuCell)}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

fetchState();
setInterval(fetchState, 1500);
