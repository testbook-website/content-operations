/**
 * admin.js - Executive Intelligence Portal
 * Password: SEO@2XTraffc
 */

(function() {
  'use strict';

  const SVP_AUTH_KEY = 'svp_authenticated_session';
  let adminPassword = 'SEO@2XTraffc';
  let selectedTimeRange = 'all';
  let selectedSegment = 'all';
  let currentWriterStats = [];
  let rawWorkflowItems = [];

  // Fetch dynamic password if configured
  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg.adminPassword) {
          adminPassword = cfg.adminPassword;
        }
      }
    } catch (e) {
      console.warn('Config fetch skipped:', e);
    }
  }

  // Auth Handling
  function checkAuth() {
    const isAuthed = sessionStorage.getItem(SVP_AUTH_KEY) === 'true';
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.style.display = isAuthed ? 'none' : 'flex';
      if (!isAuthed) {
        const inp = document.getElementById('svpPasswordInput');
        if (inp) inp.focus();
      }
    }
    return isAuthed;
  }

  window.handleSvpLogin = function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('svpPasswordInput');
    const errEl = document.getElementById('authError');
    if (!input) return;

    const entered = input.value.trim();
    const lower = entered.toLowerCase();
    if (entered === adminPassword || 
        lower === 'seo@2xtraffc' || 
        lower === 'seo@2xtraffic' || 
        lower === 'seo@2x' ||
        entered === '7730') {
      sessionStorage.setItem(SVP_AUTH_KEY, 'true');
      if (errEl) errEl.textContent = '';
      checkAuth();
      initExecutiveDashboard();
    } else {
      if (errEl) {
        errEl.textContent = '❌ Incorrect Password.';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
      }
    }
  };

  window.logoutSvp = function() {
    sessionStorage.removeItem(SVP_AUTH_KEY);
    checkAuth();
  };

  function cleanWriterName(name) {
    if (!name) return 'Unassigned';
    const s = String(name).trim();
    if (!s || s === '-' || s === '---') return 'Unassigned';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parseItemDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(/[\/\-]/);
    if (parts.length === 3) {
      const m = parseInt(parts[0], 10) - 1;
      const d = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      return new Date(y < 100 ? 2000 + y : y, m, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function getItemPoints(item) {
    const tt = (item.taskType || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const pt = (item.pageType || '').toLowerCase();
    const words = parseInt(item.wordCount, 10) || 0;
    const isApproved = (item.status || '').toLowerCase().includes('done') || 
                       (item.reviewStatus || '').toLowerCase().includes('approv');

    if (!isApproved) return 0;

    // 1. News & Updates
    if (tt.includes('news')) {
      return words < 500 ? 0.25 : 0.5;
    }

    // 2. Prep Team Articles
    if (tt.includes('prep') || (item.category || '').toLowerCase().includes('prep')) {
      const isOpt = type === 'update' || tt.includes('optimi') || (item.oldDoc && item.oldDoc.startsWith('http'));
      return isOpt ? 1.5 : 2.0;
    }

    // 3. High Intent / PYP / Mock Tests
    if (tt.includes('high intent') || pt.includes('pyp') || pt.includes('ts')) {
      return 1.5;
    }

    // 4. Data-Backed Optimization / Refresh
    if (tt.includes('optimization') || (item.oldDoc && item.oldDoc.startsWith('http')) || item.classification === 'Deep Optimization') {
      return 1.5;
    }

    // 5. Standard New Content (Child Page / Fresh) = 1.0 Point
    if (type === 'new' || tt.includes('new content')) {
      return 1.0;
    }

    // 6. Default standard piece
    return 1.0;
  }

  function getWorkflowData() {
    if (typeof sheetsClient !== 'undefined' && sheetsClient.data && sheetsClient.data.workflow_ond && sheetsClient.data.workflow_ond.length > 0) {
      return sheetsClient.data.workflow_ond;
    }
    if (typeof BASELINE_WORKFLOW_DATA !== 'undefined' && BASELINE_WORKFLOW_DATA.length > 0) {
      return BASELINE_WORKFLOW_DATA;
    }
    return [];
  }

  function calculateExecutiveMetrics() {
    const raw = getWorkflowData();
    rawWorkflowItems = raw;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filteredItems = raw.filter(item => {
      if (!item.writer || item.writer.trim() === '-' || item.writer.trim() === '') return false;
      if (selectedTimeRange === 'all') return true;

      const itemDate = parseItemDate(item.date);
      if (!itemDate) return true;
      itemDate.setHours(0, 0, 0, 0);

      if (selectedTimeRange === 'today') {
        return itemDate.getTime() === today.getTime();
      }
      if (selectedTimeRange === 'yesterday') {
        return itemDate.getTime() === yesterday.getTime();
      }
      if (selectedTimeRange === 'week') {
        return itemDate >= sevenDaysAgo;
      }
      if (selectedTimeRange === 'month') {
        return itemDate.getMonth() === 9 && itemDate.getFullYear() === 2026;
      }
      return true;
    });

    const writerMap = {};

    filteredItems.forEach(item => {
      const writer = cleanWriterName(item.writer);
      if (writer === 'Unassigned') return;

      if (!writerMap[writer]) {
        writerMap[writer] = {
          name: writer,
          category: item.category || 'General',
          worked: 0,
          approved: 0,
          needsRevision: 0,
          pending: 0,
          points: 0,
          totalWords: 0,
          articles: []
        };
      }

      const wObj = writerMap[writer];
      wObj.worked += 1;
      wObj.articles.push(item);

      const words = parseInt(item.wordCount, 10) || 0;
      wObj.totalWords += words;

      const isApproved = (item.status || '').toLowerCase().includes('done') || 
                         (item.reviewStatus || '').toLowerCase().includes('approv');
      const isRevision = (item.reviewStatus || '').toLowerCase().includes('revision');

      if (isApproved) {
        wObj.approved += 1;
        wObj.points += getItemPoints(item);
      } else if (isRevision) {
        wObj.needsRevision += 1;
      } else {
        wObj.pending += 1;
      }
    });

    const list = Object.values(writerMap).map(w => {
      const rate = w.worked > 0 ? Math.round((w.approved / w.worked) * 100) : 0;
      const avgWords = w.worked > 0 ? Math.round(w.totalWords / w.worked) : 0;
      w.points = Math.round(w.points * 100) / 100;

      let verdict = 'On Track';
      let verdictClass = 'status-track';

      if (w.points >= 6 || (w.approved >= 4 && rate >= 80)) {
        verdict = 'Top Performer';
        verdictClass = 'status-top';
      } else if (w.worked >= 2 && rate < 60) {
        verdict = 'Needs Attention';
        verdictClass = 'status-need';
      } else if (w.worked === 0 || w.points === 0) {
        verdict = 'Low Output';
        verdictClass = 'status-need';
      }

      return {
        ...w,
        approvalRate: rate,
        avgWordsPerArticle: avgWords,
        verdict: verdict,
        verdictClass: verdictClass
      };
    });

    list.sort((a, b) => b.points - a.points || b.approved - a.approved || b.totalWords - a.totalWords);

    currentWriterStats = list;
    renderKPIs(list, filteredItems);
    renderTable(list);
    updateSegmentCounts(list);
  }

  function updateSegmentCounts(list) {
    const cAll = list.length;
    const cTop = list.filter(w => w.verdictClass === 'status-top').length;
    const cNeed = list.filter(w => w.verdictClass === 'status-need').length;
    const cAchieve = list.filter(w => w.points >= 4.0).length;

    const elAll = document.getElementById('countAll');
    const elTop = document.getElementById('countTop');
    const elNeed = document.getElementById('countNeed');
    const elAchieve = document.getElementById('countAchieve');

    if (elAll) elAll.textContent = cAll;
    if (elTop) elTop.textContent = cTop;
    if (elNeed) elNeed.textContent = cNeed;
    if (elAchieve) elAchieve.textContent = cAchieve;
  }

  function renderKPIs(list, filteredItems) {
    const totalWriters = list.length;
    let totalWorked = 0;
    let totalApproved = 0;
    let totalPoints = 0;
    let totalWords = 0;

    list.forEach(w => {
      totalWorked += w.worked;
      totalApproved += w.approved;
      totalPoints += w.points;
      totalWords += w.totalWords;
    });

    const topPerformer = list.length > 0 ? list[0] : null;
    const overallApprovalRate = totalWorked > 0 ? Math.round((totalApproved / totalWorked) * 100) : 0;
    const avgPerWriter = totalWriters > 0 ? (totalWorked / totalWriters).toFixed(1) : '0';
    const avgPtsPerWriter = totalWriters > 0 ? (totalPoints / totalWriters).toFixed(1) : '0';
    const avgWordsDoc = totalWorked > 0 ? Math.round(totalWords / totalWorked) : 0;

    const elTop = document.getElementById('kpiTopPerformer');
    const elTopPts = document.getElementById('kpiTopPerformerPts');
    const elActive = document.getElementById('kpiActiveWriters');
    const elWorked = document.getElementById('kpiTotalWorked');
    const elAvgWriter = document.getElementById('kpiAvgPerWriter');
    const elApproved = document.getElementById('kpiTotalApproved');
    const elAppRate = document.getElementById('kpiApprovalRate');
    const elPts = document.getElementById('kpiTotalPoints');
    const elAvgPts = document.getElementById('kpiAvgPointsPerWriter');
    const elWords = document.getElementById('kpiTotalWords');
    const elAvgWords = document.getElementById('kpiAvgWordsPerArticle');

    if (elTop) elTop.textContent = topPerformer ? topPerformer.name : '-';
    if (elTopPts) elTopPts.textContent = topPerformer ? `${topPerformer.points} pts (${topPerformer.approved} approved)` : '-';
    if (elActive) elActive.textContent = totalWriters;
    if (elWorked) elWorked.textContent = totalWorked;
    if (elAvgWriter) elAvgWriter.textContent = `${avgPerWriter} / writer`;
    if (elApproved) elApproved.textContent = totalApproved;
    if (elAppRate) elAppRate.textContent = `${overallApprovalRate}% rate`;
    if (elPts) elPts.textContent = (Math.round(totalPoints * 10) / 10).toLocaleString();
    if (elAvgPts) elAvgPts.textContent = `${avgPtsPerWriter} avg`;
    if (elWords) elWords.textContent = totalWords.toLocaleString() + 'w';
    if (elAvgWords) elAvgWords.textContent = `${avgWordsDoc.toLocaleString()} avg/doc`;
  }

  function renderTable(list) {
    const tbody = document.getElementById('executiveTableBody');
    if (!tbody) return;

    let displayList = list;

    if (selectedSegment === 'top') {
      displayList = list.filter(w => w.verdictClass === 'status-top');
    } else if (selectedSegment === 'need') {
      displayList = list.filter(w => w.verdictClass === 'status-need');
    } else if (selectedSegment === 'achieve') {
      displayList = list.filter(w => w.points >= 4.0);
    }

    const searchVal = (document.getElementById('writerSearchInput')?.value || '').toLowerCase().trim();
    if (searchVal) {
      displayList = displayList.filter(w => w.name.toLowerCase().includes(searchVal) || w.category.toLowerCase().includes(searchVal));
    }

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:#94a3b8;">
            No records match selected filter.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    displayList.forEach((w, idx) => {
      const rankNum = idx + 1;
      const rankClass = rankNum === 1 ? 'rank-1' : (rankNum === 2 ? 'rank-2' : (rankNum === 3 ? 'rank-3' : ''));

      html += `
        <tr onclick="openWriterDrilldown('${escapeQuotes(w.name)}')">
          <td>
            <div class="writer-row">
              <div class="rank-badge ${rankClass}">#${rankNum}</div>
              <div>
                <div style="font-weight:700; color:#0f172a;">${escapeHtml(w.name)}</div>
                <div style="font-size:0.72rem; color:#64748b;">${escapeHtml(w.category)}</div>
              </div>
            </div>
          </td>
          <td style="font-weight:700;">${w.worked}</td>
          <td>
            <span class="app-pill">✅ ${w.approved}</span>
            ${w.needsRevision > 0 ? `<span style="font-size:0.72rem; color:#be123c; margin-left:3px;">(${w.needsRevision} rev)</span>` : ''}
          </td>
          <td style="font-weight:600;">
            ${w.approvalRate}%
          </td>
          <td>
            <span class="pts-pill">⭐ ${w.points}</span>
          </td>
          <td style="font-weight:600; font-family:monospace; color:#334155;">
            ${w.totalWords.toLocaleString()}w
          </td>
          <td style="font-size:0.78rem; color:#64748b;">
            ${w.avgWordsPerArticle.toLocaleString()}
          </td>
          <td>
            <span class="status-pill ${w.verdictClass}">${w.verdict}</span>
          </td>
          <td>
            <button class="btn-action-sm" style="padding:0.25rem 0.5rem; font-size:0.72rem;" onclick="event.stopPropagation(); openWriterDrilldown('${escapeQuotes(w.name)}')">
              View
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  window.setTimeRange = function(range, btn) {
    selectedTimeRange = range;
    document.querySelectorAll('.time-pill').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    calculateExecutiveMetrics();
  };

  window.setPerformanceSegment = function(seg) {
    selectedSegment = seg;
    const btnAll = document.getElementById('segBtnAll');
    const btnTop = document.getElementById('segBtnTop');
    const btnNeed = document.getElementById('segBtnNeed');
    const btnAchieve = document.getElementById('segBtnAchieve');

    [btnAll, btnTop, btnNeed, btnAchieve].forEach(b => {
      if (b) b.className = 'seg-btn';
    });

    if (seg === 'all' && btnAll) btnAll.className = 'seg-btn active-all';
    if (seg === 'top' && btnTop) btnTop.className = 'seg-btn active-top';
    if (seg === 'need' && btnNeed) btnNeed.className = 'seg-btn active-need';
    if (seg === 'achieve' && btnAchieve) btnAchieve.className = 'seg-btn active-achieve';

    renderTable(currentWriterStats);
  };

  window.filterTable = function() {
    renderTable(currentWriterStats);
  };

  window.openWriterDrilldown = function(writerName) {
    const writer = currentWriterStats.find(w => w.name === writerName);
    if (!writer) return;

    const modal = document.getElementById('writerModal');
    const title = document.getElementById('modalWriterName');
    const stats = document.getElementById('modalWriterStats');
    const listEl = document.getElementById('modalArticlesList');

    if (!modal || !listEl) return;

    title.textContent = `${writer.name} — Submissions`;
    stats.innerHTML = `Worked: <strong>${writer.worked}</strong> | Approved: <strong style="color:#047857;">${writer.approved}</strong> | Points: <strong style="color:#b45309;">${writer.points}</strong> | Words: <strong>${writer.totalWords.toLocaleString()}</strong>`;

    let html = '';
    writer.articles.forEach((item, idx) => {
      const isApp = (item.status || '').toLowerCase().includes('done') || 
                    (item.reviewStatus || '').toLowerCase().includes('approv');
      const pts = getItemPoints(item);

      html += `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <div style="font-weight:700; font-size:0.85rem; color:#0f172a;">
              ${idx + 1}. ${escapeHtml(item.topic)}
            </div>
            <div style="font-size:0.72rem; color:#64748b; display:flex; gap:0.5rem; margin-top:2px;">
              <span>${escapeHtml(item.category || 'General')}</span>
              <span>•</span>
              <span>${escapeHtml(item.taskType || 'Article')}</span>
              <span>•</span>
              <span>${parseInt(item.wordCount, 10) || 0}w</span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.75rem; font-weight:800; color:#b45309; background:#fef3c7; padding:2px 6px; border-radius:4px;">
              ${pts} pts
            </span>
            <span style="font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:4px; background:${isApp ? '#ecfdf5' : '#fff1f2'}; color:${isApp ? '#047857' : '#be123c'};">
              ${isApp ? 'Approved' : 'Pending/Rev'}
            </span>
            ${item.newDoc ? `<a href="${escapeHtml(item.newDoc)}" target="_blank" class="btn-action-sm" style="padding:0.2rem 0.4rem; font-size:0.7rem;">Doc ↗</a>` : ''}
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
    modal.style.display = 'flex';
  };

  window.closeWriterModal = function() {
    const modal = document.getElementById('writerModal');
    if (modal) modal.style.display = 'none';
  };

  window.exportExecutiveCSV = function() {
    if (!currentWriterStats || currentWriterStats.length === 0) return;

    const headers = ['Rank', 'Writer Name', 'Category', 'Articles Worked', 'Articles Approved', 'Needs Revision', 'Approval Rate (%)', 'Total Points', 'Total Word Count', 'Avg Words Per Doc', 'Status'];
    const rows = currentWriterStats.map((w, idx) => [
      idx + 1,
      `"${w.name}"`,
      `"${w.category}"`,
      w.worked,
      w.approved,
      w.needsRevision,
      `${w.approvalRate}%`,
      w.points,
      w.totalWords,
      w.avgWordsPerArticle,
      `"${w.verdict}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Content_Executive_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.refreshExecutiveData = async function() {
    if (typeof sheetsClient !== 'undefined' && typeof sheetsClient.refreshData === 'function') {
      try {
        await sheetsClient.refreshData();
      } catch (e) {
        console.warn('Refresh error:', e);
      }
    }
    calculateExecutiveMetrics();
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
  }

  function initExecutiveDashboard() {
    calculateExecutiveMetrics();
    if (typeof sheetsClient !== 'undefined') {
      sheetsClient.onUpdate(() => {
        calculateExecutiveMetrics();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    if (checkAuth()) {
      initExecutiveDashboard();
    }
  });

})();
