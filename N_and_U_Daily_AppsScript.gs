/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: N & U Daily AI Auto-Assignment & Bandwidth Engine
 * Spreadsheet ID: 1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A
 * Sheet Tab Name: N & U Daily
 * ============================================================================
 * 
 * HOW TO INSTALL IN GOOGLE SHEETS:
 * 1. Open your Google Spreadsheet:
 *    https://docs.google.com/spreadsheets/d/1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A/edit
 * 2. Click on "Extensions" > "Apps Script" in the top menu.
 * 3. Delete any old code and paste this entire file content.
 * 4. Click the "Save" (💾) icon or press Ctrl+S.
 * 5. (Optional) Run "onOpen" once to initialize the custom menu, or refresh the spreadsheet.
 * 
 * FEATURES:
 * - ⚡ Smart Task Weighting:
 *     • LMS Update / Blog Update = 20 min
 *     • Exam Page / Blog / New Blog / New Page = 60 min
 *     • New Notification = 90 min (1.5 hours)
 * - 🔄 Daily Automatic Reset:
 *     • Only considers tasks from TODAY (Column A).
 *     • Next day starts with a completely clean 0-min load slate for all writers.
 * - ✅ Column H (Status) Auto-Release:
 *     • When Status is marked "Done", "Live", or "Completed", the task is released
 *       and writer's bandwidth immediately drops so they can take the next event.
 * - 🛡️ Anti-Piling Limit: Max 2 pending tasks per writer at a time.
 * - 🎯 Earliest Free Time (EFT): Dispatches to active writer with lowest pending load.
 * - 💬 Real-Time Google Chat Webhook Alerts.
 * ============================================================================
 */

// 1. Target Spreadsheet ID
const SPREADSHEET_ID = "1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A";

function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

// 2. Task Durations / Weights (in minutes)
const TASK_ESTIMATES = {
  'lms update': 20,
  'blog update': 20,
  'lms': 20,
  'exam page': 60,
  'blog': 60,
  'new blog': 60,
  'new page': 60,
  'new notification': 90,
  'notification': 90
};

// 3. Google Chat Webhook URL (Space: Breaking News / N&U Alerts)
const AUTO_ASSIGN_WEBHOOK_URL = "https://chat.googleapis.com/v1/spaces/AAQASXz-oTo/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=LvKYBpczyYF3F09yjdEsvsQ_Hf5ff3t_Pr2Xmk3D_rg";

// ============================================================================
// 4. THIS WEEK'S ACTIVE NEWS TEAM (5 Writers Only)
// Week 1 (05 Oct - 11 Oct 2026): Team A is on News ("Event Pages")
// ============================================================================
const TEAM_WRITERS = [
  "Sonika",       // Monday & Saturday Night Shift
  "Archita",      // Tuesday Night Shift
  "Shemaila",     // Wednesday Night Shift
  "Somya",        // Thursday Night Shift
  "Mohit"         // Friday Night Shift
];

// Note for next week (Week 2: 12 Oct - 18 Oct):
// To switch to Team B next week, replace with:
// const TEAM_WRITERS = ["Nadeem", "Shilpa Kohli", "Aditi", "Atul", "Trishala"];
// ============================================================================

/**
 * Returns estimated duration in minutes for a given task type
 */
function getTaskMinutes(taskType) {
  const normalized = (taskType || '').toString().toLowerCase().trim();
  for (const key in TASK_ESTIMATES) {
    if (normalized.includes(key)) {
      return TASK_ESTIMATES[key];
    }
  }
  return 60; // Default 1 hour
}

/**
 * Checks if Column H (Status) is marked as Done / Live / Completed / Published
 */
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

/**
 * Custom Menu on Spreadsheet Open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ Content Ops')
    .addItem('Run Auto-Assignment (N & U Daily)', 'autoAssignAllPending')
    .addItem('Setup Automation & Triggers (Sweeper + Alerts)', 'installAutomationTriggers')
    .addSeparator()
    .addItem('🛑 Stop & Delete All Triggers', 'stopAndClearAllTriggers')
    .addToUi();
}

/**
 * EMERGENCY STOP: Instantly deletes all running background triggers
 * Select and run this function if you ever need to stop automation immediately.
 */
function stopAndClearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  triggers.forEach(t => {
    ScriptApp.deleteTrigger(t);
    count++;
  });
  Logger.log(`Successfully deleted ${count} trigger(s).`);
  try {
    SpreadsheetApp.getUi().alert(`🛑 All background triggers stopped!\n\nDeleted ${count} active trigger(s).`);
  } catch (e) {}
}

/**
 * Installs both the 1-Minute Background Sweeper Trigger and the Installable OnEdit Trigger.
 * (Installable triggers have full authorization to call UrlFetchApp for instant Google Chat alerts).
 */
function installAutomationTriggers() {
  const ss = getTargetSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  
  // Clear any existing triggers for these functions
  triggers.forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'autoAssignAllPending' || fn === 'installedOnEdit' || fn === 'onEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 1. Create recurring 1-minute sweeper trigger
  ScriptApp.newTrigger('autoAssignAllPending')
    .timeBased()
    .everyMinutes(1)
    .create();

  // 2. Create installable OnEdit trigger for instant Chat Alerts on manual edits
  ScriptApp.newTrigger('installedOnEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  SpreadsheetApp.getUi().alert('⚡ Automation Active!\n\n1. 1-Minute Auto-Sweeper installed.\n2. Instant On-Edit Trigger installed for real-time Google Chat alerts on new additions & manual reassignments.');
}

/**
 * Checks if Topic and Task Type are both validly entered (not empty or dashes)
 */
function isValidTask(topic, taskType) {
  const t = (topic || '').toString().trim();
  const k = (taskType || '').toString().trim();
  return t !== '' && t !== '—' && t !== '-' && k !== '' && k !== '—' && k !== '-';
}

/**
 * Main Edit Event Handler (used by simple onEdit and installable trigger)
 */
function handleEditEvent(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'N & U Daily') return;

  const row = e.range.getRow();
  if (row === 1) return; // Skip header row
  const col = e.range.getColumn();

  const rowDate = sheet.getRange(row, 1).getValue(); // Col A: Date
  const topic = sheet.getRange(row, 2).getValue(); // Col B: Topic
  const taskType = sheet.getRange(row, 3).getValue(); // Col C: Task Type
  const category = sheet.getRange(row, 4).getValue(); // Col D: Category
  const currentWriter = sheet.getRange(row, 5).getValue(); // Col E: Owner / Writer
  const status = sheet.getRange(row, 8).getValue(); // Col H: Status

  // Only process rows for TODAY
  if (!isRowToday(rowDate)) return;

  // Case 1: Manual Reassignment in Column E (Writer edited manually by lead/team)
  if (col === 5) {
    const newWriter = (currentWriter || '').toString().trim();
    const oldWriter = (e.oldValue || '').toString().trim();
    if (newWriter && newWriter !== 'Unassigned' && newWriter.toLowerCase() !== oldWriter.toLowerCase()) {
      const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "HH:mm:ss");
      sheet.getRange(row, 9).setValue(timeStr); // Update Col I: Assigned At
      if (!isStatusDone(status)) {
        sheet.getRange(row, 8).setValue('In Progress');
      }
      sendManualReassignAlert(topic, taskType, category, newWriter, oldWriter);
      return;
    }
  }

  // Case 2: New Task Added -> Auto-Assign ONLY when BOTH Topic and Task Type are entered
  if (isValidTask(topic, taskType) && !isStatusDone(status) && (!currentWriter || currentWriter.toString().trim() === '' || currentWriter.toString().trim() === 'Unassigned')) {
    assignRow(sheet, row, topic, taskType, category);
  }
}

/**
 * Simple OnEdit Trigger (fallback)
 */
function onEdit(e) {
  handleEditEvent(e);
}

/**
 * Installable OnEdit Trigger (Runs with full permissions for UrlFetchApp)
 */
function installedOnEdit(e) {
  handleEditEvent(e);
}

/**
 * Sends real-time Google Chat alert for manual reassignments
 */
