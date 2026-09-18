/**
 * app.js - Content Team Portal Orchestrator
 * 
 * Password: 7730
 * Roster: Q4 2026 (Oct 1 - Dec 31, 2026)
 * Productivity: Sheets 1, 2, 3
 * Category Analytics: Category Wise Date (derived from Category Wise AMJ)
 */

(function() {
  'use strict';

  // State Management
  const state = {
    isAuthenticated: false,
    enteredPin: '',
    correctPin: '7730',
    activeNavTab: 'roster', // 'roster' | 'productivity' | 'category'
    activeProdSubTab: 'daily', // 'daily' | 'weekly' | 'monthly' | 'kpi'
    selectedWeekId: 1,
    rosterViewMode: 'cards', // 'cards' | 'matrix'
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
    lastSyncText: document.getElementById('lastSyncText'),
    currentTime: document.getElementById('currentTime'),
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    rosterSection: document.getElementById('rosterSection'),
    productivitySection: document.getElementById('productivitySection'),
    categorySection: document.getElementById('categorySection'),
    activeDutyBanner: document.getElementById('activeDutyBanner'),
    weekCardsContainer: document.getElementById('weekCardsContainer'),
    masterMatrixContainer: document.getElementById('masterMatrixContainer'),
    weekSelect: document.getElementById('weekSelect'),
    teamFilter: document.getElementById('teamFilter'),
    rosterSearchInput: document.getElementById('rosterSearchInput'),
    viewModeBtns: document.querySelectorAll('.mode-btn'),
    prodSubnavBtns: document.querySelectorAll('.subnav-btn'),
    prodTabContents: document.querySelectorAll('.prod-subtab-content'),
    prodSearchInput: document.getElementById('prodSearchInput'),
    btnExportRoster: document.getElementById('btnExportRoster'),
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
    const savedAuth = sessionStorage.getItem('content_portal_auth');
    if (savedAuth === state.correctPin) {
      unlockApp();
    } else {
      showLockScreen();
    }

    // Keypad buttons
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

    // Keyboard support
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

    if (state.enteredPin.length === 4) {
      verifyPin();
    }
  }

  function popPin() {
    if (state.enteredPin.length > 0) {
      state.enteredPin = state.enteredPin.slice(0, -1);
      updatePinDots();
      clearFeedback();
    }
  }

  function clearPin() {
    state.enteredPin = '';
    updatePinDots();
    clearFeedback();
  }

  function updatePinDots() {
    els.pinDots.forEach((dot, idx) => {
      if (idx < state.enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function verifyPin() {
    if (state.enteredPin === state.correctPin) {
      sessionStorage.setItem('content_portal_auth', state.correctPin);
      clearFeedback();
      unlockApp();
    } else {
      const lockCard = document.querySelector('.lock-card');
      if (lockCard) {
        lockCard.classList.add('shake');
        setTimeout(() => lockCard.classList.remove('shake'), 500);
      }
      if (els.lockFeedback) {
        els.lockFeedback.textContent = 'Incorrect passcode. Try again.';
      }
      setTimeout(() => {
        clearPin();
      }, 600);
    }
  }

  function clearFeedback() {
    if (els.lockFeedback) els.lockFeedback.textContent = '';
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
  // Live Header & Synchronization
  // =========================================================================
  function initLiveHeader() {
    function updateClock() {
      const now = new Date();
      if (els.currentTime) {
        els.currentTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    setInterval(updateClock, 1000);
    updateClock();

    if (typeof sheetsClient !== 'undefined') {
      sheetsClient.onCountdown((formatted) => {
        if (els.syncCountdown) {
          els.syncCountdown.textContent = formatted;
        }
      });

      sheetsClient.onUpdate((data, syncTime) => {
        state.sheetsData = data;
        state.lastSyncTime = syncTime;
        if (els.lastSyncText) {
          els.lastSyncText.textContent = `Synced ${syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        if (state.isAuthenticated && state.activeNavTab === 'productivity') {
          renderProductivity();
        }
      });

      if (els.btnSync) {
        els.btnSync.addEventListener('click', async () => {
          els.btnSync.classList.add('spinning');
          await sheetsClient.refreshData();
          setTimeout(() => els.btnSync.classList.remove('spinning'), 600);
        });
      }

      sheetsClient.startPolling();
    }
  }

  // =========================================================================
  // Main Navigation & View Switching
  // =========================================================================
  function initNavigation() {
    els.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchNavTab(tab);
      });
    });

    els.prodSubnavBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.dataset.subtab;
        switchProdSubtab(subtab);
      });
    });

    els.viewModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        els.viewModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.rosterViewMode = btn.dataset.mode;
        renderRosterView();
      });
    });

    if (els.weekSelect) {
      els.weekSelect.addEventListener('change', (e) => {
        state.selectedWeekId = parseInt(e.target.value, 10);
        renderActiveDutyBanner();
        renderRosterView();
      });
    }

    if (els.teamFilter) {
      els.teamFilter.addEventListener('change', (e) => {
        state.rosterTeamFilter = e.target.value;
        renderRosterView();
      });
    }

    if (els.rosterSearchInput) {
      els.rosterSearchInput.addEventListener('input', (e) => {
        state.rosterSearch = e.target.value.toLowerCase().trim();
        renderRosterView();
      });
    }

    if (els.prodSearchInput) {
      els.prodSearchInput.addEventListener('input', (e) => {
        state.prodSearch = e.target.value.toLowerCase().trim();
        renderProductivity();
      });
    }

    if (els.btnExportRoster) {
      els.btnExportRoster.addEventListener('click', exportRosterCSV);
    }

    // Category Wise Date filters
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

    if (tab === 'roster') {
      els.rosterSection.style.display = 'block';
      els.productivitySection.style.display = 'none';
      els.categorySection.style.display = 'none';
      renderRoster();
    } else if (tab === 'productivity') {
      els.rosterSection.style.display = 'none';
      els.productivitySection.style.display = 'block';
      els.categorySection.style.display = 'none';
      renderProductivity();
    } else if (tab === 'category') {
      els.rosterSection.style.display = 'none';
      els.productivitySection.style.display = 'none';
      els.categorySection.style.display = 'block';
      renderCategoryTab();
    }
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
  // Roster Rendering Logic
  // =========================================================================
  function renderRoster() {
    renderActiveDutyBanner();
    populateWeekSelect();
    renderRosterView();
    renderMentorsAndPrep();
  }

  function populateWeekSelect() {
    if (!els.weekSelect || els.weekSelect.children.length > 1) return;
    els.weekSelect.innerHTML = '';
    ROSTER_CONFIG.weeks.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = `${w.name} (${w.dateRange}) - ${w.teamATheme === 'News' ? 'Team A: News' : 'Team B: News'}`;
      if (w.id === state.selectedWeekId) opt.selected = true;
      els.weekSelect.appendChild(opt);
    });
  }

  function renderActiveDutyBanner() {
    if (!els.activeDutyBanner) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];
    const newsTeam = week.teamATheme === 'News' ? 'Team A' : 'Team B';
    const contentTeam = week.teamATheme === 'Content' ? 'Team A' : 'Team B';
    const nightLead = week.nightUpdate ? week.nightUpdate.member : 'TBD';

    els.activeDutyBanner.innerHTML = `
      <div class="duty-lead">
        <div class="duty-badge-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div class="duty-text">
          <h3>${week.name}: ${week.dateRange} <span class="quarter-badge">Selected Week</span></h3>
          <p>Rotating Content & News operations schedule</p>
        </div>
      </div>
      <div class="duty-highlights">
        <div class="duty-pill news-pill">
          <span>📰 <strong>${newsTeam}</strong> on News Duty</span>
        </div>
        <div class="duty-pill night-pill">
          <span>🌙 <strong>${nightLead}</strong> (${newsTeam}) on Night Updates</span>
        </div>
        <div class="duty-pill content-pill">
          <span>✍️ <strong>${contentTeam}</strong> on Optimization & Pages</span>
        </div>
      </div>
    `;
  }

  function renderRosterView() {
    if (state.rosterViewMode === 'cards') {
      if (els.weekCardsContainer) els.weekCardsContainer.style.display = 'grid';
      if (els.masterMatrixContainer) els.masterMatrixContainer.style.display = 'none';
      renderWeekCards();
    } else {
      if (els.weekCardsContainer) els.weekCardsContainer.style.display = 'none';
      if (els.masterMatrixContainer) els.masterMatrixContainer.style.display = 'block';
      renderMasterMatrix();
    }
  }

  function getTaskBadgeHTML(task, isNight) {
    let cls = 'news';
    let label = task;
    let icon = '';

    if (task.includes('News') || task.includes('Event')) {
      cls = 'news';
      icon = '📰 ';
    } else if (task.includes('SEO')) {
      cls = 'seo';
      icon = '⚡ ';
    } else if (task.includes('High Intent')) {
      cls = 'intent';
      icon = '🎯 ';
    } else if (task.includes('Child Pages')) {
      cls = 'child';
      icon = '📄 ';
    } else if (task.includes('Upcoming')) {
      cls = 'upcoming';
      icon = '⏳ ';
    }

    let nightBadge = '';
    if (isNight) {
      nightBadge = `<span class="night-indicator" title="Assigned Night Updates Leader">🌙</span>`;
    }

    return `<span class="task-badge ${cls}">${icon}${label}</span> ${nightBadge}`;
  }

  function renderWeekCards() {
    if (!els.weekCardsContainer) return;

    let weeksToShow = ROSTER_CONFIG.weeks;
    if (state.selectedWeekId) {
      const single = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId);
      if (single) weeksToShow = [single];
    }

    let html = '';
    weeksToShow.forEach(w => {
      const isCur = w.id === state.selectedWeekId;
      const teamAMembers = ROSTER_CONFIG.teams.teamA.members;
      const teamBMembers = ROSTER_CONFIG.teams.teamB.members;

      html += `
        <div class="week-card ${isCur ? 'current-week' : ''}" id="weekCard-${w.id}">
          <div class="week-card-header">
            <div class="week-card-title">
              <h4>${w.name}</h4>
              <span>${w.dateRange}</span>
            </div>
            <div>
              <span class="quarter-badge" style="background:#e0e7ff; color:#4338ca; font-weight:700;">
                ${w.teamATheme === 'News' ? 'Team A: News' : 'Team B: News'}
              </span>
            </div>
          </div>

          <div class="team-split-view">
            <!-- Team A Column -->
            <div class="team-column" style="${state.rosterTeamFilter === 'teamB' ? 'display:none;' : ''}">
              <div class="team-column-header">
                <span class="team-name-tag team-a">TEAM A</span>
                <span class="theme-pill ${w.teamATheme.toLowerCase()}">${w.teamATheme}</span>
              </div>
              <div class="member-task-list">
                ${teamAMembers.map(m => {
                  const assign = w.assignments[m] || { task: 'Unassigned', nightUpdate: false };
                  if (state.rosterSearch && !m.toLowerCase().includes(state.rosterSearch)) return '';
                  return `
                    <div class="member-task-item">
                      <span class="member-name">${m}</span>
                      <div>${getTaskBadgeHTML(assign.task, assign.nightUpdate)}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Team B Column -->
            <div class="team-column" style="${state.rosterTeamFilter === 'teamA' ? 'display:none;' : ''}">
              <div class="team-column-header">
                <span class="team-name-tag team-b">TEAM B</span>
                <span class="theme-pill ${w.teamBTheme.toLowerCase()}">${w.teamBTheme}</span>
              </div>
              <div class="member-task-list">
                ${teamBMembers.map(m => {
                  const assign = w.assignments[m] || { task: 'Unassigned', nightUpdate: false };
                  if (state.rosterSearch && !m.toLowerCase().includes(state.rosterSearch)) return '';
                  return `
                    <div class="member-task-item">
                      <span class="member-name">
                        ${m === 'Trishala' ? '<strong>Trishala</strong> <small style="color:#059669;">(New)</small>' : m}
                      </span>
                      <div>${getTaskBadgeHTML(assign.task, assign.nightUpdate)}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Upcoming Drafts Archana -->
          <div style="background:#faf5ff; border:1px solid #f3e8ff; border-radius:8px; padding:0.65rem 0.85rem; display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:0.8rem; font-weight:700; color:#7e22ce;">Archana (Upcoming Lead)</span>
            <div>${getTaskBadgeHTML(w.assignments['Archana'].task, false)}</div>
          </div>
        </div>
      `;
    });

    els.weekCardsContainer.innerHTML = html;
  }

  function renderMasterMatrix() {
    if (!els.masterMatrixContainer) return;

    const allMembers = [
      ...ROSTER_CONFIG.teams.teamA.members.map(m => ({ name: m, team: 'Team A' })),
      ...ROSTER_CONFIG.teams.teamB.members.map(m => ({ name: m, team: 'Team B' })),
      { name: 'Archana', team: 'Upcoming' }
    ];

    let filtered = allMembers;
    if (state.rosterTeamFilter === 'teamA') {
      filtered = allMembers.filter(m => m.team === 'Team A');
    } else if (state.rosterTeamFilter === 'teamB') {
      filtered = allMembers.filter(m => m.team === 'Team B');
    }
    if (state.rosterSearch) {
      filtered = filtered.filter(m => m.name.toLowerCase().includes(state.rosterSearch));
    }

    let tableHtml = `
      <div class="master-table-container">
        <div class="table-header-tools">
          <div class="table-title">
            <h3>Q4 2026 Master Quarterly Roster Grid (Oct 1 - Dec 31, 2026)</h3>
            <p>13-Week rotation matrix with guaranteed non-consecutive task assignments</p>
          </div>
          <button class="btn-icon" id="btnMatrixDownload">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Matrix CSV
          </button>
        </div>
        <div class="table-responsive">
          <table class="master-table">
            <thead>
              <tr>
                <th style="min-width:140px;">Team Member</th>
                <th>Team</th>
                ${ROSTER_CONFIG.weeks.map(w => `
                  <th style="min-width:140px; text-align:center;">
                    <div>${w.name}</div>
                    <small style="font-weight:normal; color:#64748b; font-size:0.68rem;">${w.dateRange}</small>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${filtered.map(m => `
                <tr>
                  <td class="member-cell">
                    ${m.name === 'Trishala' ? '<strong>Trishala</strong> <span style="color:#059669; font-size:0.7rem;">(New)</span>' : m.name}
                  </td>
                  <td>
                    <span class="quarter-badge" style="${m.team === 'Team A' ? 'background:#e0e7ff; color:#4338ca;' : m.team === 'Team B' ? 'background:#e0f2fe; color:#0369a1;' : 'background:#fae8ff; color:#86198f;'}">
                      ${m.team}
                    </span>
                  </td>
                  ${ROSTER_CONFIG.weeks.map(w => {
                    const assign = w.assignments[m.name] || { task: '-', nightUpdate: false };
                    return `<td style="text-align:center;">${getTaskBadgeHTML(assign.task, assign.nightUpdate)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    els.masterMatrixContainer.innerHTML = tableHtml;

    const btnMatrix = document.getElementById('btnMatrixDownload');
    if (btnMatrix) {
      btnMatrix.addEventListener('click', exportRosterCSV);
    }
  }

  function renderMentorsAndPrep() {
    const mentorsGrid = document.getElementById('mentorsGrid');
    const prepGrid = document.getElementById('prepGrid');

    if (mentorsGrid) {
      mentorsGrid.innerHTML = ROSTER_CONFIG.categoryMentors.map(c => `
        <div class="directory-item">
          <div class="owner-name">${c.mentor}</div>
          <div class="owner-category">${c.category}</div>
        </div>
      `).join('');
    }

    if (prepGrid) {
      prepGrid.innerHTML = ROSTER_CONFIG.prepTeamAssignments.map(p => `
        <div class="directory-item">
          <div class="owner-name">${p.member}</div>
          <div class="owner-category" style="color:#059669;">${p.domain}</div>
        </div>
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
        const a = w.assignments[m.name];
        let val = a ? a.task : '';
        if (a && a.nightUpdate) val += ' [Night Updates]';
        row.push(`"${val}"`);
      });
      csv.push(row.join(','));
    });

    downloadCSV(csv.join('\n'), 'Q4_2026_Content_Roster.csv');
  }

  // =========================================================================
  // Productivity Rendering Logic (Sheets 1, 2, 3)
  // =========================================================================
  function renderProductivity() {
    const data = state.sheetsData || (typeof BASELINE_SHEETS_DATA !== 'undefined' ? BASELINE_SHEETS_DATA : null);
    if (!data) return;

    renderKPIStatsHeader(data);

    if (state.activeProdSubTab === 'daily') {
      renderDailyTab(data);
    } else if (state.activeProdSubTab === 'weekly') {
      renderWeeklyTab(data);
    } else if (state.activeProdSubTab === 'monthly') {
      renderMonthlyTab(data);
    } else if (state.activeProdSubTab === 'kpi') {
      renderKPITab(data);
    }
  }

  function sumMetric(summaryObj) {
    if (!summaryObj) return 0;
    return Object.values(summaryObj).reduce((acc, val) => {
      const n = parseFloat(String(val).replace(/,/g, '')) || 0;
      return acc + n;
    }, 0);
  }

  function renderKPIStatsHeader(data) {
    const pubToday = sumMetric(data.sheet1_published.summary['Today']);
    const wordToday = sumMetric(data.sheet2_wordcount.summary['Today']);
    const pickToday = sumMetric(data.sheet3_picked.summary['Today']);
    const pubYest = sumMetric(data.sheet1_published.summary['Yesterday']);
    const wordYest = sumMetric(data.sheet2_wordcount.summary['Yesterday']);

    const grid = document.getElementById('statsCardsGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Published Today</span>
          <div class="stat-icon" style="background:#ede9fe; color:#6366f1;">📰</div>
        </div>
        <div class="stat-value">${pubToday.toLocaleString()}</div>
        <div class="stat-subtext">Yesterday: <strong>${pubYest.toLocaleString()}</strong> articles</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Words Written Today</span>
          <div class="stat-icon" style="background:#e0f2fe; color:#0284c7;">✍️</div>
        </div>
        <div class="stat-value">${wordToday.toLocaleString()}</div>
        <div class="stat-subtext">Yesterday: <strong>${wordYest.toLocaleString()}</strong> words</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Articles Picked Today</span>
          <div class="stat-icon" style="background:#dcfce7; color:#10b981;">📌</div>
        </div>
        <div class="stat-value">${pickToday.toLocaleString()}</div>
        <div class="stat-subtext">Active team pipeline tasks</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-top">
          <span class="stat-label">Total Word Output (Till Now)</span>
          <div class="stat-icon" style="background:#fef3c7; color:#d97706;">🏆</div>
        </div>
        <div class="stat-value">${sumMetric(data.sheet2_wordcount.summary['Till Now']).toLocaleString()}</div>
        <div class="stat-subtext">Cumulative words across writers</div>
      </div>
    `;
  }

  function renderDailyTab(data) {
    const container = document.getElementById('dailyTableContainer');
    if (!container) return;

    const writers = data.sheet1_published.headers;
    let filteredWriters = writers;
    if (state.prodSearch) {
      filteredWriters = filteredWriters.filter(w => w.toLowerCase().includes(state.prodSearch));
    }

    const pubToday = data.sheet1_published.summary['Today'] || {};
    const wordToday = data.sheet2_wordcount.summary['Today'] || {};
    const pickToday = data.sheet3_picked.summary['Today'] || {};
    const pubYest = data.sheet1_published.summary['Yesterday'] || {};
    const wordYest = data.sheet2_wordcount.summary['Yesterday'] || {};

    let html = `
      <div class="master-table-container">
        <div class="table-header-tools">
          <div class="table-title">
            <h3>Daily Writer Productivity Table</h3>
            <p>Today vs Yesterday output per writer (Sheet 1, 2, 3)</p>
          </div>
          <span class="quarter-badge" style="background:#e0e7ff; color:#4338ca;">Active Writers: ${filteredWriters.length}</span>
        </div>
        <div class="table-responsive">
          <table class="master-table">
            <thead>
              <tr>
                <th>Writer Name</th>
                <th>Published Today</th>
                <th>Words Today</th>
                <th>Picked Today</th>
                <th>Published Yest.</th>
                <th>Words Yest.</th>
                <th>Daily Velocity</th>
              </tr>
            </thead>
            <tbody>
              ${filteredWriters.map(w => {
                const pt = parseInt(pubToday[w] || '0', 10);
                const wt = parseInt(wordToday[w] || '0', 10);
                const pkt = parseInt(pickToday[w] || '0', 10);
                const py = parseInt(pubYest[w] || '0', 10);
                const wy = parseInt(wordYest[w] || '0', 10);
                const diffWords = wt - wy;
                const diffBadge = diffWords >= 0 
                  ? `<span style="color:#059669; font-weight:600;">+${diffWords.toLocaleString()}</span>`
                  : `<span style="color:#e11d48; font-weight:600;">${diffWords.toLocaleString()}</span>`;

                return `
                  <tr>
                    <td class="member-cell">
                      ${w === 'Trishala' ? '<strong>Trishala</strong> <span style="color:#059669; font-size:0.7rem;">(New)</span>' : w}
                    </td>
                    <td><strong style="color:#4f46e5;">${pt}</strong></td>
                    <td><strong>${wt.toLocaleString()}</strong></td>
                    <td><span class="task-badge child" style="font-size:0.75rem;">${pkt}</span></td>
                    <td>${py}</td>
                    <td>${wy.toLocaleString()}</td>
                    <td>${diffBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderWeeklyTab(data) {
    const container = document.getElementById('weeklyTableContainer');
    if (!container) return;

    const writers = data.sheet1_published.headers;
    let filteredWriters = writers;
    if (state.prodSearch) {
      filteredWriters = filteredWriters.filter(w => w.toLowerCase().includes(state.prodSearch));
    }

    const s1 = data.sheet1_published.summary;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;

    let html = `
      <div class="master-table-container">
        <div class="table-header-tools">
          <div class="table-title">
            <h3>Weekly Team Output & Trends</h3>
            <p>Last 7 Days vs Previous 7 Days vs Last 14 Days metrics</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="master-table">
            <thead>
              <tr>
                <th>Writer Name</th>
                <th>Words (Last 7D)</th>
                <th>Words (Prev 7D)</th>
                <th>WoW Change</th>
                <th>Articles Pub (Last 7D)</th>
                <th>Articles Pub (Last 14D)</th>
                <th>Picked (Last 7D)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredWriters.map(w => {
                const w7 = parseInt(s2['Last 7 Days']?.[w] || '0', 10);
                const wp7 = parseInt(s2['Previous 7 days']?.[w] || '0', 10);
                const a7 = parseInt(s1['Last 7 Days']?.[w] || '0', 10);
                const a14 = parseInt(s1['Last 14 Days']?.[w] || '0', 10);
                const p7 = parseInt(s3['Last 7 Days']?.[w] || '0', 10);

                const change = wp7 > 0 ? (((w7 - wp7) / wp7) * 100).toFixed(1) : '+100';
                const isPos = parseFloat(change) >= 0;

                return `
                  <tr>
                    <td class="member-cell">${w}</td>
                    <td><strong style="color:#4f46e5;">${w7.toLocaleString()}</strong></td>
                    <td>${wp7.toLocaleString()}</td>
                    <td>
                      <span class="quarter-badge" style="${isPos ? 'background:#dcfce7; color:#15803d;' : 'background:#fee2e2; color:#b91c1c;'}">
                        ${isPos ? '▲ +' : '▼ '}${change}%
                      </span>
                    </td>
                    <td>${a7}</td>
                    <td>${a14}</td>
                    <td>${p7}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderMonthlyTab(data) {
    const container = document.getElementById('monthlyTableContainer');
    if (!container) return;

    const writers = data.sheet1_published.headers;
    let filteredWriters = writers;
    if (state.prodSearch) {
      filteredWriters = filteredWriters.filter(w => w.toLowerCase().includes(state.prodSearch));
    }

    const s2 = data.sheet2_wordcount.summary;
    const months = ['April', 'May', 'June', 'July', 'August', 'September'];

    let html = `
      <div class="master-table-container">
        <div class="table-header-tools">
          <div class="table-title">
            <h3>Monthly Word Count Performance</h3>
            <p>Historical monthly volumes from April to September 2026</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="master-table">
            <thead>
              <tr>
                <th>Writer Name</th>
                ${months.map(m => `<th>${m}</th>`).join('')}
                <th>Till Now Total</th>
                <th>Monthly Average</th>
              </tr>
            </thead>
            <tbody>
              ${filteredWriters.map(w => {
                const tillNow = parseInt(s2['Till Now']?.[w] || '0', 10);
                const avg = parseInt(s2['Average']?.[w] || '0', 10);

                return `
                  <tr>
                    <td class="member-cell">${w}</td>
                    ${months.map(m => {
                      const val = parseInt(s2[m]?.[w] || '0', 10);
                      return `<td>${val > 0 ? val.toLocaleString() : '-'}</td>`;
                    }).join('')}
                    <td><strong style="color:#4f46e5;">${tillNow.toLocaleString()}</strong></td>
                    <td>${avg > 0 ? avg.toLocaleString() : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderKPITab(data) {
    const container = document.getElementById('kpiTableContainer');
    if (!container) return;

    const writers = data.sheet1_published.headers;
    const s2 = data.sheet2_wordcount.summary;
    const s3 = data.sheet3_picked.summary;

    const leaderboard = writers.map(w => {
      const kpi = parseInt(s2['KPI']?.[w] || '396000', 10);
      const achievedStr = s2['Achieved Percentage']?.[w] || '0%';
      const achNum = parseFloat(achievedStr.replace('%', '')) || 0;
      const tillNow = parseInt(s2['Till Now']?.[w] || '0', 10);
      const jasKpi = parseInt(s3['JAS KPI']?.[w] || '396', 10);
      const jasAchStr = s3['Achieved Percentage']?.[w] || '0%';
      const toAchieve = s3['To be Achieved']?.[w] || '0';

      return {
        name: w,
        kpi,
        achievedPct: achNum,
        achievedStr,
        tillNow,
        jasKpi,
        jasAchStr,
        toAchieve
      };
    }).sort((a, b) => b.achievedPct - a.achievedPct);

    let filteredLeaderboard = leaderboard;
    if (state.prodSearch) {
      filteredLeaderboard = filteredLeaderboard.filter(l => l.name.toLowerCase().includes(state.prodSearch));
    }

    let html = `
      <div class="master-table-container">
        <div class="table-header-tools">
          <div class="table-title">
            <h3>Quarterly KPI Leaderboard & Progress</h3>
            <p>Word Count Targets (396,000) & Articles Targets with Achievement Percentages</p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="master-table">
            <thead>
              <tr>
                <th style="width:60px;">Rank</th>
                <th>Writer Name</th>
                <th>Word KPI Target</th>
                <th>Achieved Words</th>
                <th>Word KPI %</th>
                <th style="min-width:160px;">Progress Bar</th>
                <th>JAS Article KPI</th>
                <th>Article Achieved %</th>
                <th>Articles Deficit</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLeaderboard.map((item, idx) => {
                let medal = idx + 1;
                let rankClass = '';
                if (idx === 0) { medal = '🥇 1'; rankClass = 'rank-1'; }
                else if (idx === 1) { medal = '🥈 2'; rankClass = 'rank-2'; }
                else if (idx === 2) { medal = '🥉 3'; rankClass = 'rank-3'; }

                const barWidth = Math.min(100, Math.max(0, item.achievedPct));
                const barColor = item.achievedPct >= 100 ? '#10b981' : item.achievedPct >= 70 ? '#4f46e5' : '#f59e0b';

                return `
                  <tr>
                    <td><span class="rank-badge ${rankClass}">${medal}</span></td>
                    <td class="member-cell">
                      ${item.name === 'Trishala' ? '<strong>Trishala</strong> <span style="color:#059669; font-size:0.7rem;">(New)</span>' : item.name}
                    </td>
                    <td>${item.kpi.toLocaleString()}</td>
                    <td><strong>${item.tillNow.toLocaleString()}</strong></td>
                    <td>
                      <strong style="color:${barColor};">${item.achievedStr}</strong>
                    </td>
                    <td>
                      <div class="kpi-progress-bar-wrap">
                        <div class="kpi-progress-bar" style="width:${barWidth}%; background:${barColor};"></div>
                      </div>
                    </td>
                    <td>${item.jasKpi}</td>
                    <td><strong>${item.jasAchStr}</strong></td>
                    <td>${item.toAchieve}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // =========================================================================
  // Category Wise Date Rendering Logic
  // =========================================================================
  function renderCategoryTab() {
    if (typeof CATEGORY_DATE_DATA === 'undefined') return;

    // Populate selects once
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

    // Filter records
    let records = CATEGORY_DATE_DATA.records;
    if (state.catDateFilter !== 'all') {
      records = records.filter(r => r.date === state.catDateFilter);
    }
    if (state.catCategoryFilter !== 'all') {
      records = records.filter(r => r.category === state.catCategoryFilter);
    }
    if (state.catSearch) {
      records = records.filter(r => 
        r.category.toLowerCase().includes(state.catSearch) || 
        r.date.toLowerCase().includes(state.catSearch)
      );
    }

    // Summary calculations
    const totalRecords = records.length;
    const totalArticles = records.reduce((acc, r) => acc + r.count, 0);
    const avgPerRecord = totalRecords > 0 ? (totalArticles / totalRecords).toFixed(1) : 0;

    // Find top category
    const catTotals = {};
    records.forEach(r => {
      catTotals[r.category] = (catTotals[r.category] || 0) + r.count;
    });
    let topCat = '-';
    let topCatCount = 0;
    Object.entries(catTotals).forEach(([c, cnt]) => {
      if (cnt > topCatCount) {
        topCatCount = cnt;
        topCat = c;
      }
    });

    if (els.catStatsCardsGrid) {
      els.catStatsCardsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-label">Total Articles</span>
            <div class="stat-icon" style="background:#ede9fe; color:#6366f1;">📑</div>
          </div>
          <div class="stat-value">${totalArticles.toLocaleString()}</div>
          <div class="stat-subtext">Across active category entries</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-label">Top Category</span>
            <div class="stat-icon" style="background:#fef3c7; color:#d97706;">🥇</div>
          </div>
          <div class="stat-value" style="font-size:1.4rem;">${topCat}</div>
          <div class="stat-subtext"><strong>${topCatCount.toLocaleString()}</strong> articles published</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-label">Active Records</span>
            <div class="stat-icon" style="background:#e0f2fe; color:#0284c7;">📅</div>
          </div>
          <div class="stat-value">${totalRecords.toLocaleString()}</div>
          <div class="stat-subtext">Date & category pairs</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-top">
            <span class="stat-label">Avg Output / Category</span>
            <div class="stat-icon" style="background:#dcfce7; color:#10b981;">📈</div>
          </div>
          <div class="stat-value">${avgPerRecord}</div>
          <div class="stat-subtext">Articles per date-category item</div>
        </div>
      `;
    }

    // Render table rows (showing up to 500 for high performance, with instant render)
    if (els.catTableBody) {
      const maxDisplay = 400;
      const displayRecords = records.slice(0, maxDisplay);
      const maxCount = Math.max(...records.map(r => r.count), 1);

      let rowsHtml = displayRecords.map(r => {
        const pct = Math.min(100, Math.round((r.count / maxCount) * 100));
        return `
          <tr>
            <td style="font-family:var(--font-mono); font-weight:600; color:#334155;">${r.date}</td>
            <td class="member-cell">
              <span class="task-badge intent" style="font-weight:700;">${r.category}</span>
            </td>
            <td><strong style="color:#4f46e5; font-size:1rem;">${r.count}</strong> articles</td>
            <td style="min-width:180px;">
              <div class="kpi-progress-bar-wrap" style="height:6px;">
                <div class="kpi-progress-bar" style="width:${pct}%; background:#4f46e5;"></div>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (records.length > maxDisplay) {
        rowsHtml += `
          <tr>
            <td colspan="4" style="text-align:center; color:#64748b; padding:1rem; font-style:italic;">
              Showing first ${maxDisplay} of ${records.length} records. Filter by date or category to inspect specific records.
            </td>
          </tr>
        `;
      }

      els.catTableBody.innerHTML = rowsHtml || `
        <tr>
          <td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8;">
            No category records matching your current filter.
          </td>
        </tr>
      `;
    }
  }

  function exportCategoryCSV() {
    if (typeof CATEGORY_DATE_DATA === 'undefined') return;
    let records = CATEGORY_DATE_DATA.records;
    if (state.catDateFilter !== 'all') {
      records = records.filter(r => r.date === state.catDateFilter);
    }
    if (state.catCategoryFilter !== 'all') {
      records = records.filter(r => r.category === state.catCategoryFilter);
    }

    let csv = ['Date,Category Name,Articles Count'];
    records.forEach(r => {
      csv.push(`"${r.date}","${r.category}",${r.count}`);
    });

    downloadCSV(csv.join('\n'), 'Category_Wise_Date.csv');
  }

  function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    if (state.isAuthenticated) {
      renderApp();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
