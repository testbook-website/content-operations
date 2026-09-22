/**
 * sheets-client.js - Live Google Sheets Data Fetcher via Google Visualization API (JSONP) & CSV Fallback
 * 
 * Target Google Spreadsheets:
 * - Productivity: 1snahdTze-Ildb3RARo9dd-lwpfI7uUdubMMZfHM2Cl8
 *   - Sheet 1: Number of Articles Published Today (gid=0)
 *   - Sheet 2: Word Count (gid=1647859064)
 *   - Sheet 3: Number of Articles Picked (gid=990952275)
 * - Upcoming Events: 1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A (gid=1107724151)
 * 
 * Note: Uses Google Visualization JSONP to bypass browser CORS restrictions
 * when running from local file:// or arbitrary domains.
 */

const SHEETS_CONFIG = {
  spreadsheetId: '1snahdTze-Ildb3RARo9dd-lwpfI7uUdubMMZfHM2Cl8',
  sheet1_gid: '0',
  sheet2_gid: '1647859064',
  sheet3_gid: '990952275',
  upcomingSpreadsheetId: '1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A',
  upcoming_gid: '1107724151',
  workflowSpreadsheetId: '1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A',
  workflow_gid: '820015548',
  refreshIntervalMs: 5 * 60 * 1000 // 5 minutes
};

class SheetsClient {
  constructor() {
    this.data = typeof BASELINE_SHEETS_DATA !== 'undefined' ? JSON.parse(JSON.stringify(BASELINE_SHEETS_DATA)) : {};
    if (typeof BASELINE_UPCOMING_DATA !== 'undefined') {
      this.data.upcoming_events = BASELINE_UPCOMING_DATA;
    }
    if (typeof BASELINE_WORKFLOW_DATA !== 'undefined') {
      this.data.workflow_jas = BASELINE_WORKFLOW_DATA;
    }
    this.lastSync = this.data && this.data.timestamp ? new Date(this.data.timestamp) : new Date();
    this.subscribers = [];
    this.countdownSeconds = 300;
    this.timerInterval = null;
    this.countdownInterval = null;
    this.isFetching = false;
    this.syncStatus = 'initialized'; // 'initialized' | 'syncing' | 'live' | 'fallback'
  }

  // Subscribe to data updates
  onUpdate(callback) {
    this.subscribers.push(callback);
    if (this.data) {
      callback(this.data, this.lastSync, this.syncStatus);
    }
  }

