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
 * Action: Fetches and compares Old Doc vs New Doc text & word counts
 */
function handleFetchDocsText(newDocUrl, oldDocUrl) {
  const newDocInfo = extractDocDetails(newDocUrl);
  const oldDocInfo = oldDocUrl ? extractDocDetails(oldDocUrl) : { accessible: false, wordCount: 0, text: '', error: 'No old doc' };
  
  const netDiff = (newDocInfo.accessible && oldDocInfo.accessible)
    ? (newDocInfo.wordCount - oldDocInfo.wordCount)
    : (newDocInfo.accessible ? newDocInfo.wordCount : 0);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    newDoc: newDocInfo,
    oldDoc: oldDocInfo,
    netWordDiff: netDiff
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Action: Updates Review Status on "Workflow <OND>" tab
 */
function handleUpdateReviewStatus(rowIndex, topic, reviewStatus, notes) {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName('Workflow <OND>');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Workflow <OND> tab not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const r = parseInt(rowIndex, 10);
    const statusVal = reviewStatus || 'Approved';

    if (r && r >= 2) {
      // Column Q (17) = Review Status
      sheet.getRange(r, 17).setValue(statusVal);
      if (notes) {
        // Column R (18) = Review Notes
        sheet.getRange(r, 18).setValue(notes);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, row: r, status: statusVal }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Search by Topic if rowIndex not given
    if (topic) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const rowTopic = String(data[i][7] || '').trim(); // Col H is Topic
        if (rowTopic.toLowerCase() === String(topic).trim().toLowerCase()) {
          sheet.getRange(i + 1, 17).setValue(statusVal);
          if (notes) sheet.getRange(i + 1, 18).setValue(notes);
          return ContentService.createTextOutput(JSON.stringify({ success: true, row: i + 1, status: statusVal }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Row or topic not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Web App GET Handler
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = p.action || '';

    if (action === 'fetch_docs_text') {
      return handleFetchDocsText(p.newDoc, p.oldDoc);
    }

    if (action === 'update_review_status') {
      return handleUpdateReviewStatus(p.rowIndex, p.topic, p.reviewStatus, p.notes);
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
      return handleFetchDocsText(body.newDoc, body.oldDoc);
    }

    if (action === 'update_review_status') {
      return handleUpdateReviewStatus(body.rowIndex, body.topic, body.reviewStatus, body.notes);
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
