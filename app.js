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
    workflowDateFilter: 'today', // 'today' (default) | 'yesterday' | 'today_yesterday' | 'last7days' | 'last14days' | 'last30days' | 'all'
    workflowCategoryFilter: 'all',
    workflowWriterFilter: 'all',
    workflowTaskTypeFilter: 'all',
    workflowSearch: '',
    calendarCategoryFilter: 'all', // 'all' (default combined) | 'Railway' | 'SSC' | 'Engineering' | 'Teaching' | 'State' | 'Police'
    calendarMonthFilter: 'all',
    calendarSearch: '',
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
    upcomingDateFilter: document.getElementById('upcomingDateFilter'),
    upcomingCategoryFilter: document.getElementById('upcomingCategoryFilter'),
    upcomingStatusFilter: document.getElementById('upcomingStatusFilter'),
    upcomingSearch: document.getElementById('upcomingSearch'),
    upcomingCountLabel: document.getElementById('upcomingCountLabel'),
    upcomingTableBody: document.getElementById('upcomingTableBody'),
    btnExportUpcomingCSV: document.getElementById('btnExportUpcomingCSV'),
    upcomingLiveBadge: document.getElementById('upcomingLiveBadge'),

    // Workflow <JAS>
    sectionWorkflow: document.getElementById('sectionWorkflow'),
    workflowKpiCards: document.getElementById('workflowKpiCards'),
    workflowDateFilter: document.getElementById('workflowDateFilter'),
    optWorkflowToday: document.getElementById('optWorkflowToday'),
    optWorkflowYesterday: document.getElementById('optWorkflowYesterday'),
    workflowCategoryFilter: document.getElementById('workflowCategoryFilter'),
    workflowWriterFilter: document.getElementById('workflowWriterFilter'),
    workflowTaskTypeFilter: document.getElementById('workflowTaskTypeFilter'),
    workflowSearch: document.getElementById('workflowSearch'),
    workflowCountLabel: document.getElementById('workflowCountLabel'),
    workflowTableBody: document.getElementById('workflowTableBody'),
    btnExportWorkflowCSV: document.getElementById('btnExportWorkflowCSV'),
    workflowLiveBadge: document.getElementById('workflowLiveBadge'),

    // Event Calendar
    sectionCalendar: document.getElementById('sectionCalendar'),
    calendarKpiCards: document.getElementById('calendarKpiCards'),
    calendarCategoryFilter: document.getElementById('calendarCategoryFilter'),
    calendarMonthFilter: document.getElementById('calendarMonthFilter'),
    calendarSearch: document.getElementById('calendarSearch'),
    calendarCountLabel: document.getElementById('calendarCountLabel'),
    calendarTableBody: document.getElementById('calendarTableBody'),
    btnExportCalendarCSV: document.getElementById('btnExportCalendarCSV'),
    calendarLiveBadge: document.getElementById('calendarLiveBadge'),
    calendarCategoryPills: document.getElementById('calendarCategoryPills')
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

      sheetsClient.onUpdate((data, syncTime, status) => {
        state.sheetsData = data;
        state.lastSyncTime = syncTime;
        const liveBadge = document.getElementById('syncLiveStatus');
        if (liveBadge && syncTime) {
          const timeStr = syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          if (status === 'live') {
            liveBadge.innerHTML = `🟢 Live (${timeStr})`;
            liveBadge.style.color = '#15803d';
          } else if (status === 'syncing') {
            liveBadge.innerHTML = `🔄 Syncing...`;
            liveBadge.style.color = '#0284c7';
          } else {
            liveBadge.innerHTML = `🟢 Synced (${timeStr})`;
            liveBadge.style.color = '#15803d';
          }
        }
        if (state.isAuthenticated) {
          if (state.activeNavTab === 'productivity') renderProductivity();
          if (state.activeNavTab === 'upcoming') renderUpcomingEvents();
          if (state.activeNavTab === 'workflow') renderWorkflow();
          if (state.activeNavTab === 'calendar') renderCalendar();
        }
      });

      if (els.btnSync) {
        els.btnSync.addEventListener('click', async () => {
          els.btnSync.textContent = 'Syncing...';
          const res = await sheetsClient.refreshData();
          if (res && res.success) {
            els.btnSync.textContent = '✓ Synced!';
            setTimeout(() => { els.btnSync.textContent = 'Sync Now'; }, 2000);
          } else {
            els.btnSync.textContent = 'Sync Now';
          }
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

    // Workflow <JAS> Controls
    if (els.workflowDateFilter) {
      els.workflowDateFilter.addEventListener('change', (e) => {
        state.workflowDateFilter = e.target.value;
        renderWorkflow(true);
      });
    }

    if (els.workflowCategoryFilter) {
      els.workflowCategoryFilter.addEventListener('change', (e) => {
        state.workflowCategoryFilter = e.target.value;
        renderWorkflow(false);
      });
    }

    if (els.workflowWriterFilter) {
      els.workflowWriterFilter.addEventListener('change', (e) => {
        state.workflowWriterFilter = e.target.value;
        renderWorkflow(false);
      });
    }

    if (els.workflowTaskTypeFilter) {
      els.workflowTaskTypeFilter.addEventListener('change', (e) => {
        state.workflowTaskTypeFilter = e.target.value;
        renderWorkflow(false);
      });
    }

    if (els.workflowSearch) {
      els.workflowSearch.addEventListener('input', (e) => {
        state.workflowSearch = e.target.value.toLowerCase().trim();
        renderWorkflow(false);
      });
    }

    if (els.btnExportWorkflowCSV) {
      els.btnExportWorkflowCSV.addEventListener('click', exportWorkflowCSV);
    }

    // Event Calendar Controls
    if (els.calendarCategoryFilter) {
      els.calendarCategoryFilter.addEventListener('change', (e) => {
        state.calendarCategoryFilter = e.target.value;
        syncCalendarPills(e.target.value);
        renderCalendar();
      });
    }

    if (els.calendarCategoryPills) {
      els.calendarCategoryPills.querySelectorAll('.cat-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.dataset.category || 'all';
          state.calendarCategoryFilter = cat;
          if (els.calendarCategoryFilter) els.calendarCategoryFilter.value = cat;
          syncCalendarPills(cat);
          renderCalendar();
        });
      });
    }

    if (els.calendarMonthFilter) {
      els.calendarMonthFilter.addEventListener('change', (e) => {
        state.calendarMonthFilter = e.target.value;
        renderCalendar();
      });
    }

    if (els.calendarSearch) {
      els.calendarSearch.addEventListener('input', (e) => {
        state.calendarSearch = e.target.value.toLowerCase().trim();
        renderCalendar();
      });
    }

    if (els.btnExportCalendarCSV) {
      els.btnExportCalendarCSV.addEventListener('click', exportCalendarCSV);
    }
  }

  function switchNavTab(tab) {
    state.activeNavTab = tab;
    els.navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (els.sectionRoster) els.sectionRoster.style.display = tab === 'roster' ? 'block' : 'none';
    if (els.sectionProductivity) els.sectionProductivity.style.display = tab === 'productivity' ? 'block' : 'none';
    if (els.sectionCategory) els.sectionCategory.style.display = tab === 'category' ? 'block' : 'none';
    if (els.sectionUpcoming) els.sectionUpcoming.style.display = tab === 'upcoming' ? 'block' : 'none';
    if (els.sectionWorkflow) els.sectionWorkflow.style.display = tab === 'workflow' ? 'block' : 'none';
    if (els.sectionCalendar) els.sectionCalendar.style.display = tab === 'calendar' ? 'block' : 'none';

    if (tab === 'roster') renderRoster();
    if (tab === 'productivity') renderProductivity();
    if (tab === 'category') renderCategoryGrid();
    if (tab === 'upcoming') renderUpcomingEvents();
    if (tab === 'workflow') renderWorkflow();
    if (tab === 'calendar') renderCalendar();
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

    if (t === 'Child Pages') {
      return '<div class="grid-badge badge-child">Child Pages</div>';
    }

    if (t === 'High Intent') {
      return '<div class="grid-badge badge-intent">High Intent</div>';
    }

    if (t === 'SEO Optimization') {
      return '<div class="grid-badge badge-seo">SEO Optimization</div>';
    }

    // On News week: simple, clean Event Pages badge (no bulky Night Update badge in table)
    if (t === 'Event Pages' || t === 'Night Update' || t.includes('News') || t.includes('Event')) {
      return '<div class="grid-badge badge-event">Event Pages</div>';
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
        members: ROSTER_CONFIG.teams.teamA.members
      });
    }

    if (state.rosterTeamFilter === 'all' || state.rosterTeamFilter === 'teamB') {
      teamGroups.push({
        id: 'teamB',
        title: 'Team B',
        members: ROSTER_CONFIG.teams.teamB.members
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
                    <td class="cell-writer">${escapeHtml(member)}</td>
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
      ...ROSTER_CONFIG.teams.teamB.members.map(m => ({ name: m, team: 'Team B' }))
    ];

    let csv = ['Name,Team,' + ROSTER_CONFIG.weeks.map(w => `"${w.name} (${w.dateRange})"`).join(',')];

    allMembers.forEach(m => {
      const row = [m.name, m.team];
      ROSTER_CONFIG.weeks.forEach(w => {
        const a = w.tasks[m.name];
        row.push(a ? `"${a.task}"` : '""');
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

    if (state.activeProdSubTab === 'yesterday' || state.activeProdSubTab === 'weekly') {
      renderYesterdayTable(data);
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

      els.prodKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Picked Today</div>
          <div class="kpi-val">${pickT.toLocaleString()}</div>
          <div class="kpi-sub">Articles picked today (Row 1)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Published Today</div>
          <div class="kpi-val" style="color:#1d4ed8;">${pubT.toLocaleString()}</div>
          <div class="kpi-sub">Articles published live today</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Word Count Today</div>
          <div class="kpi-val">${wordT.toLocaleString()}</div>
          <div class="kpi-sub">Daily team volume</div>
        </div>
      `;
    } else if (state.activeProdSubTab === 'yesterday' || state.activeProdSubTab === 'weekly') {
      const pickY = sumObj(s3['Yesterday']);
      const pubY = sumObj(s1['Yesterday']);
      const wordY = sumObj(s2['Yesterday']);

      els.prodKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Picked Yesterday</div>
          <div class="kpi-val">${pickY.toLocaleString()}</div>
          <div class="kpi-sub">Articles picked yesterday (Row 2)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Published Yesterday</div>
          <div class="kpi-val" style="color:#1d4ed8;">${pubY.toLocaleString()}</div>
          <div class="kpi-sub">Articles published live yesterday</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Word Count Yesterday</div>
          <div class="kpi-val">${wordY.toLocaleString()}</div>
          <div class="kpi-sub">Yesterday's team volume (Row 2)</div>
        </div>
      `;
    } else {
      // Monthly View
      const tillWords = sumObj(s2['Till Now']);
      const tillPub = sumObj(s1['Till Now']);
      const tillPick = sumObj(s3['JAS']) + sumObj(s3['AMJ']);

      els.prodKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Total Word Count</div>
          <div class="kpi-val">${tillWords.toLocaleString()}</div>
          <div class="kpi-sub">Cumulative team words</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Published</div>
          <div class="kpi-val" style="color:#1d4ed8;">${tillPub.toLocaleString()}</div>
          <div class="kpi-sub">Cumulative articles published</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Picked</div>
          <div class="kpi-val">${tillPick.toLocaleString()}</div>
          <div class="kpi-sub">Cumulative articles picked</div>
        </div>
      `;
    }
  }

  // YESTERDAY VIEW: Row 2 of Google Sheets (Picked Yesterday | Published Yesterday | Word Count Yesterday)
  function renderYesterdayTable(data) {
    if (!els.prodTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;

    const pubY = data.sheet1_published.summary['Yesterday'] || {};
    const wordY = data.sheet2_wordcount.summary['Yesterday'] || {};
    const pickY = data.sheet3_picked.summary['Yesterday'] || {};

    let sumPickY = 0, sumPubY = 0, sumWordY = 0;

    const rowsHtml = filtered.map(w => {
      const pky = parseInt(String(pickY[w] || '0').replace(/,/g, ''), 10) || 0;
      const py = parseInt(String(pubY[w] || '0').replace(/,/g, ''), 10) || 0;
      const wy = parseInt(String(wordY[w] || '0').replace(/,/g, ''), 10) || 0;
      const avg = py > 0 ? Math.round(wy / py) : 0;

      sumPickY += pky;
      sumPubY += py;
      sumWordY += wy;

      return `
        <tr>
          <td><strong>${w}</strong></td>
          <td class="col-center">${pky > 0 ? `<strong>${pky}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${py > 0 ? `<strong style="color:#1d4ed8;">${py}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center">${wy > 0 ? `<strong>${wy.toLocaleString()}</strong>` : '<span class="zero-val">0</span>'}</td>
          <td class="col-center" style="color:#6b7280;">${avg > 0 ? avg.toLocaleString() + ' w/a' : '-'}</td>
        </tr>
      `;
    }).join('');

    const grandAvg = sumPubY > 0 ? Math.round(sumWordY / sumPubY) : 0;

    const html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Writer</th>
            <th class="col-center">Picked Yesterday</th>
            <th class="col-center">Published Yesterday</th>
            <th class="col-center">Word Count Yesterday</th>
            <th class="col-center">Avg Words/Article</th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-row">
            <td>TOTAL (${filtered.length} Writers)</td>
            <td class="col-center">${sumPickY.toLocaleString()}</td>
            <td class="col-center">${sumPubY.toLocaleString()}</td>
            <td class="col-center">${sumWordY.toLocaleString()}</td>
            <td class="col-center">${grandAvg > 0 ? grandAvg.toLocaleString() + ' w/a' : '-'}</td>
          </tr>
          ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#9ca3af;">No writers found matching search.</td></tr>'}
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
      const pkt = parseInt(String(pickT[w] || '0').replace(/,/g, ''), 10) || 0;
      const pt = parseInt(String(pubT[w] || '0').replace(/,/g, ''), 10) || 0;
      const wt = parseInt(String(wordT[w] || '0').replace(/,/g, ''), 10) || 0;

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
  // TAB 5: WORKFLOW <JAS> (Live Google Sheet gid: 820015548 Replica)
  // =========================================================================
  function getWorkflowList() {
    if (state.sheetsData && Array.isArray(state.sheetsData.workflow_jas) && state.sheetsData.workflow_jas.length > 0) {
      return state.sheetsData.workflow_jas;
    }
    if (typeof BASELINE_WORKFLOW_DATA !== 'undefined' && Array.isArray(BASELINE_WORKFLOW_DATA)) {
      return BASELINE_WORKFLOW_DATA;
    }
    return [];
  }

  function parseWorkflowDate(dateStr) {
    if (!dateStr) return null;
    const clean = String(dateStr).trim();
    // match: MM/DD/YYYY or M/D/YYYY
    const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10) - 1;
      const day = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      return new Date(year, month, day);
    }
    const t = Date.parse(clean);
    return isNaN(t) ? null : new Date(t);
  }

  function getWorkflowForDateScope(items) {
    if (!items || items.length === 0) return [];

    let maxTime = 0;
    const timestamps = [];
    items.forEach(e => {
      const d = parseWorkflowDate(e.date);
      if (d) {
        const t = d.getTime();
        if (t > maxTime) maxTime = t;
        timestamps.push(t);
      }
    });

    const dayMs = 24 * 60 * 60 * 1000;
    const todayTime = maxTime;
    const yesterdayTime = maxTime - dayMs;
    const sevenDaysAgo = maxTime - (7 * dayMs);
    const fourteenDaysAgo = maxTime - (14 * dayMs);
    const thirtyDaysAgo = maxTime - (30 * dayMs);

    // Dynamically update option labels for Today and Yesterday if elements exist
    if (maxTime > 0) {
      const todayDate = new Date(todayTime);
      const yesterdayDate = new Date(yesterdayTime);
      const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      if (els.optWorkflowToday) {
        els.optWorkflowToday.textContent = `Today (Default) (${fmt(todayDate)})`;
      }
      if (els.optWorkflowYesterday) {
        els.optWorkflowYesterday.textContent = `Yesterday (${fmt(yesterdayDate)})`;
      }
    }

    return items.filter(e => {
      const d = parseWorkflowDate(e.date);
      const time = d ? d.getTime() : null;

      if (state.workflowDateFilter === 'today_yesterday') {
        if (!time) return false;
        return time === todayTime || time === yesterdayTime;
      } else if (state.workflowDateFilter === 'today') {
        if (!time || time !== todayTime) return false;
        return true;
      } else if (state.workflowDateFilter === 'yesterday') {
        if (!time || time !== yesterdayTime) return false;
        return true;
      } else if (state.workflowDateFilter === 'last7days') {
        if (!time || time < sevenDaysAgo) return false;
        return true;
      } else if (state.workflowDateFilter === 'last14days') {
        if (!time || time < fourteenDaysAgo) return false;
        return true;
      } else if (state.workflowDateFilter === 'last30days') {
        if (!time || time < thirtyDaysAgo) return false;
        return true;
      } else if (state.workflowDateFilter === 'all') {
        return true;
      }
      return true;
    });
  }

  function renderWorkflow(rebuildFilters = true) {
    if (!els.sectionWorkflow) return;

    const allItems = getWorkflowList();
    const dateScopedItems = getWorkflowForDateScope(allItems);

    if (rebuildFilters) {
      populateWorkflowDynamicFilters(dateScopedItems);
    }

    const filteredItems = dateScopedItems.filter(e => {
      // Category Filter
      if (state.workflowCategoryFilter !== 'all' && (e.category || 'Others') !== state.workflowCategoryFilter) {
        return false;
      }

      // Writer Filter
      if (state.workflowWriterFilter !== 'all' && (e.writer || 'Unassigned') !== state.workflowWriterFilter) {
        return false;
      }

      // Task Type Filter
      if (state.workflowTaskTypeFilter !== 'all' && (e.taskType || 'Other') !== state.workflowTaskTypeFilter) {
        return false;
      }

      // Search
      if (state.workflowSearch) {
        const q = state.workflowSearch;
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.writer && e.writer.toLowerCase().includes(q)) ||
                      (e.fk && e.fk.toLowerCase().includes(q)) ||
                      (e.taskType && e.taskType.toLowerCase().includes(q)) ||
                      (e.pageType && e.pageType.toLowerCase().includes(q)) ||
                      (e.date && e.date.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    renderWorkflowKpis(filteredItems, dateScopedItems.length);
    renderWorkflowTable(filteredItems);

    if (els.workflowCountLabel) {
      els.workflowCountLabel.textContent = `Showing ${filteredItems.length} of ${dateScopedItems.length} tasks`;
    }
  }

  function renderWorkflowKpis(filteredItems, totalInScope) {
    if (!els.workflowKpiCards) return;

    const totalTasks = filteredItems.length;
    let totalWords = 0;
    const writersSet = new Set();
    let doneCount = 0;

    filteredItems.forEach(e => {
      const wc = parseInt(String(e.wordCount).replace(/,/g, ''), 10);
      if (!isNaN(wc)) totalWords += wc;
      if (e.writer && e.writer.trim()) writersSet.add(e.writer.trim());
      if (isStatusDone(e.status)) doneCount++;
    });

    const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

    els.workflowKpiCards.innerHTML = `
      <div class="kpi-card kpi-planned">
        <div class="kpi-label">📝 Total Tasks / Articles</div>
        <div class="kpi-val" style="color:#1d4ed8;">${totalTasks.toLocaleString()}</div>
        <div class="kpi-sub">${state.workflowDateFilter === 'today' ? 'Today (Default)' : (state.workflowDateFilter === 'today_yesterday' ? 'Today & Yesterday' : state.workflowDateFilter)}</div>
      </div>
      <div class="kpi-card kpi-rate">
        <div class="kpi-label">✍️ Total Word Count</div>
        <div class="kpi-val" style="color:#7c3aed;">${totalWords.toLocaleString()}</div>
        <div class="kpi-sub">Total words authored</div>
      </div>
      <div class="kpi-card kpi-done">
        <div class="kpi-label">👥 Active Writers</div>
        <div class="kpi-val" style="color:#059669;">${writersSet.size}</div>
        <div class="kpi-sub">Contributing team members</div>
      </div>
      <div class="kpi-card kpi-pending">
        <div class="kpi-label">✅ Live / Done Status</div>
        <div class="kpi-val" style="color:#15803d;">${doneCount.toLocaleString()} <span style="font-size:0.85rem; color:#6b7280; font-weight:normal;">(${completionRate}%)</span></div>
        <div class="kpi-sub">Marked Done or Live</div>
      </div>
    `;
  }

  function populateWorkflowDynamicFilters(dateScopedItems) {
    // 1. Categories
    if (els.workflowCategoryFilter) {
      const catCounts = {};
      dateScopedItems.forEach(e => {
        const cat = (e.category || 'Others').trim();
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      const sortedCats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
      const currentCat = state.workflowCategoryFilter;
      els.workflowCategoryFilter.innerHTML = `<option value="all">All Categories (${dateScopedItems.length})</option>`;
      sortedCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = `${cat} (${catCounts[cat]})`;
        if (cat === currentCat) opt.selected = true;
        els.workflowCategoryFilter.appendChild(opt);
      });
      if (currentCat !== 'all' && !catCounts[currentCat]) {
        state.workflowCategoryFilter = 'all';
        els.workflowCategoryFilter.value = 'all';
      }
    }

    // 2. Writers
    if (els.workflowWriterFilter) {
      const writerCounts = {};
      dateScopedItems.forEach(e => {
        const w = (e.writer || 'Unassigned').trim();
        writerCounts[w] = (writerCounts[w] || 0) + 1;
      });
      const sortedWriters = Object.keys(writerCounts).sort((a, b) => writerCounts[b] - writerCounts[a]);
      const currentWriter = state.workflowWriterFilter;
      els.workflowWriterFilter.innerHTML = `<option value="all">All Writers (${Object.keys(writerCounts).length})</option>`;
      sortedWriters.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `${w} (${writerCounts[w]})`;
        if (w === currentWriter) opt.selected = true;
        els.workflowWriterFilter.appendChild(opt);
      });
      if (currentWriter !== 'all' && !writerCounts[currentWriter]) {
        state.workflowWriterFilter = 'all';
        els.workflowWriterFilter.value = 'all';
      }
    }

    // 3. Task Types
    if (els.workflowTaskTypeFilter) {
      const ttCounts = {};
      dateScopedItems.forEach(e => {
        const tt = (e.taskType || 'Other').trim();
        ttCounts[tt] = (ttCounts[tt] || 0) + 1;
      });
      const sortedTT = Object.keys(ttCounts).sort((a, b) => ttCounts[b] - ttCounts[a]);
      const currentTT = state.workflowTaskTypeFilter;
      els.workflowTaskTypeFilter.innerHTML = `<option value="all">All Task Types</option>`;
      sortedTT.forEach(tt => {
        const opt = document.createElement('option');
        opt.value = tt;
        opt.textContent = `${tt} (${ttCounts[tt]})`;
        if (tt === currentTT) opt.selected = true;
        els.workflowTaskTypeFilter.appendChild(opt);
      });
      if (currentTT !== 'all' && !ttCounts[currentTT]) {
        state.workflowTaskTypeFilter = 'all';
        els.workflowTaskTypeFilter.value = 'all';
      }
    }
  }

  function renderWorkflowTable(items) {
    if (!els.workflowTableBody) return;

    if (items.length === 0) {
      els.workflowTableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding:2.5rem; color:#6b7280; font-size:0.85rem;">
            No workflow tasks match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    items.forEach(e => {
      // Word count formatting
      let wcFormatted = '—';
      if (e.wordCount !== null && e.wordCount !== undefined && String(e.wordCount).trim() !== '') {
        const n = parseInt(String(e.wordCount).replace(/,/g, ''), 10);
        wcFormatted = isNaN(n) ? escapeHtml(e.wordCount) : n.toLocaleString();
      }

      // New Doc Link
      let docLinkHtml = '<span style="color:#94a3b8;">—</span>';
      if (e.newDoc && e.newDoc.startsWith('http')) {
        docLinkHtml = `<a href="${escapeHtml(e.newDoc)}" target="_blank" rel="noopener noreferrer" class="btn-doc-link">Doc 📄</a>`;
      }

      // Live URL Link
      let urlLinkHtml = '<span style="color:#94a3b8;">—</span>';
      if (e.url) {
        let fullUrl = e.url;
        if (fullUrl.startsWith('/')) fullUrl = 'https://testbook.com' + fullUrl;
        if (fullUrl.startsWith('http')) {
          urlLinkHtml = `<a href="${escapeHtml(fullUrl)}" target="_blank" rel="noopener noreferrer" class="btn-url-link">Visit ↗</a>`;
        }
      }

      rowsHtml += `
        <tr>
          <td style="font-weight:600; color:#334155; white-space:nowrap;">${escapeHtml(e.date)}</td>
          <td>
            <div style="font-weight:600; color:#0f172a; line-height:1.35;">${escapeHtml(e.topic)}</div>
          </td>
          <td><span class="badge-cat">${escapeHtml(e.category || 'Others')}</span></td>
          <td><span class="badge-task-type">${escapeHtml(e.taskType || '—')}</span></td>
          <td><span class="badge-sub-type">${escapeHtml(e.type || '—')}</span></td>
          <td><span class="badge-page-type">${escapeHtml(e.pageType || '—')}</span></td>
          <td><span class="writer-pill">${e.writer ? escapeHtml(e.writer) : '<span style="color:#94a3b8;">—</span>'}</span></td>
          <td><span class="fk-text" title="${escapeHtml(e.fk)}">${escapeHtml(e.fk || '—')}</span></td>
          <td style="text-align:right; font-weight:600; color:#1e293b; white-space:nowrap;">${wcFormatted}</td>
          <td style="text-align:center;">${docLinkHtml}</td>
          <td style="text-align:center;">${urlLinkHtml}</td>
        </tr>
      `;
    });

    els.workflowTableBody.innerHTML = rowsHtml;
  }

  function exportWorkflowCSV() {
    const allItems = getWorkflowList();
    const dateScopedItems = getWorkflowForDateScope(allItems);

    const filteredItems = dateScopedItems.filter(e => {
      if (state.workflowCategoryFilter !== 'all' && (e.category || 'Others') !== state.workflowCategoryFilter) return false;
      if (state.workflowWriterFilter !== 'all' && (e.writer || 'Unassigned') !== state.workflowWriterFilter) return false;
      if (state.workflowTaskTypeFilter !== 'all' && (e.taskType || 'Other') !== state.workflowTaskTypeFilter) return false;
      if (state.workflowSearch) {
        const q = state.workflowSearch;
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.writer && e.writer.toLowerCase().includes(q)) ||
                      (e.fk && e.fk.toLowerCase().includes(q)) ||
                      (e.taskType && e.taskType.toLowerCase().includes(q)) ||
                      (e.pageType && e.pageType.toLowerCase().includes(q)) ||
                      (e.date && e.date.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    const headers = ['Date', 'Topic', 'Category', 'Task Type', 'Type', 'Page Type', 'Writer', 'FK', 'Word Count', 'New Content (Doc)', 'URL'];
    const csvLines = [headers.join(',')];

    filteredItems.forEach(e => {
      const row = [
        `"${(e.date || '').replace(/"/g, '""')}"`,
        `"${(e.topic || '').replace(/"/g, '""')}"`,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.taskType || '').replace(/"/g, '""')}"`,
        `"${(e.type || '').replace(/"/g, '""')}"`,
        `"${(e.pageType || '').replace(/"/g, '""')}"`,
        `"${(e.writer || '').replace(/"/g, '""')}"`,
        `"${(e.fk || '').replace(/"/g, '""')}"`,
        `"${(e.wordCount || '').replace(/"/g, '""')}"`,
        `"${(e.newDoc || '').replace(/"/g, '""')}"`,
        `"${(e.url || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Workflow_JAS_${state.workflowDateFilter}_${state.workflowCategoryFilter}.csv`;
    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // TAB 6: Event Calendar Rendering (Aggregated Sub-Sheets + Category Filter)
  // =========================================================================
  function getCalendarList() {
    if (state.sheetsData && state.sheetsData.calendar_events && state.sheetsData.calendar_events.length > 0) {
      return state.sheetsData.calendar_events;
    }
    if (typeof BASELINE_CALENDAR_DATA !== 'undefined') {
      return BASELINE_CALENDAR_DATA;
    }
    return [];
  }

  function syncCalendarPills(activeCat) {
    if (!els.calendarCategoryPills) return;
    els.calendarCategoryPills.querySelectorAll('.cat-pill-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.category || 'all') === activeCat);
    });
  }

  let calendarMonthsPopulated = false;
  function populateCalendarMonths(items) {
    if (calendarMonthsPopulated || !els.calendarMonthFilter) return;
    const monthsSet = new Set();
    items.forEach(e => {
      const d = (e.expectedDate || '').trim();
      if (!d) return;
      const match = d.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Sep|Oct|Nov|Dec)\s*(\d{4})?/i);
      if (match) {
        let m = match[1];
        if (m.toLowerCase() === 'sep') m = 'September';
        if (m.toLowerCase() === 'oct') m = 'October';
        if (m.toLowerCase() === 'nov') m = 'November';
        if (m.toLowerCase() === 'dec') m = 'December';
        const y = match[2] || '2026';
        monthsSet.add(`${m} ${y}`);
      }
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });

    sortedMonths.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      els.calendarMonthFilter.appendChild(opt);
    });
    calendarMonthsPopulated = true;
  }

  function updateCalendarPillCounts(items) {
    const counts = { all: items.length, Railway: 0, SSC: 0, Engineering: 0, Teaching: 0, State: 0, Police: 0 };
    items.forEach(e => {
      if (counts[e.category] !== undefined) counts[e.category]++;
    });

    ['All', 'Railway', 'SSC', 'Engineering', 'Teaching', 'State', 'Police'].forEach(c => {
      const el = document.getElementById(`pillCount${c}`);
      if (el) el.textContent = c === 'All' ? counts.all : (counts[c] || 0);
    });
  }

  function getEventIcon(eventName) {
    const name = (eventName || '').toLowerCase();
    if (name.includes('notification')) return '📢';
    if (name.includes('apply') || name.includes('application') || name.includes('form')) return '📝';
    if (name.includes('city') || name.includes('slip')) return '📍';
    if (name.includes('admit') || name.includes('hall ticket')) return '🎫';
    if (name.includes('exam') || name.includes('conduction') || name.includes('cbt')) return '🎯';
    if (name.includes('key')) return '🔑';
    if (name.includes('result') || name.includes('merit') || name.includes('score')) return '🏆';
    if (name.includes('cut off')) return '📊';
    return '📌';
  }

  function renderCalendar() {
    if (!els.sectionCalendar || !els.calendarTableBody) return;

    const allItems = getCalendarList();
    populateCalendarMonths(allItems);
    updateCalendarPillCounts(allItems);

    // KPI Calculations
    const totalEvents = allItems.length;
    const uniqueExams = new Set(allItems.map(e => e.exam).filter(Boolean)).size;
    const categoriesCount = new Set(allItems.map(e => e.category).filter(Boolean)).size;
    const soonEvents = allItems.filter(e => {
      const d = (e.expectedDate || '').toLowerCase();
      return d.includes('sep') || d.includes('oct') || d.includes('2026');
    }).length;

    if (els.calendarKpiCards) {
      els.calendarKpiCards.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-title">📅 Total Events Tracked</div>
          <div class="kpi-val" style="color:#1d4ed8;">${totalEvents}</div>
          <div class="kpi-sub">Across 6 Exam Verticals</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">🏛️ Distinct Exams Covered</div>
          <div class="kpi-val" style="color:#7e22ce;">${uniqueExams}</div>
          <div class="kpi-sub">RRB, SSC, UPSSSC, Police etc.</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">📂 Sub-Sheet Categories</div>
          <div class="kpi-val" style="color:#059669;">${categoriesCount}</div>
          <div class="kpi-sub">Combined view by default</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">⚡ Q4 2026 Key Milestones</div>
          <div class="kpi-val" style="color:#b45309;">${soonEvents}</div>
          <div class="kpi-sub">Upcoming Conductions & Releases</div>
        </div>
      `;
    }

    // Filter Items
    const filtered = allItems.filter(e => {
      // Category filter (Default: 'all' combined view!)
      if (state.calendarCategoryFilter !== 'all' && e.category !== state.calendarCategoryFilter) {
        return false;
      }
      // Month filter
      if (state.calendarMonthFilter !== 'all') {
        const target = state.calendarMonthFilter.toLowerCase();
        const dateStr = (e.expectedDate || '').toLowerCase();
        const parts = target.split(' ');
        const mName = parts[0];
        if (!dateStr.includes(mName.substring(0, 3))) {
          return false;
        }
      }
      // Search filter
      if (state.calendarSearch) {
        const q = state.calendarSearch;
        const match = (e.exam && e.exam.toLowerCase().includes(q)) ||
                      (e.eventName && e.eventName.toLowerCase().includes(q)) ||
                      (e.expectedDate && e.expectedDate.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.tam && e.tam.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    if (els.calendarCountLabel) {
      els.calendarCountLabel.textContent = `Showing ${filtered.length} of ${allItems.length} events`;
    }

    if (filtered.length === 0) {
      els.calendarTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:3rem; color:#64748b;">
            <div style="font-size:1.5rem; margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:600;">No events match your current filter criteria.</div>
            <div style="font-size:0.8rem; margin-top:0.25rem;">Try selecting "All Categories (Combined)" or clearing your search.</div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach(e => {
      const catClass = `badge-cal-${(e.category || 'default').toLowerCase()}`;
      const icon = getEventIcon(e.eventName);
      const isSoon = (e.expectedDate || '').toLowerCase().includes('sep') || (e.expectedDate || '').toLowerCase().includes('oct');
      const dateBadgeClass = isSoon ? 'badge-cal-date highlight-soon' : 'badge-cal-date';
      const tamHtml = e.tam ? `<span class="badge-cal-tam">${escapeHtml(e.tam)}</span>` : '<span style="color:#94a3b8;">—</span>';
      const trafficHtml = e.expectedTraffic ? `<span class="badge-cal-metric">${escapeHtml(e.expectedTraffic)}</span>` : '<span style="color:#94a3b8;">—</span>';
      const blogsHtml = e.blogsRequired ? `<span class="badge-cal-metric">${escapeHtml(e.blogsRequired)}</span>` : '<span style="color:#94a3b8;">—</span>';

      rowsHtml += `
        <tr>
          <td><span class="badge-cal-category ${catClass}">${escapeHtml(e.category)}</span></td>
          <td><div class="cal-exam-title">${escapeHtml(e.exam || 'General')}</div></td>
          <td>
            <div class="cal-event-title">
              <span style="margin-right:0.35rem;">${icon}</span>${escapeHtml(e.eventName)}
            </div>
          </td>
          <td><span class="${dateBadgeClass}">📅 ${escapeHtml(e.expectedDate || 'TBD')}</span></td>
          <td style="text-align:center;">${tamHtml}</td>
          <td style="text-align:center;">${trafficHtml}</td>
          <td style="text-align:center;">${blogsHtml}</td>
        </tr>
      `;
    });

    els.calendarTableBody.innerHTML = rowsHtml;
  }

  function exportCalendarCSV() {
    const allItems = getCalendarList();
    const filtered = allItems.filter(e => {
      if (state.calendarCategoryFilter !== 'all' && e.category !== state.calendarCategoryFilter) return false;
      if (state.calendarMonthFilter !== 'all') {
        const target = state.calendarMonthFilter.toLowerCase();
        const dateStr = (e.expectedDate || '').toLowerCase();
        const parts = target.split(' ');
        if (!dateStr.includes(parts[0].substring(0, 3))) return false;
      }
      if (state.calendarSearch) {
        const q = state.calendarSearch;
        const match = (e.exam && e.exam.toLowerCase().includes(q)) ||
                      (e.eventName && e.eventName.toLowerCase().includes(q)) ||
                      (e.expectedDate && e.expectedDate.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.tam && e.tam.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    const headers = ['Category', 'Exam', 'Event Name', 'Expected Month/Date', 'TAM', 'Expected Traffic', 'Number of Blogs Required'];
    const csvLines = [headers.join(',')];

    filtered.forEach(e => {
      const row = [
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.exam || '').replace(/"/g, '""')}"`,
        `"${(e.eventName || '').replace(/"/g, '""')}"`,
        `"${(e.expectedDate || '').replace(/"/g, '""')}"`,
        `"${(e.tam || '').replace(/"/g, '""')}"`,
        `"${(e.expectedTraffic || '').replace(/"/g, '""')}"`,
        `"${(e.blogsRequired || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Event_Calendar_${state.calendarCategoryFilter}_${Date.now()}.csv`;
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
    renderWorkflow();
    renderCalendar();
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
