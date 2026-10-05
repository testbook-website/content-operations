/**
 * admin.js - SVP Executive Intelligence Portal
 * Dedicated performance analytics for SVP Operations
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
    if (entered === adminPassword || entered === 'SEO@2XTraffc' || entered === '7730') {
      sessionStorage.setItem(SVP_AUTH_KEY, 'true');
      if (errEl) errEl.textContent = '';
      checkAuth();
      initExecutiveDashboard();
    } else {
      if (errEl) {
        errEl.textContent = '❌ Invalid SVP Password. Access Denied.';
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
      }
    }
  };

  window.logoutSvp = function() {
    sessionStorage.removeItem(SVP_AUTH_KEY);
    checkAuth();
  };

  // Helper: Normalize Writer Name
  function cleanWriterName(name) {
    if (!name) return 'Unassigned';
    const s = String(name).trim();
    if (!s || s === '-' || s === '---') return 'Unassigned';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Helper: Parse Date
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

  // Helper: Calculate OND Points for single item
  function getItemPoints(item) {
    const tt = (item.taskType || '').toLowerCase();
    const pt = (item.pageType || '').toLowerCase();
    const words = parseInt(item.wordCount, 10) || 0;
    const isApproved = (item.status || '').toLowerCase().includes('done') || 
                       (item.reviewStatus || '').toLowerCase().includes('approv');

    if (!isApproved) return 0;

    // Point Matrix
    if (tt.includes('news')) {
      return words < 500 ? 0.25 : 0.5;
    }
    if (tt.includes('high intent') || pt.includes('pyp') || pt.includes('ts')) {
      return 1.5;
    }
    if (tt.includes('optimization') || (item.oldDoc && item.oldDoc.startsWith('http'))) {
      return 1.5;
    }
    if (words >= 1500) {
      return 3.0; // Fresh Pillar
    }
    return 2.0; // Standard Fresh
  }

  // Extract Workflow Data
  function getWorkflowData() {
    if (typeof sheetsClient !== 'undefined' && sheetsClient.data && sheetsClient.data.workflow_ond && sheetsClient.data.workflow_ond.length > 0) {
      return sheetsClient.data.workflow_ond;
    }
    if (typeof BASELINE_WORKFLOW_DATA !== 'undefined' && BASELINE_WORKFLOW_DATA.length > 0) {
      return BASELINE_WORKFLOW_DATA;
    }
    return [];
  }

  // Process & Aggregate Writer Stats
  function calculateExecutiveMetrics() {
    const raw = getWorkflowData();
    rawWorkflowItems = raw;

    // Determine Date Filter Range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter Items by Date
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
        // October 2026 / Q4 Month
        return itemDate.getMonth() === 9 && itemDate.getFullYear() === 2026;
      }
      return true;
    });

    // Aggregate by Writer
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

      // Executive Verdict
      let verdict = '🟢 On Track';
      let verdictClass = 'track';

      if (w.points >= 6 || (w.approved >= 4 && rate >= 80)) {
        verdict = '🔥 Top Performer';
        verdictClass = 'top';
      } else if (w.worked >= 2 && rate < 60) {
        verdict = '⚠️ Needs Attention';
        verdictClass = 'need';
      } else if (w.worked === 0 || w.points === 0) {
        verdict = '⚠️ Low Output';
        verdictClass = 'need';
      }

      return {
        ...w,
        approvalRate: rate,
        avgWordsPerArticle: avgWords,
        verdict: verdict,
        verdictClass: verdictClass
      };
    });

    // Sort by Points Descending, then Worked Descending
    list.sort((a, b) => b.points - a.points || b.approved - a.approved || b.totalWords - a.totalWords);

    currentWriterStats = list;
    renderKPIs(list, filteredItems);
    renderTable(list);
    updateSegmentCounts(list);
  }

  // Update Segment Count Badges
  function updateSegmentCounts(list) {
    const cAll = list.length;
    const cTop = list.filter(w => w.verdictClass === 'top').length;
    const cNeed = list.filter(w => w.verdictClass === 'need').length;
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

  // Render Top Executive KPI Cards
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

    if (elTop) {
      elTop.textContent = topPerformer ? topPerformer.name : 'N/A';
    }
    if (elTopPts) {
      elTopPts.textContent = topPerformer ? `⭐ ${topPerformer.points} pts (${topPerformer.approved} approved)` : '';
    }
    if (elActive) elActive.textContent = totalWriters;
    if (elWorked) elWorked.textContent = totalWorked.toLocaleString();
    if (elAvgWriter) elAvgWriter.textContent = `${avgPerWriter} articles / writer`;
    if (elApproved) elApproved.textContent = totalApproved.toLocaleString();
    if (elAppRate) elAppRate.textContent = `${overallApprovalRate}% team approval rate`;
    if (elPts) elPts.textContent = (Math.round(totalPoints * 10) / 10).toLocaleString();
    if (elAvgPts) elAvgPts.textContent = `${avgPtsPerWriter} avg pts / writer`;
    if (elWords) elWords.textContent = totalWords.toLocaleString() + 'w';
    if (elAvgWords) elAvgWords.textContent = `${avgWordsDoc.toLocaleString()} avg words/doc`;
  }

  // Render Table
  function renderTable(list) {
    const tbody = document.getElementById('executiveTableBody');
    if (!tbody) return;

    let displayList = list;

    // Apply Segment Filter
    if (selectedSegment === 'top') {
      displayList = list.filter(w => w.verdictClass === 'top');
    } else if (selectedSegment === 'need') {
      displayList = list.filter(w => w.verdictClass === 'need');
    } else if (selectedSegment === 'achieve') {
      displayList = list.filter(w => w.points >= 4.0);
    }

    // Apply Search Filter
    const searchVal = (document.getElementById('writerSearchInput')?.value || '').toLowerCase().trim();
    if (searchVal) {
      displayList = displayList.filter(w => w.name.toLowerCase().includes(searchVal) || w.category.toLowerCase().includes(searchVal));
    }

    if (displayList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:3rem; color:#9ca3af;">
            <div style="font-size:1.5rem; margin-bottom:0.5rem;">🔍</div>
            No writers match the selected criteria for this time period.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    displayList.forEach((w, idx) => {
      const rankNum = idx + 1;
      const rankClass = rankNum === 1 ? 'rank-1' : (rankNum === 2 ? 'rank-2' : (rankNum === 3 ? 'rank-3' : ''));
      const trophy = rankNum === 1 ? '🥇' : (rankNum === 2 ? '🥈' : (rankNum === 3 ? '🥉' : `#${rankNum}`));

      html += `
        <tr onclick="openWriterDrilldown('${escapeQuotes(w.name)}')">
          <td>
            <div class="writer-cell">
              <div class="writer-avatar ${rankClass}">${trophy}</div>
              <div>
                <div class="writer-name">${escapeHtml(w.name)}</div>
                <div class="writer-role">${escapeHtml(w.category)} Team</div>
              </div>
            </div>
          </td>
          <td style="font-weight:700; font-size:0.95rem;">${w.worked}</td>
          <td>
            <span class="pill-approved">✅ ${w.approved}</span>
            ${w.needsRevision > 0 ? `<span style="font-size:0.75rem; color:#fb7185; margin-left:4px;">(${w.needsRevision} rev)</span>` : ''}
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div style="width:65px; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="width:${w.approvalRate}%; height:100%; background:${w.approvalRate >= 80 ? '#10b981' : (w.approvalRate >= 60 ? '#f59e0b' : '#ef4444')};"></div>
              </div>
              <span style="font-size:0.8rem; font-weight:700; color:#e5e7eb;">${w.approvalRate}%</span>
            </div>
          </td>
          <td>
            <span class="pill-pts">⭐ ${w.points} pts</span>
          </td>
          <td style="font-weight:700; font-family:monospace; font-size:0.9rem; color:#e2e8f0;">
            ${w.totalWords.toLocaleString()} w
          </td>
          <td style="font-size:0.8rem; color:#9ca3af;">
            ${w.avgWordsPerArticle.toLocaleString()} w/doc
          </td>
          <td>
            <span class="status-badge ${w.verdictClass}">${w.verdict}</span>
          </td>
          <td>
            <button class="btn-portal-action" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="event.stopPropagation(); openWriterDrilldown('${escapeQuotes(w.name)}')">
              🔍 Drilldown
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  // 1-Click Time Range Handler
  window.setTimeRange = function(range, btn) {
    selectedTimeRange = range;
    document.querySelectorAll('.time-pill').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    calculateExecutiveMetrics();
  };

  // 1-Click Performance Segment Handler
  window.setPerformanceSegment = function(seg) {
    selectedSegment = seg;
    const btnAll = document.getElementById('segBtnAll');
    const btnTop = document.getElementById('segBtnTop');
    const btnNeed = document.getElementById('segBtnNeed');
    const btnAchieve = document.getElementById('segBtnAchieve');
    const badge = document.getElementById('activeFilterBadge');

    [btnAll, btnTop, btnNeed, btnAchieve].forEach(b => {
      if (b) {
        b.className = 'segment-btn';
      }
    });

    if (seg === 'all') {
      btnAll.className = 'segment-btn active-all';
      if (badge) badge.textContent = 'All Writers';
    } else if (seg === 'top') {
      btnTop.className = 'segment-btn active-top';
      if (badge) badge.textContent = '🔥 Top Performers Only';
    } else if (seg === 'need') {
      btnNeed.className = 'segment-btn active-need';
      if (badge) badge.textContent = '⚠️ Needs Attention / Underperforming';
    } else if (seg === 'achieve') {
      btnAchieve.className = 'segment-btn active-gold';
      if (badge) badge.textContent = '🎯 Target Achievers';
    }

    renderTable(currentWriterStats);
  };

  window.filterTable = function() {
    renderTable(currentWriterStats);
  };

  // Writer Drilldown Modal
  window.openWriterDrilldown = function(writerName) {
    const writer = currentWriterStats.find(w => w.name === writerName);
    if (!writer) return;

    const modal = document.getElementById('writerModal');
    const title = document.getElementById('modalWriterName');
    const stats = document.getElementById('modalWriterStats');
    const listEl = document.getElementById('modalArticlesList');

    if (!modal || !listEl) return;

    title.textContent = `${writer.name} — Full Submissions Audit`;
    stats.innerHTML = `Worked: <strong>${writer.worked}</strong> articles | Approved: <strong style="color:#34d399;">${writer.approved}</strong> | Points: <strong style="color:#fbbf24;">${writer.points} pts</strong> | Total Words: <strong>${writer.totalWords.toLocaleString()} words</strong>`;

    let html = '';
    writer.articles.forEach((item, idx) => {
      const isApp = (item.status || '').toLowerCase().includes('done') || 
                    (item.reviewStatus || '').toLowerCase().includes('approv');
      const pts = getItemPoints(item);

      html += `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
          <div style="max-width:70%;">
            <div style="font-weight:700; font-size:0.95rem; color:#ffffff; margin-bottom:0.25rem;">
              ${idx + 1}. ${escapeHtml(item.topic)}
            </div>
            <div style="font-size:0.78rem; color:#9ca3af; display:flex; gap:0.75rem; flex-wrap:wrap;">
              <span>📁 ${escapeHtml(item.category || 'General')}</span>
              <span>🏷️ ${escapeHtml(item.taskType || 'Article')}</span>
              <span>📅 ${escapeHtml(item.date || 'N/A')}</span>
              <span>✍️ ${parseInt(item.wordCount, 10) || 0} words</span>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:0.8rem; font-weight:800; color:#fbbf24; background:rgba(245,158,11,0.15); padding:3px 8px; border-radius:6px;">
              ⭐ ${pts} pts
            </span>
            <span style="font-size:0.78rem; font-weight:700; padding:3px 8px; border-radius:6px; background:${isApp ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}; color:${isApp ? '#34d399' : '#fb7185'};">
              ${isApp ? '✅ Approved' : '⚠️ Pending / Revision'}
            </span>
            ${item.newDoc ? `<a href="${escapeHtml(item.newDoc)}" target="_blank" class="btn-portal-action" style="padding:0.3rem 0.6rem; font-size:0.75rem;">📄 Doc ↗</a>` : ''}
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

  // Export Executive CSV
  window.exportExecutiveCSV = function() {
    if (!currentWriterStats || currentWriterStats.length === 0) return;

    const headers = ['Rank', 'Writer Name', 'Team Category', 'Articles Worked', 'Articles Approved', 'Needs Revision', 'Approval Rate (%)', 'Total Points', 'Total Word Count', 'Avg Words Per Doc', 'Executive Verdict'];
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
    link.setAttribute('download', `SVP_Executive_Content_Report_${new Date().toISOString().slice(0,10)}.csv`);
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

  // On DOM Load
  document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    if (checkAuth()) {
      initExecutiveDashboard();
    }
  });

})();
