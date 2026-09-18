/**
 * app.js - Content Team Portal Orchestrator
 * Simple & Clean UI
 * 
 * Password: 7730
 * Roster: Q4 2026 (Oct 1 - Dec 31, 2026)
 * Productivity: Sheets 1, 2, 3
 * Category Analytics: Category Wise Date
 */

(function() {
  'use strict';

  // State Management
  const state = {
    isAuthenticated: false,
    enteredPin: '',
    correctPin: '7730',
    activeNavTab: 'roster', // 'roster' | 'productivity' | 'category'
    activeProdSubTab: 'daily',
    selectedWeekId: 1,
    isMatrixView: false,
    rosterTeamFilter: 'all',
    rosterSearch: '',
    prodSearch: '',
    catDateFilter: 'all',
    catCategoryFilter: 'all',
    catSearch: '',
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
    navTabs: document.querySelectorAll('.nav-btn'),
    rosterSection: document.getElementById('rosterSection'),
    productivitySection: document.getElementById('productivitySection'),
    categorySection: document.getElementById('categorySection'),
    activeDutyBanner: document.getElementById('activeDutyBanner'),
    nightShiftGrid: document.getElementById('nightShiftGrid'),
    weekTableView: document.getElementById('weekTableView'),
    weekTableBody: document.getElementById('weekTableBody'),
    masterMatrixContainer: document.getElementById('masterMatrixContainer'),
    weekSelect: document.getElementById('weekSelect'),
    teamFilter: document.getElementById('teamFilter'),
    rosterSearchInput: document.getElementById('rosterSearchInput'),
    btnToggleMatrix: document.getElementById('btnToggleMatrix'),
    btnExportRoster: document.getElementById('btnExportRoster'),
    mentorsSection: document.getElementById('mentorsSection'),
    mentorsList: document.getElementById('mentorsList'),
    prepList: document.getElementById('prepList'),
    prodSubnavBtns: document.querySelectorAll('.subnav-tab'),
    prodTabContents: document.querySelectorAll('.prod-subtab-content'),
    prodSearchInput: document.getElementById('prodSearchInput'),
    statsCardsGrid: document.getElementById('statsCardsGrid'),
    dailyTableContainer: document.getElementById('dailyTableContainer'),
    weeklyTableContainer: document.getElementById('weeklyTableContainer'),
    monthlyTableContainer: document.getElementById('monthlyTableContainer'),
    kpiTableContainer: document.getElementById('kpiTableContainer'),
    catDateSelect: document.getElementById('catDateSelect'),
    catCategorySelect: document.getElementById('catCategorySelect'),
    catSearchInput: document.getElementById('catSearchInput'),
    catStatsCardsGrid: document.getElementById('catStatsCardsGrid'),
    catTableBody: document.getElementById('catTableBody'),
    btnExportCategoryCSV: document.getElementById('btnExportCategoryCSV')
  };

  // =========================================================================
  // Passcode Auth Logic (PIN: 7730)
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
  // Live Sync Countdown (5 min)
  // =========================================================================
  function initLiveHeader() {
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
  // Navigation & Tabs
  // =========================================================================
  function initNavigation() {
    els.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        switchNavTab(btn.dataset.tab);
      });
    });

    els.prodSubnavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        switchProdSubtab(btn.dataset.subtab);
      });
    });

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

    if (els.rosterSearchInput) {
      els.rosterSearchInput.addEventListener('input', (e) => {
        state.rosterSearch = e.target.value.toLowerCase().trim();
        renderRoster();
      });
    }

    if (els.btnToggleMatrix) {
      els.btnToggleMatrix.addEventListener('click', () => {
        state.isMatrixView = !state.isMatrixView;
        els.btnToggleMatrix.textContent = state.isMatrixView ? 'Switch to Weekly View' : 'Switch to Full 13-Week Grid';
        renderRoster();
      });
    }

    if (els.btnExportRoster) {
      els.btnExportRoster.addEventListener('click', exportRosterCSV);
    }

    if (els.prodSearchInput) {
      els.prodSearchInput.addEventListener('input', (e) => {
        state.prodSearch = e.target.value.toLowerCase().trim();
        renderProductivity();
      });
    }

    if (els.catDateSelect) {
      els.catDateSelect.addEventListener('change', (e) => {
        state.catDateFilter = e.target.value;
        renderCategoryTab();
      });
    }

    if (els.catCategorySelect) {
      els.catCategorySelect.addEventListener('change', (e) => {
        state.catCategoryFilter = e.target.value;
        renderCategoryTab();
      });
    }

    if (els.catSearchInput) {
      els.catSearchInput.addEventListener('input', (e) => {
        state.catSearch = e.target.value.toLowerCase().trim();
        renderCategoryTab();
      });
    }

    if (els.btnExportCategoryCSV) {
      els.btnExportCategoryCSV.addEventListener('click', exportCategoryCSV);
    }
  }

  function switchNavTab(tab) {
    state.activeNavTab = tab;
    els.navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    els.rosterSection.style.display = tab === 'roster' ? 'block' : 'none';
    els.productivitySection.style.display = tab === 'productivity' ? 'block' : 'none';
    els.categorySection.style.display = tab === 'category' ? 'block' : 'none';

    if (tab === 'roster') renderRoster();
    if (tab === 'productivity') renderProductivity();
    if (tab === 'category') renderCategoryTab();
  }

  function switchProdSubtab(subtab) {
    state.activeProdSubTab = subtab;
    els.prodSubnavBtns.forEach(b => b.classList.toggle('active', b.dataset.subtab === subtab));
    els.prodTabContents.forEach(c => {
      c.style.display = c.id === `prodTab-${subtab}` ? 'block' : 'none';
    });
    renderProductivity();
  }

  // =========================================================================
  // Roster Rendering
  // =========================================================================
  function renderRoster() {
    populateWeekSelect();
    renderDutyBanner();
    renderNightShiftDaily();

    if (state.isMatrixView) {
      els.weekTableView.style.display = 'none';
      els.masterMatrixContainer.style.display = 'block';
      renderMasterMatrix();
    } else {
      els.weekTableView.style.display = 'block';
      els.masterMatrixContainer.style.display = 'none';
      renderWeekTable();
    }

    renderMentorsAndPrep();
  }

  function populateWeekSelect() {
    if (!els.weekSelect || els.weekSelect.children.length > 0) return;
    ROSTER_CONFIG.weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.dateRange}) - ${w.newsTeam} on News`;
      if (w.id === state.selectedWeekId) opt.selected = true;
      els.weekSelect.appendChild(opt);
    });
  }

  function renderDutyBanner() {
    if (!els.activeDutyBanner) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    els.activeDutyBanner.innerHTML = `
      <div class="duty-title">
        <h3>${week.name}: ${week.dateRange}</h3>
        <p>Active week task rotation for Team A & Team B</p>
      </div>
      <div class="duty-tags">
        <span class="duty-tag tag-news">📰 <strong>${week.newsTeam}</strong> on News</span>
        <span class="duty-tag tag-content">✍️ <strong>${week.contentTeam}</strong> on Content (Child / SEO / Intent)</span>
        <span class="duty-tag tag-night">🌙 <strong>Daily Night Shift Rotation</strong></span>
      </div>
    `;
  }

  function renderNightShiftDaily() {
    if (!els.nightShiftGrid) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    let html = '';
    week.nightShiftDaily.forEach(item => {
      html += `
        <div class="night-daily-card">
          <div class="day-name">${item.day}</div>
          <div class="person-name">${item.member}</div>
        </div>
      `;
    });

    els.nightShiftGrid.innerHTML = html;
  }

  function getBadgeClass(task) {
    if (task.includes('News')) return 'badge-news';
    if (task.includes('SEO')) return 'badge-seo';
    if (task.includes('High Intent')) return 'badge-intent';
    if (task.includes('Child')) return 'badge-child';
    return 'badge-upcoming';
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
      const badgeCls = getBadgeClass(taskInfo.task);

      html += `
        <tr>
          <td>
            <strong>${m.name}</strong> 
            ${m.name === 'Trishala' ? '<span style="color:#059669; font-size:0.75rem;">(New)</span>' : ''}
          </td>
          <td>${m.team}</td>
          <td><span class="badge ${badgeCls}">${taskInfo.task}</span></td>
          <td>
            ${taskInfo.nightDays !== '-' 
              ? `<span style="background:#fef3c7; color:#92400e; padding:0.15rem 0.5rem; border-radius:4px; font-weight:600; font-size:0.78rem;">🌙 ${taskInfo.nightDays}</span>`
              : '<span style="color:#9ca3af;">-</span>'}
          </td>
        </tr>
      `;
    });

    els.weekTableBody.innerHTML = html;
  }

  function renderMasterMatrix() {
    if (!els.masterMatrixContainer) return;

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
      <table class="clean-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Team</th>
            ${ROSTER_CONFIG.weeks.map(w => `<th>${w.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${filtered.map(m => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.team}</td>
              ${ROSTER_CONFIG.weeks.map(w => {
                const info = w.tasks[m.name] || { task: '-' };
                const badge = getBadgeClass(info.task);
                return `<td><span class="badge ${badge}">${info.task}</span></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    els.masterMatrixContainer.innerHTML = html;
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
  // Productivity Rendering (Sheets 1, 2, 3)
  // =========================================================================
  function renderProductivity() {
    const data = state.sheetsData || (typeof BASELINE_SHEETS_DATA !== 'undefined' ? BASELINE_SHEETS_DATA : null);
    if (!data) return;

    renderStatsSummary(data);

    if (state.activeProdSubTab === 'daily') renderDaily(data);
    if (state.activeProdSubTab === 'weekly') renderWeekly(data);
    if (state.activeProdSubTab === 'monthly') renderMonthly(data);
    if (state.activeProdSubTab === 'kpi') renderKPI(data);
  }

  function sumObj(obj) {
    if (!obj) return 0;
    return Object.values(obj).reduce((acc, v) => acc + (parseFloat(String(v).replace(/,/g, '')) || 0), 0);
  }

  function renderStatsSummary(data) {
    if (!els.statsCardsGrid) return;
    const pubToday = sumObj(data.sheet1_published.summary['Today']);
    const wordToday = sumObj(data.sheet2_wordcount.summary['Today']);
    const pickToday = sumObj(data.sheet3_picked.summary['Today']);
    const tillNow = sumObj(data.sheet2_wordcount.summary['Till Now']);

    els.statsCardsGrid.innerHTML = `
      <div class="simple-stat">
        <div class="stat-lbl">Published Today</div>
        <div class="stat-num">${pubToday.toLocaleString()}</div>
        <div class="stat-sub">Articles across writers</div>
      </div>
      <div class="simple-stat">
        <div class="stat-lbl">Words Written Today</div>
        <div class="stat-num">${wordToday.toLocaleString()}</div>
        <div class="stat-sub">Daily word volume</div>
      </div>
      <div class="simple-stat">
        <div class="stat-lbl">Articles Picked Today</div>
        <div class="stat-num">${pickToday.toLocaleString()}</div>
        <div class="stat-sub">Active in pipeline</div>
      </div>
      <div class="simple-stat">
        <div class="stat-lbl">Total Words (Till Now)</div>
        <div class="stat-num">${tillNow.toLocaleString()}</div>
        <div class="stat-sub">Cumulative team output</div>
      </div>
    `;
  }

  function renderDaily(data) {
    if (!els.dailyTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;

    const pubT = data.sheet1_published.summary['Today'] || {};
    const wordT = data.sheet2_wordcount.summary['Today'] || {};
    const pickT = data.sheet3_picked.summary['Today'] || {};
    const pubY = data.sheet1_published.summary['Yesterday'] || {};
    const wordY = data.sheet2_wordcount.summary['Yesterday'] || {};

    let html = `
      <table class="clean-table">
        <thead>
          <tr>
            <th>Writer</th>
            <th>Published Today</th>
            <th>Words Today</th>
            <th>Picked Today</th>
            <th>Published Yest.</th>
            <th>Words Yest.</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(w => `
            <tr>
              <td><strong>${w}</strong></td>
              <td><strong style="color:#2563eb;">${pubT[w] || '0'}</strong></td>
              <td><strong>${(parseInt(wordT[w] || '0', 10)).toLocaleString()}</strong></td>
              <td>${pickT[w] || '0'}</td>
              <td>${pubY[w] || '0'}</td>
              <td>${(parseInt(wordY[w] || '0', 10)).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    els.dailyTableContainer.innerHTML = html;
  }

  function renderWeekly(data) {
    if (!els.weeklyTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;

    const s1 = data.sheet1_published.summary;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;

    let html = `
      <table class="clean-table">
        <thead>
          <tr>
            <th>Writer</th>
            <th>Words (Last 7 Days)</th>
            <th>Words (Prev 7 Days)</th>
            <th>Articles Pub (Last 7D)</th>
            <th>Articles Picked (Last 7D)</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(w => `
            <tr>
              <td><strong>${w}</strong></td>
              <td><strong>${(parseInt(s2['Last 7 Days']?.[w] || '0', 10)).toLocaleString()}</strong></td>
              <td>${(parseInt(s2['Previous 7 days']?.[w] || '0', 10)).toLocaleString()}</td>
              <td>${s1['Last 7 Days']?.[w] || '0'}</td>
              <td>${s3['Last 7 Days']?.[w] || '0'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    els.weeklyTableContainer.innerHTML = html;
  }

  function renderMonthly(data) {
    if (!els.monthlyTableContainer) return;
    const writers = data.sheet1_published.headers;
    let filtered = state.prodSearch ? writers.filter(w => w.toLowerCase().includes(state.prodSearch)) : writers;
    const s2 = data.sheet2_wordcount.summary;
    const months = ['April', 'May', 'June', 'July', 'August', 'September'];

    let html = `
      <table class="clean-table">
        <thead>
          <tr>
            <th>Writer</th>
            ${months.map(m => `<th>${m}</th>`).join('')}
            <th>Till Now</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(w => `
            <tr>
              <td><strong>${w}</strong></td>
              ${months.map(m => `<td>${(parseInt(s2[m]?.[w] || '0', 10)).toLocaleString() || '-'}</td>`).join('')}
              <td><strong style="color:#2563eb;">${(parseInt(s2['Till Now']?.[w] || '0', 10)).toLocaleString()}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    els.monthlyTableContainer.innerHTML = html;
  }

  function renderKPI(data) {
    if (!els.kpiTableContainer) return;
    const writers = data.sheet1_published.headers;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;

    const list = writers.map(w => {
      const ach = s2['Achieved Percentage']?.[w] || '0%';
      const tillNow = parseInt(s2['Till Now']?.[w] || '0', 10);
      const toAch = s3['To be Achieved']?.[w] || '0';
      return { name: w, ach, tillNow, toAch, num: parseFloat(ach.replace('%', '')) || 0 };
    }).sort((a, b) => b.num - a.num);

    let filtered = state.prodSearch ? list.filter(l => l.name.toLowerCase().includes(state.prodSearch)) : list;

    let html = `
      <table class="clean-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Writer</th>
            <th>Target KPI</th>
            <th>Words Achieved</th>
            <th>Word KPI %</th>
            <th>Article Deficit</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((item, idx) => `
            <tr>
              <td><strong>#${idx + 1}</strong></td>
              <td><strong>${item.name}</strong></td>
              <td>396,000</td>
              <td>${item.tillNow.toLocaleString()}</td>
              <td><strong style="color:#059669;">${item.ach}</strong></td>
              <td>${item.toAch}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    els.kpiTableContainer.innerHTML = html;
  }

  // =========================================================================
  // Category Wise Date Rendering
  // =========================================================================
  function renderCategoryTab() {
    if (typeof CATEGORY_DATE_DATA === 'undefined') return;

    if (els.catDateSelect && els.catDateSelect.children.length <= 1) {
      CATEGORY_DATE_DATA.dates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        els.catDateSelect.appendChild(opt);
      });
    }

    if (els.catCategorySelect && els.catCategorySelect.children.length <= 1) {
      CATEGORY_DATE_DATA.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        els.catCategorySelect.appendChild(opt);
      });
    }

    let records = CATEGORY_DATE_DATA.records;
    if (state.catDateFilter !== 'all') records = records.filter(r => r.date === state.catDateFilter);
    if (state.catCategoryFilter !== 'all') records = records.filter(r => r.category === state.catCategoryFilter);
    if (state.catSearch) {
      records = records.filter(r => 
        r.category.toLowerCase().includes(state.catSearch) || 
        r.date.toLowerCase().includes(state.catSearch)
      );
    }

    const totalArticles = records.reduce((acc, r) => acc + r.count, 0);

    if (els.catStatsCardsGrid) {
      els.catStatsCardsGrid.innerHTML = `
        <div class="simple-stat">
          <div class="stat-lbl">Total Articles</div>
          <div class="stat-num">${totalArticles.toLocaleString()}</div>
          <div class="stat-sub">For current selection</div>
        </div>
        <div class="simple-stat">
          <div class="stat-lbl">Active Records</div>
          <div class="stat-num">${records.length.toLocaleString()}</div>
          <div class="stat-sub">Date & category pairs</div>
        </div>
      `;
    }

    if (els.catTableBody) {
      const display = records.slice(0, 300);
      let rows = display.map(r => `
        <tr>
          <td>${r.date}</td>
          <td><strong>${r.category}</strong></td>
          <td><strong style="color:#2563eb;">${r.count}</strong> articles</td>
        </tr>
      `).join('');

      if (records.length > 300) {
        rows += `<tr><td colspan="3" style="text-align:center; color:#6b7280; font-size:0.8rem;">Showing first 300 of ${records.length} records. Filter above to narrow results.</td></tr>`;
      }

      els.catTableBody.innerHTML = rows || `<tr><td colspan="3" style="text-align:center; color:#9ca3af;">No records found.</td></tr>`;
    }
  }

  function exportCategoryCSV() {
    if (typeof CATEGORY_DATE_DATA === 'undefined') return;
    let records = CATEGORY_DATE_DATA.records;
    if (state.catDateFilter !== 'all') records = records.filter(r => r.date === state.catDateFilter);
    if (state.catCategoryFilter !== 'all') records = records.filter(r => r.category === state.catCategoryFilter);

    let csv = ['Date,Category Name,Articles Count'];
    records.forEach(r => csv.push(`"${r.date}","${r.category}",${r.count}`));
    downloadCSV(csv.join('\n'), 'Category_Wise_Date.csv');
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
    renderCategoryTab();
  }

  function init() {
    initAuth();
    initLiveHeader();
    initNavigation();
    if (state.isAuthenticated) renderApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
