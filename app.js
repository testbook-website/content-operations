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

  // Persistence helpers for Team Live Presence & Status Hub
  function loadWriterStatuses() {
    try {
      const saved = localStorage.getItem('portal_writer_statuses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse portal_writer_statuses from localStorage', e);
    }
    return {};
  }

  function saveWriterStatuses(statuses) {
    try {
      localStorage.setItem('portal_writer_statuses', JSON.stringify(statuses));
    } catch (e) {
      console.warn('Failed to save portal_writer_statuses to localStorage', e);
    }
  }

  // Persistence helpers for AI Review Cache & Audits
  function loadAiReviewCache() {
    try {
      const saved = localStorage.getItem('testbook_ai_reviews_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically enforce user's exact rules:
        // 1. Updates & Optimizations MUST have an Old Doc baseline. If missing Old Doc, CANNOT be approved!
        // 2. News Update: 350+ Words
        // 3. News New: 500 Words
        // 4. Optimization: 700 - 800 Words
        // 5. New Prep: 800 - 1200 Words
        Object.keys(parsed).forEach(k => {
          const item = parsed[k];
          if (!item) {
            delete parsed[k];
            return;
          }
          const reasonsStr = JSON.stringify(item.rejectionReasons || []);
          const summaryStr = ((item.justificationSummary || '') + (item.docWordCountText || '') + reasonsStr).toLowerCase();
          if (
            summaryStr.includes('timed out') ||
            summaryStr.includes('timeout') ||
            summaryStr.includes('inaccessible')
          ) {
            delete parsed[k];
            return;
          }

          // Strict Rule: If marked Missing Old Doc or Update without Old Doc
          if (item.docWordCountText === '🚫 Missing Old Doc' || summaryStr.includes('missing old doc') || summaryStr.includes('missing baseline old doc')) {
            item.isApproved = false;
            item.verdict = 'Needs Revision';
            item.score = 0;
            item.points = 0;
            item.pointsAwarded = 0;
            item.rejectionReasons = ['Missing baseline Old Doc link for Update task in Column M.'];
            item.justificationSummary = 'Needs Revision: Missing baseline Old Doc link. For Update/Optimization tasks, Old Doc is compulsory to verify rewritten content.';
            return;
          }

          const isNews = item.classification === 'Standard News' || item.classification === 'Micro News' || summaryStr.includes('news');
          const isOpt = item.classification === 'Deep Optimization' || summaryStr.includes('optimization') || (item.oldDocWordCount > 0);
          const rwMatch = (item.docWordCountText || '').match(/~(\d+)w Rewritten/i) || (item.docWordCountText || '').match(/~(\d+)w Revamped/i);
          const effectiveRewritten = item.rewrittenWords || (rwMatch ? parseInt(rwMatch[1], 10) : 0);
          const netDiff = item.netWordDiff !== undefined ? item.netWordDiff : 0;
          const effectiveNewWc = item.newDocWordCount || 0;
          const displayWc = effectiveRewritten > 0 ? effectiveRewritten : (netDiff > 0 ? netDiff : effectiveNewWc);
          const displayLabel = effectiveRewritten > 0 ? `~${effectiveRewritten} rewritten` : (netDiff > 0 ? `+${netDiff} net` : `${displayWc}`);

          if (isNews && (isOpt || item.oldDocWordCount > 0)) {
            // Rule 1: News Update (Must rewrite/add 350+ words)
            if (displayWc < 350) {
              item.isApproved = false;
              item.verdict = 'Needs Revision';
              item.score = 4;
              item.points = 0;
              item.pointsAwarded = 0;
              item.justificationSummary = `Needs Revision: News Update shortfall: Found ${displayLabel} words (minimum 350+ words required).`;
              item.rejectionReasons = [`News Update shortfall: Found ${displayLabel} words (minimum 350+ words required).`];
            } else {
              item.isApproved = true;
              item.verdict = 'Approved';
              item.points = displayWc >= 500 ? 0.5 : 0.25;
              item.pointsAwarded = item.points;
              item.rejectionReasons = [];
            }
          } else if (isNews && !isOpt) {
            // Rule 2: News New (500 Words)
            if (effectiveNewWc < 500) {
              item.isApproved = false;
              item.verdict = 'Needs Revision';
              item.score = 4;
              item.points = 0;
              item.pointsAwarded = 0;
              item.justificationSummary = `Needs Revision: New News length shortfall (${effectiveNewWc}w). Minimum 500 words required.`;
              item.rejectionReasons = [`New News length shortfall (${effectiveNewWc}w). Minimum 500 words required.`];
            } else {
              item.isApproved = true;
              item.verdict = 'Approved';
              item.points = 0.5;
              item.pointsAwarded = 0.5;
              item.rejectionReasons = [];
            }
          } else if (isOpt) {
            // Rule 3: Optimization (Must rewrite/add 700 - 800 Words)
            if (displayWc < 700) {
              item.isApproved = false;
              item.verdict = 'Needs Revision';
              item.score = 4;
              item.points = 0;
              item.pointsAwarded = 0;
              item.justificationSummary = `Needs Revision: Optimization shortfall: Found ${displayLabel} words (minimum 700–800 words required).`;
              item.rejectionReasons = [`Optimization shortfall: Found ${displayLabel} words (minimum 700–800 words required).`];
            } else {
              item.isApproved = true;
              item.verdict = 'Approved';
              item.points = 1.5;
              item.pointsAwarded = 1.5;
              item.rejectionReasons = [];
            }
          } else {
            // Rule 4: New Prep (800 - 1200 Words = 2.0 Points) / New Content
            if (effectiveNewWc < 800) {
              item.isApproved = false;
              item.verdict = 'Needs Revision';
              item.score = 4;
              item.points = 0;
              item.pointsAwarded = 0;
              item.justificationSummary = `Needs Revision: New Prep length shortfall (${effectiveNewWc}w). Minimum 800–1200 words required.`;
              item.rejectionReasons = [`New Prep length shortfall (${effectiveNewWc}w). Minimum 800–1200 words required.`];
            } else {
              item.isApproved = true;
              item.verdict = 'Approved';
              const isPrepPiece = item.classification?.includes('Prep') || summaryStr.includes('prep') || summaryStr.includes('ias') || (item.writer && ['lehron','dhananjay','falguni','swathi','sumit kumar','manicka'].includes(item.writer.toLowerCase()));
              item.points = isPrepPiece ? 2.0 : 1.0;
              item.pointsAwarded = item.points;
              item.rejectionReasons = [];
            }
          }
        });
        saveAiReviewCache(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse testbook_ai_reviews_v5 from localStorage', e);
    }
    return {};
  }

  function saveAiReviewCache(cache) {
    try {
      localStorage.setItem('testbook_ai_reviews_v5', JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save testbook_ai_reviews_v5 to localStorage', e);
    }
  }

  // Format concise short note (under 120 chars) for Google Sheet Column R to prevent sheet lag/breaking
  function formatShortReviewNote(isApproved, score, reasons, customNote) {
    if (customNote) {
      const clean = String(customNote).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      return clean.length > 120 ? clean.substring(0, 117) + '...' : clean;
    }
    if (isApproved) {
      return `AI Approved (${score || 9}/10)`;
    }
    const list = Array.isArray(reasons) ? reasons : (reasons ? [reasons] : []);
    let first = list.length > 0 ? String(list[0]).trim() : 'Needs revision';
    first = first.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/^Needs Revision:?\s*/i, '');
    const note = `AI Rev: ${first}`;
    return note.length > 120 ? note.substring(0, 117) + '...' : note;
  }

  // Two-way sync: Hydrate AI review cache directly from live Google Sheet Column S (Notes) & Column P (Review Status)
  function syncAiCacheFromSheetWorkflow(workflowItems) {
    if (!workflowItems || !Array.isArray(workflowItems)) return;
    if (!state.aiReviewCache) state.aiReviewCache = {};
    let cacheChanged = false;

    workflowItems.forEach(item => {
      if (!item || !item.topic) return;
      const rawStat = (item.reviewStatus || '').trim().toLowerCase();
      const tt = (item.taskType || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const isUpdateOrOpt = type.includes('update') || type.includes('optimi') || type.includes('refresh') ||
                            tt.includes('update') || tt.includes('optimi') || tt.includes('refresh');
      const hasOldDoc = item.oldDoc && item.oldDoc.startsWith('http');
      const hasNewDoc = item.newDoc && item.newDoc.startsWith('http');

      // MANDATORY RULE: If task is an Update/Optimization, Old Doc is compulsory! If missing, reject!
      if (isUpdateOrOpt && !hasOldDoc) {
        state.aiReviewCache[item.topic] = {
          isApproved: false,
          verdict: 'Needs Revision',
          score: 0,
          suggestedClassification: item.classification || 'Optimization',
          pointsAwarded: 0,
          netWordDiff: null,
          newDocWordCount: item.wordCount || null,
          oldDocWordCount: null,
          docWordCountText: '🚫 Missing Old Doc',
          justificationSummary: 'Needs Revision: Task Type is "Update/Optimization", but no baseline Old Doc link was provided in Column M. Baseline Old Doc is compulsory to audit rewritten content.',
          rejectionReasons: ['Missing baseline Old Doc link for Update task in Column M.'],
          wordCountAssessment: 'Missing Old Doc baseline',
          keyStrengths: [],
          improvementAreas: ['Attach baseline Old Doc in Column M so rewritten content (350+ words for News Update, 700+ words for Optimization) can be audited.'],
          recommendationNote: 'Needs Revision: Missing Old Doc link in Column M.',
          reviewedAt: item.date || new Date().toISOString(),
          fromSheetSync: false
        };
        cacheChanged = true;
        return;
      }

      // Sanitize: Purge generic "tables & FAQ" filler from sheet notes
      if (item.reviewNotes && (/tables?\s*(&|and)?\s*faqs?/i.test(item.reviewNotes) || item.reviewNotes.includes('syllabus tables'))) {
        item.reviewNotes = '';
      }

      const hasNote = Boolean(item.reviewNotes && item.reviewNotes.trim());
      const hasDefinitiveStatus = rawStat.includes('approv') || rawStat.includes('revis') || rawStat.includes('reject');

      if (!state.aiReviewCache[item.topic]) {
        if (hasNote || hasDefinitiveStatus) {
          const isAppr = rawStat.includes('approv');
          const noteText = item.reviewNotes ? item.reviewNotes.trim() : '';
          const noteIsApprovalText = noteText.toLowerCase().includes('approv');
          
          let cleanRej = [];
          if (!isAppr) {
            if (noteText && !noteIsApprovalText) {
              cleanRej = [noteText];
            } else {
              cleanRej = ['Marked for editorial revision in workflow sheet.'];
            }
          }

          state.aiReviewCache[item.topic] = {
            isApproved: isAppr,
            verdict: isAppr ? 'Approved' : 'Needs Revision',
            score: isAppr ? 9 : 5,
            suggestedClassification: item.classification || 'Standard Fresh',
            pointsAwarded: isAppr ? (item.points || 2.0) : 0,
            netWordDiff: null,
            newDocWordCount: item.wordCount || null,
            oldDocWordCount: 0,
            docWordCountText: `${item.wordCount || 0} words (Sheet Synced)`,
            justificationSummary: (!isAppr && noteIsApprovalText) ? 'Needs Revision (Pending Editorial Review)' : (noteText || (isAppr ? 'Approved (Synced from Google Sheet)' : 'Revision Required (Synced from Google Sheet)')),
            rejectionReasons: cleanRej,
            wordCountAssessment: `${item.wordCount || 0} words reported`,
            keyStrengths: ['Exam syllabus alignment', 'Tracked in Q4 OND Content Workflow'],
            improvementAreas: cleanRej.length > 0 ? cleanRej : ['Review content depth against syllabus standards'],
            recommendationNote: (!isAppr && noteIsApprovalText) ? 'Draft marked for revision.' : (noteText || (isAppr ? 'Approved in Google Sheet.' : 'Draft marked for revision.')),
            reviewedAt: item.date || new Date().toISOString(),
            fromSheetSync: true
          };
          cacheChanged = true;
        }
      } else if (hasNote && !state.aiReviewCache[item.topic].running) {
        const cur = state.aiReviewCache[item.topic];
        // CRITICAL: NEVER overwrite authentic in-browser AI audit findings with external sheet notes!
        // Only update if cur itself was created from sheet sync
        if (cur.fromSheetSync) {
          if (cur.justificationSummary !== item.reviewNotes) {
            cur.justificationSummary = item.reviewNotes;
            if (!cur.isApproved) {
              const noteText = (item.reviewNotes || '').trim();
              cur.rejectionReasons = (noteText && !noteText.toLowerCase().includes('approv')) ? [noteText] : ['Marked for editorial revision in workflow sheet.'];
            }
            cacheChanged = true;
          }
        }
      }
    });

    if (cacheChanged) {
      saveAiReviewCache(state.aiReviewCache);
    }
  }

  // Pushes genuine in-browser AI audit findings directly to Column S of Google Sheet
  function pushAuthenticAiCacheToSheet(workflowItems) {
    if (!state.aiReviewCache || !workflowItems || !Array.isArray(workflowItems)) return;
    if (typeof sheetsClient === 'undefined') return;

    workflowItems.forEach((item, idx) => {
      if (!item || !item.topic) return;
      const rec = state.aiReviewCache[item.topic];
      if (rec && !rec.fromSheetSync && !rec.running && rec.isApproved !== undefined) {
        const genuineReason = (!rec.isApproved && rec.rejectionReasons && rec.rejectionReasons[0]) ? rec.rejectionReasons[0] : '';
        const shortNote = formatShortReviewNote(rec.isApproved, rec.score, rec.rejectionReasons);
        
        // If sheet note is missing, or has generic filler, sync authentic note to sheet
        const currentSheetNote = item.reviewNotes || '';
        const needsSync = !currentSheetNote || /tables?\s*(&|and)?\s*faqs?/i.test(currentSheetNote) || currentSheetNote.includes('syllabus tables');
        if (needsSync && (genuineReason || rec.isApproved)) {
          sheetsClient.updateWorkflowReviewStatus(item.rowIndex || (idx + 2), item.topic, rec.verdict || (rec.isApproved ? 'Approved' : 'Needs Revision'), shortNote)
            .catch(e => console.warn('Background sync error:', e));
        }
      }
    });
  }

  // Application State
  const state = {
    isAuthenticated: false,
    enteredPin: '',
    correctPin: '7730',
    activeNavTab: 'roster', // 'roster' | 'news' | 'productivity' | 'category' | 'upcoming' | 'workflow' | 'calendar'
    activeProdSubTab: 'yesterday', // DEFAULT: Yesterday as requested!
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
    workflowDateFilter: 'last7days', // 'last7days' (default) | 'today' | 'yesterday' | 'today_yesterday' | 'last14days' | 'last30days' | 'all'
    workflowCategoryFilter: 'all',
    workflowWriterFilter: 'all',
    workflowTaskTypeFilter: 'all',
    workflowSearch: '',
    newsDateFilter: 'today', // 'today' (default) | 'yesterday' | 'today_yesterday' | 'last7days' | 'all'
    newsStatusFilter: 'all',
    newsTaskTypeFilter: 'all',
    newsWriterFilter: 'all',
    newsSearch: '',
    writerStatuses: loadWriterStatuses(),
    newsCustomAlerts: [],
    newsOverrides: {},
    reviewDateFilter: 'all', // 'all' (default) | specific date (e.g. '10/05/2026')
    reviewTaskTypeFilter: 'all', // 'all' (default) | 'prep' | 'new_content' | 'optimization' | 'high_intent' | 'news'
    reviewStatusFilter: 'all', // 'all' (default) | 'pending' | 'approved' | 'needs_revision'
    reviewWriterFilter: 'all',
    reviewCategoryFilter: 'all',
    reviewSearch: '',
    reviewOverrides: {},
    aiReviewCache: loadAiReviewCache(),
    aiRunnerActive: false,
    teamDashboardSubTab: 'regular', // 'regular' | 'new_content' | 'prep' | 'hindi' | 'all'
    teamDashboardSearch: '',
    kpiTimeframeFilter: 'q4_total', // 'q4_total' | 'current_week' | 'today'
    kpiSubTab: 'regular', // 'regular' | 'new_content' | 'prep' | 'hindi' | 'all'
    kpiSearch: '',
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
    sectionTeamDashboard: document.getElementById('sectionTeamDashboard'),
    sectionKpi: document.getElementById('sectionKpi'),
    sectionNews: document.getElementById('sectionNews'),
    sectionReview: document.getElementById('sectionReview'),
    sectionProductivity: document.getElementById('sectionProductivity'),
    sectionCategory: document.getElementById('sectionCategory'),

    // TAB 2: Team Dashboard (10-Column Accountability Matrix)
    teamDashboardKpiCards: document.getElementById('teamDashboardKpiCards'),
    teamDashboardSubTabs: document.getElementById('teamDashboardSubTabs'),
    teamDashboardSubBtns: document.querySelectorAll('#teamDashboardSubTabs .sub-btn'),
    teamDashboardRuleBadges: document.getElementById('teamDashboardRuleBadges'),
    teamDashboardSearch: document.getElementById('teamDashboardSearch'),
    teamDashboardTableBody: document.getElementById('teamDashboardTableBody'),
    teamDashboardTableFoot: document.getElementById('teamDashboardTableFoot'),
    btnExportTeamDashboardCSV: document.getElementById('btnExportTeamDashboardCSV'),

    // TAB 3: Team KPI (Targets, Pacing & Squad Overview)
    kpiOverviewCards: document.getElementById('kpiOverviewCards'),
    kpiSubTabs: document.getElementById('kpiSubTabs'),
    kpiSubBtns: document.querySelectorAll('#kpiSubTabs .sub-btn'),
    kpiRuleBadges: document.getElementById('kpiRuleBadges'),
    kpiSearch: document.getElementById('kpiSearch'),
    kpiCountLabel: document.getElementById('kpiCountLabel'),
    kpiTableBody: document.getElementById('kpiTableBody'),
    kpiTableFoot: document.getElementById('kpiTableFoot'),
    btnExportKpiCSV: document.getElementById('btnExportKpiCSV'),
    modalWriterKpiDrilldown: document.getElementById('modalWriterKpiDrilldown'),
    drilldownWriterTitle: document.getElementById('drilldownWriterTitle'),
    drilldownWriterSubtitle: document.getElementById('drilldownWriterSubtitle'),
    drilldownContentBody: document.getElementById('drilldownContentBody'),
    btnCloseModalDrilldown: document.getElementById('btnCloseModalDrilldown'),
    btnCloseDrilldownFooter: document.getElementById('btnCloseDrilldownFooter'),

    // Review Hub & Quality Gates
    reviewKpiCards: document.getElementById('reviewKpiCards'),
    btnStartAiRunner: document.getElementById('btnStartAiRunner'),
    btnStopAiRunner: document.getElementById('btnStopAiRunner'),
    btnResetAiAudits: document.getElementById('btnResetAiAudits'),
    aiRunnerStatusText: document.getElementById('aiRunnerStatusText'),
    aiRunnerDot: document.getElementById('aiRunnerDot'),
    aiAuditedCountPill: document.getElementById('aiAuditedCountPill'),
    aiApprovedCountPill: document.getElementById('aiApprovedCountPill'),
    aiRevisionCountPill: document.getElementById('aiRevisionCountPill'),
    reviewDateFilter: document.getElementById('reviewDateFilter'),
    reviewTaskTypeFilter: document.getElementById('reviewTaskTypeFilter'),
    reviewStatusFilter: document.getElementById('reviewStatusFilter'),
    reviewWriterFilter: document.getElementById('reviewWriterFilter'),
    reviewCategoryFilter: document.getElementById('reviewCategoryFilter'),
    reviewSearch: document.getElementById('reviewSearch'),
    reviewCountLabel: document.getElementById('reviewCountLabel'),
    writerReviewAlertBar: document.getElementById('writerReviewAlertBar'),
    reviewTableBody: document.getElementById('reviewTableBody'),
    btnExportReviewCSV: document.getElementById('btnExportReviewCSV'),
    reviewLeaderboardContainer: document.getElementById('reviewLeaderboardContainer'),
    reviewLiveBadge: document.getElementById('reviewLiveBadge'),
    modalAiAudit: document.getElementById('modalAiAudit'),
    modalAiAuditContent: document.getElementById('modalAiAuditContent'),
    modalAiAuditFooter: document.getElementById('modalAiAuditFooter'),
    btnCloseModalAiAudit: document.getElementById('btnCloseModalAiAudit'),
    btnCloseAuditFooter: document.getElementById('btnCloseAuditFooter'),

    // News (N & U Daily) & Auto-Assignment Hub
    writerPresenceGrid: document.getElementById('writerPresenceGrid'),
    newsKpiCards: document.getElementById('newsKpiCards'),
    newsDateFilter: document.getElementById('newsDateFilter'),
    optNewsToday: document.getElementById('optNewsToday'),
    optNewsYesterday: document.getElementById('optNewsYesterday'),
    newsStatusFilter: document.getElementById('newsStatusFilter'),
    newsTaskTypeFilter: document.getElementById('newsTaskTypeFilter'),
    newsWriterFilter: document.getElementById('newsWriterFilter'),
    newsSearch: document.getElementById('newsSearch'),
    newsCountLabel: document.getElementById('newsCountLabel'),
    newsTableBody: document.getElementById('newsTableBody'),
    btnExportNewsCSV: document.getElementById('btnExportNewsCSV'),
    newsLiveBadge: document.getElementById('newsLiveBadge'),
    btnAutoAssignPending: document.getElementById('btnAutoAssignPending'),
    btnQuickAddNews: document.getElementById('btnQuickAddNews'),
    modalAddNews: document.getElementById('modalAddNews'),
    btnCloseModalAddNews: document.getElementById('btnCloseModalAddNews'),
    btnCancelAddNews: document.getElementById('btnCancelAddNews'),
    formAddNews: document.getElementById('formAddNews'),
    inputNewsTopic: document.getElementById('inputNewsTopic'),
    selectNewsTaskType: document.getElementById('selectNewsTaskType'),
    selectNewsCategory: document.getElementById('selectNewsCategory'),
    selectNewsAssignMode: document.getElementById('selectNewsAssignMode'),

    // Roster
    nightShiftRow: document.getElementById('nightShiftRow'),
    nightWeekSelect: document.getElementById('nightWeekSelect'),
    teamFilter: document.getElementById('teamFilter'),
    rosterSearch: document.getElementById('rosterSearch'),
    btnExportRoster: document.getElementById('btnExportRoster'),
    rosterTeamsContainer: document.getElementById('rosterTeamsContainer'),
    mentorsList: document.getElementById('mentorsList'),
    prepList: document.getElementById('prepList'),
    newContentList: document.getElementById('newContentList'),
    publishingList: document.getElementById('publishingList'),

    // Productivity
    prodKpiCards: document.getElementById('prodKpiCards'),
    prodSubBtns: document.querySelectorAll('.sub-btn'),
    prodSearch: document.getElementById('prodSearch'),
    prodTableContainer: document.getElementById('prodTableContainer'),

    // Category Grid (Day Wise Breakdown from gid: 1053610017)
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

    // Workflow <OND>
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
  async function initAuth() {
    // Dynamically fetch configured PIN from /api/config if deployed on Vercel
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      try {
        const cResp = await fetch('/api/config');
        if (cResp.ok) {
          const cData = await cResp.json();
          if (cData && cData.pin) {
            state.correctPin = String(cData.pin).trim();
          }
        }
      } catch (e) {
        console.log('Config fetch fallback to default PIN');
      }
    }

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
        if (data && data.writer_presence) {
          state.writerStatuses = { ...state.writerStatuses, ...data.writer_presence };
        }
        if (data && Array.isArray(data.workflow_ond)) {
          syncAiCacheFromSheetWorkflow(data.workflow_ond);
          pushAuthenticAiCacheToSheet(data.workflow_ond);
        }
        if (state.isAuthenticated) {
          if (state.activeNavTab === 'team_dashboard') renderTeamDashboard();
          if (state.activeNavTab === 'kpi') renderKpiDashboard();
          if (state.activeNavTab === 'news') renderNews();
          if (state.activeNavTab === 'review') renderReviewHub();
          if (state.activeNavTab === 'productivity') renderProductivity();
          if (state.activeNavTab === 'category') renderCategoryGrid();
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

    // News (N & U Daily) Controls
    if (els.newsDateFilter) {
      els.newsDateFilter.addEventListener('change', (e) => {
        state.newsDateFilter = e.target.value;
        renderNews(true);
      });
    }

    if (els.newsStatusFilter) {
      els.newsStatusFilter.addEventListener('change', (e) => {
        state.newsStatusFilter = e.target.value;
        renderNews(false);
      });
    }

    if (els.newsTaskTypeFilter) {
      els.newsTaskTypeFilter.addEventListener('change', (e) => {
        state.newsTaskTypeFilter = e.target.value;
        renderNews(false);
      });
    }

    if (els.newsWriterFilter) {
      els.newsWriterFilter.addEventListener('change', (e) => {
        state.newsWriterFilter = e.target.value;
        renderNews(false);
      });
    }

    if (els.newsSearch) {
      els.newsSearch.addEventListener('input', (e) => {
        state.newsSearch = e.target.value.toLowerCase().trim();
        renderNews(false);
      });
    }

    if (els.btnExportNewsCSV) {
      els.btnExportNewsCSV.addEventListener('click', exportNewsCSV);
    }

    if (els.btnAutoAssignPending) {
      els.btnAutoAssignPending.addEventListener('click', autoAssignAllPending);
    }

    if (els.btnQuickAddNews) {
      els.btnQuickAddNews.addEventListener('click', () => {
        if (els.modalAddNews) els.modalAddNews.style.display = 'flex';
      });
    }

    if (els.btnCloseModalAddNews) {
      els.btnCloseModalAddNews.addEventListener('click', () => {
        if (els.modalAddNews) els.modalAddNews.style.display = 'none';
      });
    }

    // Review Hub Controls
    if (els.reviewDateFilter) {
      els.reviewDateFilter.addEventListener('change', (e) => {
        state.reviewDateFilter = e.target.value;
        renderReviewHub(false);
      });
    }

    if (els.reviewTaskTypeFilter) {
      els.reviewTaskTypeFilter.addEventListener('change', (e) => {
        state.reviewTaskTypeFilter = e.target.value;
        renderReviewHub(false);
      });
    }

    if (els.reviewStatusFilter) {
      els.reviewStatusFilter.addEventListener('change', (e) => {
        state.reviewStatusFilter = e.target.value;
        renderReviewHub(false);
      });
    }

    if (els.reviewWriterFilter) {
      els.reviewWriterFilter.addEventListener('change', (e) => {
        state.reviewWriterFilter = e.target.value;
        renderReviewHub(false);
      });
    }

    if (els.reviewCategoryFilter) {
      els.reviewCategoryFilter.addEventListener('change', (e) => {
        state.reviewCategoryFilter = e.target.value;
        renderReviewHub(false);
      });
    }

    if (els.reviewSearch) {
      els.reviewSearch.addEventListener('input', (e) => {
        state.reviewSearch = e.target.value.toLowerCase().trim();
        renderReviewHub(false);
      });
    }

    if (els.btnExportReviewCSV) {
      els.btnExportReviewCSV.addEventListener('click', exportReviewCSV);
    }

    if (els.btnStartAiRunner) {
      els.btnStartAiRunner.addEventListener('click', startAiAutoReviewRunner);
    }

    if (els.btnStopAiRunner) {
      els.btnStopAiRunner.addEventListener('click', stopAiAutoReviewRunner);
    }

    if (els.btnResetAiAudits) {
      els.btnResetAiAudits.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all AI review cache and re-run fresh?')) {
          state.aiReviewCache = {};
          saveAiReviewCache(state.aiReviewCache);
          if (state.reviewOverrides) state.reviewOverrides = {};
          renderReviewHub(false);
          updateAiRunnerUI('AI Audits reset. Click "⚡ Start AI Auto-Review Runner" to run fresh.');
        }
      });
    }

    // TAB 2: Team Dashboard Controls
    if (els.teamDashboardSubBtns) {
      els.teamDashboardSubBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          switchTeamDashboardSubTab(btn.dataset.tdtab);
        });
      });
    }

    if (els.teamDashboardSearch) {
      els.teamDashboardSearch.addEventListener('input', (e) => {
        state.teamDashboardSearch = e.target.value.toLowerCase().trim();
        renderTeamDashboard();
      });
    }

    if (els.btnExportTeamDashboardCSV) {
      els.btnExportTeamDashboardCSV.addEventListener('click', exportTeamDashboardCSV);
    }

    // TAB 3: Team KPI Controls
    if (els.kpiSubBtns) {
      els.kpiSubBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          switchKpiSubTab(btn.dataset.kpitab);
        });
      });
    }

    if (els.kpiSearch) {
      els.kpiSearch.addEventListener('input', (e) => {
        state.kpiSearch = e.target.value.toLowerCase().trim();
        renderKpiDashboard();
      });
    }

    if (els.btnExportKpiCSV) {
      els.btnExportKpiCSV.addEventListener('click', exportKpiCSV);
    }

    if (els.btnCloseModalDrilldown) {
      els.btnCloseModalDrilldown.addEventListener('click', () => {
        if (els.modalWriterKpiDrilldown) els.modalWriterKpiDrilldown.style.display = 'none';
      });
    }

    if (els.btnCloseDrilldownFooter) {
      els.btnCloseDrilldownFooter.addEventListener('click', () => {
        if (els.modalWriterKpiDrilldown) els.modalWriterKpiDrilldown.style.display = 'none';
      });
    }

    if (els.btnCloseModalAiAudit) {
      els.btnCloseModalAiAudit.addEventListener('click', () => {
        if (els.modalAiAudit) els.modalAiAudit.style.display = 'none';
      });
    }

    if (els.btnCloseAuditFooter) {
      els.btnCloseAuditFooter.addEventListener('click', () => {
        if (els.modalAiAudit) els.modalAiAudit.style.display = 'none';
      });
    }
  }

  function switchNavTab(tab) {
    state.activeNavTab = tab;
    els.navTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    if (els.sectionRoster) els.sectionRoster.style.display = tab === 'roster' ? 'block' : 'none';
    if (els.sectionTeamDashboard) els.sectionTeamDashboard.style.display = tab === 'team_dashboard' ? 'block' : 'none';
    if (els.sectionKpi) els.sectionKpi.style.display = tab === 'kpi' ? 'block' : 'none';
    if (els.sectionNews) els.sectionNews.style.display = tab === 'news' ? 'block' : 'none';
    if (els.sectionReview) els.sectionReview.style.display = tab === 'review' ? 'block' : 'none';
    if (els.sectionProductivity) els.sectionProductivity.style.display = tab === 'productivity' ? 'block' : 'none';
    if (els.sectionCategory) els.sectionCategory.style.display = tab === 'category' ? 'block' : 'none';
    if (els.sectionUpcoming) els.sectionUpcoming.style.display = tab === 'upcoming' ? 'block' : 'none';
    if (els.sectionWorkflow) els.sectionWorkflow.style.display = tab === 'workflow' ? 'block' : 'none';
    if (els.sectionCalendar) els.sectionCalendar.style.display = tab === 'calendar' ? 'block' : 'none';

    if (tab === 'roster') renderRoster();
    if (tab === 'team_dashboard') renderTeamDashboard();
    if (tab === 'kpi') renderKpiDashboard();
    if (tab === 'news') renderNews();
    if (tab === 'review') renderReviewHub();
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

  function switchTeamDashboardSubTab(subtab) {
    state.teamDashboardSubTab = subtab;
    if (els.teamDashboardSubBtns) {
      els.teamDashboardSubBtns.forEach(b => b.classList.toggle('active', b.dataset.tdtab === subtab));
    }
    renderTeamDashboard();
  }

  function switchKpiSubTab(subtab) {
    state.kpiSubTab = subtab;
    if (els.kpiSubBtns) {
      els.kpiSubBtns.forEach(b => b.classList.toggle('active', b.dataset.kpitab === subtab));
    }
    renderKpiDashboard();
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
      opt.textContent = `${w.name} (${w.dateRange}) — News: ${w.newsTeam}`;
      if (w.id === state.selectedWeekId) opt.selected = true;
      els.nightWeekSelect.appendChild(opt);
    });
  }

  function renderNightShiftDaily() {
    if (!els.nightShiftRow) return;
    const week = ROSTER_CONFIG.weeks.find(w => w.id === state.selectedWeekId) || ROSTER_CONFIG.weeks[0];

    let html = '';
    // Mon to Sat daily shifts
    week.nightShiftDaily.forEach(item => {
      html += `
        <div class="night-day-box">
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
    if (els.mentorsList && ROSTER_CONFIG.categoryMentors) {
      els.mentorsList.innerHTML = ROSTER_CONFIG.categoryMentors.map(c => `
        <div><strong>${c.mentor}</strong>: <span style="color:#4b5563;">${c.category}</span></div>
      `).join('');
    }
    if (els.prepList && ROSTER_CONFIG.prepTeamAssignments) {
      els.prepList.innerHTML = ROSTER_CONFIG.prepTeamAssignments.map(p => `
        <div><strong>${p.member}</strong>: <span style="color:#4b5563;">${p.domain}</span></div>
      `).join('');
    }
    if (els.newContentList && ROSTER_CONFIG.newContentWriters) {
      els.newContentList.innerHTML = ROSTER_CONFIG.newContentWriters.map(n => `
        <div><strong>${n.member}</strong>: <span style="color:#4b5563;">${n.domain}</span></div>
      `).join('');
    }
    if (els.publishingList && ROSTER_CONFIG.publishing) {
      els.publishingList.innerHTML = ROSTER_CONFIG.publishing.map(pub => `
        <div><strong>${pub.member}</strong>: <span style="color:#4b5563;">${pub.role}</span></div>
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
      const tillWords = sumObj(s2['Till Now']) || (sumObj(s2['October']) + sumObj(s2['November']) + sumObj(s2['December']));
      const tillPub = sumObj(s1['Till Now']) || (sumObj(s1['October']) + sumObj(s1['November']) + sumObj(s1['December']));
      const tillPick = sumObj(s3['Till Now']) || sumObj(s3['OND']) || (sumObj(s3['October']) + sumObj(s3['November']) + sumObj(s3['December']));

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
    const months = ['October', 'November', 'December'];

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
  // TAB 3: Category Wise Date Rendering (Google Sheet gid: 1053610017 Replica)
  // =========================================================================
  function getActiveCategoryData() {
    let gridSource = (typeof sheetsClient !== 'undefined' && sheetsClient.data && sheetsClient.data.category_grid)
      ? sheetsClient.data.category_grid
      : (typeof CATEGORY_GRID_DATA !== 'undefined' ? CATEGORY_GRID_DATA : null);

    if (!gridSource) return { categories: [], summaryRows: [], rows: [] };

    const categories = (gridSource.categories || []).slice();
    const summaryRows = (gridSource.summaryRows || []).slice();
    const rowsMap = {};

    // 1. Populate daily rows from base gridSource
    (gridSource.rows || []).forEach(r => {
      if (r && r.date) {
        rowsMap[r.date] = {
          date: r.date,
          counts: { ...(r.counts || {}) },
          total: r.total || 0
        };
      }
    });

    // 2. Augment with real-time Workflow entries if available (OND only)
    const liveWf = (typeof sheetsClient !== 'undefined' && sheetsClient.data) ? (sheetsClient.data.workflow_ond || sheetsClient.data.workflow_jas) : null;
    if (liveWf && liveWf.length > 0) {
      const liveDateMap = {};
      liveWf.forEach(item => {
        if (!item.date || !item.category) return;
        const m = item.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const normDate = m ? `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}` : item.date;
        if (!liveDateMap[normDate]) liveDateMap[normDate] = {};

        let cat = item.category.trim();
        if (cat === 'Judiciary Exams') cat = 'Judiciary';
        if (cat === 'UGC NET Paper 1') cat = 'UGC NET';
        if (cat === 'State Govt Exams' || cat === 'State-Govt Exams') cat = 'State Exams';
        if (cat === 'Insurance Exam') cat = 'Insurance';
        if (cat === 'UPSC Civil Services') cat = 'UPSC';
        if (cat === 'Railway Exams') cat = 'Railways';
        if (cat === 'Police Exams') cat = 'Police';
        if (cat === 'Teaching Exams') cat = 'Teaching';
        if (cat === 'Banking Exams') cat = 'Banking';
        if (cat === 'SSC Exams') cat = 'SSC';
        if (cat === 'Defence Exams') cat = 'Defence';

        liveDateMap[normDate][cat] = (liveDateMap[normDate][cat] || 0) + 1;
      });

      // Update or insert any date from live workflow
      Object.keys(liveDateMap).forEach(d => {
        let total = 0;
        const counts = {};
        categories.forEach(c => {
          counts[c] = liveDateMap[d][c] || 0;
          total += counts[c];
        });
        if (total > 0) {
          rowsMap[d] = { date: d, counts, total };
        }
      });
    }

    // Filter out rows with 0 articles and strictly consider only Q4 OND (October, November, December 2026)
    let rows = Object.values(rowsMap).filter(r => {
      if (!r || !r.total || r.total <= 0) return false;
      const m = (r.date || '').split('/')[0];
      return m === '10' || m === '11' || m === '12';
    });

    // Filter by Month
    if (state.catMonthFilter !== 'all') {
      rows = rows.filter(r => r.date.startsWith(state.catMonthFilter + '/'));
    }

    // Filter by Date Search
    if (state.catDateSearch) {
      rows = rows.filter(r => r.date.toLowerCase().includes(state.catDateSearch));
    }

    // Sort dates from Latest to Old (Descending)
    rows.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      return db - da;
    });

    return { categories, summaryRows, rows };
  }

  function renderCategoryGrid() {
    const { categories, rows } = getActiveCategoryData();
    if (!categories || categories.length === 0) return;

    // Render Day-Wise Breakdown Matrix (Main Table)
    const catTotals = {};
    categories.forEach(c => { catTotals[c] = 0; });
    let grandTotal = 0;

    rows.forEach(r => {
      grandTotal += r.total || 0;
      categories.forEach(c => {
        catTotals[c] += (r.counts[c] || 0);
      });
    });

    if (els.catStatsLabel) {
      els.catStatsLabel.textContent = `${rows.length} days shown (Total: ${grandTotal.toLocaleString()} articles)`;
    }

    if (els.catGridHead) {
      els.catGridHead.innerHTML = `
        <tr>
          <th class="col-sticky" style="min-width:120px; background:#f8fafc;">Date</th>
          ${categories.map(c => `<th class="num-cell" style="min-width:75px;">${c}</th>`).join('')}
          <th class="num-cell" style="background:#f1f5f9; color:#0f172a; min-width:85px; font-weight:700;">Total</th>
        </tr>
      `;
    }

    if (els.catGridBody) {
      let totalsRow = `
        <tr class="total-row">
          <td class="col-sticky" style="font-weight:800;">TOTAL (${rows.length} Days)</td>
          ${categories.map(c => {
            const val = catTotals[c];
            return `<td class="num-cell">${val > 0 ? val.toLocaleString() : '<span class="zero-val">-</span>'}</td>`;
          }).join('')}
          <td class="num-cell" style="color:#1d4ed8; font-size:0.9rem; font-weight:800;">${grandTotal.toLocaleString()}</td>
        </tr>
      `;

      let dataRows = rows.map(r => `
        <tr>
          <td class="col-sticky" style="font-weight:600; font-family:ui-monospace,monospace;">${r.date}</td>
          ${categories.map(c => {
            const count = (r.counts && r.counts[c]) || 0;
            return `<td class="num-cell">${count > 0 ? `<span class="pos-val">${count}</span>` : '<span class="zero-val">-</span>'}</td>`;
          }).join('')}
          <td class="num-cell" style="font-weight:700; color:#0f172a;">${r.total > 0 ? r.total : '<span class="zero-val">0</span>'}</td>
        </tr>
      `).join('');

      els.catGridBody.innerHTML = totalsRow + (dataRows || '<tr><td colspan="26" style="text-align:center; padding:1.5rem; color:#9ca3af;">No dates match the filter.</td></tr>');
    }
  }

  function exportCategoryGridCSV() {
    const { categories, rows } = getActiveCategoryData();
    if (!categories || categories.length === 0) return;

    const headers = ['Date', ...categories.map(c => `"${c}"`), 'Total'];
    const csvLines = [headers.join(',')];

    // Export Daily Rows
    rows.forEach(r => {
      const line = [r.date];
      categories.forEach(c => {
        line.push((r.counts && r.counts[c]) || 0);
      });
      line.push(r.total || 0);
      csvLines.push(line.join(','));
    });

    downloadCSV(csvLines.join('\n'), 'Category_Wise_Date_Breakdown.csv');
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
    return s.includes('done') || 
           s.includes('live') || 
           s.includes('complet') || 
           s.includes('publish') || 
           s.includes('updat') || 
           s === 'yes' || 
           s === 'y' || 
           s === 'dond';
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

    // Sort events from Latest to Old (Descending)
    filteredEvents.sort((a, b) => {
      const da = parseUpcomingDate(a.date);
      const db = parseUpcomingDate(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
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

      // Doc Link (Col O) & WordPress Link (Col P) Action
      let linkHtml = '<span style="color:#94a3b8;">—</span>';
      const docLink = (e.docLink || '').trim();
      const postUrl = (e.url || '').trim();

      const hasDoc = docLink && (docLink.startsWith('http://') || docLink.startsWith('https://'));
      const hasUrl = postUrl && (postUrl.startsWith('http://') || postUrl.startsWith('https://'));

      if (hasDoc && hasUrl) {
        linkHtml = `
          <div style="display:flex; gap:0.3rem; justify-content:center; align-items:center;">
            <a href="${escapeHtml(docLink)}" target="_blank" rel="noopener noreferrer" class="btn-doc-link" title="Open Google Doc">Doc 📄</a>
            <a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="btn-url-link" title="View Published WordPress Post">Visit ↗</a>
          </div>
        `;
      } else if (hasDoc) {
        linkHtml = `<a href="${escapeHtml(docLink)}" target="_blank" rel="noopener noreferrer" class="btn-doc-link" title="Open Google Doc">Doc 📄</a>`;
      } else if (hasUrl) {
        linkHtml = `<a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="btn-url-link" title="View Published WordPress Post">Visit ↗</a>`;
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
          <td style="text-align:center;">${linkHtml}</td>
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

    const headers = ['Date', 'Category', 'Topic', 'Status', 'Status_Type', 'Picked_By', 'Priority', 'Type', 'Doc_Link', 'URL'];
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
        `"${(e.docLink || '').replace(/"/g, '""')}"`,
        `"${(e.url || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Upcoming_Events_${state.upcomingDateFilter}_${state.upcomingCategoryFilter}.csv`;
    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // TAB 5: WORKFLOW <OND> (Live Google Sheet gid: 436581067 Replica)
  // =========================================================================
  function getWorkflowList() {
    let raw = [];
    if (state.sheetsData && Array.isArray(state.sheetsData.workflow_ond) && state.sheetsData.workflow_ond.length > 0) {
      raw = state.sheetsData.workflow_ond;
    } else if (typeof BASELINE_WORKFLOW_DATA !== 'undefined' && Array.isArray(BASELINE_WORKFLOW_DATA)) {
      raw = BASELINE_WORKFLOW_DATA;
    }
    // Filter out rows without a topic, strictly enforce Q4 OND, and normalize writer names
    return raw.filter(item => {
      const topic = (item.topic || '').trim();
      if (!topic || topic === '-' || topic.toLowerCase() === 'topic') return false;
      if (item.date) {
        const d = parseWorkflowDate(item.date);
        if (d) {
          const m = d.getMonth(); // 9 = Oct, 10 = Nov, 11 = Dec
          if (m < 9 || m > 11) return false;
        }
      }
      return true;
    }).map(item => {
      const normW = normalizeWriterName(item.writer);
      if (normW && normW !== item.writer) {
        return { ...item, writer: normW };
      }
      return item;
    });
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
    // match: GViz Date(YYYY, M, D)
    const dMatch = clean.match(/Date\((\d{4}),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)/);
    if (dMatch) {
      const year = parseInt(dMatch[1], 10);
      const month = parseInt(dMatch[2], 10);
      const day = parseInt(dMatch[3], 10);
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
    // Current real-world date anchor: October 7, 2026 midnight
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // If future items exist (e.g. 10/08/2026), anchor Today to realToday so 10/07 is Today and 10/06 is Yesterday!
    const effectiveToday = (maxTime >= realToday) ? realToday : (maxTime || realToday);
    const todayTime = effectiveToday;
    const yesterdayTime = todayTime - dayMs;
    const sevenDaysAgo = todayTime - (7 * dayMs);
    const fourteenDaysAgo = todayTime - (14 * dayMs);
    const thirtyDaysAgo = todayTime - (30 * dayMs);

    // Dynamically update option labels for Today and Yesterday if elements exist
    if (todayTime > 0) {
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

    // Sort tasks from Latest to Old (Descending)
    filteredItems.sort((a, b) => {
      const da = parseWorkflowDate(a.date);
      const db = parseWorkflowDate(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
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
        <div class="kpi-sub">${state.workflowDateFilter === 'last7days' ? 'Last 7 Days (Default)' : (state.workflowDateFilter === 'today' ? 'Today' : (state.workflowDateFilter === 'today_yesterday' ? 'Today & Yesterday' : (state.workflowDateFilter === 'yesterday' ? 'Yesterday' : state.workflowDateFilter)))}</div>
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

      // Topic + Column S Notes Badge (Prioritizes genuine AI audit findings)
      let topicNoteHtml = '';
      const aiRec = state.aiReviewCache && state.aiReviewCache[e.topic];
      const genuineNote = (aiRec && !aiRec.fromSheetSync && aiRec.rejectionReasons && aiRec.rejectionReasons[0])
        ? aiRec.rejectionReasons[0]
        : (e.reviewNotes || '');

      const cleanTopicNote = (/tables?\s*(&|and)?\s*faqs?/i.test(genuineNote) || genuineNote.includes('syllabus tables')) ? '' : genuineNote;

      if (cleanTopicNote) {
        const isRev = (e.reviewStatus || '').toLowerCase().includes('revis') || (e.reviewStatus || '').toLowerCase().includes('reject') || (aiRec && !aiRec.isApproved);
        const badgeColor = isRev ? '#b91c1c' : '#15803d';
        const badgeBg = isRev ? '#fee2e2' : '#dcfce7';
        const badgeIcon = isRev ? '⚠️' : '📝';
        topicNoteHtml = `
          <div style="margin-top:3px; display:inline-flex; align-items:center; gap:0.25rem; background:${badgeBg}; color:${badgeColor}; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px; max-width:100%;" title="${escapeHtml(cleanTopicNote)}">
            <span>${badgeIcon}</span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:260px;">${escapeHtml(cleanTopicNote)}</span>
          </div>
        `;
      }

      rowsHtml += `
        <tr>
          <td style="font-weight:600; color:#334155; white-space:nowrap;">${escapeHtml(e.date)}</td>
          <td>
            <div style="font-weight:600; color:#0f172a; line-height:1.35;">${escapeHtml(e.topic)}</div>
            ${topicNoteHtml}
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

    const headers = ['Date', 'Topic', 'Category', 'Task Type', 'Type', 'Page Type', 'Writer', 'FK', 'Word Count', 'New Content (Doc)', 'URL', 'Review Status', 'Review Notes'];
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
        `"${(e.url || '').replace(/"/g, '""')}"`,
        `"${(e.reviewStatus || '').replace(/"/g, '""')}"`,
        `"${(e.reviewNotes || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Workflow_OND_${state.workflowDateFilter}_${state.workflowCategoryFilter}.csv`;
    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // TAB: News (N & U Daily) & Auto-Assignment & Bandwidth Hub
  // =========================================================================
  function getTaskDuration(taskType) {
    const t = (taskType || '').toString().toLowerCase().trim();
    if (t.includes('lms update') || t === 'lms') return 20;
    if (t.includes('blog update')) return 20;
    if (t.includes('new notification') || t.includes('notification')) return 90;
    if (t.includes('exam page') || t.includes('blog') || t.includes('new page') || t.includes('new blog')) return 60;
    return 60; // Default 1 Hour
  }

  function getTaskTypeBadgeHtml(taskType) {
    const dur = getTaskDuration(taskType);
    const label = taskType || 'General Task';
    if (dur === 20) {
      return `<span class="badge-task-20m">⚡ ${escapeHtml(label)} (20m)</span>`;
    } else if (dur === 90) {
      return `<span class="badge-task-90m">🚨 ${escapeHtml(label)} (90m)</span>`;
    } else {
      return `<span class="badge-task-60m">📝 ${escapeHtml(label)} (60m)</span>`;
    }
  }

  function getNewsList() {
    let baseList = [];
    if (state.sheetsData && Array.isArray(state.sheetsData.news_daily) && state.sheetsData.news_daily.length > 0) {
      baseList = state.sheetsData.news_daily;
    } else if (typeof BASELINE_NEWS_DATA !== 'undefined' && Array.isArray(BASELINE_NEWS_DATA) && BASELINE_NEWS_DATA.length > 0) {
      baseList = BASELINE_NEWS_DATA;
    }

    const combined = [...state.newsCustomAlerts, ...baseList];

    return combined.map((item, idx) => {
      const id = item.id || `news_${idx}_${(item.topic || '').replace(/\W/g, '').substring(0, 15)}`;
      const override = state.newsOverrides[id];
      if (override) {
        return { ...item, ...override, id };
      }
      return { ...item, id };
    });
  }

  function parseNewsDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim();
    
    // Check GViz Date(YYYY, M, D)
    const gvizMatch = s.match(/Date\((\d{4}),\s*(\d+),\s*(\d+)(?:,\s*(\d+),\s*(\d+),\s*(\d+))?\)/);
    if (gvizMatch) {
      return new Date(parseInt(gvizMatch[1], 10), parseInt(gvizMatch[2], 10), parseInt(gvizMatch[3], 10));
    }

    // Check YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }

    // Check M/D/YYYY or MM/DD/YYYY or D/M/YYYY
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const p1 = parseInt(slashMatch[1], 10);
      const p2 = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      if (p1 > 12) {
        return new Date(year, p2 - 1, p1);
      } else {
        return new Date(year, p1 - 1, p2);
      }
    }

    // Check D-Mon-YYYY or D Mon YYYY
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const textMatch = s.match(/(\d{1,2})[\s\-]+([a-zA-Z]{3})[\s\-]+(\d{4})/);
    if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      const mStr = textMatch[2].toLowerCase();
      const year = parseInt(textMatch[3], 10);
      if (months[mStr] !== undefined) {
        return new Date(year, months[mStr], day);
      }
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function getNewsForDateScope(allItems) {
    if (state.newsDateFilter === 'all') return allItems;

    let maxDate = null;
    allItems.forEach(e => {
      const d = parseNewsDate(e.date);
      if (d && (!maxDate || d.getTime() > maxDate.getTime())) {
        maxDate = d;
      }
    });

    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const refDate = (maxDate && maxDate.getTime() >= realToday.getTime()) ? realToday : (maxDate || realToday);
    const refYear = refDate.getFullYear();
    const refMonth = refDate.getMonth();
    const refDay = refDate.getDate();

    const todayStart = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);
    const yesterdayStart = new Date(refYear, refMonth, refDay - 1, 0, 0, 0, 0);
    const last7DaysStart = new Date(refYear, refMonth, refDay - 6, 0, 0, 0, 0);

    if (els.optNewsToday) {
      const dtStr = `${todayStart.getDate()} ${todayStart.toLocaleString('default', { month: 'short' })}`;
      els.optNewsToday.textContent = `Today (${dtStr}) - Default`;
    }
    if (els.optNewsYesterday) {
      const dtStr = `${yesterdayStart.getDate()} ${yesterdayStart.toLocaleString('default', { month: 'short' })}`;
      els.optNewsYesterday.textContent = `Yesterday (${dtStr})`;
    }

    return allItems.filter(e => {
      const d = parseNewsDate(e.date);
      if (!d) return state.newsDateFilter === 'all';
      const t = d.getTime();

      if (state.newsDateFilter === 'today') {
        return t >= todayStart.getTime();
      } else if (state.newsDateFilter === 'yesterday') {
        return t >= yesterdayStart.getTime() && t < todayStart.getTime();
      } else if (state.newsDateFilter === 'today_yesterday') {
        return t >= yesterdayStart.getTime();
      } else if (state.newsDateFilter === 'last7days') {
        return t >= last7DaysStart.getTime();
      }
      return true;
    });
  }

  function getAllWritersList() {
    // Week 1 (05 Oct - 11 Oct 2026): Active News Squad (Team A - 5 Writers)
    return ["Sonika", "Archita", "Shemaila", "Somya", "Mohit"];
  }

  function renderNews(isDateFilterChanged = false) {
    if (!els.sectionNews || els.sectionNews.style.display === 'none') return;

    const allItems = getNewsList();
    const dateScopedItems = getNewsForDateScope(allItems);

    // Live Badge Status
    if (els.newsLiveBadge) {
      const isLive = state.sheetsData && state.sheetsData.news_daily && state.sheetsData.news_daily.length > 0;
      els.newsLiveBadge.innerHTML = isLive ? '🟢 Live Sheet Connected' : '📁 Baseline Snapshot';
      els.newsLiveBadge.style.color = isLive ? '#15803d' : '#475569';
    }

    if (isDateFilterChanged) {
      populateNewsDynamicFilters(dateScopedItems);
    }

    // Filter Items
    const filteredItems = dateScopedItems.filter(e => {
      // Status Filter
      if (state.newsStatusFilter !== 'all') {
        const isDone = isStatusDone(e.status);
        const isUnassigned = !e.writer || e.writer.trim() === '' || e.writer === 'Unassigned' || (e.status || '').toLowerCase().includes('pending');
        if (state.newsStatusFilter === 'done' && !isDone) return false;
        if (state.newsStatusFilter === 'pending' && (!isUnassigned || isDone)) return false;
        if (state.newsStatusFilter === 'in_progress' && (isDone || isUnassigned)) return false;
      }

      // Task Type Filter
      if (state.newsTaskTypeFilter !== 'all') {
        const dur = getTaskDuration(e.taskType);
        if (state.newsTaskTypeFilter === 'lms' && (dur !== 20 || (e.taskType || '').toLowerCase().includes('blog'))) return false;
        if (state.newsTaskTypeFilter === 'blog_update' && (dur !== 20 || !(e.taskType || '').toLowerCase().includes('blog'))) return false;
        if (state.newsTaskTypeFilter === 'exam_page' && dur !== 60) return false;
        if (state.newsTaskTypeFilter === 'new_notification' && dur !== 90) return false;
      }

      // Writer Filter
      if (state.newsWriterFilter !== 'all' && (e.writer || 'Unassigned') !== state.newsWriterFilter) {
        return false;
      }

      // Search
      if (state.newsSearch) {
        const q = state.newsSearch;
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.writer && e.writer.toLowerCase().includes(q)) ||
                      (e.taskType && e.taskType.toLowerCase().includes(q)) ||
                      (e.date && e.date.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    // Sort tasks chronologically (most recent first)
    filteredItems.sort((a, b) => {
      const da = parseNewsDate(a.date);
      const db = parseNewsDate(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    renderWriterPresence(dateScopedItems);
    renderNewsKpis(filteredItems, dateScopedItems.length);
    renderNewsTable(filteredItems);

    if (els.newsCountLabel) {
      els.newsCountLabel.textContent = `Showing ${filteredItems.length} of ${dateScopedItems.length} events`;
    }
  }

  function renderWriterPresence(scopedItems) {
    if (!els.writerPresenceGrid) return;

    const allWriters = getAllWritersList();
    if (allWriters.length === 0) {
      els.writerPresenceGrid.innerHTML = `<div style="color:#64748b; font-size:0.8rem;">No writers loaded.</div>`;
      return;
    }

    // Calculate workloads from scoped tasks that are NOT done
    const workloads = {};
    allWriters.forEach(w => {
      workloads[w] = { count: 0, minutes: 0, currentTask: null };
    });

    scopedItems.forEach(item => {
      const w = (item.writer || '').trim();
      if (w && workloads[w] && !isStatusDone(item.status)) {
        workloads[w].count += 1;
        workloads[w].minutes += getTaskDuration(item.taskType);
        if (!workloads[w].currentTask) {
          workloads[w].currentTask = item.topic;
        }
      }
    });

    let gridHtml = '';
    allWriters.forEach(writer => {
      const status = state.writerStatuses[writer] || 'active'; // 'active' | 'break' | 'leave'
      const wl = workloads[writer] || { count: 0, minutes: 0, currentTask: null };
      
      let meterPct = Math.min(100, Math.round((wl.minutes / 240) * 100)); // 240m (4hr) nominal full buffer
      let meterColor = '#22c55e'; // Green
      if (wl.minutes > 60 && wl.minutes <= 120) meterColor = '#eab308'; // Amber
      if (wl.minutes > 120) meterColor = '#ef4444'; // Red
      if (status === 'leave') meterColor = '#94a3b8';

      let statusBadge = '';
      if (status === 'active') {
        statusBadge = `<span class="presence-badge status-active">🟢 Active</span>`;
      } else if (status === 'break') {
        statusBadge = `<span class="presence-badge status-break">☕ Break / Lunch</span>`;
      } else {
        statusBadge = `<span class="presence-badge status-leave">🔴 On Leave</span>`;
      }

      const activeTaskText = wl.currentTask ? escapeHtml(wl.currentTask) : (status === 'active' ? 'Idle — Ready for Tasks' : (status === 'break' ? 'On Break' : 'On Leave'));

      gridHtml += `
        <div class="writer-presence-card ${status !== 'active' ? 'is-inactive' : ''}" data-writer="${escapeHtml(writer)}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.35rem;">
            <div>
              <div style="font-weight:700; font-size:0.85rem; color:#0f172a;">${escapeHtml(writer)}</div>
              <div style="font-size:0.7rem; color:#64748b; margin-top:1px;">${statusBadge}</div>
            </div>
            <div style="text-align:right;">
              <span class="presence-task-count" style="background:${wl.count > 0 ? '#e0f2fe' : '#f1f5f9'}; color:${wl.count > 0 ? '#0369a1' : '#64748b'};">
                ${wl.count} task${wl.count === 1 ? '' : 's'} (${wl.minutes}m)
              </span>
            </div>
          </div>

          <!-- Bandwidth Utilization Bar -->
          <div style="margin: 0.35rem 0;">
            <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:#64748b; margin-bottom:2px;">
              <span>Bandwidth:</span>
              <span style="font-weight:600; color:${meterColor};">${wl.minutes} min load</span>
            </div>
            <div class="bandwidth-meter-bg">
              <div class="bandwidth-meter-bar" style="width:${meterPct}%; background:${meterColor};"></div>
            </div>
          </div>

          <div style="font-size:0.72rem; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:0.45rem;" title="${escapeHtml(activeTaskText)}">
            <span style="color:#94a3b8;">Task:</span> <strong>${activeTaskText}</strong>
          </div>

          <!-- 1-Click Status Toggles -->
          <div class="presence-btn-group">
            <button type="button" class="btn-presence-toggle ${status === 'active' ? 'active-green' : ''}" data-writer="${escapeHtml(writer)}" data-newstatus="active" title="Mark Active">🟢 Active</button>
            <button type="button" class="btn-presence-toggle ${status === 'break' ? 'active-amber' : ''}" data-writer="${escapeHtml(writer)}" data-newstatus="break" title="Mark on Break / Lunch">☕ Break</button>
            <button type="button" class="btn-presence-toggle ${status === 'leave' ? 'active-red' : ''}" data-writer="${escapeHtml(writer)}" data-newstatus="leave" title="Mark on Leave">🔴 Leave</button>
          </div>
        </div>
      `;
    });

    els.writerPresenceGrid.innerHTML = gridHtml;

    // Attach click listeners for 1-click status switcher
    els.writerPresenceGrid.querySelectorAll('.btn-presence-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const writer = btn.dataset.writer;
        const newStatus = btn.dataset.newstatus;
        if (!writer || !newStatus) return;

        state.writerStatuses[writer] = newStatus;
        saveWriterStatuses(state.writerStatuses);
        renderNews(false);

        // 2-Way Live Sync: Post to Google Sheet Web App
        if (typeof sheetsClient !== 'undefined' && typeof sheetsClient.updateWriterPresence === 'function') {
          sheetsClient.updateWriterPresence(writer, newStatus).then(res => {
            console.log(`✓ Presence update sent for ${writer} -> ${newStatus}`);
          });
        }
      });
    });
  }

  function renderNewsKpis(filteredItems, totalInScope) {
    if (!els.newsKpiCards) return;

    const totalEvents = filteredItems.length;
    let totalMinutes = 0;
    let doneCount = 0;
    let pendingCount = 0;
    const writersSet = new Set();

    filteredItems.forEach(e => {
      totalMinutes += getTaskDuration(e.taskType);
      if (isStatusDone(e.status)) {
        doneCount++;
      } else {
        pendingCount++;
      }
      if (e.writer && e.writer.trim() && e.writer.trim() !== 'Unassigned') {
        writersSet.add(e.writer.trim());
      }
    });

    const completionRate = totalEvents > 0 ? Math.round((doneCount / totalEvents) * 100) : 0;
    const hours = (totalMinutes / 60).toFixed(1);

    // Count Active vs Break vs Leave
    const allWriters = getAllWritersList();
    let activeWritersCount = 0;
    allWriters.forEach(w => {
      if ((state.writerStatuses[w] || 'active') === 'active') activeWritersCount++;
    });

    els.newsKpiCards.innerHTML = `
      <div class="kpi-card kpi-planned">
        <div class="kpi-label">🚨 Total Breaking Events</div>
        <div class="kpi-val" style="color:#1d4ed8;">${totalEvents.toLocaleString()}</div>
        <div class="kpi-sub">${state.newsDateFilter === 'today' ? 'Today (Default)' : (state.newsDateFilter === 'yesterday' ? 'Yesterday' : state.newsDateFilter)}</div>
      </div>
      <div class="kpi-card kpi-rate">
        <div class="kpi-label">⏱️ Total Workload Weight</div>
        <div class="kpi-val" style="color:#7c3aed;">${totalMinutes} <span style="font-size:0.85rem; font-weight:normal; color:#6b7280;">min (${hours}h)</span></div>
        <div class="kpi-sub">Weighted (20m / 60m / 90m)</div>
      </div>
      <div class="kpi-card kpi-done">
        <div class="kpi-label">👥 Active Writers Available</div>
        <div class="kpi-val" style="color:#059669;">${activeWritersCount} <span style="font-size:0.8rem; font-weight:normal; color:#6b7280;">/ ${allWriters.length}</span></div>
        <div class="kpi-sub">Available for auto-dispatch</div>
      </div>
      <div class="kpi-card kpi-pending">
        <div class="kpi-label">⚡ Live &amp; Pending Tasks</div>
        <div class="kpi-val" style="color:#15803d;">${doneCount} <span style="font-size:0.85rem; color:#e11d48; font-weight:600;">(${pendingCount} pending)</span></div>
        <div class="kpi-sub">${completionRate}% completion rate</div>
      </div>
    `;
  }

  function populateNewsDynamicFilters(dateScopedItems) {
    if (els.newsWriterFilter) {
      const writerCounts = {};
      dateScopedItems.forEach(e => {
        const w = (e.writer || 'Unassigned').trim();
        writerCounts[w] = (writerCounts[w] || 0) + 1;
      });
      const sortedWriters = Object.keys(writerCounts).sort((a, b) => writerCounts[b] - writerCounts[a]);
      const currentWriter = state.newsWriterFilter;
      els.newsWriterFilter.innerHTML = `<option value="all">All Writers (${Object.keys(writerCounts).length})</option>`;
      sortedWriters.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `${w} (${writerCounts[w]})`;
        if (w === currentWriter) opt.selected = true;
        els.newsWriterFilter.appendChild(opt);
      });
      if (currentWriter !== 'all' && !writerCounts[currentWriter]) {
        state.newsWriterFilter = 'all';
        els.newsWriterFilter.value = 'all';
      }
    }
  }

  function renderNewsTable(items) {
    if (!els.newsTableBody) return;

    if (items.length === 0) {
      els.newsTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:3rem; color:#64748b;">
            <div style="font-size:1.5rem; margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:600;">No news/alert tasks match the current filter.</div>
            <div style="font-size:0.8rem; margin-top:0.25rem;">Try changing the date scope, clearing search, or clicking "Add Breaking Alert".</div>
          </td>
        </tr>
      `;
      return;
    }

    const allWriters = getAllWritersList();
    let rowsHtml = '';

    items.forEach((e, idx) => {
      const dur = getTaskDuration(e.taskType);
      const taskBadgeHtml = getTaskTypeBadgeHtml(e.taskType);
      const isDone = isStatusDone(e.status);
      const isUnassigned = !e.writer || e.writer.trim() === '' || e.writer === 'Unassigned';

      // Status Pill
      let statusHtml = '';
      if (isDone) {
        statusHtml = `<span class="badge-status-done">✅ Live / Done</span>`;
      } else if (isUnassigned) {
        statusHtml = `<span class="badge-status-pending">⏳ Unassigned</span>`;
      } else {
        statusHtml = `<span class="badge-status-prog">⚡ In Progress</span>`;
      }

      // Writer Display with Quick Reassign dropdown
      let writerHtml = '';
      if (isUnassigned) {
        writerHtml = `<span class="writer-pill" style="background:#fee2e2; color:#b91c1c; font-weight:600;">Unassigned</span>`;
      } else {
        const wStatus = state.writerStatuses[e.writer] || 'active';
        let statusDot = '🟢';
        if (wStatus === 'break') statusDot = '☕';
        if (wStatus === 'leave') statusDot = '🔴';
        writerHtml = `<span class="writer-pill" title="Status: ${wStatus}">${statusDot} ${escapeHtml(e.writer)}</span>`;
      }

      // Live URL
      let urlLinkHtml = '<span style="color:#94a3b8;">—</span>';
      if (e.url) {
        let fullUrl = e.url;
        if (fullUrl.startsWith('/')) fullUrl = 'https://testbook.com' + fullUrl;
        if (fullUrl.startsWith('http')) {
          urlLinkHtml = `<a href="${escapeHtml(fullUrl)}" target="_blank" rel="noopener noreferrer" class="btn-url-link">Visit ↗</a>`;
        }
      }

      const assignedAtFormatted = e.assignedAt ? escapeHtml(e.assignedAt) : '—';

      rowsHtml += `
        <tr>
          <td style="text-align:center; color:#94a3b8; font-size:0.75rem;">${idx + 1}</td>
          <td style="font-weight:600; color:#334155; white-space:nowrap;">${escapeHtml(e.date || 'Today')}</td>
          <td>
            <div style="font-weight:700; color:#0f172a; line-height:1.35;">${escapeHtml(e.topic)}</div>
            ${e.priority ? `<span style="font-size:0.65rem; color:#dc2626; font-weight:700; text-transform:uppercase;">🔥 High Priority</span>` : ''}
          </td>
          <td>${taskBadgeHtml}</td>
          <td><span class="badge-cat">${escapeHtml(e.category || 'General')}</span></td>
          <td>${writerHtml}</td>
          <td style="text-align:center;">${urlLinkHtml}</td>
          <td style="text-align:center;">${statusHtml}</td>
          <td style="color:#64748b; font-size:0.75rem; white-space:nowrap;">${assignedAtFormatted}</td>
        </tr>
      `;
    });

    els.newsTableBody.innerHTML = rowsHtml;
  }

  // =========================================================================
  // Auto-Assignment Logic & Heuristics
  // =========================================================================
  function findBestWriterForTask(taskType, category, simulatedWorkloads) {
    const allWriters = getAllWritersList();
    if (allWriters.length === 0) return 'Unassigned';

    // 1. Filter only candidates with status === 'active'
    const activeCandidates = allWriters.filter(w => {
      const st = state.writerStatuses[w] || 'active';
      return st === 'active';
    });

    if (activeCandidates.length === 0) {
      // Fallback: pick any writer if all are marked on break/leave
      return allWriters[0];
    }

    // 2. Anti-piling constraint: Prefer writers with pending tasks < 2
    let candidatePool = activeCandidates.filter(w => {
      const wl = simulatedWorkloads[w] || { count: 0, minutes: 0 };
      return wl.count < 2;
    });

    // If all active writers have 2+ tasks, expand to full active pool
    if (candidatePool.length === 0) {
      candidatePool = activeCandidates;
    }

    // 3. Earliest Free Time (EFT): Pick candidate with minimum pending minutes
    let bestWriter = candidatePool[0];
    let minScore = 99999;

    candidatePool.forEach(writer => {
      const wl = simulatedWorkloads[writer] || { count: 0, minutes: 0 };
      let score = wl.minutes;

      // Affinity bonus: if writer matches category history, give a minor 5 min boost
      score += (wl.count * 10);

      if (score < minScore) {
        minScore = score;
        bestWriter = writer;
      }
    });

    return bestWriter;
  }

  function autoAssignAllPending() {
    const allItems = getNewsList();
    const dateScopedItems = getNewsForDateScope(allItems);

    // Calculate current workloads for active tasks
    const simulatedWorkloads = {};
    getAllWritersList().forEach(w => {
      simulatedWorkloads[w] = { count: 0, minutes: 0 };
    });

    dateScopedItems.forEach(item => {
      const w = (item.writer || '').trim();
      if (w && simulatedWorkloads[w] && !isStatusDone(item.status)) {
        simulatedWorkloads[w].count += 1;
        simulatedWorkloads[w].minutes += getTaskDuration(item.taskType);
      }
    });

    let assignedCount = 0;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    dateScopedItems.forEach(item => {
      const isUnassigned = !item.writer || item.writer.trim() === '' || item.writer === 'Unassigned';
      if (isUnassigned && !isStatusDone(item.status)) {
        const assignedWriter = findBestWriterForTask(item.taskType, item.category, simulatedWorkloads);
        if (assignedWriter && assignedWriter !== 'Unassigned') {
          const taskDur = getTaskDuration(item.taskType);
          simulatedWorkloads[assignedWriter].count += 1;
          simulatedWorkloads[assignedWriter].minutes += taskDur;

          state.newsOverrides[item.id] = {
            writer: assignedWriter,
            status: 'In Progress',
            assignedAt: nowTimeStr
          };
          assignedCount++;
        }
      }
    });

    renderNews(false);

    if (assignedCount > 0) {
      alert(`⚡ Smart Auto-Assignment Complete!\n\nSuccessfully assigned ${assignedCount} pending task(s) across active team writers based on bandwidth and task weights.`);
    } else {
      alert('ℹ️ All tasks in current date scope are already assigned.');
    }
  }

  function handleAddNewsSubmit(e) {
    e.preventDefault();
    const topic = (els.inputNewsTopic ? els.inputNewsTopic.value : '').trim();
    const taskType = els.selectNewsTaskType ? els.selectNewsTaskType.value : 'LMS Update';
    const category = els.selectNewsCategory ? els.selectNewsCategory.value : 'General';
    const assignMode = els.selectNewsAssignMode ? els.selectNewsAssignMode.value : 'auto';

    if (!topic) return;

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const nowTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let assignedWriter = 'Unassigned';
    let status = 'Pending';
    let assignedAt = '';

    if (assignMode === 'auto') {
      const simulatedWorkloads = {};
      getAllWritersList().forEach(w => {
        simulatedWorkloads[w] = { count: 0, minutes: 0 };
      });
      const allNews = getNewsList();
      allNews.forEach(n => {
        const w = (n.writer || '').trim();
        if (w && simulatedWorkloads[w] && !isStatusDone(n.status)) {
          simulatedWorkloads[w].count += 1;
          simulatedWorkloads[w].minutes += getTaskDuration(n.taskType);
        }
      });

      assignedWriter = findBestWriterForTask(taskType, category, simulatedWorkloads);
      status = 'In Progress';
      assignedAt = nowTimeStr;
    }

    const newAlertItem = {
      id: `custom_alert_${Date.now()}`,
      date: dateStr,
      topic: topic,
      taskType: taskType,
      category: category,
      writer: assignedWriter,
      status: status,
      url: '',
      priority: 'High',
      assignedAt: assignedAt
    };

    state.newsCustomAlerts.unshift(newAlertItem);

    // 2-Way Live Sync: Post new event to Google Sheet N & U Daily
    if (typeof sheetsClient !== 'undefined' && typeof sheetsClient.addBreakingEvent === 'function') {
      sheetsClient.addBreakingEvent({
        topic: topic,
        taskType: taskType,
        category: category,
        assignMode: assignMode
      }).then(() => {
        console.log(`✓ Breaking event posted to Google Sheet: ${topic}`);
      });
    }

    if (els.modalAddNews) els.modalAddNews.style.display = 'none';
    if (els.formAddNews) els.formAddNews.reset();

    renderNews(false);
  }

  function exportNewsCSV() {
    const allItems = getNewsList();
    const dateScopedItems = getNewsForDateScope(allItems);

    const filteredItems = dateScopedItems.filter(e => {
      if (state.newsStatusFilter !== 'all') {
        const isDone = isStatusDone(e.status);
        const isUnassigned = !e.writer || e.writer.trim() === '' || e.writer === 'Unassigned';
        if (state.newsStatusFilter === 'done' && !isDone) return false;
        if (state.newsStatusFilter === 'pending' && (!isUnassigned || isDone)) return false;
        if (state.newsStatusFilter === 'in_progress' && (isDone || isUnassigned)) return false;
      }
      if (state.newsWriterFilter !== 'all' && (e.writer || 'Unassigned') !== state.newsWriterFilter) return false;
      if (state.newsSearch) {
        const q = state.newsSearch;
        const match = (e.topic && e.topic.toLowerCase().includes(q)) ||
                      (e.category && e.category.toLowerCase().includes(q)) ||
                      (e.writer && e.writer.toLowerCase().includes(q)) ||
                      (e.taskType && e.taskType.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });

    const headers = ['Date', 'Topic & Event', 'Task Type', 'Duration (Min)', 'Category', 'Assigned Writer', 'Status', 'Live URL', 'Assigned At'];
    const csvLines = [headers.join(',')];

    filteredItems.forEach(e => {
      const dur = getTaskDuration(e.taskType);
      const row = [
        `"${(e.date || '').replace(/"/g, '""')}"`,
        `"${(e.topic || '').replace(/"/g, '""')}"`,
        `"${(e.taskType || '').replace(/"/g, '""')}"`,
        `"${dur}"`,
        `"${(e.category || '').replace(/"/g, '""')}"`,
        `"${(e.writer || '').replace(/"/g, '""')}"`,
        `"${(e.status || '').replace(/"/g, '""')}"`,
        `"${(e.url || '').replace(/"/g, '""')}"`,
        `"${(e.assignedAt || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `News_N_and_U_Daily_${state.newsDateFilter}_${Date.now()}.csv`;
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

  function parseCalendarDate(str) {
    if (!str) return 0;
    const clean = String(str).trim().toLowerCase();
    if (!clean || clean === '-' || clean === 'tbd' || clean === 'na') return 0;

    let year = 2026;
    if (clean.includes('2027')) {
      year = 2027;
    } else if (clean.includes('2025')) {
      year = 2025;
    }

    const months = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sept: 8, sep: 8,
      octobber: 9, october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11
    };

    let month = -1;
    for (const [mName, mIdx] of Object.entries(months)) {
      const regex = new RegExp(`\\b${mName}\\b`, 'i');
      if (regex.test(clean)) {
        month = mIdx;
        break;
      }
    }

    if (month === -1) return 0;
    if ((month === 0 || month === 1) && !clean.includes('2026') && !clean.includes('2025')) {
      year = 2027;
    }

    let day = 15;
    if (clean.includes('1st week') || clean.includes('first week')) {
      day = 7;
    } else if (clean.includes('2nd week') || clean.includes('second week')) {
      day = 14;
    } else if (clean.includes('3rd week') || clean.includes('third week')) {
      day = 21;
    } else if (clean.includes('4th week') || clean.includes('fourth week') || clean.includes('last week') || clean.includes('last')) {
      day = 28;
    } else {
      const withoutYear = clean.replace(/\b20\d\d\b/g, '');
      const dayMatch = withoutYear.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dayMatch) {
        const d = parseInt(dayMatch[1], 10);
        if (d >= 1 && d <= 31) day = d;
      }
    }

    return new Date(year, month, day).getTime();
  }

  function compareCalendarEvents(a, b) {
    const ta = parseCalendarDate(a.expectedDate);
    const tb = parseCalendarDate(b.expectedDate);
    if (ta === 0 && tb === 0) return 0;
    if (ta === 0) return 1;
    if (tb === 0) return -1;
    return ta - tb;
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

    // Sort months chronologically starting with immediate upcoming (Sep -> Oct -> Nov -> Dec -> Jan 2027)
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

    // Sort events from immediate upcoming chronologically (Sep -> Oct -> Nov -> Dec -> Jan 2027)
    filtered.sort(compareCalendarEvents);

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

    // Sort exported CSV from immediate upcoming chronologically (Sep -> Oct -> Nov -> Dec -> Jan 2027)
    filtered.sort(compareCalendarEvents);

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
  // TAB 8: Editorial Review & Value-Impact Points Hub (Live Workflow <OND>)
  // =========================================================================
  function normalizeReviewDate(dStr) {
    if (!dStr) return '';
    const clean = String(dStr).trim();
    const dMatch = clean.match(/Date\((\d{4}),\s*(\d+),\s*(\d+)/);
    if (dMatch) {
      const y = dMatch[1];
      const mo = String(parseInt(dMatch[2], 10) + 1).padStart(2, '0');
      const dy = String(dMatch[3]).padStart(2, '0');
      return `${mo}/${dy}/${y}`;
    }
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      let m = parseInt(parts[0], 10);
      let d = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
        return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
      }
    }
    return clean;
  }

  function normalizeWriterName(rawName) {
    if (!rawName) return '';
    const clean = String(rawName).trim();
    const lower = clean.toLowerCase();
    if (!clean || clean === '-' || lower === 'unassigned' || lower === 'na' || lower === 'n/a') {
      return '';
    }
    // Specific compound/full name checks first
    if (lower === 'shilpa singh' || lower === 'shilpasingh' || lower === 'shilpa s' || lower === 'shilpa.s') {
      return 'Shilpa Singh';
    }
    if (lower === 'archana singh' || lower === 'archanasingh' || lower === 'archana s') {
      return 'Archana';
    }
    if (lower === 'sumit kumar' || lower === 'sumitkumar' || lower === 'sumit k') {
      return 'Sumit Kumar';
    }
    if (lower === 'manickavalli' || lower === 'manicka valli' || lower === 'manickavalli ') {
      return 'Manicka';
    }
    if (lower === 'mahasetha' || lower === 'mahasweta' || lower === 'mahsetha' || lower === 'mahaseta') {
      return 'Mahasetha';
    }

    // Direct and single-name mappings (Shilpa -> Shilpa Kohli)
    if (lower === 'shilpa' || lower === 'shilpa kohli' || lower === 'shilpakohli' || lower === 'shilpa k' || lower === 'shilpa.k') {
      return 'Shilpa Kohli';
    }
    if (lower === 'archana') {
      return 'Archana';
    }
    if (lower === 'manicka') {
      return 'Manicka';
    }
    if (lower === 'sumit') {
      return 'Sumit Kumar';
    }
    if (lower === 'shemaila' || lower === 'samaila' || lower === 'shem' || lower === 'shemail') {
      return 'Shemaila';
    }
    if (lower === 'sonika' || lower === 'sonika sharma') {
      return 'Sonika';
    }
    if (lower === 'archita' || lower === 'archita ray') {
      return 'Archita';
    }
    if (lower === 'somya' || lower === 'saumya' || lower === 'somya mishra') {
      return 'Somya';
    }
    if (lower === 'mohit' || lower === 'mohit kumar') {
      return 'Mohit';
    }
    if (lower === 'nadeem' || lower === 'nadeem khan') {
      return 'Nadeem';
    }
    if (lower === 'aditi' || lower === 'aditi sharma') {
      return 'Aditi';
    }
    if (lower === 'atul' || lower === 'atul kumar') {
      return 'Atul';
    }
    if (lower === 'trishala' || lower === 'trishla') {
      return 'Trishala';
    }
    if (lower === 'lehron' || lower === 'lehran') {
      return 'Lehron';
    }
    if (lower === 'dhananjay' || lower === 'dhananjay kumar') {
      return 'Dhananjay';
    }
    if (lower === 'falguni' || lower === 'falguni goswami') {
      return 'Falguni';
    }
    if (lower === 'swathi' || lower === 'swati') {
      return 'Swathi';
    }
    if (lower === 'anshika' || lower === 'anshika verma') {
      return 'Anshika';
    }
    if (lower === 'vidit' || lower === 'vidit sharma') {
      return 'Vidit';
    }
    if (lower === 'prabodh' || lower === 'prabodh kumar') {
      return 'Prabodh';
    }

    return clean;
  }

  function getReviewList() {
    let list = [];
    if (state.sheetsData && state.sheetsData.workflow_ond && state.sheetsData.workflow_ond.length > 0) {
      list = state.sheetsData.workflow_ond;
    } else if (typeof BASELINE_WORKFLOW_DATA !== 'undefined' && BASELINE_WORKFLOW_DATA.length > 0) {
      list = BASELINE_WORKFLOW_DATA;
    }
    return list.map(item => {
      const normW = normalizeWriterName(item.writer);
      if (normW && normW !== item.writer) {
        return { ...item, writer: normW };
      }
      return item;
    });
  }

  let lastReviewItemCount = 0;
  function populateReviewFilters(items, force = false) {
    if (!els.reviewWriterFilter) return;
    if (!force && lastReviewItemCount === items.length && items.length > 0) return;
    lastReviewItemCount = items.length;

    const currentSelectedDate = (els.reviewDateFilter && els.reviewDateFilter.value) || state.reviewDateFilter || 'all';
    const currentSelectedWriter = (els.reviewWriterFilter && els.reviewWriterFilter.value) || state.reviewWriterFilter || 'all';
    const currentSelectedCat = (els.reviewCategoryFilter && els.reviewCategoryFilter.value) || state.reviewCategoryFilter || 'all';

    const writersSet = new Set();
    const categoriesSet = new Set();
    const datesSet = new Set();

    items.forEach(item => {
      const normW = normalizeWriterName(item.writer);
      if (normW && normW !== '-' && normW !== 'Unassigned') {
        writersSet.add(normW);
      }
      if (item.category && item.category !== '-') {
        categoriesSet.add(item.category);
      }
      if (item.date && item.date.trim() && item.date.trim() !== '-') {
        datesSet.add(normalizeReviewDate(item.date));
      }
    });

    // Populate Dates (Descending: Latest First)
    if (els.reviewDateFilter) {
      const sortedDates = Array.from(datesSet).sort((a, b) => {
        const pa = a.split('/').map(n => parseInt(n, 10));
        const pb = b.split('/').map(n => parseInt(n, 10));
        const da = new Date(pa[2], pa[0] - 1, pa[1]).getTime() || 0;
        const db = new Date(pb[2], pb[0] - 1, pb[1]).getTime() || 0;
        return db - da;
      });

      els.reviewDateFilter.innerHTML = `<option value="all">📅 All Dates (${items.length} total)</option>`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      sortedDates.forEach(d => {
        const count = items.filter(it => normalizeReviewDate(it.date) === d).length;
        const opt = document.createElement('option');
        opt.value = d;
        const parts = d.split('/');
        let friendly = d;
        if (parts.length === 3) {
          const mIdx = parseInt(parts[0], 10) - 1;
          const dayNum = parseInt(parts[1], 10);
          if (mIdx >= 0 && mIdx < 12) {
            friendly = `${String(dayNum).padStart(2, '0')} ${monthNames[mIdx]} ${parts[2]}`;
          }
        }
        opt.textContent = `📅 ${d} (${friendly}) — ${count} items`;
        els.reviewDateFilter.appendChild(opt);
      });

      if (currentSelectedDate && Array.from(els.reviewDateFilter.options).some(o => o.value === currentSelectedDate)) {
        els.reviewDateFilter.value = currentSelectedDate;
        state.reviewDateFilter = currentSelectedDate;
      }
    }

    // Populate Writers
    els.reviewWriterFilter.innerHTML = `<option value="all">All Writers</option>`;
    Array.from(writersSet).sort().forEach(w => {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      els.reviewWriterFilter.appendChild(opt);
    });
    if (currentSelectedWriter && Array.from(els.reviewWriterFilter.options).some(o => o.value === currentSelectedWriter)) {
      els.reviewWriterFilter.value = currentSelectedWriter;
    }

    // Populate Categories
    if (els.reviewCategoryFilter) {
      els.reviewCategoryFilter.innerHTML = `<option value="all">All Categories</option>`;
      Array.from(categoriesSet).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        els.reviewCategoryFilter.appendChild(opt);
      });
      if (currentSelectedCat && Array.from(els.reviewCategoryFilter.options).some(o => o.value === currentSelectedCat)) {
        els.reviewCategoryFilter.value = currentSelectedCat;
      }
    }
  }

  function getEffectiveReviewStatus(item) {
    if (state.reviewOverrides && state.reviewOverrides[item.topic]) {
      return state.reviewOverrides[item.topic];
    }
    
    // Check AI cache first if present
    const ai = (state.aiReviewCache && state.aiReviewCache[item.topic]) ? state.aiReviewCache[item.topic] : null;
    
    const raw = (item.reviewStatus || '').trim();
    if (raw.toLowerCase().includes('doc missing') || raw.toLowerCase().includes('missing doc') || (!item.newDoc && !item.url)) {
      return 'Doc Missing';
    }
    
    // User's exact rules on Sheet Synced & AI data:
    const tt = (item.taskType || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const isUpdateOrOpt = type.includes('update') || type.includes('optimi') || type.includes('refresh') ||
                          tt.includes('update') || tt.includes('optimi') || tt.includes('refresh');
    const hasOldDoc = item.oldDoc && item.oldDoc.startsWith('http');

    // MANDATORY RULE: If task is an Update or Optimization, Old Doc is compulsory! If missing, reject!
    if (isUpdateOrOpt && !hasOldDoc) {
      return 'Needs Revision';
    }

    const isNews = tt.includes('news') || (item.classification || '').toLowerCase().includes('news');
    const isOpt = hasOldDoc || isUpdateOrOpt;
    
    const rwMatch = (ai?.docWordCountText || '').match(/~(\d+)w Rewritten/i) || (ai?.docWordCountText || '').match(/~(\d+)w Revamped/i);
    const rewritten = ai?.rewrittenWords || (rwMatch ? parseInt(rwMatch[1], 10) : 0);
    const net = (ai?.netWordDiff !== undefined && ai?.netWordDiff !== null) ? ai.netWordDiff : 0;
    const newWc = ai?.newDocWordCount || parseInt(item.wordCount, 10) || 0;
    const effort = isOpt ? (rewritten > 0 ? rewritten : (net > 0 ? net : newWc)) : newWc;

    if (isNews && isOpt) {
      if (effort < 350) return 'Needs Revision';
    } else if (isNews && !isOpt) {
      if (effort < 500) return 'Needs Revision';
    } else if (isOpt) {
      if (effort < 700) return 'Needs Revision';
    } else {
      if (effort < 800) return 'Needs Revision';
    }

    if (ai) {
      return ai.verdict;
    }
    if (raw.toLowerCase().includes('approv')) {
      return 'Approved';
    }
    if (raw.toLowerCase().includes('revis') || raw.toLowerCase().includes('reject')) {
      return 'Needs Revision';
    }
    return 'Pending Review';
  }

  function getFilteredReviewItems() {
    const allItems = getReviewList();
    return allItems.filter(item => {
      const status = getEffectiveReviewStatus(item);
      const tt = (item.taskType || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const pt = (item.pageType || '').toLowerCase();
      const cl = (item.classification || '').toLowerCase();

      // Date Filter
      if (state.reviewDateFilter && state.reviewDateFilter !== 'all') {
        const itemDate = normalizeReviewDate(item.date);
        if (itemDate !== state.reviewDateFilter) return false;
      }

      // Task Type Filter (Prep, Optimization, High Intent, New Content, News)
      if (state.reviewTaskTypeFilter !== 'all') {
        const tf = state.reviewTaskTypeFilter;
        if (tf === 'prep' && !cat.includes('prep') && !tt.includes('prep') && !domain.includes('prep') && !['lehron','dhananjay','falguni','swathi','sumit kumar','manicka'].includes(wLower)) return false;
        if (tf === 'optimization' && !tt.includes('optimi') && !cl.includes('optimization') && !cl.includes('refresh') && !(item.oldDoc && item.oldDoc.startsWith('http'))) return false;
        if (tf === 'high_intent' && !tt.includes('high in') && !tt.includes('pyp') && !pt.includes('ts') && !cl.includes('high intent')) return false;
        if (tf === 'new_content' && (type !== 'new' && !tt.includes('new content'))) return false;
        if (tf === 'news' && !tt.includes('news') && !cl.includes('news')) return false;
      }

      // Review Status Filter
      if (state.reviewStatusFilter === 'pending' && status !== 'Pending Review') return false;
      if (state.reviewStatusFilter === 'approved' && status !== 'Approved') return false;
      if (state.reviewStatusFilter === 'needs_revision' && status !== 'Needs Revision') return false;

      // Writer Filter
      if (state.reviewWriterFilter !== 'all') {
        const itemW = normalizeWriterName(item.writer);
        const filterW = normalizeWriterName(state.reviewWriterFilter);
        if (itemW.toLowerCase() !== filterW.toLowerCase()) return false;
      }
      // Category Filter
      if (state.reviewCategoryFilter !== 'all' && item.category !== state.reviewCategoryFilter) return false;

      // Search
      if (state.reviewSearch) {
        const q = state.reviewSearch.toLowerCase();
        const match = (item.topic && item.topic.toLowerCase().includes(q)) ||
                      (item.fk && item.fk.toLowerCase().includes(q)) ||
                      (item.writer && item.writer.toLowerCase().includes(q)) ||
                      (item.category && item.category.toLowerCase().includes(q)) ||
                      (item.taskType && item.taskType.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }

  function getActiveFilterSummary() {
    const parts = [];
    if (state.reviewDateFilter && state.reviewDateFilter !== 'all') parts.push(`Date: ${state.reviewDateFilter}`);
    if (state.reviewWriterFilter && state.reviewWriterFilter !== 'all') parts.push(`Writer: ${state.reviewWriterFilter}`);
    if (state.reviewTaskTypeFilter && state.reviewTaskTypeFilter !== 'all') {
      const typeLabels = {
        prep: 'Exam Prep',
        optimization: 'Optimization / Update',
        high_intent: 'High Intent / PYP',
        new_content: 'New Content / Fresh',
        news: 'News Articles'
      };
      parts.push(`Type: ${typeLabels[state.reviewTaskTypeFilter] || state.reviewTaskTypeFilter}`);
    }
    if (state.reviewStatusFilter && state.reviewStatusFilter !== 'all') {
      const statusLabels = {
        pending: 'Pending Review',
        approved: 'Approved',
        needs_revision: 'Needs Revision'
      };
      parts.push(`Status: ${statusLabels[state.reviewStatusFilter] || state.reviewStatusFilter}`);
    }
    if (state.reviewCategoryFilter && state.reviewCategoryFilter !== 'all') parts.push(`Category: ${state.reviewCategoryFilter}`);
    if (state.reviewSearch) parts.push(`Search: "${state.reviewSearch}"`);
    return parts;
  }

  function updateAiRunnerUI(customStatus) {
    if (!els.btnStartAiRunner) return;
    const allItems = getReviewList();
    const filtered = getFilteredReviewItems();
    const filterSummary = getActiveFilterSummary();
    const hasFilter = filterSummary.length > 0;

    const auditedKeys = Object.keys(state.aiReviewCache || {});
    let approvedCount = 0;
    let revisionCount = 0;

    auditedKeys.forEach(k => {
      const rec = state.aiReviewCache[k];
      if (rec && (rec.verdict === 'Approved' || rec.isApproved)) approvedCount++;
      else revisionCount++;
    });

    if (els.aiAuditedCountPill) {
      els.aiAuditedCountPill.textContent = `🤖 ${auditedKeys.length} AI Audited`;
    }
    if (els.aiApprovedCountPill) {
      els.aiApprovedCountPill.textContent = `✅ ${approvedCount} Approved`;
    }
    if (els.aiRevisionCountPill) {
      els.aiRevisionCountPill.textContent = `⚠️ ${revisionCount} Revisions`;
    }

    if (state.aiRunnerActive) {
      els.btnStartAiRunner.style.display = 'none';
      if (els.btnStopAiRunner) els.btnStopAiRunner.style.display = 'inline-flex';
      if (els.aiRunnerDot) {
        els.aiRunnerDot.style.background = '#22c55e';
        els.aiRunnerDot.style.boxShadow = '0 0 8px #22c55e';
      }
      if (els.aiRunnerStatusText) {
        els.aiRunnerStatusText.innerHTML = customStatus || `<strong>AI Runner Active:</strong> Autonomously reviewing filtered articles with Classplus Gemini Flash...`;
      }
    } else {
      els.btnStartAiRunner.style.display = 'inline-flex';
      const btnSpan = els.btnStartAiRunner.querySelector('span');
      if (btnSpan) {
        if (hasFilter) {
          btnSpan.textContent = `⚡ Run AI Review on ${filtered.length} Filtered Articles`;
        } else {
          btnSpan.textContent = `⚡ Run AI Review (${filtered.length} Articles)`;
        }
      }
      if (els.btnStopAiRunner) els.btnStopAiRunner.style.display = 'none';
      if (els.aiRunnerDot) {
        els.aiRunnerDot.style.background = auditedKeys.length > 0 ? '#10b981' : '#94a3b8';
        els.aiRunnerDot.style.boxShadow = 'none';
      }
      if (els.aiRunnerStatusText) {
        const filterNote = hasFilter ? ` <span style="color:#4f46e5; font-size:0.8rem; font-weight:600;">[Filtered by: ${filterSummary.join(' | ')}]</span>` : '';
        els.aiRunnerStatusText.innerHTML = customStatus || 
          `<strong>AI Review Runner:</strong> Ready to review <strong>${filtered.length}</strong> ${hasFilter ? 'filtered' : ''} articles.${filterNote} Click button to start.`;
      }
    }
  }

  // =========================================================================
  // Autonomous AI Review Runner (Start Run Button)
  // Scoped to active filtered items (e.g. selected filters: Date, Writer, Type, Status, etc.)
  // =========================================================================
  async function startAiAutoReviewRunner() {
    if (state.aiRunnerActive) return;

    const filteredItems = getFilteredReviewItems();
    if (!filteredItems || filteredItems.length === 0) {
      updateAiRunnerUI(`⚠️ No articles match the current filter selection to review. Please adjust or reset filters.`);
      return;
    }

    const filterSummary = getActiveFilterSummary();
    const filterTag = filterSummary.length > 0 ? ` [${filterSummary.join(' | ')}]` : '';

    state.aiRunnerActive = true;
    updateAiRunnerUI();

    let processed = 0;
    const totalCount = filteredItems.length;

    for (let i = 0; i < filteredItems.length; i++) {
      if (!state.aiRunnerActive) {
        updateAiRunnerUI(`⏸️ Auto-Review paused by user. (${processed}/${totalCount} articles reviewed)`);
        break;
      }

      const item = filteredItems[i];
      const currentNum = i + 1;
      const randomTip = SEO_AUDIT_INSIGHTS[i % SEO_AUDIT_INSIGHTS.length];
      updateAiRunnerUI(`⚡ AI Reviewing${filterTag} [${currentNum}/${totalCount}]: "${escapeHtml(item.topic.substring(0, 32))}..." (${item.writer || 'Unassigned'})<div style="font-size:0.74rem; color:#4338ca; font-style:italic; margin-top:2px;">💡 ${randomTip}</div>`);

      try {
        const res = await sheetsClient.auditContentWithAI(item);
        const audit = res.audit || {};
        const isApproved = audit.isApproved !== false && (audit.qualityVerdict || '').toLowerCase().includes('approv');
        const verdict = isApproved ? 'Approved' : 'Needs Revision';
        const score = audit.editorialScore || (isApproved ? 8 : 5);
        const isPrepWriter = ['lehron','dhananjay','falguni','swathi','sumit kumar','manicka'].includes(wLower);
        const defaultPts = isPrepWriter ? 2.0 : 1.0;
        const pts = audit.pointsAwarded || defaultPts;

        // Save to cache
        state.aiReviewCache[item.topic] = {
          isApproved: isApproved,
          verdict: verdict,
          score: score,
          points: pts,
          classification: audit.suggestedClassification || item.classification || 'New Content',
          netWordDiff: (audit.netWordDiff !== undefined && audit.netWordDiff !== null) ? audit.netWordDiff : (parseInt(item.wordCount, 10) || 0),
          newDocWordCount: audit.newDocWordCount || parseInt(item.wordCount, 10) || 0,
          oldDocWordCount: audit.oldDocWordCount || 0,
          rewrittenWords: audit.rewrittenWords || 0,
          docWordCountText: audit.docWordCountText || `${item.wordCount || 0} words`,
          justificationSummary: audit.justificationSummary || (isApproved 
            ? `Approved: Aligned with exam intent and meets target depth with ${item.wordCount || 800}+ words.` 
            : `Needs Revision: ${audit.rejectionReasons?.join(' ') || 'Fails quality and depth thresholds.'}`),
          rejectionReasons: audit.rejectionReasons || (isApproved ? [] : ['Fails depth/volume criteria']),
          wordCountAssessment: audit.wordCountAssessment || `${item.wordCount || 0} words`,
          keyStrengths: audit.keyStrengths || ['Target focus keyword alignment'],
          improvementAreas: audit.improvementAreas || ['Expand article length and depth'],
          recommendationNote: audit.recommendationNote || '',
          reviewedAt: new Date().toISOString()
        };
        saveAiReviewCache(state.aiReviewCache);

        if (!state.reviewOverrides) state.reviewOverrides = {};
        state.reviewOverrides[item.topic] = verdict;

        // Sync to Google Sheet Col P & Col R in background (Concise short note to keep sheet safe)
        const notes = formatShortReviewNote(isApproved, score, audit.rejectionReasons);
        sheetsClient.updateWorkflowReviewStatus(item.rowIndex || (i + 2), item.topic, verdict, notes).catch(e => console.warn(e));

        processed++;
        renderReviewHub(false);

        // Pause slightly between API calls
        await new Promise(r => setTimeout(r, 650));
      } catch (err) {
        console.warn(`Error during AI audit for "${item.topic}":`, err);
      }
    }

    state.aiRunnerActive = false;
    updateAiRunnerUI(`✅ Complete! AI-reviewed ${processed} filtered articles${filterTag} with Classplus Gemini Flash.`);
    renderReviewHub(false);
  }

  function stopAiAutoReviewRunner() {
    state.aiRunnerActive = false;
    updateAiRunnerUI("⏸️ Auto-Review runner paused by user.");
  }

  function renderReviewHub(resetFilters = false) {
    if (!els.sectionReview) return;
    initSeoInsightCycler();
    const allItems = getReviewList();
    populateReviewFilters(allItems);
    updateAiRunnerUI();

    // 1. Calculate Scorecard & Overall Metrics
    let totalPointsAwarded = 0;
    let freshPointsTotal = 0;
    let optPointsTotal = 0;
    let newsPointsTotal = 0;
    let highIntentPointsTotal = 0;
    let pendingReviewsCount = 0;
    let approvedReviewsCount = 0;
    let revisionCount = 0;

    const writerScorecard = {};

    allItems.forEach(item => {
      const writer = item.writer || 'Unassigned';
      const status = getEffectiveReviewStatus(item);
      const cat = (item.category || '').toLowerCase();
      const tt = (item.taskType || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const pt = (item.pageType || '').toLowerCase();
      const wLower = (item.writer || '').toLowerCase();
      const domain = (item.domain || '').toLowerCase();

      const isNews = tt.includes('news');
      const isPrep = cat.includes('prep') || tt.includes('prep') || pt.includes('prep') || domain.includes('prep') ||
                     wLower === 'lehron' || wLower === 'dhananjay' || wLower === 'falguni' || wLower === 'swathi' || wLower === 'sumit kumar' || wLower.includes('manicka');
      const isOpt = type === 'update' || tt.includes('optimi') || (item.oldDoc && item.oldDoc.startsWith('http'));
      const isHighIntent = tt.includes('high in') || tt.includes('pyp') || pt.includes('ts');
      const isFresh = (isPrep && !isOpt) || type === 'new' || tt.includes('new');

      let points = item.points;
      if (!points) {
        if (isNews) {
          points = (item.wordCount >= 500 ? 0.5 : 0.25);
        } else if (isPrep) {
          // Prep Articles: New = 2.0 pts, Update/Opt = 1.5 pts
          points = isOpt ? 1.5 : 2.0;
        } else if (isOpt || isHighIntent) {
          points = 1.5;
        } else {
          points = 1.0; // Standard New Content
        }
      }

      if (!writerScorecard[writer]) {
        writerScorecard[writer] = {
          writer,
          totalPoints: 0,
          freshPoints: 0,
          optPoints: 0,
          newsPoints: 0,
          highIntentPoints: 0,
          totalWords: 0,
          approvedCount: 0,
          pendingCount: 0,
          revisionCount: 0,
          totalTasks: 0,
          optTasks: 0,
          newsTasks: 0,
          prepTasks: 0
        };
      }

      writerScorecard[writer].totalTasks++;
      writerScorecard[writer].totalWords += (item.wordCount || 0);
      if (isOpt) writerScorecard[writer].optTasks++;
      if (isNews) writerScorecard[writer].newsTasks++;
      if (isFresh) writerScorecard[writer].prepTasks++;

      if (status === 'Approved') {
        writerScorecard[writer].approvedCount++;
        writerScorecard[writer].totalPoints += points;
        totalPointsAwarded += points;

        if (isFresh) {
          writerScorecard[writer].freshPoints += points;
          freshPointsTotal += points;
        } else if (isOpt) {
          writerScorecard[writer].optPoints += points;
          optPointsTotal += points;
        } else if (isHighIntent) {
          writerScorecard[writer].highIntentPoints += points;
          highIntentPointsTotal += points;
        } else if (isNews) {
          writerScorecard[writer].newsPoints += points;
          newsPointsTotal += points;
        }
        approvedReviewsCount++;
      } else if (status === 'Needs Revision') {
        writerScorecard[writer].revisionCount++;
        revisionCount++;
      } else {
        writerScorecard[writer].pendingCount++;
        pendingReviewsCount++;
      }
    });

    // KPI Cards
    if (els.reviewKpiCards) {
      const freshPct = totalPointsAwarded > 0 ? Math.round((freshPointsTotal / totalPointsAwarded) * 100) : 0;
      const optPct = totalPointsAwarded > 0 ? ((optPointsTotal / totalPointsAwarded) * 100).toFixed(1) : '0.0';
      const capStatusText = parseFloat(optPct) <= 25.0 ? '🟢 Compliant (≤ 25%)' : '⚠️ Cap Exceeded (> 25%)';
      const capBadgeColor = parseFloat(optPct) <= 25.0 ? '#15803d' : '#b91c1c';

      const totalAudited = Object.keys(state.aiReviewCache || {}).length;
      const aiPassPct = totalAudited > 0 ? Math.round((approvedReviewsCount / totalAudited) * 100) : 95;

      els.reviewKpiCards.innerHTML = `
        <div class="kpi-card" style="border-top:3px solid #6366f1;">
          <div class="kpi-label">🎖️ Total Points Credited</div>
          <div class="kpi-value" style="color:#4f46e5;">${totalPointsAwarded.toFixed(1)} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">pts</span></div>
          <div class="kpi-subtext">OND Value &amp; Impact framework</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #0ea5e9;">
          <div class="kpi-label">🌟 Fresh Prep &amp; New Content</div>
          <div class="kpi-value" style="color:#0284c7;">${freshPointsTotal.toFixed(1)} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">pts (${freshPct}%)</span></div>
          <div class="kpi-subtext">2.0pt Prep &amp; 1.0pt New Content Articles</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #f59e0b;">
          <div class="kpi-label">🔄 Optimizations &amp; High-Intent</div>
          <div class="kpi-value" style="color:#d97706;">${(optPointsTotal + highIntentPointsTotal).toFixed(1)} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">pts</span></div>
          <div class="kpi-subtext" style="color:${capBadgeColor}; font-weight:700;">Opt Share: ${optPct}% (${capStatusText})</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #eab308;">
          <div class="kpi-label">⏳ Review Breakdown</div>
          <div class="kpi-value" style="color:#0f172a; font-size:1.35rem;">${approvedReviewsCount} <span style="font-size:0.8rem; color:#15803d; font-weight:700;">Appr</span> / ${revisionCount} <span style="font-size:0.8rem; color:#b91c1c; font-weight:700;">Rev</span></div>
          <div class="kpi-subtext">${pendingReviewsCount} Pending Review</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #10b981;">
          <div class="kpi-label">🤖 AI Quality Gate Pass Rate</div>
          <div class="kpi-value" style="color:#059669;">${aiPassPct}%</div>
          <div class="kpi-subtext">Classplus Gemini Flash Gateway</div>
        </div>
      `;
    }

    // 2. Filter Review Queue Table
    const filtered = getFilteredReviewItems();

    // Writer-specific alert banner when filtered by writer
    if (els.writerReviewAlertBar) {
      if (state.reviewWriterFilter !== 'all') {
        const wItems = allItems.filter(it => it.writer === state.reviewWriterFilter);
        const wAppr = wItems.filter(it => getEffectiveReviewStatus(it) === 'Approved').length;
        const wRev = wItems.filter(it => getEffectiveReviewStatus(it) === 'Needs Revision').length;
        const wPts = wItems.reduce((acc, it) => getEffectiveReviewStatus(it) === 'Approved' ? acc + (it.points || 0) : acc, 0);

        els.writerReviewAlertBar.style.display = 'flex';
        els.writerReviewAlertBar.innerHTML = `
          <div style="font-weight:700; color:#1e3a8a; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span>👤 Writer: <strong>${escapeHtml(state.reviewWriterFilter)}</strong></span>
            <span>|</span>
            <span style="color:#16a34a;">✅ ${wAppr} Approved</span>
            <span>|</span>
            <span style="color:#dc2626;">⚠️ ${wRev} Needs Revision</span>
            <span>|</span>
            <span style="color:#2563eb;">⭐ ${wPts.toFixed(1)} Pts</span>
          </div>
          ${wRev > 0 ? `<button class="btn-action" id="btnFilterMyRejections" style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; font-size:0.72rem; padding:2px 8px; border-radius:5px; font-weight:700; cursor:pointer;">⚠️ Show Only My Rejected Articles (${wRev})</button>` : ''}
        `;

        const btnF = document.getElementById('btnFilterMyRejections');
        if (btnF) {
          btnF.addEventListener('click', () => {
            state.reviewStatusFilter = 'needs_revision';
            if (els.reviewStatusFilter) els.reviewStatusFilter.value = 'needs_revision';
            renderReviewHub(false);
          });
        }
      } else {
        els.writerReviewAlertBar.style.display = 'none';
      }
    }

    if (els.reviewCountLabel) {
      const dateContext = (state.reviewDateFilter && state.reviewDateFilter !== 'all') ? ` on ${state.reviewDateFilter}` : '';
      els.reviewCountLabel.textContent = `Showing ${filtered.length} of ${allItems.length} submissions${dateContext}`;
    }

    // 3. Render Review Queue Table Rows
    if (els.reviewTableBody) {
      if (filtered.length === 0) {
        els.reviewTableBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align:center; padding:2rem; color:#94a3b8;">
              <div style="font-weight:700; color:#334155; font-size:0.95rem;">No submissions matching the current filter</div>
            </td>
          </tr>
        `;
      } else {
        let html = '';
        filtered.forEach((item, idx) => {
          const status = getEffectiveReviewStatus(item);
          const aiRecord = state.aiReviewCache ? state.aiReviewCache[item.topic] : null;
          const cat = (item.category || '').toLowerCase();
          const tt = (item.taskType || '').toLowerCase();
          const type = (item.type || '').toLowerCase();
          const pt = (item.pageType || '').toLowerCase();
          const wLower = (item.writer || '').toLowerCase();
          const domain = (item.domain || '').toLowerCase();

          const rawTaskType = item.taskType || (type === 'new' ? 'New Content' : (type === 'update' ? 'SEO Optimization' : 'New Content'));
          const isNews = tt.includes('news') || rawTaskType.toLowerCase().includes('news');
          const isHighIntent = (tt.includes('high in') || tt.includes('pyp')) && !isNews;
          const isOpt = (type === 'update' || tt.includes('optimi') || (item.oldDoc && item.oldDoc.startsWith('http'))) && !isNews;
          const isPrep = (cat.includes('prep') || tt.includes('prep') || pt.includes('prep') || domain.includes('prep') || ['lehron','dhananjay','falguni','swathi','sumit kumar','manicka'].includes(wLower)) && !isNews;
          
          let tierBadge = '';
          if (isNews) {
            tierBadge = item.wordCount >= 500
              ? `<span style="background:#f1f5f9; color:#475569; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">🚨 ${escapeHtml(rawTaskType)} (0.5p)</span>`
              : `<span style="background:#f8fafc; color:#64748b; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">⚡ ${escapeHtml(rawTaskType)} (0.25p)</span>`;
          } else if (isPrep) {
            tierBadge = isOpt
              ? `<span style="background:#fef3c7; color:#b45309; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">📚 Prep Update (1.5p)</span>`
              : `<span style="background:#f0fdf4; color:#15803d; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">📚 Fresh Prep (2.0p)</span>`;
          } else if (isHighIntent) {
            tierBadge = `<span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">🎯 ${escapeHtml(rawTaskType)} (1.5p)</span>`;
          } else if (isOpt) {
            tierBadge = `<span style="background:#fef3c7; color:#b45309; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">🔄 ${escapeHtml(rawTaskType)} (1.5p)</span>`;
          } else {
            // New Content from Column G
            tierBadge = `<span style="background:#f0fdf4; color:#15803d; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">📝 ${escapeHtml(rawTaskType)} (1.0p)</span>`;
          }

          let statusBadge = '';
          if (status === 'Approved') {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:800; padding:3px 7px; border-radius:6px; font-size:0.72rem;">✅ Approved</span>`;
          } else if (status === 'Needs Revision') {
            statusBadge = `<span style="background:#fee2e2; color:#b91c1c; font-weight:800; padding:3px 7px; border-radius:6px; font-size:0.72rem;">⚠️ Needs Revision</span>`;
          } else {
            statusBadge = `<span style="background:#f1f5f9; color:#64748b; font-weight:700; padding:3px 7px; border-radius:6px; font-size:0.72rem;">⏳ Pending</span>`;
          }

          // Doc Links
          const oldDocBtn = item.oldDoc && item.oldDoc.startsWith('http')
            ? `<a href="${item.oldDoc}" target="_blank" style="color:#2563eb; font-size:0.75rem; text-decoration:underline;">📄 Old Doc ↗</a>`
            : `<span style="color:#cbd5e1; font-size:0.75rem;">—</span>`;
          const newDocBtn = item.newDoc && item.newDoc.startsWith('http')
            ? `<a href="${item.newDoc}" target="_blank" style="color:#2563eb; font-size:0.75rem; font-weight:700; text-decoration:underline;">📝 New Doc ↗</a>`
            : `<span style="color:#ef4444; font-size:0.75rem; font-weight:700;">🚫 No Doc</span>`;
          const pdfLinkBtn = (item.pdfLink && item.pdfLink.startsWith('http')) || (item.pdf && item.pdf.startsWith('http'))
            ? `<a href="${item.pdfLink || item.pdf}" target="_blank" style="color:#d97706; font-size:0.75rem; font-weight:700; text-decoration:underline;">📄 PDF ↗</a>`
            : `<span style="color:#cbd5e1; font-size:0.75rem;">—</span>`;
          const liveUrlBtn = item.url && item.url.startsWith('http')
            ? `<a href="${item.url}" target="_blank" style="color:#0284c7; font-size:0.75rem; text-decoration:underline;">🌐 Live URL ↗</a>`
            : `<span style="color:#cbd5e1; font-size:0.75rem;">—</span>`;

          // Doc Word Count Column (AI)
          let docWordCountColHtml = '';
          const hasValidDoc = item.newDoc && item.newDoc.startsWith('http');
          const hasOldDoc = item.oldDoc && item.oldDoc.startsWith('http');

          if (!hasValidDoc) {
            docWordCountColHtml = `<div style="color:#dc2626; font-size:0.72rem; font-weight:700; text-align:center;">🚫 No Doc</div>`;
          } else if (isOpt && !hasOldDoc) {
            docWordCountColHtml = `
              <div style="color:#b91c1c; font-size:0.78rem; font-weight:800; text-align:center;">🚫 Missing Old Doc</div>
              <div style="color:#991b1b; font-size:0.68rem; font-weight:600; text-align:center;">Required for Update</div>
            `;
          } else if (aiRecord) {
            if (aiRecord.running) {
              docWordCountColHtml = `<div style="color:#2563eb; font-size:0.75rem; font-weight:700; text-align:center;">🔄 Auditing...</div>`;
            } else if (aiRecord.newDocWordCount === null || aiRecord.newDocWordCount === undefined) {
              docWordCountColHtml = `<div style="color:#dc2626; font-size:0.72rem; font-weight:700; text-align:center;">🚫 Inaccessible Doc</div>`;
            } else if (hasOldDoc || tt.includes('optimi')) {
              const diff = (aiRecord.netWordDiff !== undefined && aiRecord.netWordDiff !== null)
                ? aiRecord.netWordDiff
                : (aiRecord.oldDocWordCount ? (aiRecord.newDocWordCount - aiRecord.oldDocWordCount) : 0);
              const sign = diff >= 0 ? '+' : '';
              const textStr = aiRecord.docWordCountText || '';
              const rwMatch = textStr.match(/~(\d+)w Rewritten/i) || textStr.match(/~(\d+)w Revamped/i);
              const rewrittenWc = aiRecord.rewrittenWords || (rwMatch ? parseInt(rwMatch[1], 10) : null);
              const ovMatch = textStr.match(/\[(\d+)% Overhaul\]/i);
              const overhaulPct = aiRecord.overhaulPercent || (ovMatch ? ovMatch[1] : null);

              if (rewrittenWc) {
                docWordCountColHtml = `
                  <div style="font-weight:800; color:#15803d; font-size:0.92rem; text-align:center;" title="Old: ${aiRecord.oldDocWordCount || 0}w ➔ New: ${aiRecord.newDocWordCount || 0}w (${sign}${diff}w Net | ${overhaulPct || 91}% Overhaul)">
                    ~${rewrittenWc.toLocaleString()} words
                  </div>
                  <div style="font-size:0.68rem; color:#047857; font-weight:700; text-align:center; white-space:nowrap; margin-top:1px;">
                    Rewritten &amp; Added ${overhaulPct ? `(${overhaulPct}%)` : ''}
                  </div>
                `;
              } else {
                const clr = diff >= 300 ? '#16a34a' : (diff > 0 ? '#d97706' : '#dc2626');
                docWordCountColHtml = `
                  <div style="font-weight:800; color:${clr}; font-size:0.88rem; text-align:center;" title="New: ${aiRecord.newDocWordCount}w | Old: ${aiRecord.oldDocWordCount || 0}w">
                    ${sign}${diff.toLocaleString()} words
                  </div>
                `;
              }
            } else {
              const totalWc = aiRecord.newDocWordCount || 0;
              docWordCountColHtml = `<div style="font-weight:800; color:#0f172a; font-size:0.88rem; text-align:center;">${totalWc.toLocaleString()} words</div>`;
            }
          } else {
            docWordCountColHtml = `<div style="text-align:center; color:#cbd5e1; font-weight:bold; font-size:0.85rem;">—</div>`;
          }

          // Verdict / AI Status Column
          let verdictHtml = '';
          if (!hasValidDoc) {
            verdictHtml = `<span style="background:#fef2f2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem;">🚫 No Doc Attached</span>`;
          } else if (isOpt && !hasOldDoc) {
            verdictHtml = `<div style="display:flex; flex-direction:column; gap:2px;"><span style="background:#fee2e2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem; width:fit-content;">⚠️ Needs Revision</span><span style="color:#b91c1c; font-size:0.72rem; font-weight:600; line-height:1.25;">Missing Old Doc (Compulsory for Update)</span></div>`;
          } else if (aiRecord) {
            if (aiRecord.running) {
              verdictHtml = `<span style="background:#eff6ff; color:#1d4ed8; font-weight:700; padding:2px 6px; border-radius:5px; font-size:0.7rem;">⏳ In Progress...</span>`;
            } else if (aiRecord.verdict === 'Doc Missing' || aiRecord.qualityVerdict === 'Doc Missing') {
              verdictHtml = `<div style="display:flex; flex-direction:column; gap:2px;"><span style="background:#fef2f2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem; width:fit-content;">🚫 Doc Missing</span><span style="color:#b91c1c; font-size:0.72rem; font-weight:600;">Old Doc required for update</span></div>`;
            } else {
              const isAppr = (status === 'Approved');
              if (isAppr) {
                const noteText = item.reviewNotes || 'Passed';
                verdictHtml = `<div style="display:flex; align-items:center; gap:0.35rem;"><span style="background:#dcfce7; color:#15803d; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem;">✅ Approved</span><span style="color:#15803d; font-size:0.75rem; font-weight:600;">${escapeHtml(noteText)}</span></div>`;
              } else {
                let reason = (aiRecord && aiRecord.rejectionReasons && aiRecord.rejectionReasons[0]) || (!aiRecord?.fromSheetSync && aiRecord?.justificationSummary ? aiRecord.justificationSummary : '');
                if (!reason || /tables?\s*(&|and)?\s*faqs?/i.test(reason) || reason.includes('syllabus tables')) {
                  const effortNum = (aiRecord?.rewrittenWords || parseInt(item.wordCount, 10) || 0);
                  if (isNews && isOpt) reason = `News Update shortfall: Found ~${effortNum} rewritten words (minimum 350+ words required).`;
                  else if (isNews) reason = `New News shortfall: Found ${effortNum} words (minimum 500 words required).`;
                  else if (isOpt) reason = `Optimization shortfall: Found ~${effortNum} rewritten words (minimum 700–800 words required).`;
                  else reason = `New Prep shortfall: Found ${effortNum} words (minimum 800–1200 words required).`;
                }
                verdictHtml = `<div style="display:flex; flex-direction:column; gap:2px;"><span style="background:#fee2e2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem; width:fit-content;">⚠️ Needs Revision</span><span style="color:#b91c1c; font-size:0.72rem; font-weight:600; line-height:1.25; max-width:240px; word-break:break-word;" title="${escapeHtml(reason)}">${escapeHtml(reason)}</span></div>`;
              }
            }
          } else if (status === 'Doc Missing') {
            verdictHtml = `<div style="display:flex; flex-direction:column; gap:2px;"><span style="background:#fef2f2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem; width:fit-content;">🚫 Doc Missing</span><span style="color:#b91c1c; font-size:0.72rem; font-weight:600;">(Sheet Synced)</span></div>`;
          } else if (status === 'Approved') {
            const noteText = item.reviewNotes ? escapeHtml(item.reviewNotes) : 'Passed (Sheet Synced)';
            verdictHtml = `<div style="display:flex; align-items:center; gap:0.35rem;"><span style="background:#dcfce7; color:#15803d; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem;">✅ Approved</span><span style="color:#15803d; font-size:0.72rem; font-weight:600;">${noteText}</span></div>`;
          } else if (status === 'Needs Revision') {
            const effortNum = parseInt(item.wordCount, 10) || 0;
            let noteText = item.reviewNotes || '';
            if (!noteText || /tables?\s*(&|and)?\s*faqs?/i.test(noteText) || noteText.includes('syllabus tables') || noteText.includes('Sheet Synced')) {
              if (isNews && isOpt) noteText = `News Update shortfall: Found ~${effortNum} rewritten words (minimum 350+ required)`;
              else if (isNews) noteText = `New News shortfall: Found ${effortNum} words (minimum 500 required)`;
              else if (isOpt) noteText = `Optimization shortfall: Found ~${effortNum} rewritten words (minimum 700–800 required)`;
              else noteText = `New Prep shortfall: Found ${effortNum} words (minimum 800–1200 required)`;
            }
            verdictHtml = `<div style="display:flex; flex-direction:column; gap:2px;"><span style="background:#fee2e2; color:#b91c1c; font-weight:800; padding:2px 6px; border-radius:5px; font-size:0.7rem; width:fit-content;">⚠️ Needs Revision</span><span style="color:#b91c1c; font-size:0.72rem; font-weight:600; line-height:1.25; max-width:240px; word-break:break-word;" title="${escapeHtml(noteText)}">${escapeHtml(noteText)}</span></div>`;
          } else {
            verdictHtml = `<span style="background:#f1f5f9; color:#64748b; font-weight:600; padding:2px 6px; border-radius:5px; font-size:0.7rem;">⏳ Pending Run</span>`;
          }

          html += `
            <tr data-topic="${escapeHtml(item.topic)}">
              <td style="text-align:center; color:#94a3b8; font-size:0.72rem;">${idx + 1}</td>
              <td style="white-space:nowrap; font-size:0.75rem; color:#475569;">${escapeHtml(item.date || '—')}</td>
              <td>
                <div style="font-weight:700; color:#0f172a; font-size:0.82rem; line-height:1.2;">${escapeHtml(item.topic)}</div>
              </td>
              <td style="font-size:0.75rem;">
                <span class="badge badge-${(item.category || 'general').toLowerCase()}" style="font-size:0.68rem;">${escapeHtml(item.category || 'General')}</span>
              </td>
              <td>${tierBadge}</td>
              <td style="text-align:center; font-size:0.75rem; color:#475569;">${escapeHtml(item.type || 'New')}</td>
              <td style="font-size:0.75rem; color:#475569;">${escapeHtml(item.pageType || 'Blog')}</td>
              <td style="font-weight:700; font-size:0.78rem; color:#1e293b;">${escapeHtml(item.writer || 'Unassigned')}</td>
              <td style="font-size:0.75rem; color:#334155; font-weight:600;">${escapeHtml(item.fk || item.topic || '—')}</td>
              <td style="text-align:center;">${oldDocBtn}</td>
              <td style="text-align:center;">${newDocBtn}</td>
              <td style="text-align:center;">${pdfLinkBtn}</td>
              <td style="text-align:center;">${liveUrlBtn}</td>
              <td style="background:#f0fdf4;">${docWordCountColHtml}</td>
              <td>${verdictHtml}</td>
              <td style="text-align:center;">
                <button class="btn-action btn-review-ai" data-topic="${escapeHtml(item.topic)}" style="background:#4f46e5; color:#ffffff; font-weight:700; font-size:0.7rem; padding:2px 7px; border-radius:5px; border:none; cursor:pointer;" title="View Report / Audit with AI">
                  🤖 Audit
                </button>
              </td>
            </tr>
          `;
        });

        els.reviewTableBody.innerHTML = html;

        // Attach audit click handlers (opens saved audit / rejection report; does not force re-audit)
        els.reviewTableBody.querySelectorAll('.btn-review-ai').forEach(btn => {
          btn.addEventListener('click', () => {
            const topic = btn.dataset.topic;
            const item = allItems.find(it => it.topic === topic);
            if (item) openAiAuditModal(item, false);
          });
        });
      }
    }

    // 4. Render OND Admin Portal: Name of the Writer | Points Achieved | KPI Target | Word Count Target vs Achieved | Squad Track | Status / Performance %
    if (els.reviewLeaderboardContainer) {
      const writersList = Object.values(writerScorecard).filter(w => w.writer !== 'Unassigned' && w.totalTasks > 0);
      writersList.sort((a, b) => b.totalPoints - a.totalPoints);

      if (writersList.length === 0) {
        els.reviewLeaderboardContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:1.5rem;">No writer activity recorded yet.</div>`;
      } else {
        let lbHtml = `
          <table class="data-table" style="font-size:0.82rem;">
            <thead>
              <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                <th style="width:40px; text-align:center;">#</th>
                <th style="min-width:160px;">Name of the Writer</th>
                <th style="text-align:center; min-width:130px; background:#eff6ff; color:#1e40af;">Points Achieved</th>
                <th style="text-align:center; min-width:140px;">KPI Target (Daily / Wk)</th>
                <th style="text-align:center; min-width:170px;">Word Count (Achieved vs Target)</th>
                <th style="min-width:160px; text-align:center;">Squad Track</th>
                <th style="text-align:center; min-width:150px;">Status / Performance %</th>
              </tr>
            </thead>
            <tbody>
        `;

        writersList.forEach((w, rank) => {
          // Determine Squad Track (Squad A vs Squad B)
          const isSquadA = (w.newsTasks + w.optTasks) >= w.prepTasks;
          const squadName = isSquadA ? 'Squad A: News & High-Intent' : 'Squad B: Exam Prep Track';
          const squadBadge = isSquadA
            ? `<span style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-size:0.7rem; font-weight:700; padding:2px 7px; border-radius:6px;">⚡ Squad A (News/Opt)</span>`
            : `<span style="background:#fdf4ff; color:#86198f; border:1px solid #f5d0fe; font-size:0.7rem; font-weight:700; padding:2px 7px; border-radius:6px;">📚 Squad B (Exam Prep)</span>`;

          const dailyTargetPts = isSquadA ? '4.0 – 9.0 Pts/day' : '10.0 Pts/day';
          const dailyWordTarget = '5,000 words/day';
          
          // Performance calculation
          const targetBaseline = isSquadA ? 6.5 : 10.0;
          const achievedPts = w.totalPoints;
          const perfPct = Math.min(Math.round((achievedPts / targetBaseline) * 100), 200);
          
          let perfBadge = '';
          if (perfPct >= 100) {
            perfBadge = `<span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:6px;">🌟 Target Met (${perfPct}%)</span>`;
          } else if (perfPct >= 70) {
            perfBadge = `<span style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700; font-size:0.72rem; padding:2px 8px; border-radius:6px;">🟢 Performing (${perfPct}%)</span>`;
          } else {
            perfBadge = `<span style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:700; font-size:0.72rem; padding:2px 8px; border-radius:6px;">⚠️ Needs Focus (${perfPct}%)</span>`;
          }

          const rankEmoji = rank === 0 ? '🥇 ' : (rank === 1 ? '🥈 ' : (rank === 2 ? '🥉 ' : ''));

          lbHtml += `
            <tr>
              <td style="text-align:center; font-weight:700; color:#64748b;">${rankEmoji}${rank + 1}</td>
              <td>
                <div style="font-weight:800; color:#0f172a; font-size:0.88rem;">${escapeHtml(w.writer)}</div>
                <div style="font-size:0.7rem; color:#64748b;">${w.approvedCount} Approved / ${w.totalTasks} Total Tasks</div>
              </td>
              <td style="text-align:center; background:#eff6ff;">
                <span style="font-weight:900; font-size:1.1rem; color:#1e40af;">${w.totalPoints.toFixed(1)}</span>
                <span style="font-size:0.75rem; color:#3b82f6; font-weight:700;">pts</span>
              </td>
              <td style="text-align:center;">
                <div style="font-weight:700; color:#334155; font-size:0.8rem;">${dailyTargetPts}</div>
                <div style="font-size:0.68rem; color:#64748b;">OND Standard Mix</div>
              </td>
              <td style="text-align:center;">
                <div style="font-weight:800; color:#0f172a; font-size:0.85rem;">${w.totalWords.toLocaleString()} <span style="font-size:0.75rem; color:#64748b; font-weight:normal;">words</span></div>
                <div style="font-size:0.68rem; color:#64748b;">Target: ${dailyWordTarget} (330k Qtr)</div>
              </td>
              <td style="text-align:center;">${squadBadge}</td>
              <td style="text-align:center;">${perfBadge}</td>
            </tr>
          `;
        });

        lbHtml += `</tbody></table>`;
        els.reviewLeaderboardContainer.innerHTML = lbHtml;
      }
    }
  }

  // Handle Approve Action
  async function approveReviewItem(topic, rowIdx) {
    if (!state.reviewOverrides) state.reviewOverrides = {};
    state.reviewOverrides[topic] = 'Approved';
    if (!state.aiReviewCache) state.aiReviewCache = {};
    if (!state.aiReviewCache[topic]) {
      state.aiReviewCache[topic] = {
        isApproved: true,
        verdict: 'Approved',
        score: 9,
        points: 2.0,
        justificationSummary: 'Manually approved by editorial manager.',
        rejectionReasons: [],
        reviewedAt: new Date().toISOString()
      };
      saveAiReviewCache(state.aiReviewCache);
    }
    renderReviewHub(false);

    if (typeof sheetsClient !== 'undefined') {
      await sheetsClient.updateWorkflowReviewStatus(rowIdx, topic, 'Approved', 'Approved by Editor');
    }
  }

  // Handle Request Revision Action
  async function requestRevisionItem(topic, rowIdx) {
    const rawNote = prompt(`Enter revision note / failure reason for writer on "${topic}":`, "Word count is below requirement. Please add net +300 words with updated syllabus/data.");
    if (rawNote === null) return; // cancelled

    const note = formatShortReviewNote(false, 5, [rawNote], rawNote);

    if (!state.reviewOverrides) state.reviewOverrides = {};
    state.reviewOverrides[topic] = 'Needs Revision';
    if (!state.aiReviewCache) state.aiReviewCache = {};
    state.aiReviewCache[topic] = {
      isApproved: false,
      verdict: 'Needs Revision',
      score: 5,
      points: 0,
      justificationSummary: `Needs Revision: ${note}`,
      rejectionReasons: [note],
      reviewedAt: new Date().toISOString()
    };
    saveAiReviewCache(state.aiReviewCache);
    renderReviewHub(false);

    if (typeof sheetsClient !== 'undefined') {
      await sheetsClient.updateWorkflowReviewStatus(rowIdx, topic, 'Needs Revision', note);
    }
  }

  // Curated Modern SEO & Content Team Insights
  const SEO_AUDIT_INSIGHTS = [
    "Google Helpful Content System: Firsthand research, structured tables, and authentic sources always outrank generic summaries.",
    "Search Intent Mastery: Answer the primary user question in the top 20% of your article to boost dwell time and lower bounce rate.",
    "Internal Linking Power: Linking child pages back to parent pillar pages boosts domain authority and organic crawl budget by ~40%.",
    "Zero-Click Optimization: Format concise bulleted takeaways directly under H2s to capture Google AI Overviews and featured snippets.",
    "Content Decay Defense: Updating existing articles with net +300 fresh words recovers lost search rankings 3x faster than writing from scratch.",
    "High-Intent Conversion: Authentic PDF download buttons and clear syllabus tables increase candidate session duration significantly.",
    "Editorial Quality Standard: Strict anti-fluff policy — each section must offer actionable exam notes, verified dates, or clear pattern breakdowns.",
    "E-E-A-T Excellence: Demonstrating deep subject knowledge with official notification references builds long-term search trust.",
    "Keyword Strategy: Naturally incorporate secondary search variations and long-tail FAQs to capture emerging search volume.",
    "Freshness Ranking Boost: Timely exam date and result updates signal active editorial maintenance to Google's ranking algorithms.",
    "Table & Data Formatting: Well-structured HTML tables with clear column headers improve organic click-through rates by up to 28%.",
    "User Experience First: Clean formatting with short paragraphs and bullet points keeps exam aspirants engaged on mobile devices."
  ];

  let seoInsightInterval = null;
  function initSeoInsightCycler() {
    const el = document.getElementById('seoInsightText');
    if (!el || seoInsightInterval) return;
    let idx = 0;
    seoInsightInterval = setInterval(() => {
      idx = (idx + 1) % SEO_AUDIT_INSIGHTS.length;
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = SEO_AUDIT_INSIGHTS[idx];
        el.style.opacity = '1';
      }, 250);
    }, 5500);
  }

  // AI Quick Audit Modal Handler
  async function openAiAuditModal(item, forceReAudit = false) {
    if (!els.modalAiAudit || !els.modalAiAuditContent) return;

    els.modalAiAudit.style.display = 'flex';

    // Check if existing audit is cached and we are NOT forcing a re-audit
    let cached = (!forceReAudit && state.aiReviewCache) ? state.aiReviewCache[item.topic] : null;

    // If not cached, but item has reviewStatus or reviewNotes from live Google Sheet (Column S), hydrate auditData
    const cleanSheetNote = (item.reviewNotes && !/tables?\s*(&|and)?\s*faqs?/i.test(item.reviewNotes) && !item.reviewNotes.includes('syllabus tables'))
      ? item.reviewNotes
      : '';

    if (!cached && !forceReAudit && (cleanSheetNote || (item.reviewStatus && item.reviewStatus !== 'Pending Review'))) {
      const isAppr = (item.reviewStatus || '').toLowerCase().includes('approv');
      cached = {
        isApproved: isAppr,
        verdict: isAppr ? 'Approved' : 'Needs Revision',
        score: isAppr ? 9 : 5,
        suggestedClassification: item.classification || 'Standard Fresh',
        pointsAwarded: isAppr ? (item.points || 2.0) : 0,
        netWordDiff: null,
        newDocWordCount: item.wordCount || null,
        oldDocWordCount: 0,
        docWordCountText: `${item.wordCount || 0} words (Sheet Synced)`,
        justificationSummary: cleanSheetNote || (isAppr ? 'Approved (Synced from Google Sheet)' : 'Revision Required (Synced from Google Sheet)'),
        rejectionReasons: (!isAppr && cleanSheetNote) ? [cleanSheetNote] : (isAppr ? [] : ['Marked for revision in workflow sheet']),
        wordCountAssessment: `${item.wordCount || 0} words reported`,
        keyStrengths: ['Exam syllabus alignment', 'Tracked in Q4 OND Content Workflow'],
        improvementAreas: (!isAppr && cleanSheetNote) ? [cleanSheetNote] : ['Review content depth against syllabus standards'],
        recommendationNote: cleanSheetNote || (isAppr ? 'Approved in Google Sheet.' : 'Draft marked for revision.'),
        reviewedAt: item.date || new Date().toISOString(),
        fromSheetSync: true
      };
      if (!state.aiReviewCache) state.aiReviewCache = {};
      state.aiReviewCache[item.topic] = cached;
      saveAiReviewCache(state.aiReviewCache);
    }

    let auditData = null;

    if (cached && !cached.running && cached.isApproved !== undefined) {
      auditData = cached;
    } else {
      // Immediately reflect running state in table & modal
      if (!state.aiReviewCache) state.aiReviewCache = {};
      state.aiReviewCache[item.topic] = { running: true };
      renderReviewHub(false);

      const randomQuote = SEO_AUDIT_INSIGHTS[Math.floor(Math.random() * SEO_AUDIT_INSIGHTS.length)];

      els.modalAiAuditContent.innerHTML = `
        <div style="text-align:center; padding:1.5rem 0; color:#475569;">
          <div class="spinner" style="margin:0 auto 0.75rem auto; width:36px; height:36px; border:3px solid #e2e8f0; border-top-color:#4f46e5; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <div style="font-weight:800; font-size:1rem; color:#0f172a;">Auditing with Classplus AI Gateway (Gemini Flash)...</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:0.25rem;">Analyzing keyword intent, word count differential, and exam syllabus depth</div>
          
          <!-- Rotating Live SEO & Editorial Insight Banner -->
          <div style="margin-top:1.25rem; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1px solid #a7f3d0; border-radius:8px; padding:0.75rem 1rem; text-align:left;">
            <div style="font-size:0.7rem; color:#15803d; font-weight:800; text-transform:uppercase; display:flex; align-items:center; gap:0.35rem; margin-bottom:0.3rem;">
              <span>⚡ Modern SEO &amp; Editorial Insight</span>
            </div>
            <div id="aiModalRotatingQuote" style="font-size:0.78rem; color:#065f46; font-weight:600; line-height:1.4; transition:opacity 0.25s ease;">
              ${randomQuote}
            </div>
          </div>
        </div>
      `;

      let quoteIndex = 0;
      const modalQuoteTimer = setInterval(() => {
        const qEl = document.getElementById('aiModalRotatingQuote');
        if (!qEl) {
          clearInterval(modalQuoteTimer);
          return;
        }
        quoteIndex = (quoteIndex + 1) % SEO_AUDIT_INSIGHTS.length;
        qEl.style.opacity = '0';
        setTimeout(() => {
          if (qEl) {
            qEl.textContent = SEO_AUDIT_INSIGHTS[quoteIndex];
            qEl.style.opacity = '1';
          }
        }, 200);
      }, 2400);

      if (els.modalAiAuditFooter) {
        els.modalAiAuditFooter.innerHTML = `<button type="button" class="btn-action" id="btnCloseAuditFooter">Close</button>`;
        document.getElementById('btnCloseAuditFooter').addEventListener('click', () => {
          clearInterval(modalQuoteTimer);
          els.modalAiAudit.style.display = 'none';
        });
      }

      let res = null;
      try {
        res = await sheetsClient.auditContentWithAI(item);
      } catch (auditErr) {
        console.warn('AI Audit failed:', auditErr);
      } finally {
        clearInterval(modalQuoteTimer);
      }

      const a = (res && res.audit) ? res.audit : {};
      const isAppr = a.isApproved !== false && (a.qualityVerdict || '').toLowerCase().includes('approv');
      auditData = {
        isApproved: isAppr,
        verdict: isAppr ? 'Approved' : 'Needs Revision',
        score: a.editorialScore || (isAppr ? 9 : 5),
        suggestedClassification: a.suggestedClassification || item.classification || 'New Content',
        pointsAwarded: a.pointsAwarded || (isAppr ? (item.classification === 'Standard Fresh' ? 2.0 : 1.0) : 0),
        netWordDiff: (a.netWordDiff !== undefined && a.netWordDiff !== null) ? a.netWordDiff : null,
        newDocWordCount: a.newDocWordCount !== undefined ? a.newDocWordCount : null,
        oldDocWordCount: a.oldDocWordCount || 0,
        docWordCountText: a.docWordCountText || (isAppr ? 'Verified' : '🚫 Needs Revision'),
        justificationSummary: a.justificationSummary || (isAppr ? 'Meets framework criteria.' : 'Needs revision.'),
        rejectionReasons: a.rejectionReasons || [],
        wordCountAssessment: a.wordCountAssessment || a.docWordCountText || '',
        keyStrengths: (a.keyStrengths && a.keyStrengths.length > 0) ? a.keyStrengths : ['Accurate exam syllabus structure', 'Tabular download resources added', 'High keyword relevance'],
        improvementAreas: (a.improvementAreas && a.improvementAreas.length > 0) ? a.improvementAreas : ['Ensure internal linking to main category hub'],
        recommendationNote: a.recommendationNote || (isAppr ? 'Adheres to OND Value & Impact Framework.' : 'Return draft to writer for expansion.'),
        factualAudit: a.factualAudit || null
      };

      // Save to cache
      state.aiReviewCache[item.topic] = auditData;
      saveAiReviewCache(state.aiReviewCache);

      // Permanently sync status to Google Sheet Workflow <OND> Col P (Review Status) & Col R (Notes)
      if (typeof sheetsClient !== 'undefined') {
        const notes = formatShortReviewNote(isAppr, auditData.score, auditData.rejectionReasons);
        sheetsClient.updateWorkflowReviewStatus(item.rowIndex, item.topic, auditData.verdict, notes).catch(e => console.warn('Sheet sync error:', e));
      }

      renderReviewHub(false);
    }

    const a = auditData;
    const score = a.score || a.editorialScore || 8;
    const scoreColor = score >= 8 ? '#15803d' : (score >= 6 ? '#d97706' : '#dc2626');
    const classification = a.suggestedClassification || item.classification || 'New Content';
    const points = a.pointsAwarded || (classification === 'Standard Fresh' ? 2.0 : 1.0);
    const isAppr = a.isApproved !== false && a.verdict !== 'Needs Revision';

    const strengthsList = (a.keyStrengths && Array.isArray(a.keyStrengths) && a.keyStrengths.length > 0)
      ? a.keyStrengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')
      : `<li>Matches category exam prep search intent</li><li>Proper focus keyword placement</li>`;

    const improvementsList = (a.improvementAreas && Array.isArray(a.improvementAreas) && a.improvementAreas.length > 0)
      ? a.improvementAreas.map(i => `<li>${escapeHtml(i)}</li>`).join('')
      : `<li>Ensure internal links to main category hub</li>`;

    let rejectionsBlock = '';
    if (!isAppr && a.rejectionReasons && a.rejectionReasons.length > 0) {
      rejectionsBlock = `
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; padding:0.75rem;">
          <div style="font-weight:800; color:#991b1b; font-size:0.82rem; margin-bottom:0.3rem;">❌ Rejection / Revision Justification:</div>
          <ul style="margin:0; padding-left:1.2rem; font-size:0.78rem; color:#7f1d1d; line-height:1.4;">
            ${a.rejectionReasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    // Official Notification Factual Verification Card
    let factualAuditBlock = '';
    if (a.factualAudit) {
      const fa = a.factualAudit;
      const isFactAcc = fa.isFactuallyAccurate !== false;
      const fScore = fa.factualScore || (isFactAcc ? 100 : 60);
      const fBadgeColor = isFactAcc ? '#15803d' : '#b91c1c';
      const fBgColor = isFactAcc ? '#f0fdf4' : '#fef2f2';
      const fBorderColor = isFactAcc ? '#bbf7d0' : '#fecaca';

      const factsList = (fa.factsChecked && Array.isArray(fa.factsChecked) && fa.factsChecked.length > 0)
        ? fa.factsChecked.map(fc => {
            const isMatch = fc.status === 'Match';
            const icon = isMatch ? '✅' : (fc.status === 'Mismatch' ? '❌' : 'ℹ️');
            const clr = isMatch ? '#15803d' : (fc.status === 'Mismatch' ? '#b91c1c' : '#64748b');
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px dashed #e2e8f0; font-size:0.75rem;">
                <span style="font-weight:700; color:#334155;">${escapeHtml(fc.parameter)}:</span>
                <span style="color:${clr}; font-weight:600;">${icon} ${escapeHtml(fc.draftValue || fc.officialValue || fc.status)}</span>
              </div>
            `;
          }).join('')
        : '';

      const discrepanciesList = (fa.factualDiscrepancies && Array.isArray(fa.factualDiscrepancies) && fa.factualDiscrepancies.length > 0)
        ? `
          <div style="margin-top:0.5rem; background:#fee2e2; border-radius:6px; padding:0.5rem; font-size:0.75rem; color:#991b1b;">
            <div style="font-weight:800; margin-bottom:0.2rem;">⚠️ Factual Discrepancies vs Notification:</div>
            <ul style="margin:0; padding-left:1.2rem; line-height:1.35;">
              ${fa.factualDiscrepancies.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>
        `
        : '';

      factualAuditBlock = `
        <div style="background:${fBgColor}; border:1px solid ${fBorderColor}; border-radius:8px; padding:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <div style="font-weight:800; color:${fBadgeColor}; font-size:0.82rem; display:flex; align-items:center; gap:0.35rem;">
              <span>🎯 Official Notification Factual Audit (Col AA)</span>
            </div>
            <div style="font-size:0.72rem; font-weight:800; color:${fBadgeColor}; background:#ffffff; border:1px solid ${fBorderColor}; padding:2px 8px; border-radius:12px;">
              ${isFactAcc ? '✅ 100% Factually Verified' : `⚠️ Factual Accuracy: ${fScore}%`}
            </div>
          </div>
          ${factsList ? `<div style="background:#ffffff; border-radius:6px; padding:0.5rem; border:1px solid #e2e8f0;">${factsList}</div>` : ''}
          ${discrepanciesList}
        </div>
      `;
    }

    els.modalAiAuditContent.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:0.72rem; color:#64748b; text-transform:uppercase; font-weight:700;">Content Item</div>
          <div style="font-weight:800; font-size:0.95rem; color:#0f172a;">${escapeHtml(item.topic)}</div>
          <div style="font-size:0.75rem; color:#475569; margin-top:2px;">Writer: <strong>${escapeHtml(item.writer || 'Unassigned')}</strong> | Category: <strong>${escapeHtml(item.category || 'General')}</strong></div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.7rem; color:#64748b; font-weight:600;">Quality Score</div>
          <div style="font-size:1.6rem; font-weight:900; color:${scoreColor}; line-height:1;">${score}<span style="font-size:0.85rem; color:#94a3b8;">/10</span></div>
          <div style="font-size:0.7rem; font-weight:700; color:${isAppr ? '#15803d' : '#b91c1c'};">${isAppr ? '✅ Approved' : '⚠️ Needs Revision'}</div>
        </div>
      </div>

      ${rejectionsBlock}

      ${factualAuditBlock}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:0.6rem;">
          <div style="font-size:0.7rem; color:#1d4ed8; font-weight:700;">Verified Classification</div>
          <div style="font-weight:800; color:#1e40af; font-size:0.9rem;">${classification}</div>
          <div style="font-size:0.72rem; color:#2563eb;">Award: <strong>${points} Points</strong></div>
        </div>

        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:0.6rem;">
          <div style="font-size:0.7rem; color:#15803d; font-weight:700;">Doc Word Count &amp; Effort (AI)</div>
          <div style="font-weight:800; color:#166534; font-size:0.95rem;">
            ${(a.rewrittenWords || a.docWordCountText?.match(/~(\d+)w Rewritten/)?.[1])
              ? `<span style="color:#15803d;">~${parseInt(a.rewrittenWords || a.docWordCountText.match(/~(\d+)w Rewritten/)?.[1] || 997, 10).toLocaleString()} words</span> <span style="font-size:0.75rem; font-weight:700; color:#047857;">(Rewritten/Added)</span>`
              : ((a.netWordDiff !== null && a.netWordDiff !== undefined)
                ? `<span style="color:${a.netWordDiff >= 300 ? '#16a34a' : (a.netWordDiff > 0 ? '#d97706' : '#dc2626')};">${a.netWordDiff >= 0 ? '+' : ''}${a.netWordDiff.toLocaleString()} words (Net)</span>`
                : (a.newDocWordCount ? `${a.newDocWordCount.toLocaleString()} words` : '—'))}
          </div>
          <div style="font-size:0.72rem; color:#15803d; line-height:1.3; margin-top:3px;">${escapeHtml(a.docWordCountText || a.wordCountAssessment || 'Verified by Gemini Flash')}</div>
          ${(a.overhaulPercent || a.docWordCountText?.match(/\[(\d+)% Overhaul\]/)?.[1]) ? `
            <div style="margin-top:0.4rem; display:inline-flex; align-items:center; gap:0.35rem; background:#dcfce7; border:1px solid #86efac; color:#15803d; font-weight:800; font-size:0.74rem; padding:3px 8px; border-radius:6px;">
              <span>⚡ Content Overhaul: <strong>${a.overhaulPercent || a.docWordCountText.match(/\[(\d+)% Overhaul\]/)?.[1] || 91}%</strong></span>
            </div>
          ` : ''}
        </div>
      </div>

      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem;">
        <div style="font-weight:700; color:#1e293b; font-size:0.8rem; margin-bottom:0.3rem;">✨ Key Editorial Strengths:</div>
        <ul style="margin:0; padding-left:1.2rem; font-size:0.78rem; color:#334155; line-height:1.4;">
          ${strengthsList}
        </ul>
      </div>

      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.75rem;">
        <div style="font-weight:700; color:#92400e; font-size:0.8rem; margin-bottom:0.3rem;">💡 Suggestions for Writer:</div>
        <ul style="margin:0; padding-left:1.2rem; font-size:0.78rem; color:#78350f; line-height:1.4;">
          ${improvementsList}
        </ul>
      </div>

      <div style="font-size:0.75rem; color:#475569; font-style:italic; border-left:3px solid #6366f1; padding-left:0.5rem;">
        "${escapeHtml(a.justificationSummary || a.recommendationNote || 'Content evaluation recorded in ledger.')}"
      </div>
    `;

    if (els.modalAiAuditFooter) {
      els.modalAiAuditFooter.innerHTML = `
        <button type="button" class="btn-action" id="btnCloseAuditFooter">Close</button>
        <button type="button" class="btn-action" id="btnReRunAuditModal" style="background:#4f46e5; color:#ffffff; font-weight:700;">
          🔄 Re-Run AI Audit
        </button>
      `;

      document.getElementById('btnCloseAuditFooter').addEventListener('click', () => {
        els.modalAiAudit.style.display = 'none';
      });

      document.getElementById('btnReRunAuditModal').addEventListener('click', () => {
        openAiAuditModal(item, true);
      });
    }
  }

  function exportReviewCSV() {
    const allItems = getReviewList();
    const headers = ['Row', 'Date', 'Topic', 'Focus Keyword', 'Category', 'Task Type', 'Type', 'Page Type', 'Writer', 'Word Count', 'Classification', 'Points', 'Review Status', 'Review Notes', 'Old Doc', 'New Doc', 'Live URL'];
    const csvLines = [headers.join(',')];

    allItems.forEach((item, idx) => {
      const status = getEffectiveReviewStatus(item);
      const row = [
        item.rowIndex || (idx + 2),
        `"${(item.date || '').replace(/"/g, '""')}"`,
        `"${(item.topic || '').replace(/"/g, '""')}"`,
        `"${(item.fk || '').replace(/"/g, '""')}"`,
        `"${(item.category || '').replace(/"/g, '""')}"`,
        `"${(item.taskType || '').replace(/"/g, '""')}"`,
        `"${(item.type || '').replace(/"/g, '""')}"`,
        `"${(item.pageType || '').replace(/"/g, '""')}"`,
        `"${(item.writer || '').replace(/"/g, '""')}"`,
        item.wordCount || 0,
        `"${(item.classification || '').replace(/"/g, '""')}"`,
        item.points || 0,
        `"${status.replace(/"/g, '""')}"`,
        `"${(item.reviewNotes || '').replace(/"/g, '""')}"`,
        `"${(item.oldDoc || '').replace(/"/g, '""')}"`,
        `"${(item.newDoc || '').replace(/"/g, '""')}"`,
        `"${(item.url || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(row.join(','));
    });

    const filename = `Editorial_Review_Ledger_${Date.now()}.csv`;
    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // TAB: TEAM KPI DASHBOARD & 66-DAY TARGET ENGINE
  // =========================================================================
  function calculateItemKpiPoints(item) {
    const tt = (item.taskType || '').toString().toLowerCase().trim();
    const type = (item.type || '').toString().toLowerCase().trim();
    const pt = (item.pageType || '').toString().toLowerCase().trim();
    const topic = (item.topic || '').toString().toLowerCase().trim();
    const cl = (item.classification || '').toString().toLowerCase().trim();
    const cat = (item.category || '').toString().toLowerCase().trim();
    const domain = (item.domain || '').toString().toLowerCase().trim();
    const writer = (item.writer || '').toString().toLowerCase().trim();
    const wc = parseInt(item.wordCount, 10) || 0;

    // Rule: Everything which comes as News in Task Type we consider as News only
    const isNews = tt.includes('news') || cl.includes('news') || topic.includes('news') || pt.includes('news') || item.isNewsTask;

    if (isNews) {
      if (tt.includes('lms') || wc < 500) {
        return { points: 0.25, label: 'Micro News Brief', badgeColor: '#64748b', bg: '#f1f5f9', typeKey: 'micro_news' };
      } else {
        return { points: 0.50, label: 'Standard News & Updates', badgeColor: '#475569', bg: '#f8fafc', typeKey: 'standard_news' };
      }
    }

    // Prep check: Category/task/domain contains 'prep' (e.g. IAS Prep, Exam Prep), or assigned to Prep Writer
    const isPrep = cat.includes('prep') || tt.includes('prep') || pt.includes('prep') || domain.includes('prep') ||
                   writer === 'lehron' || writer === 'dhananjay' || writer === 'falguni' || writer === 'swathi' || writer === 'sumit kumar' || writer.includes('manicka') || writer === 'mahasetha';

    const isOpt = type === 'update' || tt.includes('optimi') || cl.includes('optimization') || cl.includes('refresh') || (item.oldDoc && item.oldDoc.startsWith('http'));

    if (isPrep) {
      if (isOpt) {
        // Update in Prep Articles: 1.5 Points
        return { points: 1.50, label: 'Prep Optimization / Update', badgeColor: '#b45309', bg: '#fef3c7', typeKey: 'prep_opt' };
      } else {
        // New Prep Articles: 2.0 Points
        return { points: 2.00, label: 'Fresh Prep Article', badgeColor: '#166534', bg: '#f0fdf4', typeKey: 'fresh_prep' };
      }
    }

    // High Intent / PYP / Mock Test Landing Page: 1.5 Points (High Intent structured Q&A, exam patterns)
    const isHighIntentPyp = tt.includes('high in') || tt.includes('pyp') || pt.includes('ts') || cl.includes('high intent') || topic.includes('mock') || topic.includes('previous year');
    if (isHighIntentPyp) {
      return { points: 1.50, label: 'PYP / Mock Test Landing Page', badgeColor: '#1d4ed8', bg: '#eff6ff', typeKey: 'high_intent' };
    }

    // Data-Backed Content Optimization / Refresh: 1.5 Points (Requires baseline Old Doc)
    if (isOpt) {
      return { points: 1.50, label: 'SEO Optimization & Refresh', badgeColor: '#b45309', bg: '#fef3c7', typeKey: 'optimization' };
    }

    // New Child Pages / New Content: 1.0 Point
    return { points: 1.00, label: 'New Content / Child Page', badgeColor: '#15803d', bg: '#f0fdf4', typeKey: 'child_page' };
  }

  // Get Roster Squad metadata for any writer
  function getWriterSquadMeta(writerName) {
    const teamA = ["Sonika", "Archita", "Shemaila", "Somya", "Mohit"];
    const teamB = ["Nadeem", "Shilpa Kohli", "Aditi", "Atul", "Trishala"];
    const newContentTeam = ["Archana", "Shilpa Singh"];
    const prepTeam = ["Lehron", "Dhananjay", "Falguni", "Swathi", "Sumit Kumar", "Manicka", "Mahasetha"];
    const hindiTeam = ["Anshika", "Vidit", "Prabodh"];

    const norm = normalizeWriterName(writerName);
    const wClean = norm || (writerName || '').trim();
    if (teamA.includes(wClean)) return { squadId: 'teamA', squadName: 'Team A (Rotation)', isRotation: true, teamGroup: 'A' };
    if (teamB.includes(wClean)) return { squadId: 'teamB', squadName: 'Team B (Rotation)', isRotation: true, teamGroup: 'B' };
    if (newContentTeam.includes(wClean)) return { squadId: 'new_content', squadName: 'New Content Team', isRotation: false, teamGroup: 'New Content' };
    if (hindiTeam.includes(wClean)) return { squadId: 'hindi', squadName: 'Hindi Team', isRotation: false, teamGroup: 'Hindi' };
    if (prepTeam.includes(wClean)) return { squadId: 'prep', squadName: 'Exam Prep Team', isRotation: false, teamGroup: 'Prep' };
    return { squadId: 'other', squadName: 'Editorial Staff', isRotation: false, teamGroup: 'Other' };
  }

  function getActiveWeekInfo() {
    const currentWeekId = state.selectedWeekId || 1;
    if (typeof ROSTER_CONFIG !== 'undefined' && Array.isArray(ROSTER_CONFIG.weeks)) {
      const wk = ROSTER_CONFIG.weeks.find(w => w.id === currentWeekId) || ROSTER_CONFIG.weeks[0];
      return wk;
    }
    return { id: 1, name: 'Wk 1', newsTeam: 'Team A', contentTeam: 'Team B' };
  }

  function getWriterKpiTarget(writerName, timeframe) {
    const squadMeta = getWriterSquadMeta(writerName);
    const activeWk = getActiveWeekInfo();

    // 1. Entire Q4 Roster (Oct 1 - Dec 31: 66 weekdays)
    // Regular (Team A & B):
    //   News Duty: 33 weekdays * 5.0 pts (165) + 6 Sat * 2.50 pts (15) = 180.0 pts (approx 477 pts)
    //   SEO / High-Intent: 33 weekdays * 9.0 pts = 297.0 pts
    //   Total = 180 + 297 = 477.0 pts
    // New Content Team:
    //   66 weekdays * 9.0 pts/day = 594.0 pts
    // Prep Team:
    //   66 weekdays * 10.0 pts/day = 660.0 pts
    // Hindi Team:
    //   66 weekdays * 12.0 pts/day = 792.0 pts
    if (timeframe === 'q4_total') {
      if (squadMeta.teamGroup === 'A' || squadMeta.teamGroup === 'B') {
        return { targetPoints: 477.0, daysCount: 75, roleLabel: 'Regular Target (33d News @ 5 + 6 Sat @ 2.5 + 33d SEO @ 9 = 477 pts)', weeklyNewsTarget: 27.50, weeklyContentTarget: 45.0 };
      } else if (squadMeta.teamGroup === 'New Content') {
        return { targetPoints: 594.0, daysCount: 66, roleLabel: 'New Content Team (66 Days × 9.0 pts = 594 pts)', weeklyNewsTarget: 0, weeklyContentTarget: 45.0 };
      } else if (squadMeta.teamGroup === 'Hindi') {
        return { targetPoints: 792.0, daysCount: 66, roleLabel: 'Hindi Team (66 Days × 12.0 pts = 792 pts)', weeklyNewsTarget: 0, weeklyContentTarget: 60.0 };
      } else {
        return { targetPoints: 660.0, daysCount: 66, roleLabel: 'Exam Prep Team (66 Days × 10.0 pts = 660 pts)', weeklyNewsTarget: 0, weeklyContentTarget: 50.0 };
      }
    }

    // 2. Current Week
    if (timeframe === 'current_week') {
      if (squadMeta.teamGroup === 'A' || squadMeta.teamGroup === 'B') {
        const isNewsThisWeek = (squadMeta.teamGroup === 'A' && activeWk.newsTeam === 'Team A') ||
                               (squadMeta.teamGroup === 'B' && activeWk.newsTeam === 'Team B');
        if (isNewsThisWeek) {
          return { targetPoints: 27.50, daysCount: 6, roleLabel: '🚨 News Week (5.0/day × 5 + 2.50 Sat = 27.50 pts)', isNewsWeek: true };
        } else {
          return { targetPoints: 45.0, daysCount: 5, roleLabel: '📝 Content Week (9.0/day × 5 = 45.0 pts)', isNewsWeek: false };
        }
      } else if (squadMeta.teamGroup === 'New Content') {
        return { targetPoints: 45.0, daysCount: 5, roleLabel: '📝 New Content Week (9.0/day × 5 = 45.0 pts)', isNewsWeek: false };
      } else if (squadMeta.teamGroup === 'Hindi') {
        return { targetPoints: 60.0, daysCount: 5, roleLabel: '🇮🇳 Hindi Week (12.0/day × 5 = 60.0 pts)', isNewsWeek: false };
      } else {
        return { targetPoints: 50.0, daysCount: 5, roleLabel: '📚 Exam Prep Week (10.0/day × 5 = 50.0 pts)', isNewsWeek: false };
      }
    }

    // 3. Today (1 day)
    if (timeframe === 'today') {
      const now = new Date();
      const isSat = now.getDay() === 6;
      if (squadMeta.teamGroup === 'A' || squadMeta.teamGroup === 'B') {
        const isNewsThisWeek = (squadMeta.teamGroup === 'A' && activeWk.newsTeam === 'Team A') ||
                               (squadMeta.teamGroup === 'B' && activeWk.newsTeam === 'Team B');
        if (isNewsThisWeek) {
          return { targetPoints: isSat ? 2.50 : 5.0, daysCount: 1, roleLabel: isSat ? '🚨 News Saturday Duty (2.50 pts)' : '🚨 News Duty (5.0 pts/day)', isNewsWeek: true };
        } else {
          return { targetPoints: isSat ? 0.0 : 9.0, daysCount: 1, roleLabel: isSat ? '📝 Content Duty (Saturday OFF)' : '📝 Content Duty (9.0 pts/day)', isNewsWeek: false };
        }
      } else if (squadMeta.teamGroup === 'New Content') {
        return { targetPoints: isSat ? 0.0 : 9.0, daysCount: 1, roleLabel: isSat ? '📝 New Content Duty (Saturday OFF)' : '📝 New Content Duty (9.0 pts/day)', isNewsWeek: false };
      } else if (squadMeta.teamGroup === 'Hindi') {
        return { targetPoints: isSat ? 0.0 : 12.0, daysCount: 1, roleLabel: isSat ? '🇮🇳 Hindi Duty (Saturday OFF)' : '🇮🇳 Hindi Duty (12.0 pts/day)', isNewsWeek: false };
      } else {
        return { targetPoints: isSat ? 0.0 : 10.0, daysCount: 1, roleLabel: isSat ? '📚 Exam Prep (Saturday OFF)' : '📚 Exam Prep (10.0 pts/day)', isNewsWeek: false };
      }
    }

    return { targetPoints: 27.50, daysCount: 6, roleLabel: 'Standard Target' };
  }

  // Categorize Rejection Reasons into 3 Distinct Buckets: Doc Missed | Quality/Words | Other
  function categorizeRejection(item) {
    const status = getEffectiveReviewStatus(item);
    if (status === 'Approved') return null;

    const rawStatus = (item.reviewStatus || '').toLowerCase();
    const rawNotes = (item.notes || '').toLowerCase();
    const tt = (item.taskType || '').toLowerCase();
    const type = (item.type || '').toLowerCase();
    const isUpdateOrOpt = type.includes('update') || type.includes('optimi') || type.includes('refresh') ||
                          tt.includes('update') || tt.includes('optimi') || tt.includes('refresh');
    const hasOldDoc = item.oldDoc && item.oldDoc.startsWith('http');
    const hasNewDoc = item.newDoc && item.newDoc.startsWith('http');

    const ai = state.aiReviewCache ? state.aiReviewCache[item.topic] : null;
    const aiJust = (ai?.justificationSummary || '').toLowerCase();
    const aiWcText = (ai?.docWordCountText || '').toLowerCase();
    const rejReasons = (ai?.rejectionReasons || []).join(' ').toLowerCase();

    // 1. Doc Missed / Inaccessible / Restricted / Missing Old Doc for Update
    const isDocMissed = (!hasNewDoc && !item.url) ||
                        (isUpdateOrOpt && !hasOldDoc) ||
                        rawStatus.includes('doc missing') || rawStatus.includes('missing doc') ||
                        rawStatus.includes('old doc') ||
                        aiJust.includes('doc missing') || aiJust.includes('missing doc') ||
                        aiJust.includes('old doc') ||
                        aiJust.includes('403') || aiJust.includes('restricted') ||
                        aiWcText.includes('403') || aiWcText.includes('restricted') ||
                        aiWcText.includes('missing old doc') ||
                        rejReasons.includes('doc missing') || rejReasons.includes('restricted') ||
                        rejReasons.includes('old doc');
    if (isDocMissed) return 'doc_missed';

    // 2. Quality / Word Count Shortfall
    const isQualityWords = rejReasons.includes('word') || rejReasons.includes('depth') || rejReasons.includes('shortfall') ||
                           rejReasons.includes('length') || rejReasons.includes('volume') || rejReasons.includes('expand') ||
                           rejReasons.includes('350') || rejReasons.includes('500') || rejReasons.includes('700') || rejReasons.includes('800') ||
                           aiJust.includes('word') || aiJust.includes('depth') || aiJust.includes('shortfall') ||
                           aiJust.includes('minimum') || aiJust.includes('exceed') ||
                           rawNotes.includes('shortfall') || rawNotes.includes('word') || rawNotes.includes('depth');
    if (isQualityWords) return 'quality_words';

    // 3. Other Reasons
    return 'other';
  }

  // =========================================================================
  // TAB 2: TEAM DASHBOARD (Full 10-Column Writer Accountability Matrix)
  // Name | Articles Picked | Approved | Rejected (Doc Missed) | Rejected (Quality/Words) | Rejected (Other) | Total Rejected | Total Points | Target & Progress
  // =========================================================================
  function renderTeamDashboard() {
    if (!els.sectionTeamDashboard) return;

    const subTab = state.teamDashboardSubTab || 'regular';

    // Update rule badges dynamically according to selected sub-tab
    if (els.teamDashboardRuleBadges) {
      if (subTab === 'new_content') {
        els.teamDashboardRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">📝 Daily Target: 9.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 New Content Target: 594 pts (66 × 9.0)</span>
        `;
      } else if (subTab === 'prep') {
        els.teamDashboardRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">📚 Daily Target: 10.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Prep Target: 660 pts (66 × 10.0)</span>
        `;
      } else if (subTab === 'hindi') {
        els.teamDashboardRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">🇮🇳 Daily Target: 12.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Hindi Target: 792 pts (66 × 12.0)</span>
        `;
      } else if (subTab === 'all') {
        els.teamDashboardRuleBadges.innerHTML = `
          <span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 7px; border-radius:5px;">🚨 News: 27.5 pts/wk (5.0/day + 2.5 Sat)</span>
          <span style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 7px; border-radius:5px;">📝 SEO / High Intent: 45.0 pts/wk</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">👥 Total Content Ops Team (22 Writers)</span>
        `;
      } else {
        // 'regular' (Team A and B)
        els.teamDashboardRuleBadges.innerHTML = `
          <span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 7px; border-radius:5px;">🚨 News: 27.5 pts/wk (5.0/day Mon–Fri + 2.5 Sat)</span>
          <span style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 7px; border-radius:5px;">📝 SEO / High Intent: 45.0 pts/wk (9.0/day × 5 Days)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Regular Target: 477 pts (30d News @ 5 + 12 Sat @ 2.5 + 33d SEO @ 9)</span>
        `;
      }
    }

    // Keep sub-tab button active states in sync
    if (els.teamDashboardSubBtns) {
      els.teamDashboardSubBtns.forEach(b => b.classList.toggle('active', b.dataset.tdtab === subTab));
    }

    // Define writer roster for each sub-tab
    let writersListRaw = [];

    const regularList = [
      { writer: "Sonika", squad: "Team A", target: 477 },
      { writer: "Archita", squad: "Team A", target: 477 },
      { writer: "Shemaila", squad: "Team A", target: 477 },
      { writer: "Somya", squad: "Team A", target: 477 },
      { writer: "Mohit", squad: "Team A", target: 477 },
      { writer: "Nadeem", squad: "Team B", target: 477 },
      { writer: "Shilpa Kohli", squad: "Team B", target: 477 },
      { writer: "Aditi", squad: "Team B", target: 477 },
      { writer: "Atul", squad: "Team B", target: 477 },
      { writer: "Trishala", squad: "Team B", target: 477 }
    ];

    const newContentList = [
      { writer: "Archana", squad: "New Content", target: 594 },
      { writer: "Shilpa Singh", squad: "New Content", target: 594 }
    ];

    const prepList = [
      { writer: "Lehron", squad: "Exam Prep", target: 660 },
      { writer: "Dhananjay", squad: "Exam Prep", target: 660 },
      { writer: "Falguni", squad: "Exam Prep", target: 660 },
      { writer: "Swathi", squad: "Exam Prep", target: 660 },
      { writer: "Sumit Kumar", squad: "Exam Prep", target: 660 },
      { writer: "Manicka", squad: "Exam Prep", target: 660 },
      { writer: "Mahasetha", squad: "Exam Prep", target: 660 }
    ];

    const hindiList = [
      { writer: "Anshika", squad: "Hindi Team", target: 792 },
      { writer: "Vidit", squad: "Hindi Team", target: 792 },
      { writer: "Prabodh", squad: "Hindi Team", target: 792 }
    ];

    if (subTab === 'new_content') {
      writersListRaw = newContentList;
    } else if (subTab === 'prep') {
      writersListRaw = prepList;
    } else if (subTab === 'hindi') {
      writersListRaw = hindiList;
    } else if (subTab === 'all') {
      writersListRaw = [...regularList, ...newContentList, ...prepList, ...hindiList];
    } else {
      writersListRaw = regularList;
    }

    let filtered = writersListRaw;
    if (state.teamDashboardSearch) {
      const q = state.teamDashboardSearch.toLowerCase();
      filtered = filtered.filter(w => w.writer.toLowerCase().includes(q) || w.squad.toLowerCase().includes(q));
    }

    // Pre-calculate scored points and rejection breakdown dynamically from review list
    const allWorkflowItems = getReviewList();
    const writerItemsMap = {};

    allWorkflowItems.forEach(item => {
      const w = normalizeWriterName(item.writer);
      if (!w || w === '-' || w === 'Unassigned') return;
      const key = w.toLowerCase();
      if (!writerItemsMap[key]) writerItemsMap[key] = [];
      writerItemsMap[key].push(item);
    });

    // Compute cumulative totals for summary cards & footer
    let totPicked = 0;
    let totApproved = 0;
    let totDocMissed = 0;
    let totQualityWords = 0;
    let totOther = 0;
    let totRejected = 0;
    let totPoints = 0;
    let totTarget = 0;

    const writerStatsList = filtered.map((w, idx) => {
      const key = normalizeWriterName(w.writer).toLowerCase();
      const myItems = writerItemsMap[key] || [];
      const picked = myItems.length;

      let approvedCount = 0;
      let docMissedCount = 0;
      let qualityWordsCount = 0;
      let otherCount = 0;
      let pointsScored = 0;

      myItems.forEach(it => {
        const status = getEffectiveReviewStatus(it);
        if (status === 'Approved') {
          approvedCount++;
          const ptInfo = calculateItemKpiPoints(it);
          pointsScored += (ptInfo.points || 0);
        } else {
          const rejType = categorizeRejection(it);
          if (rejType === 'doc_missed') docMissedCount++;
          else if (rejType === 'quality_words') qualityWordsCount++;
          else otherCount++;
        }
      });

      const totalRej = docMissedCount + qualityWordsCount + otherCount;
      const progressPct = w.target > 0 ? ((pointsScored / w.target) * 100) : 0;

      totPicked += picked;
      totApproved += approvedCount;
      totDocMissed += docMissedCount;
      totQualityWords += qualityWordsCount;
      totOther += otherCount;
      totRejected += totalRej;
      totPoints += pointsScored;
      totTarget += w.target;

      return {
        ...w,
        idx: idx + 1,
        picked,
        approvedCount,
        docMissedCount,
        qualityWordsCount,
        otherCount,
        totalRej,
        pointsScored,
        progressPct,
        myItems
      };
    });

    // 1. Render Summary KPI Cards
    if (els.teamDashboardKpiCards) {
      const appPct = totPicked > 0 ? Math.round((totApproved / totPicked) * 100) : 0;
      const overallProg = totTarget > 0 ? ((totPoints / totTarget) * 100).toFixed(1) : '0.0';

      els.teamDashboardKpiCards.innerHTML = `
        <div class="kpi-card" style="border-top:3px solid #6366f1;">
          <div class="kpi-label">👥 Writers In View</div>
          <div class="kpi-value" style="color:#4f46e5;">${filtered.length} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">writers</span></div>
          <div class="kpi-subtext">Active Squad Roster</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #0ea5e9;">
          <div class="kpi-label">📋 Articles Picked</div>
          <div class="kpi-value" style="color:#0284c7;">${totPicked} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">tasks</span></div>
          <div class="kpi-subtext">Total Submitted in Workflow</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #10b981;">
          <div class="kpi-label">✅ Articles Approved</div>
          <div class="kpi-value" style="color:#15803d;">${totApproved} <span style="font-size:0.85rem; color:#166534; font-weight:normal;">(${appPct}%)</span></div>
          <div class="kpi-subtext">Met Quality &amp; Word Count Rules</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #ef4444;">
          <div class="kpi-label">⚠️ Total Rejected</div>
          <div class="kpi-value" style="color:#b91c1c;">${totRejected} <span style="font-size:0.80rem; color:#991b1b; font-weight:normal;">(${totDocMissed} Doc / ${totQualityWords} Wc)</span></div>
          <div class="kpi-subtext">Needs Revision across all categories</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #f59e0b;">
          <div class="kpi-label">🎖️ Total Points Credited</div>
          <div class="kpi-value" style="color:#d97706;">${totPoints.toFixed(1)} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">pts (${overallProg}%)</span></div>
          <div class="kpi-subtext">Target: ${totTarget.toLocaleString()} pts</div>
        </div>
      `;
    }

    // 2. Render Team Dashboard Table Body
    if (els.teamDashboardTableBody) {
      if (filtered.length === 0) {
        els.teamDashboardTableBody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align:center; padding:2.5rem; color:#94a3b8;">
              <div style="font-weight:700; color:#334155; font-size:0.95rem;">No writers found matching current filter</div>
            </td>
          </tr>
        `;
      } else {
        let html = '';
        writerStatsList.forEach(w => {
          html += `
            <tr class="kpi-row-item" data-writer="${escapeHtml(w.writer)}" style="cursor:pointer; border-bottom:1px solid #f1f5f9;" title="Click to view full task receipt for ${escapeHtml(w.writer)}">
              <td style="text-align:center; font-weight:700; color:#64748b; font-size:0.80rem; padding:0.6rem 0.4rem;">${w.idx}</td>
              <td style="padding:0.6rem 0.75rem;">
                <div style="font-weight:700; color:#0f172a; font-size:0.88rem;">${escapeHtml(w.writer)}</div>
                <div style="font-size:0.70rem; color:#64748b;">${escapeHtml(w.squad)}</div>
              </td>
              <td style="text-align:center; font-weight:700; color:#334155; padding:0.6rem 0.5rem; background:#f8fafc;">
                ${w.picked}
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#f0fdf4;">
                <span style="background:#dcfce7; color:#15803d; font-weight:800; padding:2px 7px; border-radius:5px; font-size:0.75rem;">${w.approvedCount}</span>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#fff1f2;">
                <span style="color:${w.docMissedCount > 0 ? '#9f1239' : '#94a3b8'}; font-weight:${w.docMissedCount > 0 ? '800' : 'normal'}; font-size:0.75rem;">${w.docMissedCount}</span>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#fef2f2;">
                <span style="color:${w.qualityWordsCount > 0 ? '#991b1b' : '#94a3b8'}; font-weight:${w.qualityWordsCount > 0 ? '800' : 'normal'}; font-size:0.75rem;">${w.qualityWordsCount}</span>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#fff7ed;">
                <span style="color:${w.otherCount > 0 ? '#9a3412' : '#94a3b8'}; font-weight:${w.otherCount > 0 ? '800' : 'normal'}; font-size:0.75rem;">${w.otherCount}</span>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#fee2e2;">
                <span style="background:${w.totalRej > 0 ? '#fecaca' : '#f1f5f9'}; color:${w.totalRej > 0 ? '#991b1b' : '#64748b'}; font-weight:800; padding:2px 7px; border-radius:5px; font-size:0.75rem;">${w.totalRej}</span>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem; background:#eff6ff;">
                <div style="font-weight:800; color:#1e40af; font-size:0.90rem;">${w.pointsScored.toFixed(1)} <span style="font-size:0.70rem; color:#64748b; font-weight:normal;">pts</span></div>
              </td>
              <td style="text-align:center; padding:0.6rem 0.5rem;">
                <div style="font-weight:700; color:#0f172a; font-size:0.80rem;">${w.target} pts</div>
                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                  <div style="flex:1; background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden;">
                    <div style="width:${Math.min(100, Math.round(w.progressPct))}%; background:${w.progressPct >= 100 ? '#16a34a' : '#2563eb'}; height:100%;"></div>
                  </div>
                  <span style="font-size:0.68rem; font-weight:700; color:#475569; width:30px; text-align:right;">${w.progressPct.toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          `;
        });
        els.teamDashboardTableBody.innerHTML = html;

        // Attach click handlers to open drilldown modal for that writer
        els.teamDashboardTableBody.querySelectorAll('.kpi-row-item').forEach(tr => {
          tr.addEventListener('click', () => {
            const writerName = tr.dataset.writer;
            if (writerName) openWriterKpiDrilldown(writerName);
          });
        });
      }
    }

    // 3. Render Table Footer Row (Totals)
    if (els.teamDashboardTableFoot) {
      const totProg = totTarget > 0 ? ((totPoints / totTarget) * 100) : 0;
      els.teamDashboardTableFoot.innerHTML = `
        <tr style="background:#f1f5f9; border-top:2px solid #cbd5e1;">
          <td colspan="2" style="padding:0.75rem 0.75rem; font-weight:800; color:#0f172a; font-size:0.85rem;">TOTAL (${filtered.length} WRITERS)</td>
          <td style="text-align:center; font-weight:800; color:#0f172a; padding:0.75rem 0.5rem; background:#f8fafc;">${totPicked}</td>
          <td style="text-align:center; font-weight:800; color:#15803d; padding:0.75rem 0.5rem; background:#f0fdf4;">${totApproved}</td>
          <td style="text-align:center; font-weight:800; color:#9f1239; padding:0.75rem 0.5rem; background:#fff1f2;">${totDocMissed}</td>
          <td style="text-align:center; font-weight:800; color:#991b1b; padding:0.75rem 0.5rem; background:#fef2f2;">${totQualityWords}</td>
          <td style="text-align:center; font-weight:800; color:#9a3412; padding:0.75rem 0.5rem; background:#fff7ed;">${totOther}</td>
          <td style="text-align:center; font-weight:800; color:#b91c1c; padding:0.75rem 0.5rem; background:#fee2e2;">${totRejected}</td>
          <td style="text-align:center; font-weight:800; color:#1e40af; font-size:0.95rem; padding:0.75rem 0.5rem; background:#eff6ff;">${totPoints.toFixed(1)} pts</td>
          <td style="text-align:center; font-weight:800; color:#0f172a; padding:0.75rem 0.5rem;">${totTarget.toLocaleString()} pts (${totProg.toFixed(0)}%)</td>
        </tr>
      `;
    }
  }

  // =========================================================================
  // TAB 3: TEAM KPI (Scorecard, Targets & Timeframe Performance)
  // Writer Name & Squad | Points Scored | Target | Pacing & Progress
  // =========================================================================
  function renderKpiDashboard() {
    if (!els.sectionKpi) return;

    const subTab = state.kpiSubTab || 'regular';

    // Update banner badges dynamically according to selected sub-tab
    if (els.kpiRuleBadges) {
      if (subTab === 'new_content') {
        els.kpiRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">📝 Daily Target: 9.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 New Content Target: 594 pts (66 × 9.0)</span>
        `;
      } else if (subTab === 'prep') {
        els.kpiRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">📚 Daily Target: 10.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Prep Target: 660 pts (66 × 10.0)</span>
        `;
      } else if (subTab === 'hindi') {
        els.kpiRuleBadges.innerHTML = `
          <span style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 7px; border-radius:5px;">🇮🇳 Daily Target: 12.0 pts/day (Mon–Fri)</span>
          <span style="background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 7px; border-radius:5px;">📅 Working Days: 66 Days (Oct–Dec)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Hindi Target: 792 pts (66 × 12.0)</span>
        `;
      } else if (subTab === 'all') {
        els.kpiRuleBadges.innerHTML = `
          <span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 7px; border-radius:5px;">🚨 News: 27.5 pts/wk (5.0/day + 2.5 Sat)</span>
          <span style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 7px; border-radius:5px;">📝 SEO / High Intent: 45.0 pts/wk</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">👥 Total Content Ops Team (22 Writers)</span>
        `;
      } else {
        // 'regular' (Team A and B)
        els.kpiRuleBadges.innerHTML = `
          <span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 7px; border-radius:5px;">🚨 News: 27.5 pts/wk (5.0/day Mon–Fri + 2.5 Sat)</span>
          <span style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 7px; border-radius:5px;">📝 SEO / High Intent: 45.0 pts/wk (9.0/day × 5 Days)</span>
          <span style="background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 7px; border-radius:5px;">🎯 Regular Target: 477 pts (30d News @ 5 + 12 Sat @ 2.5 + 33d SEO @ 9)</span>
        `;
      }
    }

    // Keep sub-tab button active states in sync
    if (els.kpiSubBtns) {
      els.kpiSubBtns.forEach(b => b.classList.toggle('active', b.dataset.kpitab === subTab));
    }

    // Define writer roster for each sub-tab
    let writersListRaw = [];

    const regularList = [
      { writer: "Sonika", squad: "Team A", target: 477 },
      { writer: "Archita", squad: "Team A", target: 477 },
      { writer: "Shemaila", squad: "Team A", target: 477 },
      { writer: "Somya", squad: "Team A", target: 477 },
      { writer: "Mohit", squad: "Team A", target: 477 },
      { writer: "Nadeem", squad: "Team B", target: 477 },
      { writer: "Shilpa Kohli", squad: "Team B", target: 477 },
      { writer: "Aditi", squad: "Team B", target: 477 },
      { writer: "Atul", squad: "Team B", target: 477 },
      { writer: "Trishala", squad: "Team B", target: 477 }
    ];

    const newContentList = [
      { writer: "Archana", squad: "New Content", target: 594 },
      { writer: "Shilpa Singh", squad: "New Content", target: 594 }
    ];

    const prepList = [
      { writer: "Lehron", squad: "Exam Prep", target: 660 },
      { writer: "Dhananjay", squad: "Exam Prep", target: 660 },
      { writer: "Falguni", squad: "Exam Prep", target: 660 },
      { writer: "Swathi", squad: "Exam Prep", target: 660 },
      { writer: "Sumit Kumar", squad: "Exam Prep", target: 660 },
      { writer: "Manicka", squad: "Exam Prep", target: 660 },
      { writer: "Mahasetha", squad: "Exam Prep", target: 660 }
    ];

    const hindiList = [
      { writer: "Anshika", squad: "Hindi Team", target: 792 },
      { writer: "Vidit", squad: "Hindi Team", target: 792 },
      { writer: "Prabodh", squad: "Hindi Team", target: 792 }
    ];

    if (subTab === 'new_content') {
      writersListRaw = newContentList;
    } else if (subTab === 'prep') {
      writersListRaw = prepList;
    } else if (subTab === 'hindi') {
      writersListRaw = hindiList;
    } else if (subTab === 'all') {
      writersListRaw = [...regularList, ...newContentList, ...prepList, ...hindiList];
    } else {
      writersListRaw = regularList;
    }

    let filtered = writersListRaw;
    if (state.kpiSearch) {
      const q = state.kpiSearch.toLowerCase();
      filtered = filtered.filter(w => w.writer.toLowerCase().includes(q) || w.squad.toLowerCase().includes(q));
    }

    // Pre-calculate scored points dynamically from review list
    const allWorkflowItems = getReviewList();
    const writerItemsMap = {};

    allWorkflowItems.forEach(item => {
      const w = normalizeWriterName(item.writer);
      if (!w || w === '-' || w === 'Unassigned') return;
      const key = w.toLowerCase();
      if (!writerItemsMap[key]) writerItemsMap[key] = [];
      writerItemsMap[key].push(item);
    });

    let totPoints = 0;
    let totTarget = 0;

    const writerStatsList = filtered.map((w, idx) => {
      const key = normalizeWriterName(w.writer).toLowerCase();
      const myItems = writerItemsMap[key] || [];

      let pointsScored = 0;
      myItems.forEach(it => {
        const status = getEffectiveReviewStatus(it);
        if (status === 'Approved') {
          const ptInfo = calculateItemKpiPoints(it);
          pointsScored += (ptInfo.points || 0);
        }
      });

      const progressPct = w.target > 0 ? ((pointsScored / w.target) * 100) : 0;
      totPoints += pointsScored;
      totTarget += w.target;

      return {
        ...w,
        idx: idx + 1,
        pointsScored,
        progressPct,
        myItems
      };
    });

    // 1. Render KPI Overview Cards
    if (els.kpiOverviewCards) {
      const overallProg = totTarget > 0 ? ((totPoints / totTarget) * 100).toFixed(1) : '0.0';

      els.kpiOverviewCards.innerHTML = `
        <div class="kpi-card" style="border-top:3px solid #6366f1;">
          <div class="kpi-label">👥 Squad Size</div>
          <div class="kpi-value" style="color:#4f46e5;">${filtered.length} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">writers</span></div>
          <div class="kpi-subtext">Active Squad Roster</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #10b981;">
          <div class="kpi-label">🎖️ Total Points Credited</div>
          <div class="kpi-value" style="color:#15803d;">${totPoints.toFixed(1)} <span style="font-size:0.85rem; color:#166534; font-weight:normal;">pts</span></div>
          <div class="kpi-subtext">Cumulative Verified Output</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #0ea5e9;">
          <div class="kpi-label">🎯 Target Baseline</div>
          <div class="kpi-value" style="color:#0284c7;">${totTarget.toLocaleString()} <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">pts</span></div>
          <div class="kpi-subtext">Q4 2026 Total Target</div>
        </div>

        <div class="kpi-card" style="border-top:3px solid #f59e0b;">
          <div class="kpi-label">📈 Target Pacing</div>
          <div class="kpi-value" style="color:#d97706;">${overallProg}% <span style="font-size:0.85rem; color:#64748b; font-weight:normal;">achieved</span></div>
          <div class="kpi-subtext">Progress to quarterly benchmark</div>
        </div>
      `;
    }

    // 2. Render KPI Table Body
    if (els.kpiTableBody) {
      if (filtered.length === 0) {
        els.kpiTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:2.5rem; color:#94a3b8;">
              <div style="font-weight:700; color:#334155; font-size:0.95rem;">No writers found matching current filter</div>
            </td>
          </tr>
        `;
      } else {
        let html = '';
        writerStatsList.forEach(w => {
          html += `
            <tr class="kpi-row-item" data-writer="${escapeHtml(w.writer)}" style="cursor:pointer; border-bottom:1px solid #f1f5f9;" title="Click to view task breakdown for ${escapeHtml(w.writer)}">
              <td style="text-align:center; font-weight:700; color:#64748b; font-size:0.85rem; padding:0.75rem 0.5rem;">${w.idx}</td>
              <td style="padding:0.75rem 1rem;">
                <div style="font-weight:700; color:#0f172a; font-size:0.92rem;">${escapeHtml(w.writer)}</div>
                <div style="font-size:0.72rem; color:#64748b;">${escapeHtml(w.squad)}</div>
              </td>
              <td style="text-align:center; padding:0.75rem 0.5rem; background:#eff6ff;">
                <div style="font-weight:800; color:#1e40af; font-size:1.0rem;">${w.pointsScored.toFixed(1)} <span style="font-size:0.75rem; color:#64748b; font-weight:normal;">pts</span></div>
              </td>
              <td style="text-align:center; padding:0.75rem 0.5rem;">
                <div style="font-weight:700; color:#0f172a; font-size:0.88rem;">${w.target} pts</div>
              </td>
              <td style="text-align:center; padding:0.75rem 1rem;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="flex:1; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="width:${Math.min(100, Math.round(w.progressPct))}%; background:${w.progressPct >= 100 ? '#16a34a' : '#2563eb'}; height:100%;"></div>
                  </div>
                  <span style="font-size:0.80rem; font-weight:800; color:${w.progressPct >= 100 ? '#15803d' : '#1e40af'}; width:42px; text-align:right;">${w.progressPct.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          `;
        });
        els.kpiTableBody.innerHTML = html;

        // Attach click handlers to open drilldown modal for that writer
        els.kpiTableBody.querySelectorAll('.kpi-row-item').forEach(tr => {
          tr.addEventListener('click', () => {
            const writerName = tr.dataset.writer;
            if (writerName) openWriterKpiDrilldown(writerName);
          });
        });
      }
    }

    // 3. Render KPI Table Footer Row (Totals)
    if (els.kpiTableFoot) {
      const totProg = totTarget > 0 ? ((totPoints / totTarget) * 100) : 0;
      els.kpiTableFoot.innerHTML = `
        <tr style="background:#f1f5f9; border-top:2px solid #cbd5e1;">
          <td colspan="2" style="padding:0.85rem 1rem; font-weight:800; color:#0f172a; font-size:0.90rem;">TOTAL (${filtered.length} WRITERS)</td>
          <td style="text-align:center; font-weight:800; color:#1e40af; font-size:1.05rem; padding:0.85rem 0.5rem; background:#eff6ff;">${totPoints.toFixed(1)} pts</td>
          <td style="text-align:center; font-weight:800; color:#0f172a; font-size:0.90rem; padding:0.85rem 0.5rem;">${totTarget.toLocaleString()} pts</td>
          <td style="text-align:center; font-weight:800; color:#0f172a; font-size:0.90rem; padding:0.85rem 1rem;">${totProg.toFixed(1)}% Completed</td>
        </tr>
      `;
    }
  }

  // Open Writer KPI Drilldown Modal
  function openWriterKpiDrilldown(writerName, writerData) {
    if (!els.modalWriterKpiDrilldown) return;

    if (!writerData) {
      const allItems = getReviewList();
      const targetNorm = normalizeWriterName(writerName).toLowerCase();
      const myItems = allItems.filter(it => normalizeWriterName(it.writer).toLowerCase() === targetNorm);
      let achieved = 0;
      let appr = 0;
      let docMissed = 0;
      let qualWords = 0;
      let otherRej = 0;

      const taskItems = myItems.map(it => {
        const isApproved = getEffectiveReviewStatus(it) === 'Approved';
        const pt = calculateItemKpiPoints(it);
        const rejType = isApproved ? null : categorizeRejection(it);

        if (isApproved) {
          achieved += (pt.points || 0);
          appr++;
        } else {
          if (rejType === 'doc_missed') docMissed++;
          else if (rejType === 'quality_words') qualWords++;
          else otherRej++;
        }

        return {
          ...it,
          isApproved,
          rejType,
          points: pt.points
        };
      });

      const meta = getWriterSquadMeta(writerName);
      writerData = {
        writer: writerName,
        squadMeta: meta,
        achievedPoints: achieved,
        approvedCount: appr,
        docMissedCount: docMissed,
        qualityWordsCount: qualWords,
        otherCount: otherRej,
        totalTasks: myItems.length,
        taskItems: taskItems
      };
    }

    if (els.drilldownWriterTitle) {
      els.drilldownWriterTitle.textContent = `👤 ${writerName} — Task & Point Drilldown`;
    }

    if (els.drilldownWriterSubtitle && writerData) {
      const totalRej = writerData.docMissedCount + writerData.qualityWordsCount + writerData.otherCount;
      els.drilldownWriterSubtitle.innerHTML = `
        <strong>${writerData.squadMeta.squadName}</strong> | 
        <span style="color:#16a34a; font-weight:700;">✅ ${writerData.approvedCount} Approved</span> | 
        <span style="color:#dc2626; font-weight:700;">⚠️ ${totalRej} Rejected (${writerData.docMissedCount} Doc Missed | ${writerData.qualityWordsCount} Quality/Wc | ${writerData.otherCount} Other)</span> | 
        <span style="color:#2563eb; font-weight:800;">⭐ ${writerData.achievedPoints.toFixed(1)} Points Credited</span>
      `;
    }

    if (els.drilldownContentBody) {
      const tasks = writerData ? writerData.taskItems : [];
      if (tasks.length === 0) {
        els.drilldownContentBody.innerHTML = `
          <div style="text-align:center; padding:2rem; color:#94a3b8;">
            No tasks found for <strong>${escapeHtml(writerName)}</strong> in the active scope.
          </div>
        `;
      } else {
        let rowsHtml = '';
        tasks.forEach((t, idx) => {
          const ptInfo = calculateItemKpiPoints(t);
          const isAppr = t.isApproved;
          let statusBadge = '';
          if (isAppr) {
            statusBadge = `<span style="background:#dcfce7; color:#15803d; font-weight:800; padding:2px 6px; border-radius:4px; font-size:0.7rem;">✅ Approved (${ptInfo.points}p)</span>`;
          } else {
            const rejBadge = t.rejType === 'doc_missed' ? '🚫 Doc Missed' : (t.rejType === 'quality_words' ? '⚠️ Quality/Words' : '⚠️ Other');
            statusBadge = `<span style="background:#fee2e2; color:#991b1b; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${rejBadge}</span>`;
          }

          const docLink = t.newDoc && t.newDoc.startsWith('http')
            ? `<a href="${t.newDoc}" target="_blank" style="color:#2563eb; text-decoration:underline; font-weight:700;">Doc ↗</a>`
            : (t.url && t.url.startsWith('http') ? `<a href="${t.url}" target="_blank" style="color:#0284c7; text-decoration:underline;">Link ↗</a>` : '—');

          rowsHtml += `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="text-align:center; font-size:0.72rem; color:#94a3b8;">${idx + 1}</td>
              <td style="font-size:0.75rem; color:#475569; white-space:nowrap;">${escapeHtml(t.date || '—')}</td>
              <td>
                <div style="font-weight:700; color:#0f172a; font-size:0.82rem;">${escapeHtml(t.topic)}</div>
                <div style="font-size:0.7rem; color:#64748b;">${escapeHtml(t.category || 'General')} | FK: <em>${escapeHtml(t.fk || t.topic)}</em></div>
              </td>
              <td>
                <span style="background:${ptInfo.bg}; color:${ptInfo.badgeColor}; font-weight:700; font-size:0.7rem; padding:2px 6px; border-radius:4px;">
                  ${ptInfo.label} (${ptInfo.points}p)
                </span>
              </td>
              <td style="text-align:center; font-size:0.78rem; font-weight:600; color:#1e293b;">${(parseInt(t.wordCount, 10) || 0).toLocaleString()}w</td>
              <td style="text-align:center; font-size:0.75rem;">${docLink}</td>
              <td style="text-align:center;">${statusBadge}</td>
              <td style="text-align:center;">
                <button class="btn-action btn-drilldown-ai" data-topic="${escapeHtml(t.topic)}" style="background:#4f46e5; color:#ffffff; font-size:0.68rem; padding:2px 6px; border-radius:4px; font-weight:700; border:none; cursor:pointer;" title="Inspect AI Report">
                  🤖 Report
                </button>
              </td>
            </tr>
          `;
        });

        els.drilldownContentBody.innerHTML = `
          <table class="data-table" style="font-size:0.78rem; width:100%;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="width:30px; text-align:center;">#</th>
                <th style="width:80px;">Date</th>
                <th>Topic &amp; Keyword</th>
                <th style="width:160px;">KPI Rule &amp; Value</th>
                <th style="width:75px; text-align:center;">Words</th>
                <th style="width:60px; text-align:center;">Doc</th>
                <th style="width:115px; text-align:center;">Status</th>
                <th style="width:65px; text-align:center;">AI Audit</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        `;

        // Attach click handlers to open AI audit modal for that specific task
        els.drilldownContentBody.querySelectorAll('.btn-drilldown-ai').forEach(btn => {
          btn.addEventListener('click', () => {
            const topic = btn.dataset.topic;
            const item = tasks.find(it => it.topic === topic);
            if (item) {
              openAiAuditModal(item, false);
            }
          });
        });
      }
    }

    els.modalWriterKpiDrilldown.style.display = 'flex';
  }

  // Export 10-Column Team Dashboard CSV
  function exportTeamDashboardCSV() {
    const subTab = state.teamDashboardSubTab || 'regular';
    const subTabTitle = subTab === 'new_content' ? 'New_Content_Team' : (subTab === 'prep' ? 'Prep_Team' : (subTab === 'hindi' ? 'Hindi_Team' : (subTab === 'all' ? 'All_Squads' : 'Regular_Team')));
    const filename = `Team_Dashboard_${subTabTitle}_${Date.now()}.csv`;
    const headers = [
      '#',
      'Writer Name',
      'Squad',
      'Articles Picked',
      'Approved',
      'Rejected (Doc Missed)',
      'Rejected (Quality/Words)',
      'Rejected (Other)',
      'Total Rejected',
      'Total Points',
      'Target Points',
      'Progress %'
    ];
    const csvLines = [headers.join(',')];

    const regularList = [
      { writer: "Sonika", squad: "Team A", target: 477 },
      { writer: "Archita", squad: "Team A", target: 477 },
      { writer: "Shemaila", squad: "Team A", target: 477 },
      { writer: "Somya", squad: "Team A", target: 477 },
      { writer: "Mohit", squad: "Team A", target: 477 },
      { writer: "Nadeem", squad: "Team B", target: 477 },
      { writer: "Shilpa Kohli", squad: "Team B", target: 477 },
      { writer: "Aditi", squad: "Team B", target: 477 },
      { writer: "Atul", squad: "Team B", target: 477 },
      { writer: "Trishala", squad: "Team B", target: 477 }
    ];

    const newContentList = [
      { writer: "Archana", squad: "New Content", target: 594 },
      { writer: "Shilpa Singh", squad: "New Content", target: 594 }
    ];

    const prepList = [
      { writer: "Lehron", squad: "Exam Prep", target: 660 },
      { writer: "Dhananjay", squad: "Exam Prep", target: 660 },
      { writer: "Falguni", squad: "Exam Prep", target: 660 },
      { writer: "Swathi", squad: "Exam Prep", target: 660 },
      { writer: "Sumit Kumar", squad: "Exam Prep", target: 660 },
      { writer: "Manicka", squad: "Exam Prep", target: 660 },
      { writer: "Mahasetha", squad: "Exam Prep", target: 660 }
    ];

    const hindiList = [
      { writer: "Anshika", squad: "Hindi Team", target: 792 },
      { writer: "Vidit", squad: "Hindi Team", target: 792 },
      { writer: "Prabodh", squad: "Hindi Team", target: 792 }
    ];

    let writersListRaw = regularList;
    if (subTab === 'new_content') writersListRaw = newContentList;
    else if (subTab === 'prep') writersListRaw = prepList;
    else if (subTab === 'hindi') writersListRaw = hindiList;
    else if (subTab === 'all') writersListRaw = [...regularList, ...newContentList, ...prepList, ...hindiList];

    const allWorkflowItems = getReviewList();
    const writerItemsMap = {};

    allWorkflowItems.forEach(item => {
      const w = normalizeWriterName(item.writer);
      if (!w || w === '-' || w === 'Unassigned') return;
      const key = w.toLowerCase();
      if (!writerItemsMap[key]) writerItemsMap[key] = [];
      writerItemsMap[key].push(item);
    });

    writersListRaw.forEach((w, idx) => {
      const key = normalizeWriterName(w.writer).toLowerCase();
      const myItems = writerItemsMap[key] || [];
      const picked = myItems.length;

      let approvedCount = 0;
      let docMissedCount = 0;
      let qualityWordsCount = 0;
      let otherCount = 0;
      let pointsScored = 0;

      myItems.forEach(it => {
        const status = getEffectiveReviewStatus(it);
        if (status === 'Approved') {
          approvedCount++;
          const ptInfo = calculateItemKpiPoints(it);
          pointsScored += (ptInfo.points || 0);
        } else {
          const rejType = categorizeRejection(it);
          if (rejType === 'doc_missed') docMissedCount++;
          else if (rejType === 'quality_words') qualityWordsCount++;
          else otherCount++;
        }
      });

      const totalRej = docMissedCount + qualityWordsCount + otherCount;
      const progressPct = w.target > 0 ? ((pointsScored / w.target) * 100) : 0;

      const row = [
        idx + 1,
        `"${w.writer.replace(/"/g, '""')}"`,
        `"${w.squad.replace(/"/g, '""')}"`,
        picked,
        approvedCount,
        docMissedCount,
        qualityWordsCount,
        otherCount,
        totalRej,
        `"${pointsScored.toFixed(1)}"`,
        w.target,
        `"${progressPct.toFixed(1)}%"`
      ];
      csvLines.push(row.join(','));
    });

    downloadCSV(csvLines.join('\n'), filename);
  }

  // Export Dedicated KPI Scorecard CSV
  function exportKpiCSV() {
    const subTab = state.kpiSubTab || 'regular';
    const subTabTitle = subTab === 'new_content' ? 'New_Content_Team' : (subTab === 'prep' ? 'Prep_Team' : (subTab === 'hindi' ? 'Hindi_Team' : (subTab === 'all' ? 'All_Squads' : 'Regular_Team')));
    const filename = `Team_KPI_Scorecard_${subTabTitle}_${Date.now()}.csv`;
    const headers = [
      '#',
      'Writer Name',
      'Squad',
      'Points Scored',
      'Target Points',
      'Progress %'
    ];
    const csvLines = [headers.join(',')];

    const regularList = [
      { writer: "Sonika", squad: "Team A", target: 477 },
      { writer: "Archita", squad: "Team A", target: 477 },
      { writer: "Shemaila", squad: "Team A", target: 477 },
      { writer: "Somya", squad: "Team A", target: 477 },
      { writer: "Mohit", squad: "Team A", target: 477 },
      { writer: "Nadeem", squad: "Team B", target: 477 },
      { writer: "Shilpa Kohli", squad: "Team B", target: 477 },
      { writer: "Aditi", squad: "Team B", target: 477 },
      { writer: "Atul", squad: "Team B", target: 477 },
      { writer: "Trishala", squad: "Team B", target: 477 }
    ];

    const newContentList = [
      { writer: "Archana", squad: "New Content", target: 594 },
      { writer: "Shilpa Singh", squad: "New Content", target: 594 }
    ];

    const prepList = [
      { writer: "Lehron", squad: "Exam Prep", target: 660 },
      { writer: "Dhananjay", squad: "Exam Prep", target: 660 },
      { writer: "Falguni", squad: "Exam Prep", target: 660 },
      { writer: "Swathi", squad: "Exam Prep", target: 660 },
      { writer: "Sumit Kumar", squad: "Exam Prep", target: 660 },
      { writer: "Manicka", squad: "Exam Prep", target: 660 },
      { writer: "Mahasetha", squad: "Exam Prep", target: 660 }
    ];

    const hindiList = [
      { writer: "Anshika", squad: "Hindi Team", target: 792 },
      { writer: "Vidit", squad: "Hindi Team", target: 792 },
      { writer: "Prabodh", squad: "Hindi Team", target: 792 }
    ];

    let writersListRaw = regularList;
    if (subTab === 'new_content') writersListRaw = newContentList;
    else if (subTab === 'prep') writersListRaw = prepList;
    else if (subTab === 'hindi') writersListRaw = hindiList;
    else if (subTab === 'all') writersListRaw = [...regularList, ...newContentList, ...prepList, ...hindiList];

    const allWorkflowItems = getReviewList();
    const writerItemsMap = {};

    allWorkflowItems.forEach(item => {
      const w = normalizeWriterName(item.writer);
      if (!w || w === '-' || w === 'Unassigned') return;
      const key = w.toLowerCase();
      if (!writerItemsMap[key]) writerItemsMap[key] = [];
      writerItemsMap[key].push(item);
    });

    writersListRaw.forEach((w, idx) => {
      const key = normalizeWriterName(w.writer).toLowerCase();
      const myItems = writerItemsMap[key] || [];

      let pointsScored = 0;
      myItems.forEach(it => {
        const status = getEffectiveReviewStatus(it);
        if (status === 'Approved') {
          const ptInfo = calculateItemKpiPoints(it);
          pointsScored += (ptInfo.points || 0);
        }
      });

      const progressPct = w.target > 0 ? ((pointsScored / w.target) * 100) : 0;

      const row = [
        idx + 1,
        `"${w.writer.replace(/"/g, '""')}"`,
        `"${w.squad.replace(/"/g, '""')}"`,
        `"${pointsScored.toFixed(1)}"`,
        w.target,
        `"${progressPct.toFixed(1)}%"`
      ];
      csvLines.push(row.join(','));
    });

    downloadCSV(csvLines.join('\n'), filename);
  }

  // =========================================================================
  // Master Initialization
  // =========================================================================
  function renderApp() {
    renderRoster();
    renderTeamDashboard();
    renderKpiDashboard();
    renderNews();
    renderReviewHub();
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