function sendManualReassignAlert(topic, taskType, category, newWriter, oldWriter) {
  if (!AUTO_ASSIGN_WEBHOOK_URL) return;

  const minutes = getTaskMinutes(taskType);
  const oldInfo = oldWriter && oldWriter !== 'Unassigned' ? `\n👤 *Previous Writer:* ${oldWriter}` : '';

  const payload = {
    text: `🔄 *Task Manually Reassigned: N & U Daily*\n` +
          `📌 *Topic:* ${topic}\n` +
          `🏷️ *Task Type:* ${taskType} (${minutes} min)\n` +
          `📂 *Category:* ${category || 'General'}\n` +
          `👤 *New Assigned Writer:* *${newWriter}*` +
          oldInfo + `\n` +
          `⏱️ *Reassigned At:* ${Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy, HH:mm:ss")}`
  };

  try {
    UrlFetchApp.fetch(AUTO_ASSIGN_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Manual reassign webhook error: ' + err.toString());
  }
}

/**
 * Reads writer availability from the dedicated "Writer Presence" sheet tab.
 * If the tab doesn't exist, it defaults everyone in TEAM_WRITERS to 'active'.
 */
function getWriterPresenceFromSheet(ss) {
  const presenceSheet = ss.getSheetByName('Writer Presence') || ss.getSheetByName('Presence');
  const presenceMap = {};
  TEAM_WRITERS.forEach(w => { presenceMap[w] = 'active'; });

  if (!presenceSheet) return presenceMap;

  const lastRow = presenceSheet.getLastRow();
  if (lastRow < 2) return presenceMap;

  // Reads Column A (Writer) and Column B (Status) from 'Writer Presence'
  const data = presenceSheet.getRange(2, 1, lastRow - 1, 2).getValues();
  data.forEach(r => {
    const writerName = (r[0] || '').toString().trim();
    const status = (r[1] || '').toString().toLowerCase().trim();

    if (writerName && status) {
      TEAM_WRITERS.forEach(tw => {
        if (tw.toLowerCase() === writerName.toLowerCase()) {
          presenceMap[tw] = status; // 'active', 'break', or 'leave'
        }
      });
    }
  });

  return presenceMap;
}

/**
 * Assigns a specific row based on EFT + 2-task concurrency limit + Live Presence
 */
function assignRow(sheet, row, topic, taskType, category) {
  const ss = sheet.getParent();
  const workloads = calculateCurrentWorkloads(sheet, row);
  const taskMinutes = getTaskMinutes(taskType);
  const presenceMap = getWriterPresenceFromSheet(ss);

  // 1. Filter ONLY writers who are ACTIVE (strictly skips anyone on 'break' or 'leave')
  const activeCandidates = TEAM_WRITERS.filter(w => {
    const st = presenceMap[w] || 'active';
    return st === 'active' || st === '🟢 active';
  });

  const poolToUse = activeCandidates.length > 0 ? activeCandidates : TEAM_WRITERS;

  // 2. Anti-piling rule: Filter candidates with < 2 active tasks today
  let candidatePool = poolToUse.filter(w => (workloads[w] ? workloads[w].count : 0) < 2);
  if (candidatePool.length === 0) {
    candidatePool = poolToUse;
  }

  // 3. Earliest Free Time (EFT): Pick active writer with lowest pending minutes today
  let bestWriter = candidatePool[0];
  let minMinutes = 99999;

  candidatePool.forEach(writer => {
    const wl = workloads[writer] || { count: 0, minutes: 0 };
    if (wl.minutes < minMinutes) {
      minMinutes = wl.minutes;
      bestWriter = writer;
    }
  });

  // 3. Ensure Date is populated in Column A if blank
  const dateCell = sheet.getRange(row, 1);
  if (!dateCell.getValue()) {
    dateCell.setValue(Utilities.formatDate(new Date(), "Asia/Kolkata", "M/d/yyyy"));
  }

  // 4. Update Sheet: Col E (Writer), Col H (Status), Col I (Assigned At)
  sheet.getRange(row, 5).setValue(bestWriter);
  const statusCell = sheet.getRange(row, 8);
  if (!statusCell.getValue()) {
    statusCell.setValue('In Progress');
  }

  const assignedAtCell = sheet.getRange(row, 9);
  const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "HH:mm:ss");
  assignedAtCell.setValue(timeStr);

  // 5. Send Google Chat Notification
  sendChatAlert(topic, taskType, category, bestWriter, taskMinutes);
}

/**
 * Calculates pending workloads for TODAY ONLY, excluding completed tasks in Col H
 */
