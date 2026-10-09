/**
 * =========================================================================
 * TESTBOOK EDITORIAL QUALITY & DOC AUDITOR (STANDALONE WEB APP)
 * =========================================================================
 * Purpose: Securely extracts full body text and exact word counts from internal
 *          Google Docs (@testbook.com) and updates Workflow <OND> status.
 *
 * Security: Runs inside Google Workspace under authorized Testbook account.
 *           Keeps all documents 100% PRIVATE (No public link sharing required).
 *
 * NOTE: This script has ZERO news automation, ZERO chat webhooks, and ZERO triggers.
 * =========================================================================
 */

// Target Spreadsheet ID (Workflow <OND>)
const SPREADSHEET_ID = "1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A";

function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

/**
 * Extracts Google Document ID from a URL
 */
function extractGoogleDocId(url) {
  if (!url) return '';
  const m = String(url).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : '';
}

/**
 * Extracts full body text and exact word count from an internal Google Doc
 */
function extractDocDetails(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { accessible: false, wordCount: 0, text: '', error: 'No URL provided' };
  }
  const docId = extractGoogleDocId(url);
  if (!docId) {
    return { accessible: false, wordCount: 0, text: '', error: 'Not a valid Google Doc link' };
  }

  // Method 1: Native DocumentApp (Fastest & most accurate inside organization)
  try {
    const doc = DocumentApp.openById(docId);
    const bodyText = doc.getBody().getText() || '';
    const words = (bodyText.match(/\S+/g) || []).length;
    return {
      accessible: true,
      docId: docId,
      wordCount: words,
      text: bodyText.length > 7000 ? bodyText.substring(0, 7000) + '\n...[content continues]' : bodyText
    };
  } catch (err) {
    // Method 2: OAuth Bearer Export Fallback
    try {
      const exportUrl = 'https://docs.google.com/document/d/' + docId + '/export?format=txt';
      const resp = UrlFetchApp.fetch(exportUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) {
        const bodyText = resp.getContentText() || '';
        const words = (bodyText.match(/\S+/g) || []).length;
        return {
          accessible: true,
          docId: docId,
          wordCount: words,
          text: bodyText.length > 7000 ? bodyText.substring(0, 7000) + '\n...[content continues]' : bodyText
        };
      }
      return { accessible: false, wordCount: 0, text: '', error: 'Access restricted (HTTP ' + resp.getResponseCode() + ')' };
    } catch (e2) {
      return { accessible: false, wordCount: 0, text: '', error: err.message || 'Cannot access Doc' };
    }
  }
}

/**
 * Extracts text from an Official Notification PDF or Google Drive file
 */
function extractPdfDetails(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { accessible: false, text: '', error: 'No PDF URL provided' };
  }
  const fileId = extractGoogleDocId(url);
  if (!fileId) {
    return { accessible: false, text: '', error: 'No valid Drive ID found in URL' };
  }
  try {
    const file = DriveApp.getFileById(fileId);
    const mime = file.getMimeType();
    if (mime === MimeType.GOOGLE_DOCS) {
      const doc = DocumentApp.openById(fileId);
      const text = doc.getBody().getText() || '';
      return { accessible: true, fileId: fileId, text: text.substring(0, 8000) };
    } else {
      // Try to read file as text or export
      const blob = file.getBlob();
      const text = blob.getDataAsString() || '';
      return { accessible: true, fileId: fileId, text: text.substring(0, 8000) };
    }
  } catch (err) {
    return { accessible: false, text: '', error: err.message || 'Cannot access Drive file' };
  }
}

/**
 * Action: Fetches and compares Old Doc vs New Doc text & word counts + Official Notification PDF
 */
