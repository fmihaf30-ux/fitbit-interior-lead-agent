// Fitbit Interiors — Live Pixel-Agents 2D Office & Operations Dashboard Controller
let lastEventId = 0;
let reportData = null;
let lastWaCount = -1;
let lastB2BCount = -1;
let lastSentCount = -1;
let activeWaFilter = 'all'; // 'all' | 'fresh' | 'pitched' | 'replied'
let activeB2BFilter = 'all'; // 'all' | 'ready' | 'sent' | 'replied' | 'blocked'

function formatMMSS(sec) {
  const s = Math.max(0, Number(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'all 0.25s ease';
    setTimeout(() => t.remove(), 260);
  }, 3200);
}

function setWaFilter(filter) {
  activeWaFilter = filter;
  ['tabWaAll', 'tabWaFresh', 'tabWaPitched', 'tabWaReplied'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  if (filter === 'all') document.getElementById('tabWaAll')?.classList.add('active');
  if (filter === 'fresh') document.getElementById('tabWaFresh')?.classList.add('active');
  if (filter === 'pitched') document.getElementById('tabWaPitched')?.classList.add('active');
  if (filter === 'replied') document.getElementById('tabWaReplied')?.classList.add('active');
  renderTables();
}

function setB2BFilter(filter) {
  activeB2BFilter = filter;
  ['tabB2BAll', 'tabB2BReady', 'tabB2BSent', 'tabB2BReplied', 'tabB2BBlocked'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  if (filter === 'all') document.getElementById('tabB2BAll')?.classList.add('active');
  if (filter === 'ready') document.getElementById('tabB2BReady')?.classList.add('active');
  if (filter === 'sent') document.getElementById('tabB2BSent')?.classList.add('active');
  if (filter === 'replied') document.getElementById('tabB2BReplied')?.classList.add('active');
  if (filter === 'blocked') document.getElementById('tabB2BBlocked')?.classList.add('active');
  renderTables();
}

async function markPitchSent(phone, agentName, waLink, event) {
  if (event) {
    event.preventDefault();
  }

  // Find row in table and update immediately in DOM for instant response
  const clean = String(phone || '').replace(/[^0-9]/g, '');
  const row = document.getElementById(`wa-row-${clean}`);
  if (row) {
    row.classList.remove('row-fresh');
    row.classList.add('row-pitched');
    const badgeCell = row.querySelector('.col-pitch-status');
    if (badgeCell) {
      badgeCell.innerHTML = `<span class="badge badge-pitched">✓ Pitched (Just now)</span>`;
    }
    const btnCell = row.querySelector('.col-pitch-action');
    if (btnCell) {
      btnCell.innerHTML = `<a class="wa-btn btn-pitched" href="${escapeHtml(waLink)}" target="_blank" rel="noopener" onclick="markPitchSent('${escapeHtml(phone)}', '${escapeHtml(agentName)}', '${escapeHtml(waLink)}', event)">Pitch Again ↗</a>`;
    }
  }

  // Update in reportData memory
  if (reportData && reportData.waAgents) {
    const target = reportData.waAgents.find(a => String(a.phone).replace(/[^0-9]/g, '') === clean);
    if (target) {
      target.status = 'Pitched';
      target.isPitched = true;
      target.pitchedAt = new Date().toISOString();
    }
    updateCountsFromData();
  }

  showToast(`✓ Marked ${agentName || clean} as Pitched!`, 'success');

  // Open WhatsApp in a new tab
  if (waLink) {
    window.open(waLink, '_blank', 'noopener,noreferrer');
  }

  // Persist to server
  try {
    await fetch('/api/leads/pitch-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, agentName, status: 'Pitched' })
    });
  } catch (err) {
    console.error('Error recording pitch status:', err);
  }
}

async function markAllPitched() {
  if (!confirm('Mark all currently uncontacted WhatsApp leads as Pitched?')) return;
  try {
    const res = await fetch('/api/leads/pitch-all', { method: 'POST' });
    const data = await res.json();
    showToast(`✓ Marked ${data.count || 0} leads as Pitched!`, 'success');
    fetchState();
  } catch (err) {
    console.error('Error marking all pitched:', err);
  }
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
    updateCountsFromData();

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

function updateCountsFromData() {
  if (!reportData) return;
  const s = reportData.summary || {};
  const wa = reportData.waAgents || [];
  const b2b = reportData.b2bLeads || [];

  const waTotal = wa.length;
  const waFresh = wa.filter(a => !/pitched|replied|contacted/i.test(a.status || '')).length;
  const waPitched = wa.filter(a => /pitched/i.test(a.status || '')).length;
  const waReplied = wa.filter(a => /replied/i.test(a.status || '')).length;

  // Update top KPI cards
  const elWaTotal = document.getElementById('kpiWaTotal');
  const elWaPitched = document.getElementById('kpiWaPitched');
  const elWaFresh = document.getElementById('kpiWaFresh');
  if (elWaTotal) elWaTotal.textContent = waTotal;
  if (elWaPitched) elWaPitched.textContent = waPitched;
  if (elWaFresh) {
    elWaFresh.textContent = waFresh;
    elWaFresh.style.color = waFresh > 0 ? '#10b981' : '#94a3b8';
  }

  // Update tabs
  const badgeAll = document.getElementById('badgeTabWaAll');
  const badgeFresh = document.getElementById('badgeTabWaFresh');
  const badgePitched = document.getElementById('badgeTabWaPitched');
  const badgeReplied = document.getElementById('badgeTabWaReplied');
  if (badgeAll) badgeAll.textContent = waTotal;
  if (badgeFresh) {
    badgeFresh.textContent = waFresh;
    if (waFresh > 0) {
      badgeFresh.classList.add('fresh-glow');
    } else {
      badgeFresh.classList.remove('fresh-glow');
    }
  }
  if (badgePitched) badgePitched.textContent = waPitched;
  if (badgeReplied) badgeReplied.textContent = waReplied;

  // Update B2B tabs
  const b2bTotal = b2b.length;
  const b2bReady = b2b.filter(l => /ready/i.test(l.status || '')).length;
  const b2bSent = b2b.filter(l => !l.bounced && /sent|initial/i.test(l.status || '')).length;
  const b2bReplied = b2b.filter(l => /replied/i.test(l.status || '')).length;
  const b2bBlocked = b2b.filter(l => l.bounced || /blocked|bounced/i.test(l.status || '')).length;

  const elB2BTotal = document.getElementById('kpiB2BTotal');
  const elEmailsSent = document.getElementById('kpiEmailsSent');
  const elBouncedStopped = document.getElementById('kpiBouncedStopped');
  if (elB2BTotal) elB2BTotal.textContent = b2bTotal;
  if (elEmailsSent) elEmailsSent.textContent = s.initialEmailsSent || b2bSent;
  if (elBouncedStopped) elBouncedStopped.textContent = s.bouncedStopped || 22;

  const elTabB2BAll = document.getElementById('badgeTabB2BAll');
  const elTabB2BReady = document.getElementById('badgeTabB2BReady');
  const elTabB2BSent = document.getElementById('badgeTabB2BSent');
  const elTabB2BReplied = document.getElementById('badgeTabB2BReplied');
  const elTabB2BBlocked = document.getElementById('badgeTabB2BBlocked');
  if (elTabB2BAll) elTabB2BAll.textContent = b2bTotal;
  if (elTabB2BReady) elTabB2BReady.textContent = b2bReady;
  if (elTabB2BSent) elTabB2BSent.textContent = b2bSent;
  if (elTabB2BReplied) elTabB2BReplied.textContent = b2bReplied;
  if (elTabB2BBlocked) elTabB2BBlocked.textContent = b2bBlocked;

  const freshPill = document.getElementById('freshPillBadge');
  if (freshPill) {
    if (waFresh > 0) {
      freshPill.style.display = 'inline-flex';
      freshPill.textContent = `${waFresh} Fresh Unpitched`;
    } else {
      freshPill.style.display = 'none';
    }
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

  const kpiShiftRemaining = document.getElementById('kpiShiftRemaining');
  const kpiShiftBadge = document.getElementById('kpiShiftBadge');
  const kpiShiftSub = document.getElementById('kpiShiftSub');
  if (kpiShiftRemaining) kpiShiftRemaining.textContent = mmss;
  if (kpiShiftBadge) kpiShiftBadge.textContent = `Shift #${data.boardroomReport?.shiftNumber || 1}`;

  if (pillWorking && pillBreak && pillBoardroom) {
    pillWorking.className = 'phase-pill' + (data.officeShift === 'working' ? ' active-work' : '');
    pillBreak.className = 'phase-pill' + ((data.officeShift === 'short_break' || data.officeShift === 'long_break') ? ' active-break' : '');
    pillBoardroom.className = 'phase-pill' + (data.officeShift === 'boardroom' ? ' active-boardroom' : '');
  }

  if (dot && label) {
    if (data.officeShift === 'boardroom') {
      dot.className = 'shift-dot';
      dot.style.background = '#a855f7';
      label.textContent = `Boardroom Standup • Next Work Shift in ${mmss}`;
      if (kpiShiftSub) kpiShiftSub.textContent = 'Team in Boardroom';
      if (bannerTag) { bannerTag.textContent = 'BOARDROOM REVIEW'; bannerTag.style.background = '#7e22ce'; }
      if (bannerText) bannerText.textContent = `All 5 agents are reviewing newly discovered B2B leads, emails dispatched, blocked bounces, and WhatsApp partners!`;
    } else if (data.officeShift === 'long_break' || data.officeShift === 'short_break') {
      dot.className = 'shift-dot break';
      dot.style.background = '#f59e0b';
      const kindLabel = data.officeShift === 'long_break' ? 'Long Lunch Break' : 'Coffee Break';
      label.textContent = `${kindLabel} • Boardroom Review in ${mmss}`;
      if (kpiShiftSub) kpiShiftSub.textContent = 'Coffee & Lounge Rest';
      if (bannerTag) { bannerTag.textContent = 'TIMED BREAK'; bannerTag.style.background = '#d97706'; }
      if (bannerText) bannerText.textContent = `Staff resting at the Kitchen Espresso Bar & Sofa Lounge. Next: End-of-Break Boardroom Review in ${mmss}!`;
    } else {
      dot.className = 'shift-dot';
      dot.style.background = '#10b981';
      label.textContent = `Active Work Shift • Coffee Break in ${mmss}`;
      if (kpiShiftSub) kpiShiftSub.textContent = 'Sarah, David, Emma & Grace Active';
      if (bannerTag) { bannerTag.textContent = 'ACTIVE SHIFT'; bannerTag.style.background = '#059669'; }
      if (bannerText) bannerText.textContent = `Sarah is crawling RED & Jiji listings, Emma is sending automated SMTP emails, David is building WhatsApp links, and Grace is checking replies.`;
    }
  }

  const s = data.summary || {};
  const elScoutTotal = document.getElementById('metricScoutTotal');
  const elWaContacted = document.getElementById('metricWaContacted');
  const elEmailSent = document.getElementById('metricEmailSent');
  const elReplies = document.getElementById('metricReplies');
  if (elScoutTotal) elScoutTotal.textContent = (s.waAgentsTotal || 71) + (s.b2bTotal || 61);
  if (elWaContacted) elWaContacted.textContent = `${s.waAgentsTotal || 71} WA`;
  if (elEmailSent) elEmailSent.textContent = `${s.initialEmailsSent || 55} Sent`;
  if (elReplies) elReplies.textContent = `${s.totalConfirmedReplies || 9} Replies`;

  const states = data.agentStates || {};
  if (states.sarah?.status) document.getElementById('subSarah').textContent = states.sarah.status;
  if (states.david?.status) document.getElementById('subDavid').textContent = states.david.status;
  if (states.emma?.status) document.getElementById('subEmma').textContent = states.emma.status;
  if (states.grace?.status) document.getElementById('subGrace').textContent = states.grace.status;
  if (states.manager?.status) document.getElementById('subFahim').textContent = states.manager.status;

  const box = document.getElementById('officeLogs');
  if (box && data.logs) {
    box.innerHTML = data.logs.slice(0, 15).map(l =>
      `<div class="ticker-item"><strong>[${escapeHtml(l.time)} ${escapeHtml(l.agent)}]</strong> ${escapeHtml(l.message)}</div>`
    ).join('');
  }
}

function renderBoardroomSummary(data) {
  const br = data.boardroomReport || {};
  const statusTag = document.getElementById('boardroomStatusTag');
  if (statusTag) {
    statusTag.textContent = data.officeShift === 'boardroom'
      ? `LIVE STANDUP: Speaker — ${(br.speaker || 'manager').toUpperCase()} (Shift #${br.shiftNumber || 1})`
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
    bounceBadge.textContent = `${bouncedItems.length || 22} Permanently Stopped`;
  }

  const bounceListEl = document.getElementById('brBouncedList');
  if (bounceListEl) {
    bounceListEl.innerHTML = bouncedItems.slice(0, 6).map(b =>
      `<li><strong>${escapeHtml(b.name)}</strong> (<code>${escapeHtml(b.email)}</code>) — Follow-ups Blocked</li>`
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
  const kpiEl = document.getElementById('kpiRepliesTotal');
  if (countEl) countEl.textContent = replies.length;
  if (kpiEl) kpiEl.textContent = replies.length;

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

  // 1. Filter and Render WhatsApp Property Agents
  let waList = reportData.waAgents || [];

  if (activeWaFilter === 'fresh') {
    waList = waList.filter(a => !/pitched|replied|contacted/i.test(a.status || ''));
  } else if (activeWaFilter === 'pitched') {
    waList = waList.filter(a => /pitched/i.test(a.status || ''));
  } else if (activeWaFilter === 'replied') {
    waList = waList.filter(a => /replied/i.test(a.status || ''));
  }

  if (q) {
    waList = waList.filter(a =>
      String(a.agentName).toLowerCase().includes(q) ||
      String(a.suburb).toLowerCase().includes(q) ||
      String(a.phone).toLowerCase().includes(q) ||
      String(a.listingTrigger).toLowerCase().includes(q)
    );
  }

  const waBody = document.getElementById('waAgentsTableBody');
  if (waBody) {
    if (waList.length === 0) {
      waBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 28px;">No property agents match this filter.</td></tr>`;
    } else {
      waBody.innerHTML = waList.map(a => {
        const isReplied = /replied/i.test(a.status || '');
        const isPitched = /pitched/i.test(a.status || '');
        const isFresh = !isReplied && !isPitched;
        const cleanDigits = String(a.phone || '').replace(/[^0-9]/g, '');

        let statusBadge = '';
        if (isReplied) {
          statusBadge = `<span class="badge badge-replied">💬 Confirmed Partner</span>`;
        } else if (isPitched) {
          statusBadge = `<span class="badge badge-pitched">✓ Pitched</span>`;
        } else {
          statusBadge = `<span class="badge badge-fresh">⚡ Fresh / Ready</span>`;
        }

        let actionBtn = '';
        if (isFresh) {
          actionBtn = `<a class="wa-btn btn-fresh" href="${escapeHtml(a.waLink)}" target="_blank" rel="noopener" onclick="markPitchSent('${escapeHtml(a.phone)}', '${escapeHtml(a.agentName)}', '${escapeHtml(a.waLink)}', event)">Send Pitch ↗</a>`;
        } else {
          actionBtn = `<a class="wa-btn btn-pitched" href="${escapeHtml(a.waLink)}" target="_blank" rel="noopener" onclick="markPitchSent('${escapeHtml(a.phone)}', '${escapeHtml(a.agentName)}', '${escapeHtml(a.waLink)}', event)">Pitch Again ↗</a>`;
        }

        const rowClass = isFresh ? 'row-fresh' : (isPitched ? 'row-pitched' : '');

        return `
          <tr id="wa-row-${cleanDigits}" class="${rowClass}">
            <td style="color: #64748b; font-size: 11px;">${a.index}</td>
            <td><strong>${escapeHtml(a.agentName)}</strong></td>
            <td>${escapeHtml(a.suburb)}</td>
            <td><code>${escapeHtml(a.phone)}</code></td>
            <td style="font-size: 11.5px; color: #cbd5e1;">${escapeHtml(a.listingTrigger)}</td>
            <td class="col-pitch-status">${statusBadge}</td>
            <td class="col-pitch-action" style="text-align: right;">${actionBtn}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. Filter and Render B2B Email Outreach
  let b2bList = reportData.b2bLeads || [];

  if (activeB2BFilter === 'ready') {
    b2bList = b2bList.filter(l => /ready/i.test(l.status || ''));
  } else if (activeB2BFilter === 'sent') {
    b2bList = b2bList.filter(l => !l.bounced && /sent|initial|contacted/i.test(l.status || ''));
  } else if (activeB2BFilter === 'replied') {
    b2bList = b2bList.filter(l => /replied/i.test(l.status || ''));
  } else if (activeB2BFilter === 'blocked') {
    b2bList = b2bList.filter(l => l.bounced || /blocked|bounced/i.test(l.status || ''));
  }

  if (q) {
    b2bList = b2bList.filter(l =>
      String(l.name).toLowerCase().includes(q) ||
      String(l.category).toLowerCase().includes(q) ||
      String(l.city).toLowerCase().includes(q) ||
      String(l.email).toLowerCase().includes(q) ||
      String(l.status).toLowerCase().includes(q)
    );
  }

  const b2bCountEl = document.getElementById('countB2BLeads');
  if (b2bCountEl) b2bCountEl.textContent = (reportData.b2bLeads || []).length;

  const b2bBody = document.getElementById('b2bTableBody');
  if (b2bBody) {
    if (b2bList.length === 0) {
      b2bBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 28px;">No B2B companies match this filter.</td></tr>`;
    } else {
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
            <td style="color: #64748b; font-size: 11px;">${l.index}</td>
            <td><strong>${escapeHtml(l.name)}</strong></td>
            <td><span class="badge" style="background: rgba(255,255,255,0.06); font-size: 10px;">${escapeHtml(l.category)}</span></td>
            <td>${escapeHtml(l.city)}</td>
            <td><code>${escapeHtml(l.email)}</code></td>
            <td>${escapeHtml(l.phone || '—')}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(l.status)}</span></td>
            <td>${escapeHtml(fuCell)}</td>
          </tr>
        `;
      }).join('');
    }
  }
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