function calculateCurrentWorkloads(sheet, excludeRow) {
  const lastRow = sheet.getLastRow();
  const workloads = {};
  TEAM_WRITERS.forEach(w => {
    workloads[w] = { count: 0, minutes: 0 };
  });

  if (lastRow < 2) return workloads;

  // Format today's date in IST
  const todayIso = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  const todaySlash = Utilities.formatDate(new Date(), "Asia/Kolkata", "M/d/yyyy");

  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // Cols A to H
  data.forEach((r, idx) => {
    const currentRow = idx + 2;
    if (currentRow === excludeRow) return;

    const rowDateRaw = r[0]; // Col A: Date
    const taskType = r[2];   // Col C: Task Type
    const writer = (r[4] || '').toString().trim(); // Col E: Owner / Writer
    const status = r[7];     // Col H: Status

    // Verify if this row belongs to Today
    let isTodayRow = false;
    if (rowDateRaw instanceof Date) {
      const rowDateFormatted = Utilities.formatDate(rowDateRaw, "Asia/Kolkata", "yyyy-MM-dd");
      isTodayRow = (rowDateFormatted === todayIso);
    } else if (rowDateRaw) {
      const s = rowDateRaw.toString().trim();
      isTodayRow = s.includes(todaySlash) || s.includes(todayIso);
    } else {
      isTodayRow = true; // Blank date defaults to today
    }

    // Workload is only counted if it belongs to TODAY and Col H is NOT Done
    if (isTodayRow && writer && workloads[writer] && !isStatusDone(status)) {
      workloads[writer].count += 1;
      workloads[writer].minutes += getTaskMinutes(taskType);
    }
  });

  return workloads;
}

/**
 * EMERGENCY STOP: Instantly deletes and removes all active background triggers
 */
function stopAndClearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('All triggers stopped and cleared successfully.');
  try {
    SpreadsheetApp.getUi().alert('🛑 Emergency Stop Activated!\n\nAll background triggers have been completely deleted.');
  } catch (e) {}
}

/**
 * Checks if a date cell belongs to TODAY in IST
 */
function isRowToday(rowDateRaw) {
  if (!rowDateRaw) return true; // Newly added blank row defaults to today
  const todayIso = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
  const todaySlash = Utilities.formatDate(new Date(), "Asia/Kolkata", "M/d/yyyy");
  const todaySlash2 = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy");
  const todaySlash3 = Utilities.formatDate(new Date(), "Asia/Kolkata", "d/M/yyyy");

  if (rowDateRaw instanceof Date) {
    const dIso = Utilities.formatDate(rowDateRaw, "Asia/Kolkata", "yyyy-MM-dd");
    return dIso === todayIso;
  }
  const s = String(rowDateRaw).trim();
  return s.includes(todayIso) || s.includes(todaySlash) || s.includes(todaySlash2) || s.includes(todaySlash3);
}

/**
 * Batch Auto-Assign all unassigned pending rows for TODAY ONLY (Never touches old history)
 */
function autoAssignAllPending() {
  const ss = getTargetSpreadsheet();
  const sheet = ss ? ss.getSheetByName('N & U Daily') : null;
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Only scan recent rows (up to last 60 rows) to prevent touching old archived records
  const startRow = Math.max(2, lastRow - 60);
  let assignedCount = 0;

  for (let row = startRow; row <= lastRow; row++) {
    const rowDate = sheet.getRange(row, 1).getValue(); // Col A: Date
    const topic = sheet.getRange(row, 2).getValue();     // Col B: Topic
    const taskType = sheet.getRange(row, 3).getValue();  // Col C: Task Type
    const category = sheet.getRange(row, 4).getValue();  // Col D: Category
    const currentWriter = sheet.getRange(row, 5).getValue(); // Col E: Writer
    const status = sheet.getRange(row, 8).getValue();    // Col H: Status

    // STRICT FILTER: Must be TODAY's row, have BOTH valid topic & task type, NOT be done, and writer is empty
    if (isRowToday(rowDate) && isValidTask(topic, taskType) && !isStatusDone(status) && (!currentWriter || currentWriter.toString().trim() === '' || currentWriter.toString().trim() === 'Unassigned')) {
      assignRow(sheet, row, topic, taskType, category);
      assignedCount++;
    }
  }

  if (assignedCount > 0) {
    Logger.log(`Assigned ${assignedCount} tasks for today.`);
  }
}

/**
 * Sends real-time Google Chat alert to space
 */
