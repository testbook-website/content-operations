/**
 * sheets-client.js - Live Google Sheets Data Fetcher & CSV Parser
 * 
 * Target Google Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1snahdTze-Ildb3RARo9dd-lwpfI7uUdubMMZfHM2Cl8/edit
 * 
 * Sheets:
 * - Sheet 1: Number of Articles Published Today (gid=0)
 * - Sheet 2: Word Count (gid=1647859064)
 * - Sheet 3: Number of Articles Picked (gid=990952275)
 */

const SHEETS_CONFIG = {
  spreadsheetId: '1snahdTze-Ildb3RARo9dd-lwpfI7uUdubMMZfHM2Cl8',
  sheet1_gid: '0',
  sheet2_gid: '1647859064',
  sheet3_gid: '990952275',
  refreshIntervalMs: 5 * 60 * 1000 // 5 minutes
};

class SheetsClient {
  constructor() {
    this.data = typeof BASELINE_SHEETS_DATA !== 'undefined' ? BASELINE_SHEETS_DATA : null;
    this.lastSync = this.data ? new Date(this.data.timestamp) : new Date();
    this.subscribers = [];
    this.countdownSeconds = 300;
    this.timerInterval = null;
    this.countdownInterval = null;
    this.isFetching = false;
  }

  // Subscribe to data updates
  onUpdate(callback) {
    this.subscribers.push(callback);
    if (this.data) {
      callback(this.data, this.lastSync);
    }
  }

  // Subscribe to countdown updates
  onCountdown(callback) {
    this.countdownCallback = callback;
  }

  notify() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.data, this.lastSync);
      } catch (err) {
        console.error("Error in subscriber callback:", err);
      }
    });
  }

  // CSV parsing function that handles quotes, commas and newlines
  parseCSV(text) {
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

  // Fetch sheet CSV with cors proxy fallback
  async fetchSheetCSV(gid) {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.spreadsheetId}/export?format=csv&gid=${gid}`;
    
    // Try direct fetch first
    try {
      const res = await fetch(directUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.warn(`Direct fetch failed for gid ${gid}, trying backup proxy...`, e);
    }

    // Try allorigins or corsproxy if direct fetch is blocked by browser CORS policy
    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(directUrl)}`
    ];

    for (const pUrl of proxyUrls) {
      try {
        const pRes = await fetch(pUrl);
        if (pRes.ok) {
          return await pRes.text();
        }
      } catch (err) {
        console.warn("Proxy attempt failed:", err);
      }
    }

    throw new Error(`Unable to fetch sheet data for gid: ${gid}`);
  }

  // Refresh all 3 sheets
  async refreshData() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      console.log("Fetching live updates from Google Sheets...");
      const [csv1, csv2, csv3] = await Promise.all([
        this.fetchSheetCSV(SHEETS_CONFIG.sheet1_gid),
        this.fetchSheetCSV(SHEETS_CONFIG.sheet2_gid),
        this.fetchSheetCSV(SHEETS_CONFIG.sheet3_gid)
      ]);

      const s1 = this.parseCSV(csv1);
      const s2 = this.parseCSV(csv2);
      const s3 = this.parseCSV(csv3);

      this.data = {
        timestamp: new Date().toISOString(),
        sheet1_published: s1,
        sheet2_wordcount: s2,
        sheet3_picked: s3
      };

      this.lastSync = new Date();
      this.countdownSeconds = 300;
      this.notify();
      console.log("Live updates successfully applied at", this.lastSync.toLocaleTimeString());
      return { success: true, timestamp: this.lastSync };
    } catch (err) {
      console.warn("Auto-sync could not reach Google Sheets. Utilizing local snapshot fallback.", err);
      // Fallback remains active
      this.lastSync = new Date();
      this.countdownSeconds = 300;
      this.notify();
      return { success: false, error: err.message };
    } finally {
      this.isFetching = false;
    }
  }

  startPolling() {
    // Stop any existing intervals
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
  }
}

const sheetsClient = new SheetsClient();