function handleFetchDocsText(newDocUrl, oldDocUrl, pdfUrl) {
  const newDocInfo = extractDocDetails(newDocUrl);
  const oldDocInfo = oldDocUrl ? extractDocDetails(oldDocUrl) : { accessible: false, wordCount: 0, text: '', error: 'No old doc' };
  const pdfDocInfo = pdfUrl ? extractPdfDetails(pdfUrl) : { accessible: false, text: '', error: 'No PDF attached' };
  
  const netDiff = (newDocInfo.accessible && oldDocInfo.accessible)
    ? (newDocInfo.wordCount - oldDocInfo.wordCount)
    : (newDocInfo.accessible ? newDocInfo.wordCount : 0);

  let overhaulPercent = 100;
  let rewrittenWords = newDocInfo.wordCount;

  if (newDocInfo.accessible && oldDocInfo.accessible && oldDocInfo.text) {
    const normalize = function(t) {
      return (t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    };
    const oldTokens = normalize(oldDocInfo.text).split(' ');
    const newTokens = normalize(newDocInfo.text).split(' ');
    const oldShingles = {};
    for (var i = 0; i < oldTokens.length - 2; i++) {
      oldShingles[oldTokens[i] + ' ' + oldTokens[i + 1] + ' ' + oldTokens[i + 2]] = true;
    }
    var reused = 0;
    var totalShingles = Math.max(1, newTokens.length - 2);
    for (var j = 0; j < newTokens.length - 2; j++) {
      if (oldShingles[newTokens[j] + ' ' + newTokens[j + 1] + ' ' + newTokens[j + 2]]) {
        reused++;
      }
    }
    var sim = Math.min(1, reused / totalShingles);
    overhaulPercent = Math.max(0, Math.min(100, Math.round((1 - sim) * 100)));
    rewrittenWords = Math.round(newDocInfo.wordCount * (overhaulPercent / 100));
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    newDoc: newDocInfo,
    oldDoc: oldDocInfo,
    pdfDoc: pdfDocInfo,
    netWordDiff: netDiff,
    rewrittenWords: rewrittenWords,
    overhaulPercent: overhaulPercent
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Robust helper to locate the Workflow tab regardless of exact naming (OND/JAS)
 */
/**
 * Robust helper to locate the Workflow tab (Prioritizes OND over JAS)
 */
function findWorkflowSheet(ss) {
  if (!ss) return null;

  // 1. Exact matches for Workflow OND
  var ondNames = ['Workflow<OND>', 'Workflow <OND>', 'Workflow OND', 'Workflow(OND)'];
  for (var i = 0; i < ondNames.length; i++) {
    var s = ss.getSheetByName(ondNames[i]);
    if (s) return s;
  }

  // 2. Exact GID match for 436581067 (Workflow<OND>)
  var sheets = ss.getSheets();
  for (var j = 0; j < sheets.length; j++) {
    if (String(sheets[j].getSheetId()) === '436581067') {
      return sheets[j];
    }
  }

  // 3. ANY sheet containing BOTH 'workflow' AND 'ond'
  for (var k = 0; k < sheets.length; k++) {
    var name = sheets[k].getName().toLowerCase();
    if (name.indexOf('workflow') !== -1 && name.indexOf('ond') !== -1) {
      return sheets[k];
    }
  }

  // 4. Fallback: Workflow <JAS>
  var sJas = ss.getSheetByName('Workflow<OND>') || ss.getSheetByName('Workflow <JAS>') || ss.getSheetByName('Workflow<JAS>');
  if (sJas) return sJas;

  // 5. Fallback: Any workflow sheet
  for (var m = 0; m < sheets.length; m++) {
    if (sheets[m].getName().toLowerCase().indexOf('workflow') !== -1) {
      return sheets[m];
    }
  }

  return sheets[0] || null;
}

/**
 * Action: Updates Review Status on Workflow tab
 */
function handleUpdateReviewStatus(rowIndex, topic, reviewStatus, notes) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = findWorkflowSheet(ss);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Workflow sheet tab not found in spreadsheet' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const lastCol = Math.max(sheet.getLastColumn(), 30);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0] || [];
    let reviewStatusCol = 16; // Default Column P
    let statusCol = 17;       // Default Column Q
    let notesCol = 19;        // Default Column S (Index 19 in 1-based indexing)

    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || '').trim().toLowerCase();
      if (h === 'review status' || h === 'review_status') {
        reviewStatusCol = c + 1;
      } else if (h === 'status' && reviewStatusCol !== (c + 1)) {
        statusCol = c + 1;
      } else if (h.indexOf('review note') !== -1 || h === 'notes' || h.indexOf('audit note') !== -1 || h.indexOf('rejection note') !== -1) {
        notesCol = c + 1;
      }
    }

    const statusVal = reviewStatus || 'Approved';

    // Format concise short note (max 120 chars) to prevent sheet lag/breaking
    const formatShortNote = function(n) {
      if (!n) return '';
      const clean = String(n).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      return clean.length > 120 ? clean.substring(0, 117) + '...' : clean;
    };
    const shortNoteVal = formatShortNote(notes);

    // 1. TOPIC-FIRST SEARCH: Finds exact row matching topic across all 1000+ rows
    if (topic && String(topic).trim()) {
      const cleanTopic = String(topic).trim().toLowerCase();
      const data = sheet.getDataRange().getValues();

      // Pass 1: EXACT topic match
      for (let i = 1; i < data.length; i++) {
        const rowTopicB = String(data[i][1] || '').trim().toLowerCase();
        const rowTopicH = String(data[i][7] || '').trim().toLowerCase();
        const rowTopicK = String(data[i][10] || '').trim().toLowerCase();
        if ((rowTopicB && rowTopicB === cleanTopic) || (rowTopicK && rowTopicK === cleanTopic) || (rowTopicH && rowTopicH === cleanTopic)) {
          const targetRow = i + 1;
          sheet.getRange(targetRow, reviewStatusCol).setValue(statusVal);
          if (statusCol > 0 && statusCol !== reviewStatusCol) {
            sheet.getRange(targetRow, statusCol).setValue('Done');
          }
          if (notesCol > 0 && notes !== undefined) {
            if (notes === '' || notes === 'CLEAR' || notes === null || notes === 'REMOVE' || notes === 'EMPTY') {
              sheet.getRange(targetRow, notesCol).setValue('');
            } else if (shortNoteVal) {
              sheet.getRange(targetRow, notesCol).setValue(shortNoteVal);
            }
          }
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            sheetName: sheet.getName(),
            matchedBy: 'exact_topic',
            row: targetRow,
            topic: topic,
            reviewStatusCol: reviewStatusCol,
            notesCol: notesCol,
            status: statusVal,
            notes: shortNoteVal
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // Pass 2: Fuzzy / Substring fallback match
      for (let j = 1; j < data.length; j++) {
        const rowTopicB = String(data[j][1] || '').trim().toLowerCase();
        if (rowTopicB && cleanTopic.length >= 5 && rowTopicB.length >= 5 && (rowTopicB.indexOf(cleanTopic) !== -1 || cleanTopic.indexOf(rowTopicB) !== -1)) {
          const targetRow = j + 1;
          sheet.getRange(targetRow, reviewStatusCol).setValue(statusVal);
          if (statusCol > 0 && statusCol !== reviewStatusCol) {
            sheet.getRange(targetRow, statusCol).setValue('Done');
          }
          if (notesCol > 0 && notes !== undefined) {
            if (notes === '' || notes === 'CLEAR' || notes === null || notes === 'REMOVE' || notes === 'EMPTY') {
              sheet.getRange(targetRow, notesCol).setValue('');
            } else if (shortNoteVal) {
              sheet.getRange(targetRow, notesCol).setValue(shortNoteVal);
            }
          }
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            sheetName: sheet.getName(),
            matchedBy: 'fuzzy_topic',
            row: targetRow,
            topic: topic,
            reviewStatusCol: reviewStatusCol,
            notesCol: notesCol,
            status: statusVal,
            notes: shortNoteVal
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 2. Fallback to rowIndex if given and valid
    const r = parseInt(rowIndex, 10);
    if (r && r >= 2) {
      sheet.getRange(r, reviewStatusCol).setValue(statusVal);
      if (statusCol > 0 && statusCol !== reviewStatusCol) {
        sheet.getRange(r, statusCol).setValue('Done');
      }
      if (notesCol > 0 && notes !== undefined) {
        if (notes === '' || notes === 'CLEAR' || notes === null || notes === 'REMOVE' || notes === 'EMPTY') {
          sheet.getRange(r, notesCol).setValue('');
        } else if (shortNoteVal) {
          sheet.getRange(r, notesCol).setValue(shortNoteVal);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sheetName: sheet.getName(),
        matchedBy: 'rowIndex',
        row: r,
        reviewStatusCol: reviewStatusCol,
        notesCol: notesCol,
        status: statusVal,
        notes: shortNoteVal
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Row or topic not found in sheet: ' + sheet.getName() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Action: Batch populates short review notes into Column S for all rows marked Needs Revision
 */
function handlePopulateAllRevisionNotes() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = findWorkflowSheet(ss);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Workflow sheet tab not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Sheet is empty' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = data[0];
    let reviewStatusCol = 16; // Col P default
    let notesCol = 19;        // Col S default
    let writerCol = 5;        // Col E default

    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || '').trim().toLowerCase();
      if (h === 'review status' || h === 'review_status') {
        reviewStatusCol = c + 1;
      } else if (h.indexOf('review note') !== -1 || h === 'notes' || h.indexOf('audit note') !== -1 || h.indexOf('rejection note') !== -1) {
        notesCol = c + 1;
      } else if (h === 'writer' || h === 'assignee' || h === 'content writer') {
        writerCol = c + 1;
      }
    }

    let updatedCount = 0;
    const notesValues = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const currentNote = String(row[notesCol - 1] || '').trim();
      const status = String(row[reviewStatusCol - 1] || '').trim().toLowerCase();
      const isRevision = status.indexOf('revis') !== -1 || status.indexOf('reject') !== -1;

      if (isRevision && !currentNote) {
        const topic = String(row[1] || '').trim();
        const writer = String(row[writerCol - 1] || '').trim().toLowerCase();
        const taskType = String(row[6] || '').trim().toLowerCase();
        const type = String(row[7] || '').trim().toLowerCase();
        const wcRaw = String(row[11] || '').replace(/,/g, '').trim();
        const wc = parseFloat(wcRaw) || 0;
        const oldDoc = String(row[12] || '').trim();
        const newDoc = String(row[13] || '').trim();
        const hasDoc = newDoc.indexOf('http') !== -1;
        const hasOld = oldDoc.indexOf('http') !== -1;
        const isNews = taskType.indexOf('news') !== -1 || type.indexOf('news') !== -1;

        // Hindi Team writers (Anshika, Vidit, Prabodh) write fresh Hindi content
        const hindiWriters = ['anshika', 'vidit', 'prabodh'];
        const isHindiWriter = hindiWriters.some(function(w) { return writer.indexOf(w) !== -1; });
        const isExplicitNew = type.indexOf('new') !== -1 || taskType.indexOf('new') !== -1;
        const isOpt = !isHindiWriter && !isExplicitNew && (
          type === 'update' || 
          type === 'optimization' || 
          type === 'optimi' || 
          type === 'refresh' || 
          taskType === 'seo optimization' || 
          taskType === 'content optimization'
        );
        const isHighIntent = taskType.indexOf('high in') !== -1 || taskType.indexOf('pyp') !== -1;

        let note = '';
        if (!hasDoc) {
          note = 'AI Rev: Missing Google Doc link in Col N';
        } else if (isOpt && !hasOld) {
          note = 'AI Rev: Missing baseline Old Doc in Col M for diff';
        } else if (wc > 0 && wc < 250) {
          note = `AI Rev: Word count deficit (${wc}w; min 350w required)`;
        } else if (isNews && wc > 0 && wc < 350) {
          note = `AI Rev: News brief below threshold (${wc}/350w)`;
        } else if (isOpt && wc > 0 && wc < 300) {
          note = `AI Rev: Net addition below +300w threshold (${wc}w)`;
        } else if (isHighIntent && wc > 0 && wc < 700) {
          note = `AI Rev: Word count deficit (${wc}/700w for High-Intent)`;
        } else if (wc > 0 && wc < 800 && !isNews) {
          note = `AI Rev: Word count deficit (${wc}/800w min)`;
        } else if (wc === 0) {
          note = 'AI Rev: Zero word count reported; verify content draft';
        } else {
          // Never output generic "tables & FAQ" filler notes
          note = '';
        }

        if (note) {
          notesValues.push([note]);
          updatedCount++;
        } else {
          notesValues.push([currentNote]);
        }
      } else {
        notesValues.push([currentNote]);
      }
    }

    if (updatedCount > 0) {
      sheet.getRange(2, notesCol, notesValues.length, 1).setValues(notesValues);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      sheetName: sheet.getName(),
      updatedCount: updatedCount,
      notesCol: notesCol
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Standalone one-click utility function:
 * Clears all generic "tables & FAQ" filler notes from Column S of the Workflow sheet.
 * Leaves authentic AI audit reasons (like proofreading lapses, factual errors, etc.) 100% untouched.
 * Run this directly in the Apps Script Editor or via Web App action.
 */
function clearGenericTableFaqNotes() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = findWorkflowSheet(ss);
    if (!sheet) {
      Logger.log('Workflow sheet not found');
      return 'Workflow sheet not found';
    }

    const data = sheet.getDataRange().getValues();
    let notesCol = 19;
    const headers = data[0] || [];
    for (let c = 0; c < headers.length; c++) {
      const h = String(headers[c] || '').trim().toLowerCase();
      if (h.indexOf('review note') !== -1 || h === 'notes' || h.indexOf('audit note') !== -1 || h.indexOf('rejection note') !== -1) {
        notesCol = c + 1;
        break;
      }
    }

    let clearedCount = 0;
    for (let i = 1; i < data.length; i++) {
      const val = String(data[i][notesCol - 1] || '').trim();
      if (/tables?\s*(&|and)?\s*faqs?/i.test(val) || val.indexOf('syllabus tables') !== -1 || val === 'CLEAR') {
        sheet.getRange(i + 1, notesCol).setValue('');
        clearedCount++;
      }
    }

    Logger.log('Successfully cleared ' + clearedCount + ' generic notes from Column ' + notesCol);
    return 'Cleared ' + clearedCount + ' generic notes';
  } catch (err) {
    Logger.log('Error in clearGenericTableFaqNotes: ' + err.toString());
    return err.toString();
  }
}

/**
 * Web App GET Handler
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = p.action || '';

    if (action === 'list_sheets') {
      const ss = getTargetSpreadsheet();
      const all = ss.getSheets().map(function(s) { return { name: s.getName(), gid: s.getSheetId() }; });
      const active = findWorkflowSheet(ss);
      return ContentService.createTextOutput(JSON.stringify({ success: true, activeWorkflow: active ? active.getName() : null, sheets: all }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'fetch_docs_text') {
      return handleFetchDocsText(p.newDoc, p.oldDoc, p.pdfDoc || p.pdf);
    }

    if (action === 'update_review_status') {
      return handleUpdateReviewStatus(p.rowIndex, p.topic, p.reviewStatus, p.notes);
    }

    if (action === 'populate_all_revision_notes' || action === 'populate_revision_notes') {
      return handlePopulateAllRevisionNotes();
    }

    if (action === 'clear_generic_notes' || action === 'clean_notes' || action === 'clear_tables_faqs') {
      const res = clearGenericTableFaqNotes();
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: res }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'live',
      service: 'Testbook Doc Auditor & Review Bridge',
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web App POST Handler
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

    if (action === 'fetch_docs_text') {
      return handleFetchDocsText(body.newDoc, body.oldDoc, body.pdfDoc || body.pdf);
    }

    if (action === 'update_review_status') {
      return handleUpdateReviewStatus(body.rowIndex, body.topic, body.reviewStatus, body.notes);
    }

    if (action === 'populate_all_revision_notes' || action === 'populate_revision_notes') {
      return handlePopulateAllRevisionNotes();
    }

    if (action === 'clear_generic_notes' || action === 'clean_notes' || action === 'clear_tables_faqs') {
      const res = clearGenericTableFaqNotes();
      return ContentService.createTextOutput(JSON.stringify({ success: true, result: res }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'live',
      service: 'Testbook Doc Auditor & Review Bridge',
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