function sendChatAlert(topic, taskType, category, writer, minutes) {
  if (!AUTO_ASSIGN_WEBHOOK_URL) return;

  const payload = {
    text: `🚨 *Breaking Event Assigned: N & U Daily*\n` +
          `📌 *Topic:* ${topic}\n` +
          `🏷️ *Task Type:* ${taskType} (${minutes} min)\n` +
          `📂 *Category:* ${category || 'General'}\n` +
          `👤 *Assigned Writer:* *${writer}*\n` +
          `⏱️ *Assigned At:* ${Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy, HH:mm:ss")}`
  };

  try {
    UrlFetchApp.fetch(AUTO_ASSIGN_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Google Chat webhook error: ' + err.toString());
  }
}

// ============================================================================
// ============================================================================
// WEB APP API (Dashboard -> Google Sheet Live 2-Way Write Integration)
// ============================================================================

/**
 * Handles GET requests from Dashboard (Zero CORS issues from browser)
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = p.action || '';

    if (action === 'update_presence') {
      return handleUpdatePresence(p.writer, p.status);
    }

    if (action === 'add_event') {
      return handleAddEvent(p.topic, p.taskType, p.category, p.assignMode);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'live', time: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests from Dashboard
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (ex) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action || '';

    if (action === 'update_presence') {
      return handleUpdatePresence(body.writer, body.status);
    }

    if (action === 'add_event') {
      return handleAddEvent(body.topic, body.taskType, body.category, body.assignMode);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Action received' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper: Updates Writer Status & Timestamp in "Writer Presence" sheet
 */
function handleUpdatePresence(writerName, status) {
  const ss = getTargetSpreadsheet();
  if (!ss) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Cannot access spreadsheet' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let presenceSheet = ss.getSheetByName('Writer Presence') || ss.getSheetByName('Presence');
  if (!presenceSheet) {
    presenceSheet = ss.insertSheet('Writer Presence');
    presenceSheet.getRange(1, 1, 1, 3).setValues([['Writer', 'Status', 'Last Updated']]);
  }

  const writer = (writerName || '').trim();
  const st = (status || 'Active').trim();
  const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy, HH:mm:ss");

  if (writer) {
    const lastRow = Math.max(presenceSheet.getLastRow(), 1);
    let found = false;
    if (lastRow > 1) {
      const names = presenceSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < names.length; i++) {
        const rowWriter = (names[i][0] || '').toString().trim();
        if (rowWriter.toLowerCase() === writer.toLowerCase()) {
          presenceSheet.getRange(i + 2, 2).setValue(st);
          presenceSheet.getRange(i + 2, 3).setValue(timeStr);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      presenceSheet.appendRow([writer, st, timeStr]);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, writer: writer, status: st }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper: Appends new breaking event to "N & U Daily" and auto-assigns
 */
function handleAddEvent(topic, taskType, category, assignMode) {
  const ss = getTargetSpreadsheet();
  const sheet = ss ? ss.getSheetByName('N & U Daily') : null;
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sheet tab not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const t = (topic || '').trim();
  const type = taskType || 'LMS Update';
  const cat = category || 'General';
  const mode = assignMode || 'auto';
  const dateStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "M/d/yyyy");
  const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "HH:mm:ss");

  if (!t) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Topic is required' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const newRowIdx = sheet.getLastRow() + 1;
  sheet.getRange(newRowIdx, 1).setValue(dateStr);     // Col A: Date
  sheet.getRange(newRowIdx, 2).setValue(t);           // Col B: Topic
  sheet.getRange(newRowIdx, 3).setValue(type);        // Col C: Task Type
  sheet.getRange(newRowIdx, 4).setValue(cat);         // Col D: Category
  sheet.getRange(newRowIdx, 6).setValue('');          // Col F: Live URL
  sheet.getRange(newRowIdx, 7).setValue('Normal');    // Col G: Priority

  if (mode === 'auto') {
    assignRow(sheet, newRowIdx, t, type, cat);
  } else if (mode !== 'unassigned' && mode) {
    sheet.getRange(newRowIdx, 5).setValue(mode);        // Col E: Specific Writer
    sheet.getRange(newRowIdx, 8).setValue('In Progress'); // Col H: Status
    sheet.getRange(newRowIdx, 9).setValue(timeStr);     // Col I: Assigned At
    sendChatAlert(t, type, cat, mode, getTaskMinutes(type));
  } else {
    sheet.getRange(newRowIdx, 5).setValue('Unassigned');
    sheet.getRange(newRowIdx, 8).setValue('Pending');
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, row: newRowIdx, topic: t }))
    .setMimeType(ContentService.MimeType.JSON);
}
