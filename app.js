/**
 * app.js - Content Team Portal
 * Ultra-simple, clean, and reliable
 * 
 * Passcode: 7730
 * Tab 1: Roster Plan (Q4 2026: Oct 1 - Dec 31) with Day-by-Day Night Shift
 * Tab 2: Productivity (Default: Weekly View)
 * Tab 3: Category Wise Date (Categories in Columns)
 */

(function() {
  'use strict';

  // Application State
  const state = {
    isAuthenticated: false,
    enteredPin: '',
    correctPin: '7730',
    activeNavTab: 'roster', // 'roster' | 'productivity' | 'category'
    activeProdSubTab: 'daily', // DEFAULT: Daily Output as requested!
    selectedWeekId: 1,
    isMatrixView: false,
    rosterTeamFilter: 'all',
    rosterSearch: '',
    prodSearch: '',
    catMonthFilter: 'all',
    catDateSearch: '',
    upcomingDateFilter: 'last7days', // 'last7days' | 'today' | 'last3days' | 'last14days' | 'last30days' | 'all'
    upcomingCategoryFilter: 'all',
    upcomingStatusFilter: 'all', // 'all' | 'done' | 'pending' | 'draft'
    upcomingSearch: '',
    sheetsData: null,
    lastSyncTime: null
  };

  // DOM Elements
  const els = {
    lockScreen: document.getElementById('lockScreen'),
    pinDots: document.querySelectorAll('.pin-dot'),
    lockFeedback: document.getElementById('lockFeedback'),
    btnLock: document.getElementById('btnLock'),
    btnSync: document.getElementById('btnSync'),
    syncCountdown: document.getElementById('syncCountdown'),
    
    // Main Nav
    navTabs: document.querySelectorAll('.tab-btn'),
    sectionRoster: document.getElementById('sectionRoster'),
    sectionProductivity: document.getElementById('sectionProductivity'),
    sectionCategory: document.getElementById('sectionCategory'),

    // Roster
    nightShiftRow: document.getElementById('nightShiftRow'),
    nightWeekSelect: document.getElementById('nightWeekSelect'),
    teamFilter: document.getElementById('teamFilter'),
    rosterSearch: document.getElementById('rosterSearch'),
    btnExportRoster: document.getElementById('btnExportRoster'),
    rosterTeamsContainer: document.getElementById('rosterTeamsContainer'),
    mentorsList: document.getElementById('mentorsList'),
    prepList: document.getElementById('prepList'),

    // Productivity
    prodKpiCards: document.getElementById('prodKpiCards'),
    prodSubBtns: document.querySelectorAll('.sub-btn'),
    prodSearch: document.getElementById('prodSearch'),
    prodTableContainer: document.getElementById('prodTableContainer'),

    // Category Grid (Categories in Columns)
    catMonthFilter: document.getElementById('catMonthFilter'),
    catSearch: document.getElementById('catSearch'),
    catStatsLabel: document.getElementById('catStatsLabel'),
    catGridHead: document.getElementById('catGridHead'),
    catGridBody: document.getElementById('catGridBody'),
    btnExportCategoryCSV: document.getElementById('btnExportCategoryCSV'),

    // Upcoming Events
    sectionUpcoming: document.getElementById('sectionUpcoming'),
    upcomingKpiCards: document.getElementById('upcomingKpiCards'),
    upcomingCatBreakdown: document.getElementById('upcomingCatBreakdown'),
    upcomingDateFilter: document.getElementById('upcomingDateFilter'),
    upcomingCategoryFilter: document.getElementById('upcomingCategoryFilter'),
    upcomingStatusFilter: document.getElementById('upcomingStatusFilter'),
    upcomingSearch: document.getElementById('upcomingSearch'),
    upcomingCountLabel: document.getElementById('upcomingCountLabel'),
    upcomingTableBody: document.getElementById('upcomingTableBody'),
    btnExportUpcomingCSV: document.getElementById('btnExportUpcomingCSV'),
    upcomingLiveBadge: document.getElementById('upcomingLiveBadge')
  };

  // =========================================================================
  // Authentication (PIN: 7730)
  // =========================================================================
  function initAuth() {
    const saved = sessionStorage.getItem('content_portal_auth');
    if (saved === state.correctPin) {
      unlockApp();
    } else {
      showLockScreen();
    }

    document.querySelectorAll('.key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (val === 'clear') {
          clearPin();
        } else if (val === 'back') {
          popPin();
        } else if (val !== undefined) {
          pushPin(val);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (state.isAuthenticated) return;
      if (e.key >= '0' && e.key <= '9') {
        pushPin(e.key);
      } else if (e.key === 'Backspace') {
        popPin();
      } else if (e.key === 'Escape') {
        clearPin();
      }
    });

    if (els.btnLock) {
      els.btnLock.addEventListener('click', () => {
        sessionStorage.removeItem('content_portal_auth');
        showLockScreen();
      });
    }
  }

  function pushPin(digit) {
    if (state.enteredPin.length >= 4) return;
    state.enteredPin += digit;
    updatePinDots();
    if (state.enteredPin.length === 4) verifyPin();
  }

  function popPin() {
    if (state.enteredPin.length > 0) {
      state.enteredPin = state.enteredPin.slice(0, -1);
      updatePinDots();
      if (els.lockFeedback) els.lockFeedback.textContent = '';
    }
  }

  function clearPin() {
    state.enteredPin = '';
    updatePinDots();
    if (els.lockFeedback) els.lockFeedback.textContent = '';
  }

  function updatePinDots() {
    els.pinDots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < state.enteredPin.length);
    });
  }

  function verifyPin() {
    if (state.enteredPin === state.correctPin) {
      sessionStorage.setItem('content_portal_auth', state.correctPin);
      unlockApp();
    } else {
      if (els.lockFeedback) els.lockFeedback.textContent = 'Incorrect passcode';
      setTimeout(clearPin, 600);
    }
  }

  function showLockScreen() {
    state.isAuthenticated = false;
    clearPin();
    if (els.lockScreen) els.lockScreen.classList.remove('hidden');
  }

  function unlockApp() {
    state.isAuthenticated = true;
    if (els.lockScreen) els.lockScreen.classList.add('hidden');
    renderApp();
  }

  // =========================================================================
  // Live Header & Polling Sync
  // =========================================================================
  function initLiveSync() {
    if (typeof sheetsClient !== 'undefined') {
      sheetsClient.onCountdown((formatted) => {
        if (els.syncCountdown) els.syncCountdown.textContent = formatted;
      });

      sheetsClient.onUpdate((data, syncTime) => {
        state.sheetsData = data;
        state.lastSyncTime = syncTime;
        if (state.isAuthenticated) {
          if (state.activeNavTab === 'productivity') renderProductivity();
          if (state.activeNavTab === 'upcoming') renderUpcomingEvents();
        }
      });

      if (els.btnSync) {
        els.btnSync.addEventListener('click', async () => {
          els.btnSync.textContent = 'Syncing...';
          await sheetsClient.refreshData();
          els.btnSync.textContent = 'Sync Now';
        });
      }

      sheetsClient.startPolling();
    }
  }

  // =========================================================================
  // Navigation & Sub-Tabs
  // =========================================================================
  function initNavigation() {
    // Top Tabs
    els.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        switchNavTab(btn.dataset.tab);
      });
    });

    // Productivity Sub-Tabs
    els.prodSubBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchProdSubTab(btn.dataset.subtab);
      });
    });

    // Roster Controls
    if (els.nightWeekSelect) {
      els.nightWeekSelect.addEventListener('change', (e) => {
        state.selectedWeekId = parseInt(e.target.value, 10);
        renderNightShiftDaily();
      });
    }

    if (els.teamFilter) {
      els.teamFilter.addEventListener('change', (e) => {
        state.rosterTeamFilter = e.target.value;
        renderTeamsMatrix();
      });
    }

    if (els.rosterSearch) {
      els.rosterSearch.addEventListener('input', (e) => {
        state.rosterSearch = e.target.value.toLowerCase().trim();
        renderTeamsMatrix();
      });
    }

    if (els.btnExportRoster) {
      els.btnExportRoster.addEventListener('click', exportRosterCSV);
    }

    // Productivity Search
    if (els.prodSearch) {
      els.prodSearch.addEventListener('input', (e) => {
        state.prodSearch = e.target.value.toLowerCase().trim();
        renderProductivity();
      });
    }

    // Category Grid Controls
    if (els.catMonthFilter) {
      els.catMonthFilter.addEventListener('change', (e) => {
        state.catMonthFilter = e.target.value;
        renderCategoryGrid();
      });
    }

    if (els.catSearch) {
      els.catSearch.addEventListener('input', (e) => {
        state.catDateSearch = e.target.value.toLowerCase().trim();
        renderCategoryGrid();
      });
    }

    if (els.btnExportCategoryCSV) {
      els.btnExportCategoryCSV.addEventListener('click', exportCategoryGridCSV);
    }

    // Upcoming Events Controls
    if (els.upcomingDateFilter) {
      els.upcomingDateFilter.addEventListener('change', (e) => {
        state.upcomingDateFilter = e.target.value;
        renderUpcomingEvents(true);
      });
    }

    if (els.upcomingCategoryFilter) {
      els.upcomingCategoryFilter.addEventListener('change', (e) => {
        state.upcomingCategoryFilter = e.target.value;
        renderUpcomingEvents(false);
      });
    }

    if (els.upcomingStatusFilter) {
      els.upcomingStatusFilter.addEventListener('change', (e) => {
        state.upcomingStatusFilter = e.target.value;
        renderUpcomingEvents(false);
      });
    }

    if (els.upcomingSearch) {
      els.upcomingSearch.addEventListener('input', (e) => {
        state.upcomingSearch = e.target.value.toLowerCase().trim();
        renderUpcomingEvents(false);
      });
    }

    if (els.btnExportUpcomingCSV) {
      els.btnExportUpcomingCSV.addEventListener('click', exportUpcomingCSV);
    }
  }

  function switchNavTab(tab) {
    state.activeNavTab = tab;
    els.navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (els.sectionRoster) els.sectionRoster.style.display = tab === 'roster' ? 'block' : 'none';
    if (els.sectionProductivity) els.sectionProductivity.style.display = tab === 'productivity' ? 'block' : 'none';
    if (els.sectionCategory) els.sectionCategory.style.display = tab === 'category' ? 'block' : 'none';
    if (els.sectionUpcoming) els.sectionUpcoming.style.display = tab === 'upcoming' ? 'block' : 'none';

    if (tab === 'roster') renderRoster();
    if (tab === 'productivity') renderProductivity();
    if (tab === 'category') renderCategoryGrid();
    if (tab === 'upcoming') renderUpcomingEvents();
  }

  function switchProdSubTab(subtab) {
    state.activeProdSubTab = subtab;
    els.prodSubBtns.forEach(b => b.classList.toggle('active', b.dataset.subtab === subtab));
    renderProductivity();
  }

  // =========================================================================
  // TAB 1: Roster Plan Rendering (Q4 2026 - Master Matrix Layout)
  // =========================================================================
  function renderRoster() {
    if (typeof ROSTER_CONFIG === 'undefined') return;

    populateNightWeekSelect();
    renderNightShiftDaily();
    renderTeamsMatrix();
    renderMentorsAndPrep();
  }

  function populateNightWeekSelect() {
    if (!els.nightWeekSelect || els.nightWeekSelect.children.length > 0) return;
    ROSTER_CONFIG.weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.dateRange}) — News: ${w.newsTeam} (Lead: ${w.nightLead || 'Team'})`;
      if (w.id === state.selectedWeekId) opt.selected = true;
      els.nightWeekSelect.appendChild(opt);
    });
  }

  function renderNightShiftDaily() {
    if (!els.nightShiftRow) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    let html = '';
    // Mon to Sat (6 days) - Sunday is strictly deleted!
    week.nightShiftDaily.forEach(item => {
      const isLead = week.nightLead && item.member === week.nightLead;
      html += `
        <div class="night-day-box ${isLead ? 'is-lead' : ''}">
          <div class="night-day-name">${escapeHtml(item.day)}</div>
          <div class="night-member-name">${escapeHtml(item.member)}</div>
          ${isLead ? '<span class="night-role-tag">Night Lead</span>' : '<span style="display:inline-block; margin-top:0.25rem; font-size:0.68rem; color:#64748b;">On Call</span>'}
        </div>
      `;
    });

    els.nightShiftRow.innerHTML = html;
  }

  function getRosterMatrixBadge(taskInfo) {
    if (!taskInfo || !taskInfo.task || taskInfo.task === '-') {
      return '<div class="grid-badge" style="background:#f8fafc; color:#94a3b8;">—</div>';
    }

    const t = taskInfo.task;

    if (t === 'Night Update') {
      return `
        <div class="grid-badge badge-night" title="${escapeHtml(taskInfo.nightDays ? 'Night shifts: ' + taskInfo.nightDays : 'Weekly Night Lead')}">
          <span class="night-icon">🌙</span>
          <span class="night-label">
            <span>Night</span>
            <span>Update</span>
          </span>
        </div>
      `;
    }

    if (t === 'Child Pages') {
      return '<div class="grid-badge badge-child">Child Pages</div>';
    }

    if (t === 'High Intent') {
      return '<div class="grid-badge badge-intent">High Intent</div>';
    }

    if (t === 'SEO Optimization') {
      return '<div class="grid-badge badge-seo">SEO Optimization</div>';
    }

    if (t === 'Event Pages') {
      return '<div class="grid-badge badge-event">Event Pages</div>';
    }

    if (t === 'Upcoming Drafts') {
      return '<div class="grid-badge badge-upcoming">Upcoming Drafts</div>';
    }

    return `<div class="grid-badge">${escapeHtml(t)}</div>`;
  }

  function renderTeamsMatrix() {
    if (!els.rosterTeamsContainer) return;

    const teamGroups = [];

    if (state.rosterTeamFilter === 'all' || state.rosterTeamFilter === 'teamA') {
      teamGroups.push({
        id: 'teamA',
        title: 'Team A',
        meta: '5 writers · alternates News / Content weekly',
        members: ROSTER_CONFIG.teams.teamA.members
      });
    }

    if (state.rosterTeamFilter === 'all' || state.rosterTeamFilter === 'teamB') {
      teamGroups.push({
        id: 'teamB',
        title: 'Team B',
        meta: '5 writers · alternates News / Content weekly (Trishala replaces Shilpa Singh)',
        members: ROSTER_CONFIG.teams.teamB.members
      });
    }

    if (state.rosterTeamFilter === 'all') {
      teamGroups.push({
        id: 'upcoming',
        title: 'Upcoming Drafts & News Support',
        meta: '1 dedicated writer · alternates Event Pages & Upcoming Drafts weekly',
        members: ROSTER_CONFIG.teams.upcoming.members
      });
    }

    const searchQuery = state.rosterSearch;
    let anyWriterRendered = false;
    let html = '';

    teamGroups.forEach(grp => {
      let filteredMembers = grp.members;
      if (searchQuery) {
        filteredMembers = filteredMembers.filter(m => m.toLowerCase().includes(searchQuery));
      }

      if (filteredMembers.length === 0) return;
      anyWriterRendered = true;

      html += `
        <div class="team-roster-section">
          <div class="team-roster-header">
            <h2 class="team-title">${escapeHtml(grp.title)}</h2>
            <div class="team-meta">${escapeHtml(grp.meta)}</div>
          </div>

          <div class="roster-table-card">
            <table class="roster-matrix-table">
              <thead>
                <tr>
                  <th class="col-writer">Writer</th>
                  ${ROSTER_CONFIG.weeks.map(w => `
                    <th class="col-week">
                      <div class="wk-name">${escapeHtml(w.name)}</div>
                      <div class="wk-sub">${escapeHtml(w.dateRange)}</div>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${filteredMembers.map(member => `
                  <tr>
                    <td class="cell-writer">
                      ${escapeHtml(member)}
                      ${member === 'Trishala' ? '<span style="display:block; font-size:0.68rem; color:#059669; font-weight:600; margin-top:2px;">(Replaces Shilpa Singh)</span>' : ''}
                    </td>
                    ${ROSTER_CONFIG.weeks.map(w => {
                      const taskInfo = w.tasks[member] || { task: '-' };
                      return `<td class="cell-task">${getRosterMatrixBadge(taskInfo)}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    });

    if (!anyWriterRendered) {
      html = `
        <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:3rem 1.5rem; text-align:center; color:#64748b;">
          <p style="font-size:1rem; font-weight:600; color:#334155;">No writers found matching "${escapeHtml(searchQuery)}"</p>
          <p style="font-size:0.8rem; margin-top:0.35rem;">Try clearing the search or changing the team filter.</p>
        </div>
      `;
    }

    els.rosterTeamsContainer.innerHTML = html;
  }

  function renderMentorsAndPrep() {
    if (els.mentorsList) {
      els.mentorsList.innerHTML = ROSTER_CONFIG.categoryMentors.map(c => `
        <div><strong>${c.mentor}</strong>: <span style="color:#4b5563;">${c.category}</span></div>
      `).join('');
    }
    if (els.prepList) {
      els.prepList.innerHTML = ROSTER_CONFIG.prepTeamAssignments.map(p => `
        <div><strong>${p.member}</strong>: <span style="color:#4b5563;">${p.domain}</span></div>
      `).join('');
    }
  }

  function exportRosterCSV() {
    const allMembers = [
      ...ROSTER_CONFIG.teams.teamA.members.map(m => ({ name: m, team: 'Team A' })),
      ...ROSTER_CONFIG.teams.teamB.members.map(m => ({ name: m, team: 'Team B' })),
      { name: 'Archana', team: 'Upcoming' }
    ];

    let csv = ['Name,Team,' + ROSTER_CONFIG.weeks.map(w => `"${w.name} (${w.dateRange})"`).join(',')];

    allMembers.forEach(m => {
      const row = [m.name, m.team];
      ROSTER_CONFIG.weeks.forEach(w => {
        const a = w.tasks[m.name];
        row.push(a ? `"${a.task} [Night: ${a.nightDays}]"` : '""');
      });
      csv.push(row.join(','));
    });

    downloadCSV(csv.join('\n'), 'Q4_2026_Content_Roster.csv');
  }

  // =========================================================================
  // TAB 2: Productivity Portal (Default: Weekly View)
  // =========================================================================
  function renderProductivity() {
    const data = state.sheetsData || (typeof BASELINE_SHEETS_DATA !== 'undefined' ? BASELINE_SHEETS_DATA : null);
    if (!data) return;

    renderProdKpiCards(data);

    if (state.activeProdSubTab === 'weekly') {
      renderWeeklyTable(data);
    } else if (state.activeProdSubTab === 'daily') {
      renderDailyTable(data);
    } else if (state.activeProdSubTab === 'monthly') {
      renderMonthlyTable(data);
    }
  }

  function sumObj(obj) {
    if (!obj) return 0;
    return Object.values(obj).reduce((acc, v) => acc + (parseFloat(String(v).replace(/,/g, '')) || 0), 0);
  }

  function renderProdKpiCards(data) {
    if (!els.prodKpiCards) return;

    const s1 = data.sheet1_published.summary;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;
    const writers = data.sheet1_published.headers || [];

    if (state.activeProdSubTab === 'daily') {
      const pickT = sumObj(s3['Today']);
      const pubT = sumObj(s1['Today']);
      const wordT = sumObj(s2['Today']);

      let topWriter = '-';
      let topWords = 0;
      writers.forEach(w => {
        const num = parseInt(s2['Today']?.[w] || '0', 10);
        if (num > topWords) {
          topWords = num;
          topWriter = w;
        }
      });

      els.prodKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Picked Today</div>
          <div class="kpi-val">${pickT.toLocaleString()}</div>
          <div class="kpi-sub">Articles picked today</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Published Today</div>
          <div class="kpi-val" style="color:#1d4ed8;">${pubT.toLocaleString()}</div>
          <div class="kpi-sub">Articles published live</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Word Count Today</div>
          <div class="kpi-val">${wordT.toLocaleString()}</div>
          <div class="kpi-sub">Daily team volume</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Writer Today</div>
          <div class="kpi-val" style="font-size:1.15rem; color:#059669;">${topWriter}</div>
          <div class="kpi-sub">${topWords.toLocaleString()} words today</div>
        </div>
      `;
    } else {
      const words7D = sumObj(s2['Last 7 Days']);
      const pub7D = sumObj(s1['Last 7 Days']);
      const pick7D = sumObj(s3['Last 7 Days']);
      
      let topWriter = '-';
      let topWords = 0;
      writers.forEach(w => {
        const num = parseInt(s2['Last 7 Days']?.[w] || '0', 10);
        if (num > topWords) {
          topWords = num;
          topWriter = w;
        }
      });

      els.prodKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Picked (Last 7 Days)</div>
          <div class="kpi-val">${pick7D.toLocaleString()}</div>
          <div class="kpi-sub">Articles in work</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Published (Last 7 Days)</div>
          <div class="kpi-val" style="color:#1d4ed8;">${pub7D.toLocaleString()}</div>
          <div class="kpi-sub">Articles published live</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Words (Last 7 Days)</div>
          <div class="kpi-val">${words7D.toLocaleString()}</div>
          <div class="kpi-sub">Total 7-day team volume</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Writer (Last 7 Days)</div>
          <div class="kpi-val" style="font-size:1.15rem; color:#059669;">${topWriter}</div>
          <div class="kpi-sub">${topWords.toLocaleString()} words this week</div>
        </div>
      `;
    }
  }

  // Last 7 Days (Formerly Weekly Output)
  function renderWeeklyTable(data) {
    if (!els.prodTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;

    const s1 = data.sheet1_published.summary;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;

    let totWords7D = 0, totWordsPrev = 0, totPub7D = 0, totPick7D = 0;

    const rowsHtml = filtered.map(w => {
      const w7 = parseInt(s2['Last 7 Days']?.[w] || '0', 10);
      const wp = parseInt(s2['Previous 7 days']?.[w] || '0', 10);
      const p7 = parseInt(s1['Last 7 Days']?.[w] || '0', 10);
      const pk = parseInt(s3['Last 7 Days']?.[w] || '0', 10);
      const avg = p7 > 0 ? Math.round(w7 / p7) : 0;

      totWords7D += w7;
      totWordsPrev += wp;
      totPub7D += p7;
      totPick7D += pk;

      return `
        <tr>
          <td><strong>${w}</strong></td>
          <td class="col-center"><strong>${w7 > 0 ? w7.toLocaleString() : '<span class="zero-val">0</span>'}</strong></td>
          <td class="col-center" style="color:#6b7280;">${wp > 0 ? wp.toLocaleString() : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${p7 > 0 ? `<strong style="color:#1d4ed8;">${p7}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${pk > 0 ? `<strong>${pk}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center" style="color:#6b7280;">${avg > 0 ? avg.toLocaleString() + ' w/a' : '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Writer</th>
            <th class="col-center">Words (Last 7 Days)</th>
            <th class="col-center">Words (Prev 7 Days)</th>
            <th class="col-center">Articles Published (7D)</th>
            <th class="col-center">Articles Picked (7D)</th>
            <th class="col-center">Avg Words/Article</th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-row">
            <td>TOTAL (${filtered.length} Writers)</td>
            <td class="col-center">${totWords7D.toLocaleString()}</td>
            <td class="col-center">${totWordsPrev.toLocaleString()}</td>
            <td class="col-center">${totPub7D.toLocaleString()}</td>
            <td class="col-center">${totPick7D.toLocaleString()}</td>
            <td class="col-center">${totPub7D > 0 ? Math.round(totWords7D / totPub7D).toLocaleString() + ' w/a' : '-'}</td>
          </tr>
          ${rowsHtml || '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#9ca3af;">No writers found matching search.</td></tr>'}
        </tbody>
      </table>
    `;

    els.prodTableContainer.innerHTML = html;
  }

  // DEFAULT VIEW: Daily Output (Picked Today | Published Today | Word Count)
  function renderDailyTable(data) {
    if (!els.prodTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;

    const pubT = data.sheet1_published.summary['Today'] || {};
    const wordT = data.sheet2_wordcount.summary['Today'] || {};
    const pickT = data.sheet3_picked.summary['Today'] || {};

    let sumPickT = 0, sumPubT = 0, sumWordT = 0;

    const rowsHtml = filtered.map(w => {
      const pkt = parseInt(pickT[w] || '0', 10);
      const pt = parseInt(pubT[w] || '0', 10);
      const wt = parseInt(wordT[w] || '0', 10);

      sumPickT += pkt;
      sumPubT += pt;
      sumWordT += wt;

      return `
        <tr>
          <td><strong>${w}</strong></td>
          <td class="col-center">${pkt > 0 ? `<strong>${pkt}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${pt > 0 ? `<strong style="color:#1d4ed8;">${pt}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${wt > 0 ? `<strong>${wt.toLocaleString()}</strong>` : '<span class="zero-val">0</span>'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Writer</th>
            <th class="col-center">Picked Today</th>
            <th class="col-center">Published Today</th>
            <th class="col-center">Word Count</th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-row">
            <td>TOTAL (${filtered.length} Writers)</td>
            <td class="col-center">${sumPickT.toLocaleString()}</td>
            <td class="col-center">${sumPubT.toLocaleString()}</td>
            <td class="col-center">${sumWordT.toLocaleString()}</td>
          </tr>
          ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#9ca3af;">No writers found.</td></tr>'}
        </tbody>
      </table>
    `;

    els.prodTableContainer.innerHTML = html;
  }

  function renderMonthlyTable(data) {
    if (!els.prodTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;
    const s2 = data.sheet2_wordcount.summary;
    const months = ['April', 'May', 'June', 'July', 'August', 'September'];

    const monthTotals = {};
    months.forEach(m => { monthTotals[m] = 0; });
    let grandTillNow = 0;

    const rowsHtml = filtered.map(w => {
      const till = parseInt(s2['Till Now']?.[w] || '0', 10);
      grandTillNow += till;

      return `
        <tr>
          <td><strong>${w}</strong></td>
          ${months.map(m => {
            const val = parseInt(s2[m]?.[w] || '0', 10);
            monthTotals[m] += val;
            return `<td class="num-cell">${val > 0 ? val.toLocaleString() : '<span class="zero-val">-</span>'}</td>`;
          }).join('')}
          <td class="num-cell"><strong style="color:#1d4ed8;">${till.toLocaleString()}</strong></td>
        </tr>
      `;
    }).join('');

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Writer</th>
            ${months.map(m => `<th class="num-cell">${m}</th>`).join('')}
            <th class="num-cell">Till Now</th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-row">
            <td>TOTAL</td>
            ${months.map(m => `<td class="num-cell">${monthTotals[m].toLocaleString()}</td>`).join('')}
            <td class="num-cell">${grandTillNow.toLocaleString()}</td>
          </tr>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    els.prodTableContainer.innerHTML = html;
  }

  // =========================================================================
  // TAB 3: Category Wise Date Rendering (Categories in Columns)
  // =========================================================================
  function renderCategoryGrid() {
    if (typeof CATEGORY_GRID_DATA === 'undefined') return;

    const categories = CATEGORY_GRID_DATA.categories || [];
    let rows = CATEGORY_GRID_DATA.rows || [];

    // Filter by Month
    if (state.catMonthFilter !== 'all') {
      rows = rows.filter(r => r.date.startsWith(state.catMonthFilter + '/'));
    }

    // Filter by Date Search
    if (state.catDateSearch) {
      rows = rows.filter(r => r.date.toLowerCase().includes(state.catDateSearch));
    }

    // Category Totals
    const catTotals = {};
    categories.forEach(c => { catTotals[c] = 0; });
    let grandTotal = 0;

    rows.forEach(r => {
      grandTotal += r.total || 0;
      categories.forEach(c => {
        catTotals[c] += (r.counts[c] || 0);
      });
    });

    // Update Stats Label
    if (els.catStatsLabel) {
      els.catStatsLabel.textContent = `${rows.length} days shown (Total: ${grandTotal.toLocaleString()} articles)`;
    }

    // Build Header: Date | Categories... | Total
    if (els.catGridHead) {
      els.catGridHead.innerHTML = `
        <tr>
          <th class="col-sticky">Date</th>
          ${categories.map(c => `<th class="num-cell">${c}</th>`).join('')}
          <th class="num-cell" style="background:#f1f5f9; color:#0f172a;">Total</th>
        </tr>
      `;
    }

    // Build Body
    if (els.catGridBody) {
      // Summary Totals Row at the very top
      let totalsRow = `
        <tr class="total-row">
          <td class="col-sticky">TOTAL (${rows.length} Days)</td>
          ${categories.map(c => {
            const val = catTotals[c];
            return `<td class="num-cell">${val > 0 ? val.toLocaleString() : '<span class="zero-val">-</span>'}</td>`;
          }).join('')}
          <td class="num-cell" style="color:#1d4ed8; font-size:0.9rem;">${grandTotal.toLocaleString()}</td>
        </tr>
      `;

      let dataRows = rows.map(r => `
        <tr>
          <td class="col-sticky">${r.date}</td>
          ${categories.map(c => {
            const count = r.counts[c] || 0;
            return `<td class="num-cell">${count > 0 ? `<span class="pos-val">${count}</span>` : '<span class="zero-val">-</span>'}</td>`;
          }).join('')}
          <td class="num-cell"><strong>${r.total > 0 ? r.total : '<span class="zero-val">0</span>'}</strong></td>
        </tr>
      `).join('');

      els.catGridBody.innerHTML = totalsRow + (dataRows || '<tr><td colspan="26" style="text-align:center; padding:1.5rem; color:#9ca3af;">No dates match the filter.</td></tr>');
    }
  }

  function exportCategoryGridCSV() {
    if (typeof CATEGORY_GRID_DATA === 'undefined') return;

    const categories = CATEGORY_GRID_DATA.categories || [];
    let rows = CATEGORY_GRID_DATA.rows || [];

    if (state.catMonthFilter !== 'all') {
      rows = rows.filter(r => r.date.startsWith(state.catMonthFilter + '/'));
    }
    if (state.catDateSearch) {
      rows = rows.filter(r => r.date.toLowerCase().includes(state.catDateSearch));
    }

    // Header row
    const headers = ['Date', ...categories.map(c => `"${c}"`), 'Total'];
    const csvLines = [headers.join(',')];

    rows.forEach(r => {
      const line = [r.date];
      categories.forEach(c => {
        line.push(r.counts[c] || 0);
      });
      line.push(r.total || 0);
      csvLines.push(line.join(','));
    });

    downloadCSV(csvLines.join('\n'), 'Category_Wise_Date_Grid.csv');
  }

  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // =========================================================================
  // TAB 4: UPCOMING EVENTS RENDERING
  // =========================================================================
  const MONTH_MAP = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sept': 8, 'sep': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };

  function parseUpcomingDate(str) {
    if (!str || typeof str !== 'string') return null;
    const clean = str.trim();
    // match: "18th September 2026" or "1-April-2026"
    const dmMatch = clean.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([A-Za-z]+)[\s\-]+(\d{4})/i);
    if (dmMatch) {
      const day = parseInt(dmMatch[1], 10);
      const mStr = dmMatch[2].toLowerCase();
      const month = MONTH_MAP[mStr] !== undefined ? MONTH_MAP[mStr] : 8;
      const year = parseInt(dmMatch[3], 10);
      return new Date(year, month, day);
    }
    // match: "19th May" (assume 2026)
    const shortMatch = clean.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([A-Za-z]+)$/i);
    if (shortMatch) {
      const day = parseInt(shortMatch[1], 10);
      const mStr = shortMatch[2].toLowerCase();
      const month = MONTH_MAP[mStr] !== undefined ? MONTH_MAP[mStr] : 4;
      return new Date(2026, month, day);
    }
    // match: MM/DD/YYYY
    const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (slashMatch) {
      return new Date(parseInt(slashMatch[3], 10), parseInt(slashMatch[1], 10) - 1, parseInt(slashMatch[2], 10));
    }
    return null;
  }

  function isStatusDone(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s.includes('done') || s.includes('live') || s === 'dond';
  }

  function isStatusDraft(status) {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s.includes('draft') || s === 'picked' || s.includes('added in publishing');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getUpcomingEventsList() {
    if (state.sheetsData && Array.isArray(state.sheetsData.upcoming_events) && state.sheetsData.upcoming_events.length > 0) {
      return state.sheetsData.upcoming_events;
    }
    if (typeof BASELINE_UPCOMING_DATA !== 'undefined' && Array.isArray(BASELINE_UPCOMING_DATA)) {
      return BASELINE_UPCOMING_DATA;
    }
    return [];
  }

  function getUpcomingEventsForDateScope(events) {
    if (!events || events.length === 0) return [];

    // Find max date timestamp
    let maxTime = 0;
    const timestamps = [];
    events.forEach(e => {
      const d = parseUpcomingDate(e.date);
      if (d) {
        const t = d.getTime();
        if (t > maxTime) maxTime = t;
        timestamps.push(t);
      }
    });

    const uniqueTimesDesc = [...new Set(timestamps)].sort((a, b) => b - a);
    const top7DateTimes = new Set(uniqueTimesDesc.slice(0, 7));

    const dayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = maxTime - (7 * dayMs);
    const threeDaysAgo = maxTime - (3 * dayMs);
    const fourteenDaysAgo = maxTime - (14 * dayMs);
    const thirtyDaysAgo = maxTime - (30 * dayMs);

    return events.filter(e => {
      const d = parseUpcomingDate(e.date);
      const time = d ? d.getTime() : null;

      if (state.upcomingDateFilter === 'last7days') {
        if (!time) return false;
        // Priority: Include top 7 active dates from Col A or within last 7 calendar days
        if (!top7DateTimes.has(time) && time < sevenDaysAgo) return false;
        return true;
      } else if (state.upcomingDateFilter === 'today') {
        if (!time || time !== maxTime) return false;
        return true;
      } else if (state.upcomingDateFilter === 'last3days') {
        if (!time || time < threeDaysAgo) return false;
        return true;
      } else if (state.upcomingDateFilter === 'last14days') {
        if (!time || time < fourteenDaysAgo) return false;
        return true;
      } else if (state.upcomingDateFilter === 'last30days') {
        if (!time || time < thirtyDaysAgo) return false;
        return true;
      } else if (state.upcomingDateFilter === 'all') {
        return true;
      }
      return true;
    });
  }

  function renderUpcomingEvents(rebuildCategories = true) {
    if (!els.sectionUpcoming) return;

    const allEvents = getUpcomingEventsList();
    const dateScopedEvents = getUpcomingEventsForDateScope(allEvents);

    // If rebuildCategories is requested (e.g. date filter changed)
    if (rebuildCategories) {
      populateUpcomingCategoryFilter(dateScopedEvents);
      renderUpcomingCategoryChips(dateScopedEvents);
    }

    // Now filter by category, status, and search
    const filteredEvents = dateScopedEvents.filter(e => {
      // Category Filter
      if (state.upcomingCategoryFilter !== 'all' && e.category !== state.upcomingCategoryFilter) {
        return false;
      }

      // Status Filter
      if (state.upcomingStatusFilter === 'done') {
        if (!isStatusDone(e.status)) return false;
      } else if (state.upcomingStatusFilter === 'pending') {
        if (isStatusDone(e.status) || isStatusDraft(e.status)) return false;
      } else if (state.upcomingStatusFilter === 'draft') {
        if (!isStatusDraft(e.status)) return false;
      }

      // Search Query
      if (state.upcomingSearch) {
        const q = state.upcomingSearch.toLowerCase();
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.pickedBy && e.pickedBy.toLowerCase().includes(q)) ||
                      (e.keywords && e.keywords.toLowerCase().includes(q)) ||
                      (e.date && e.date.toLowerCase().includes(q)) ||
                      (e.status && e.status.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    // Render KPI Cards (Number of Events Planned - Number of Articles Done)
    renderUpcomingKpis(filteredEvents, dateScopedEvents.length);

    // Render Table
    renderUpcomingTable(filteredEvents);

    // Update count label
    if (els.upcomingCountLabel) {
      els.upcomingCountLabel.textContent = `Showing ${filteredEvents.length} of ${dateScopedEvents.length} events`;
    }
  }

  function renderUpcomingKpis(filteredEvents, totalInDateScope) {
    if (!els.upcomingKpiCards) return;

    const planned = filteredEvents.length;
    const done = filteredEvents.filter(e => isStatusDone(e.status)).length;
    const pending = planned - done;
    const rate = planned > 0 ? Math.round((done / planned) * 100) : 0;

    els.upcomingKpiCards.innerHTML = `
      <div class="kpi-card kpi-planned">
        <div class="kpi-label">📌 Events Planned</div>
        <div class="kpi-val" style="color:#1d4ed8;">${planned}</div>
        <div class="kpi-sub">${state.upcomingCategoryFilter !== 'all' ? state.upcomingCategoryFilter : 'All Categories'}</div>
      </div>
      <div class="kpi-card kpi-done">
        <div class="kpi-label">✅ Articles Done</div>
        <div class="kpi-val" style="color:#15803d;">${done}</div>
        <div class="kpi-sub">Status: Done / Live</div>
      </div>
      <div class="kpi-card kpi-pending">
        <div class="kpi-label">⏳ Pending Deficit</div>
        <div class="kpi-val" style="color:#c2410c;">${pending}</div>
        <div class="kpi-sub">Planned − Done</div>
      </div>
      <div class="kpi-card kpi-rate">
        <div class="kpi-label">🎯 Completion Rate</div>
        <div class="kpi-val" style="color:#7c3aed;">${rate}%</div>
        <div class="kpi-sub">${done} / ${planned} completed</div>
      </div>
    `;
  }

  function populateUpcomingCategoryFilter(dateScopedEvents) {
    if (!els.upcomingCategoryFilter) return;

    const catCounts = {};
    dateScopedEvents.forEach(e => {
      const cat = e.category || 'Others';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    const currentVal = state.upcomingCategoryFilter;
    els.upcomingCategoryFilter.innerHTML = `<option value="all">All Categories (${dateScopedEvents.length} Events)</option>`;

    sortedCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `${cat} (${catCounts[cat]})`;
      if (cat === currentVal) opt.selected = true;
      els.upcomingCategoryFilter.appendChild(opt);
    });

    // If current selected category is not in this scope, reset to 'all'
    if (currentVal !== 'all' && !catCounts[currentVal]) {
      state.upcomingCategoryFilter = 'all';
      els.upcomingCategoryFilter.value = 'all';
    }
  }

  function renderUpcomingCategoryChips(dateScopedEvents) {
    if (!els.upcomingCatBreakdown) return;

    const catStats = {};
    dateScopedEvents.forEach(e => {
      const cat = e.category || 'Others';
      if (!catStats[cat]) catStats[cat] = { total: 0, done: 0 };
      catStats[cat].total++;
      if (isStatusDone(e.status)) catStats[cat].done++;
    });

    const sortedCats = Object.keys(catStats).sort((a, b) => catStats[b].total - catStats[a].total);

    if (sortedCats.length === 0) {
      els.upcomingCatBreakdown.innerHTML = '';
      return;
    }

    let chipsHtml = `
      <div class="upcoming-cat-chip ${state.upcomingCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">
        <div class="cat-chip-name">
          <span>All Categories</span>
          <span>${dateScopedEvents.length}</span>
        </div>
        <div class="cat-chip-counts">
          <span>Total Planned</span>
          <span style="font-weight:700; color:#1d4ed8;">${dateScopedEvents.length}</span>
        </div>
        <div class="cat-progress-bar">
          <div class="cat-progress-fill" style="width: 100%;"></div>
        </div>
      </div>
    `;

    sortedCats.forEach(cat => {
      const stat = catStats[cat];
      const rate = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
      const isActive = state.upcomingCategoryFilter === cat;

      chipsHtml += `
        <div class="upcoming-cat-chip ${isActive ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
          <div class="cat-chip-name">
            <span>${escapeHtml(cat)}</span>
            <span>${stat.total}</span>
          </div>
          <div class="cat-chip-counts">
            <span>${stat.done} Done / ${stat.total - stat.done} Left</span>
            <span style="font-weight:700;">${rate}%</span>
          </div>
          <div class="cat-progress-bar">
            <div class="cat-progress-fill" style="width: ${rate}%;"></div>
          </div>
        </div>
      `;
    });

    els.upcomingCatBreakdown.innerHTML = chipsHtml;

    // Attach click listeners to chips
    els.upcomingCatBreakdown.querySelectorAll('.upcoming-cat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.dataset.cat;
        state.upcomingCategoryFilter = cat;
        if (els.upcomingCategoryFilter) els.upcomingCategoryFilter.value = cat;
        renderUpcomingEvents(false);
        // Highlight active chip
        els.upcomingCatBreakdown.querySelectorAll('.upcoming-cat-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.cat === cat);
        });
      });
    });
  }

  function renderUpcomingTable(filteredEvents) {
    if (!els.upcomingTableBody) return;

    if (filteredEvents.length === 0) {
      els.upcomingTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:2rem; color:#6b7280; font-size:0.85rem;">
            No upcoming events match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filteredEvents.forEach(e => {
      // Status formatting
      let statusBadge = '';
      if (isStatusDone(e.status)) {
        statusBadge = `<span class="badge-status status-done">✅ Done</span>`;
      } else if (isStatusDraft(e.status)) {
        statusBadge = `<span class="badge-status status-draft">📝 ${escapeHtml(e.status || 'Drafted')}</span>`;
      } else {
        statusBadge = `<span class="badge-status status-pending">⏳ Pending</span>`;
      }

      // Priority formatting
      let priorityBadge = '—';
      if (e.priority === 'P0') {
        priorityBadge = `<span class="badge-p0">P0</span>`;
      } else if (e.priority === 'P1') {
        priorityBadge = `<span class="badge-p1">P1</span>`;
      } else if (e.priority) {
        priorityBadge = escapeHtml(e.priority);
      }

      // URL Action
      let linkHtml = '—';
      if (e.url) {
        linkHtml = `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer" class="btn-link-action">View Post ↗</a>`;
      }

      rowsHtml += `
        <tr>
          <td style="font-weight:600; color:#334155; white-space:nowrap;">${escapeHtml(e.date)}</td>
          <td><span class="badge-cat">${escapeHtml(e.category)}</span></td>
          <td>
            <div style="font-weight:600; color:#0f172a; line-height:1.35;">${escapeHtml(e.topic)}</div>
            ${e.seoSuggestion ? `<div style="font-size:0.72rem; color:#64748b; margin-top:0.2rem;">${escapeHtml(e.seoSuggestion)}</div>` : ''}
          </td>
          <td>${statusBadge}</td>
          <td style="font-weight:500;">${e.pickedBy ? escapeHtml(e.pickedBy) : '<span style="color:#94a3b8;">—</span>'}</td>
          <td>${priorityBadge}</td>
          <td style="font-size:0.78rem; color:#64748b;">${escapeHtml(e.type || 'News')}</td>
          <td>${linkHtml}</td>
        </tr>
      `;
    });

    els.upcomingTableBody.innerHTML = rowsHtml;
  }

  function exportUpcomingCSV() {
    const allEvents = getUpcomingEventsList();
    const dateScopedEvents = getUpcomingEventsForDateScope(allEvents);

    const filteredEvents = dateScopedEvents.filter(e => {
      if (state.upcomingCategoryFilter !== 'all' && e.category !== state.upcomingCategoryFilter) return false;
      if (state.upcomingStatusFilter === 'done' && !isStatusDone(e.status)) return false;
      if (state.upcomingStatusFilter === 'pending' && (isStatusDone(e.status) || isStatusDraft(e.status))) return false;
      if (state.upcomingStatusFilter === 'draft' && !isStatusDraft(e.status)) return false;
      if (state.upcomingSearch) {
        const q = state.upcomingSearch.toLowerCase();
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.pickedBy && e.pickedBy.toLowerCase().includes(q)) ||
                      (e.date && e.date.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    const headers = ['Date', 'Category', 'Topic', 'Status', 'Status_Type', 'Picked_By', 'Priority', 'Type', 'URL'];
    const csvLines = [headers.join(',')];

    filteredEvents.forEach(e => {
      const statusType = isStatusDone(e.status) ? 'Done' : (isStatusDraft(e.status) ? 'Drafted' : 'Pending');
      const row = [
        `"${(e.date || '').replace(/"/g, '""')}"`,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.topic || '').replace(/"/g, '""')}"`,
        `"${(e.status || '').replace(/"/g, '""')}"`,
        `"${statusType}"`,
        `"${(e.pickedBy || '').replace(/"/g, '""')}"`,
        `"${(e.priority || '').replace(/"/g, '""')}"`,
        `"${(e.type || '').replace(/"/g, '""')}"`,
        `"${(e.url || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Upcoming_Events_${state.upcomingDateFilter}_${state.upcomingCategoryFilter}.csv`;
    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // Master Initialization
  // =========================================================================
  function renderApp() {
    renderRoster();
    renderProductivity();
    renderCategoryGrid();
    renderUpcomingEvents();
  }

  function init() {
    initAuth();
    initLiveSync();
    initNavigation();
    if (state.isAuthenticated) renderApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
