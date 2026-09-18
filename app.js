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
    dutyBanner: document.getElementById('dutyBanner'),
    nightShiftRow: document.getElementById('nightShiftRow'),
    weekSelect: document.getElementById('weekSelect'),
    teamFilter: document.getElementById('teamFilter'),
    rosterSearch: document.getElementById('rosterSearch'),
    btnToggleMatrix: document.getElementById('btnToggleMatrix'),
    btnExportRoster: document.getElementById('btnExportRoster'),
    weekTableWrap: document.getElementById('weekTableWrap'),
    weekTableBody: document.getElementById('weekTableBody'),
    matrixTableWrap: document.getElementById('matrixTableWrap'),
    matrixTable: document.getElementById('matrixTable'),
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
    btnExportCategoryCSV: document.getElementById('btnExportCategoryCSV')
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
        if (state.isAuthenticated && state.activeNavTab === 'productivity') {
          renderProductivity();
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
    if (els.weekSelect) {
      els.weekSelect.addEventListener('change', (e) => {
        state.selectedWeekId = parseInt(e.target.value, 10);
        renderRoster();
      });
    }

    if (els.teamFilter) {
      els.teamFilter.addEventListener('change', (e) => {
        state.rosterTeamFilter = e.target.value;
        renderRoster();
      });
    }

    if (els.rosterSearch) {
      els.rosterSearch.addEventListener('input', (e) => {
        state.rosterSearch = e.target.value.toLowerCase().trim();
        renderRoster();
      });
    }

    if (els.btnToggleMatrix) {
      els.btnToggleMatrix.addEventListener('click', () => {
        state.isMatrixView = !state.isMatrixView;
        els.btnToggleMatrix.textContent = state.isMatrixView ? 'Switch to Weekly View' : 'Switch to 13-Week Grid';
        renderRoster();
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
  }

  function switchNavTab(tab) {
    state.activeNavTab = tab;
    els.navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (els.sectionRoster) els.sectionRoster.style.display = tab === 'roster' ? 'block' : 'none';
    if (els.sectionProductivity) els.sectionProductivity.style.display = tab === 'productivity' ? 'block' : 'none';
    if (els.sectionCategory) els.sectionCategory.style.display = tab === 'category' ? 'block' : 'none';

    if (tab === 'roster') renderRoster();
    if (tab === 'productivity') renderProductivity();
    if (tab === 'category') renderCategoryGrid();
  }

  function switchProdSubTab(subtab) {
    state.activeProdSubTab = subtab;
    els.prodSubBtns.forEach(b => b.classList.toggle('active', b.dataset.subtab === subtab));
    renderProductivity();
  }

  // =========================================================================
  // TAB 1: Roster Plan Rendering (Q4 2026)
  // =========================================================================
  function renderRoster() {
    if (typeof ROSTER_CONFIG === 'undefined') return;

    populateWeekSelect();
    renderDutyBanner();
    renderNightShiftDaily();

    if (state.isMatrixView) {
      if (els.weekTableWrap) els.weekTableWrap.style.display = 'none';
      if (els.matrixTableWrap) els.matrixTableWrap.style.display = 'block';
      renderMasterMatrix();
    } else {
      if (els.weekTableWrap) els.weekTableWrap.style.display = 'block';
      if (els.matrixTableWrap) els.matrixTableWrap.style.display = 'none';
      renderWeekTable();
    }

    renderMentorsAndPrep();
  }

  function populateWeekSelect() {
    if (!els.weekSelect || els.weekSelect.children.length > 0) return;
    ROSTER_CONFIG.weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.dateRange}) — ${w.newsTeam} on News`;
      if (w.id === state.selectedWeekId) opt.selected = true;
      els.weekSelect.appendChild(opt);
    });
  }

  function renderDutyBanner() {
    if (!els.dutyBanner) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    els.dutyBanner.innerHTML = `
      <div class="banner-left">
        <h3>${week.name}: ${week.dateRange}</h3>
        <p>Q4 2026 Content Operations Schedule</p>
      </div>
      <div class="banner-tags">
        <span class="simple-tag tag-news">📰 <strong>${week.newsTeam}</strong> on News</span>
        <span class="simple-tag tag-content">✍️ <strong>${week.contentTeam}</strong> on Content (Child / SEO / Intent)</span>
        <span class="simple-tag tag-night">🌙 <strong>Daily Night Shift Allotment</strong></span>
      </div>
    `;
  }

  function renderNightShiftDaily() {
    if (!els.nightShiftRow) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    let html = '';
    week.nightShiftDaily.forEach(item => {
      html += `
        <div class="night-card">
          <div class="day">${item.day}</div>
          <div class="name">${item.member}</div>
        </div>
      `;
    });

    els.nightShiftRow.innerHTML = html;
  }

  function getTaskBadge(task) {
    if (task.includes('News')) return '<span class="task-pill task-news">📰 News</span>';
    if (task.includes('SEO')) return '<span class="task-pill task-seo">🔍 SEO Optimization</span>';
    if (task.includes('High Intent')) return '<span class="task-pill task-intent">🎯 High Intent</span>';
    if (task.includes('Child')) return '<span class="task-pill task-child">📄 Child Pages</span>';
    if (task.includes('Upcoming')) return '<span class="task-pill task-upcoming">📑 Upcoming Drafts</span>';
    return `<span class="task-pill">${task}</span>`;
  }

  function renderWeekTable() {
    if (!els.weekTableBody) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    const allMembers = [
      ...ROSTER_CONFIG.teams.teamA.members.map(m => ({ name: m, team: 'Team A' })),
      ...ROSTER_CONFIG.teams.teamB.members.map(m => ({ name: m, team: 'Team B' })),
      { name: 'Archana', team: 'Upcoming' }
    ];

    let filtered = allMembers;
    if (state.rosterTeamFilter === 'teamA') filtered = allMembers.filter(m => m.team === 'Team A');
    if (state.rosterTeamFilter === 'teamB') filtered = allMembers.filter(m => m.team === 'Team B');
    if (state.rosterSearch) filtered = filtered.filter(m => m.name.toLowerCase().includes(state.rosterSearch));

    let html = '';
    filtered.forEach(m => {
      const taskInfo = week.tasks[m.name] || { task: '-', nightDays: '-' };

      html += `
        <tr>
          <td>
            <strong>${m.name}</strong>
            ${m.name === 'Trishala' ? '<span style="color:#059669; font-size:0.75rem; font-weight:600; margin-left:4px;">(Replaces Shilpa Singh)</span>' : ''}
          </td>
          <td>${m.team}</td>
          <td>${getTaskBadge(taskInfo.task)}</td>
          <td>
            ${taskInfo.nightDays !== '-'
              ? `<span style="background:#fef3c7; color:#92400e; padding:0.15rem 0.5rem; border-radius:4px; font-weight:600; font-size:0.75rem;">🌙 ${taskInfo.nightDays}</span>`
              : '<span style="color:#9ca3af;">-</span>'}
          </td>
        </tr>
      `;
    });

    els.weekTableBody.innerHTML = html;
  }

  function renderMasterMatrix() {
    if (!els.matrixTable) return;

    const allMembers = [
      ...ROSTER_CONFIG.teams.teamA.members.map(m => ({ name: m, team: 'Team A' })),
      ...ROSTER_CONFIG.teams.teamB.members.map(m => ({ name: m, team: 'Team B' })),
      { name: 'Archana', team: 'Upcoming' }
    ];

    let filtered = allMembers;
    if (state.rosterTeamFilter === 'teamA') filtered = allMembers.filter(m => m.team === 'Team A');
    if (state.rosterTeamFilter === 'teamB') filtered = allMembers.filter(m => m.team === 'Team B');
    if (state.rosterSearch) filtered = filtered.filter(m => m.name.toLowerCase().includes(state.rosterSearch));

    let html = `
      <thead>
        <tr>
          <th class="col-sticky">Member</th>
          <th>Team</th>
          ${ROSTER_CONFIG.weeks.map(w => `<th>${w.name}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${filtered.map(m => `
          <tr>
            <td class="col-sticky"><strong>${m.name}</strong></td>
            <td>${m.team}</td>
            ${ROSTER_CONFIG.weeks.map(w => {
              const info = w.tasks[m.name] || { task: '-' };
              return `<td>${getTaskBadge(info.task)}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    `;

    els.matrixTable.innerHTML = html;
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
  // Master Initialization
  // =========================================================================
  function renderApp() {
    renderRoster();
    renderProductivity();
    renderCategoryGrid();
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