  // Subscribe to countdown updates
  onCountdown(callback) {
    this.countdownCallback = callback;
  }

  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.data, this.lastSync, this.syncStatus);
      } catch (err) {
        console.error("Error in subscriber callback:", err);
      }
    });
  }

  // =========================================================================
  // Primary Live Fetch: Google Visualization API with JSONP (Zero CORS issues)
  // =========================================================================
  fetchSheetGViz(spreadsheetId, gid, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const callbackName = 'gviz_jsonp_' + Math.round(1000000 * Math.random());
      const script = document.createElement('script');
      let timer = null;

      window[callbackName] = function(json) {
        cleanup();
        if (json && json.status === 'error') {
          reject(new Error(json.errors?.[0]?.message || 'GViz error'));
        } else if (json && json.table) {
          resolve(json.table);
        } else {
          reject(new Error('Invalid GViz response structure'));
        }
      };

      function cleanup() {
        if (timer) clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      }

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`GViz request timed out for gid ${gid}`));
      }, timeoutMs);

      script.onerror = function(err) {
        cleanup();
        reject(new Error(`Failed to load GViz script for gid ${gid}`));
      };

      script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}&_t=${Date.now()}`;
      document.body.appendChild(script);
    });
  }

  // Parse GViz Table for Productivity Sheets (Sheet 1, 2, 3)
  parseGVizProductivity(table, isPickedSheet = false) {
    if (!table || !table.cols || !table.rows) {
      return { headers: [], summary: {}, daily: [] };
    }

    // Extract headers (writers) from cols (starting from index 1)
    const headers = table.cols.slice(1).map(c => (c.label || '').trim()).filter(Boolean);

    // Standard row label mapping for when Google converts Col A to Date/Number
    const knownLabels = isPickedSheet 
      ? ['Today', 'Yesterday', 'Day Before', 'Last 7 Days', 'AMJ', 'JAS', 'April', 'May', 'June', 'July', 'August', 'September']
      : ['Today', 'Yesterday', 'Last 7 Days', 'Last 14 Days', 'Previous 7 days', 'Till Now', 'April', 'May', 'June', 'July', 'August', 'September'];

    const summary = {};
    const daily = [];

    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      if (!row || !row.c) continue;

      const c0 = row.c[0];
      const label = (c0 && (c0.f !== undefined && c0.f !== null ? String(c0.f) : (c0.v !== undefined && c0.v !== null ? String(c0.v) : ''))).trim();

      // Check if this row is a daily date row (e.g. "4/1/2026", "04/01/2026", "2026-04-01")
      if (label && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(label)) {
        const dayData = {};
        for (let h = 0; h < headers.length; h++) {
          const cell = row.c[h + 1];
          const val = cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : (cell && cell.f ? cell.f : '0');
          dayData[headers[h]] = val;
        }
        daily.push({ date: label, data: dayData });
      } else {
        // Summary row
        const rowLabel = label ? label : (i < knownLabels.length ? knownLabels[i] : '');
        if (rowLabel && rowLabel.toLowerCase() !== 'day') {
          const rowData = {};
          for (let h = 0; h < headers.length; h++) {
            const cell = row.c[h + 1];
            const val = cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : (cell && cell.f ? cell.f : '0');
            rowData[headers[h]] = val;
          }
          summary[rowLabel] = rowData;
        }
      }
    }

    return { headers, summary, daily };
  }

  // Parse GViz Table for Upcoming Events (gid: 1107724151)
  parseGVizUpcoming(table) {
    if (!table || !table.rows) return [];
    const items = [];

    for (let i = 0; i < table.rows.length; i++) {
      const r = table.rows[i].c || [];
      const getVal = (idx) => {
        if (!r[idx]) return '';
        if (r[idx].f !== undefined && r[idx].f !== null) return String(r[idx].f).trim();
        if (r[idx].v !== undefined && r[idx].v !== null) return String(r[idx].v).trim();
        return '';
      };

      const date = getVal(0);
      const topic = getVal(7);
      if (!date && !topic) continue;

      let cat = getVal(6) || 'Others';
      if (cat === 'Insuarnce') cat = 'Insurance';
      if (cat === 'Railways') cat = 'Railway';
      if (cat === 'Other') cat = 'Others';
      if (cat === 'state' || cat === 'State') cat = 'State Exams';
      if (cat === 'State psc') cat = 'State PSC';
      if (cat === 'teaching') cat = 'Teaching';
      if (cat === 'police') cat = 'Police';
      if (cat === 'UGC') cat = 'UGC NET';

      const status = getVal(13);
      const pickedBy = getVal(4);
      const priority = getVal(5);
      const type = getVal(8);
      let url = getVal(15);
      if (!url && getVal(10).startsWith('http')) url = getVal(10);

      items.push({
        date,
        category: cat,
        topic,
        status,
        pickedBy,
        priority,
        type,
        url,
        assignedBy: getVal(1),
        datePicked: getVal(2),
        keywords: getVal(11),
        seoSuggestion: getVal(12),
        expectedEventDate: getVal(19)
      });
    }
    return items;
  }

  // Parse GViz Table for Workflow <JAS> (gid: 820015548)
  parseGVizWorkflow(table) {
    if (!table || !table.rows) return [];
    const items = [];

    for (let i = 0; i < table.rows.length; i++) {
      const r = table.rows[i].c || [];
      const getVal = (idx) => {
        if (!r[idx]) return '';
        if (r[idx].f !== undefined && r[idx].f !== null) return String(r[idx].f).trim();
        if (r[idx].v !== undefined && r[idx].v !== null) return String(r[idx].v).trim();
        return '';
      };

      const date = getVal(0);
      const topic = getVal(1);
      if (!date && !topic) continue;

      const category = getVal(5) || 'Others';
      const taskType = getVal(6);
      const type = getVal(7);
      const pageType = getVal(8);
      const writer = getVal(9);
      const fk = getVal(10);
      const wordCount = getVal(11);
      const newDoc = getVal(13);
      let url = getVal(14);
      if (!url && getVal(3)) url = getVal(3);
      const status = getVal(16);

      items.push({
        date,
        topic,
        category,
        taskType,
        type,
        pageType,
        writer,
        fk,
        wordCount,
        newDoc,
        url,
        status
      });
    }
    return items;
  }

  // =========================================================================
  // Fallback CSV Parser (Used if direct HTTP fetch succeeds)
  // =========================================================================
  parseCSVRows(text) {
    const lines = [];
    let row = [];
    let cell = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(cell);
        cell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell);
        if (row.length > 0 && row.some(c => c.trim() !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell || row.length > 0) {
      row.push(cell);
      if (row.some(c => c.trim() !== '')) {
        lines.push(row);
      }
    }
    return lines;
  }

  parseCSV(text) {
    const lines = this.parseCSVRows(text);
    if (lines.length === 0) return { headers: [], summary: {}, daily: [] };

    const headers = lines[0].slice(1).map(h => h.trim()).filter(Boolean);
    const summary = {};
    const daily = [];

    let i = 1;
    while (i < lines.length) {
      const r = lines[i];
      if (!r || r.length === 0 || !r[0].trim()) {
        i++;
        continue;
      }
      const label = r[0].trim();
      if (label.toLowerCase() === 'day') {
        break;
      }
      const rowData = {};
      headers.forEach((h, idx) => {
        if (idx + 1 < r.length) {
          rowData[h] = r[idx + 1].trim();
        }
      });
      summary[label] = rowData;
      i++;
    }

    if (i < lines.length && lines[i] && lines[i][0].trim().toLowerCase() === 'day') {
      const dayHeaders = lines[i].slice(1).map(h => h.trim()).filter(Boolean);
      i++;
      while (i < lines.length) {
        const r = lines[i];
        if (r && r[0] && r[0].trim()) {
          const dateStr = r[0].trim();
          const dayData = {};
          dayHeaders.forEach((h, idx) => {
            if (idx + 1 < r.length) {
              dayData[h] = r[idx + 1].trim();
            }
          });
          daily.push({ date: dateStr, data: dayData });
        }
        i++;
      }
    }

    return { headers, summary, daily };
  }

  parseUpcomingCSV(text) {
    const rows = this.parseCSVRows(text);
    if (rows.length <= 1) return [];

    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const date = (r[0] || '').trim();
      const topic = (r[7] || '').trim();
      if (!date && !topic) continue;

      let cat = (r[6] || 'Others').trim();
      if (!cat) cat = 'Others';
      if (cat === 'Insuarnce') cat = 'Insurance';
      if (cat === 'Railways') cat = 'Railway';
      if (cat === 'Other') cat = 'Others';
      if (cat === 'state' || cat === 'State') cat = 'State Exams';
      if (cat === 'State psc') cat = 'State PSC';
      if (cat === 'teaching') cat = 'Teaching';
      if (cat === 'police') cat = 'Police';
      if (cat === 'UGC') cat = 'UGC NET';

      const status = (r[13] || '').trim();
      const pickedBy = (r[4] || '').trim();
      const priority = (r[5] || '').trim();
      const type = (r[8] || '').trim();
      let url = (r[15] || '').trim();
      if (!url && r[10] && r[10].startsWith('http')) url = r[10].trim();

      items.push({
        date,
        category: cat,
        topic,
        status,
        pickedBy,
        priority,
        type,
        url,
        assignedBy: (r[1] || '').trim(),
        datePicked: (r[2] || '').trim(),
        keywords: (r[11] || '').trim(),
        seoSuggestion: (r[12] || '').trim(),
        expectedEventDate: (r[19] || '').trim()
      });
    }
    return items;
  }

  parseWorkflowCSV(text) {
    const rows = this.parseCSVRows(text);
    if (rows.length <= 1) return [];

    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const date = (r[0] || '').trim();
      const topic = (r[1] || '').trim();
      if (!date && !topic) continue;

      const category = (r[5] || 'Others').trim() || 'Others';
      const taskType = (r[6] || '').trim();
      const type = (r[7] || '').trim();
      const pageType = (r[8] || '').trim();
      const writer = (r[9] || '').trim();
      const fk = (r[10] || '').trim();
      const wordCount = (r[11] || '').trim();
      const newDoc = (r[13] || '').trim();
      let url = (r[14] || '').trim();
      if (!url && r[3]) url = r[3].trim();
      const status = (r[16] || '').trim();

      items.push({
        date,
        topic,
        category,
        taskType,
        type,
        pageType,
        writer,
        fk,
        wordCount,
        newDoc,
        url,
        status
      });
    }
    return items;
  }

  async fetchSheetCSV(gid, spreadsheetId = SHEETS_CONFIG.spreadsheetId) {
    const directUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&_t=${Date.now()}`;
    const res = await fetch(directUrl);
    if (res.ok) {
      return await res.text();
    }
    throw new Error(`HTTP ${res.status} fetching CSV`);
  }

  // =========================================================================
  // Refresh Data Engine: GViz JSONP first (CORS-free), then direct CSV fallback
  // =========================================================================
  async refreshData() {
    if (this.isFetching) return { success: false, inProgress: true };
    this.isFetching = true;
    this.syncStatus = 'syncing';

    try {
      console.log("Fetching live Google Sheets updates via GViz JSONP (zero CORS limitations)...");
      
      let s1, s2, s3, upcoming, workflow;

      // 1. Try GViz JSONP (Reliable in all browsers, file:// and http://)
      try {
        const [t1, t2, t3, tUpcoming, tWorkflow] = await Promise.all([
          this.fetchSheetGViz(SHEETS_CONFIG.spreadsheetId, SHEETS_CONFIG.sheet1_gid),
          this.fetchSheetGViz(SHEETS_CONFIG.spreadsheetId, SHEETS_CONFIG.sheet2_gid),
          this.fetchSheetGViz(SHEETS_CONFIG.spreadsheetId, SHEETS_CONFIG.sheet3_gid),
          this.fetchSheetGViz(SHEETS_CONFIG.upcomingSpreadsheetId, SHEETS_CONFIG.upcoming_gid),
          this.fetchSheetGViz(SHEETS_CONFIG.workflowSpreadsheetId, SHEETS_CONFIG.workflow_gid)
        ]);

        s1 = this.parseGVizProductivity(t1, false);
        s2 = this.parseGVizProductivity(t2, false);
        s3 = this.parseGVizProductivity(t3, true);
        upcoming = this.parseGVizUpcoming(tUpcoming);
        workflow = this.parseGVizWorkflow(tWorkflow);
      } catch (gvizError) {
        console.warn("GViz JSONP failed, attempting direct CSV fetch fallback...", gvizError);

        // 2. Direct CSV fetch fallback (if hosted on HTTP/HTTPS)
        const [csv1, csv2, csv3, csvUpcoming, csvWorkflow] = await Promise.all([
          this.fetchSheetCSV(SHEETS_CONFIG.sheet1_gid),
          this.fetchSheetCSV(SHEETS_CONFIG.sheet2_gid),
          this.fetchSheetCSV(SHEETS_CONFIG.sheet3_gid),
          this.fetchSheetCSV(SHEETS_CONFIG.upcoming_gid, SHEETS_CONFIG.upcomingSpreadsheetId),
          this.fetchSheetCSV(SHEETS_CONFIG.workflow_gid, SHEETS_CONFIG.workflowSpreadsheetId)
        ]);

        s1 = this.parseCSV(csv1);
        s2 = this.parseCSV(csv2);
        s3 = this.parseCSV(csv3);
        upcoming = this.parseUpcomingCSV(csvUpcoming);
        workflow = this.parseWorkflowCSV(csvWorkflow);
      }

      this.data = {
        timestamp: new Date().toISOString(),
        sheet1_published: s1,
        sheet2_wordcount: s2,
        sheet3_picked: s3,
        upcoming_events: upcoming && upcoming.length > 0 ? upcoming : (this.data.upcoming_events || []),
        workflow_jas: workflow && workflow.length > 0 ? workflow : (this.data.workflow_jas || [])
      };

      this.lastSync = new Date();
      this.syncStatus = 'live';
      this.countdownSeconds = 300;
      this.notify();
      console.log("✓ Google Sheets live data successfully synced at", this.lastSync.toLocaleTimeString());
      return { success: true, timestamp: this.lastSync };
    } catch (err) {
      console.warn("Could not sync live Google Sheets. Utilizing snapshot data.", err);
      this.syncStatus = 'fallback';
      this.countdownSeconds = 300;
      this.notify();
      return { success: false, error: err.message };
    } finally {
      this.isFetching = false;
    }
  }

  startPolling() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.countdownSeconds = 300;

    // Countdown tick every second
    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownCallback) {
        const minutes = Math.floor(Math.max(0, this.countdownSeconds) / 60);
        const seconds = Math.max(0, this.countdownSeconds) % 60;
        const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        this.countdownCallback(formatted, this.countdownSeconds);
      }
      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = 300;
        this.refreshData();
      }
    }, 1000);

    // Trigger an immediate live sync
    setTimeout(() => {
      this.refreshData();
    }, 500);
  }
}

const sheetsClient = new SheetsClient();
