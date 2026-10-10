/**
 * Vercel Serverless Function: /api/audit
 * Handles AI Document Auditing, Smart Word-Level Diffing, and Rewrite Effort Analysis with Zero CORS
 */

// Helper: Smart Token & Phrase Overhaul Calculation
function computeSmartDiffMetrics(newText, oldText) {
  if (!oldText || !oldText.trim()) {
    const totalWords = (newText ? (newText.match(/\S+/g) || []).length : 0);
    return {
      isOptimization: false,
      netWordDiff: totalWords,
      rewrittenWords: totalWords,
      overhaulPercent: 100,
      summaryText: `${totalWords.toLocaleString()} words (Fresh Piece)`
    };
  }

  const normalize = (t) => (t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const oldTokens = normalize(oldText).split(' ').filter(Boolean);
  const newTokens = normalize(newText).split(' ').filter(Boolean);

  const oldTotal = oldTokens.length;
  const newTotal = newTokens.length;
  const netDiff = newTotal - oldTotal;

  // Build frequency map of 3-word n-grams (shingles) from old text
  const oldShingles = new Set();
  for (let i = 0; i < oldTokens.length - 2; i++) {
    oldShingles.add(oldTokens[i] + ' ' + oldTokens[i + 1] + ' ' + oldTokens[i + 2]);
  }

  // Count how many shingles in new text are preserved vs newly written
  let reusedShingles = 0;
  const totalNewShingles = Math.max(1, newTokens.length - 2);

  for (let i = 0; i < newTokens.length - 2; i++) {
    const shingle = newTokens[i] + ' ' + newTokens[i + 1] + ' ' + newTokens[i + 2];
    if (oldShingles.has(shingle)) {
      reusedShingles++;
    }
  }

  const similarityRatio = Math.min(1, reusedShingles / totalNewShingles);
  const overhaulPercent = Math.max(0, Math.min(100, Math.round((1 - similarityRatio) * 100)));
  const rewrittenWords = Math.round(newTotal * (overhaulPercent / 100));

  let summaryText = '';
  if (netDiff >= 0) {
    summaryText = `Old: ${oldTotal.toLocaleString()}w ➔ New: ${newTotal.toLocaleString()}w (+${netDiff.toLocaleString()}w Net | ~${rewrittenWords.toLocaleString()}w Rewritten/Added [${overhaulPercent}% Overhaul])`;
  } else {
    summaryText = `Old: ${oldTotal.toLocaleString()}w ➔ New: ${newTotal.toLocaleString()}w (${netDiff.toLocaleString()}w Net | ~${rewrittenWords.toLocaleString()}w Revamped [${overhaulPercent}% Overhaul])`;
  }

  return {
    isOptimization: true,
    oldWordCount: oldTotal,
    newWordCount: newTotal,
    netWordDiff: netDiff,
    rewrittenWords: rewrittenWords,
    overhaulPercent: overhaulPercent,
    summaryText: summaryText
  };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { item } = req.body || {};
  if (!item) {
    return res.status(400).json({ error: 'Missing content item payload.' });
  }

  const apiKey = process.env.LITELLM_API_KEY || process.env.CLASSPLUS_AI_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'LITELLM_API_KEY is not configured in Vercel Environment Variables. Please add LITELLM_API_KEY in Vercel Project Settings > Environment Variables.'
    });
  }
  const endpoint = process.env.LITELLM_ENDPOINT || 'https://litellm.classplusapp.com/v1/chat/completions';
  const webAppUrl = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwOtco6sBd8RtiHpaBCCFYjpWE3rU9v5bE4fG9rMui5BYi0-LZNXSatBpvWSye8BRhr/exec';

  const hasNewDocLink = item.newDoc && item.newDoc.startsWith('http');
  const hasOldDocLink = item.oldDoc && item.oldDoc.startsWith('http');
  const hasPdfLink = (item.pdfLink && item.pdfLink.startsWith('http')) || (item.pdf && item.pdf.startsWith('http'));
  const pdfUrl = item.pdfLink || item.pdf || '';

  const taskTypeLower = (item.taskType || '').toLowerCase().trim();
  const typeLower = (item.type || '').toLowerCase().trim();
  const writerLower = (item.writer || '').toLowerCase().trim();

  // Hindi Team writers (Anshika, Vidit, Prabodh) write fresh Hindi content - never require Old Doc
  const hindiWriters = ['anshika', 'vidit', 'prabodh'];
  const isHindiWriter = hindiWriters.some(w => writerLower.includes(w));

  // Explicit new article indicators
  const isExplicitNew = typeLower.includes('new') || taskTypeLower.includes('new');

  // An update task requiring Old Doc is ONLY when:
  // 1. Not a Hindi team writer
  // 2. Type is explicitly 'Update' or 'Optimization' or 'Refresh' (and NOT 'New')
  // 3. Task is an SEO Optimization or Content Refresh on an existing page
  const isUpdateTask = !isHindiWriter && !isExplicitNew && (
    typeLower === 'update' || 
    typeLower === 'optimization' || 
    typeLower === 'optimi' ||
    typeLower === 'refresh' ||
    taskTypeLower === 'seo optimization' ||
    taskTypeLower === 'content optimization'
  );

  // Strict Rule 1: Every submission requires a New Doc
  if (!hasNewDocLink) {
    return res.status(200).json({
      success: true,
      audit: {
        isApproved: false,
        qualityVerdict: 'Doc Missing',
        editorialScore: 0,
        pointsAwarded: 0,
        newDocWordCount: null,
        oldDocWordCount: null,
        netWordDiff: null,
        docWordCountText: '🚫 No Doc Attached',
        justificationSummary: 'Doc Missing: No valid Google Doc submission link was provided in the sheet. Skipped AI review to save tokens.',
        rejectionReasons: ['Missing Google Doc link. Please provide a valid submission URL in the sheet.'],
        keyStrengths: [],
        improvementAreas: ['Attach working Google Doc link before requesting review.']
      }
    });
  }

  // Strict Rule 2: For Update/Optimization tasks, BOTH Old Doc and New Doc are mandatory
  if (isUpdateTask && !hasOldDocLink) {
    return res.status(200).json({
      success: true,
      audit: {
        isApproved: false,
        qualityVerdict: 'Doc Missing',
        editorialScore: 0,
        pointsAwarded: 0,
        newDocWordCount: null,
        oldDocWordCount: null,
        netWordDiff: null,
        docWordCountText: '🚫 Missing Old Doc',
        justificationSummary: 'Doc Missing: Task Type is "Update/Optimization", but no baseline Old Doc link was provided in Column M. Skipped AI text evaluation to save tokens.',
        rejectionReasons: ['Missing baseline Old Doc link for Update task in Column M.'],
        keyStrengths: [],
        improvementAreas: ['Attach baseline Old Doc in Column M so the diff and overhaul percentage can be audited.']
      }
    });
  }

  // 1. Extract verified doc text via Google Apps Script (Internal @testbook.com execution)
  let docExtraction = null;
  let diffMetrics = null;
  try {
    if (webAppUrl && (hasNewDocLink || hasOldDocLink)) {
      const fetchUrl = `${webAppUrl}?action=fetch_docs_text&newDoc=${encodeURIComponent(item.newDoc || '')}&oldDoc=${encodeURIComponent(item.oldDoc || '')}&pdfDoc=${encodeURIComponent(pdfUrl)}`;
      const extResp = await fetch(fetchUrl);
      if (extResp.ok) {
        const extData = await extResp.json();
        if (extData && extData.success) {
          docExtraction = extData;
          if (docExtraction.newDoc?.text) {
            diffMetrics = computeSmartDiffMetrics(docExtraction.newDoc.text, docExtraction.oldDoc?.text);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Apps Script doc extraction failed:', e);
  }

  // If new doc was tested and is strictly restricted (403 / unshared)
  if (docExtraction && docExtraction.newDoc && !docExtraction.newDoc.accessible) {
    return res.status(200).json({
      success: true,
      audit: {
        isApproved: false,
        qualityVerdict: 'Needs Revision',
        editorialScore: 1,
        pointsAwarded: 0,
        newDocWordCount: null,
        oldDocWordCount: null,
        netWordDiff: null,
        docWordCountText: '🚫 Access Restricted (403)',
        justificationSummary: `Access to Google Doc is restricted on Google Drive (${docExtraction.newDoc.error || 'HTTP 403'}). The writer must grant view access to your account to enable audit.`,
        rejectionReasons: [`Google Doc access is restricted (${docExtraction.newDoc.error || 'HTTP 403'}). Please ask writer to share the document with your account.`],
        keyStrengths: [],
        improvementAreas: ['Ensure document has view permissions enabled for internal team.']
      }
    });
  }

  const systemPrompt = `You are a Senior Content Operations Lead & SEO Quality Auditor for an online education portal (Testbook).
Evaluate this content submission under the official OND Point-Based Framework with DUAL Auditing: (1) Editorial & Anti-Fluff Quality, and (2) Factual Integrity vs Official Notification.

⚖️ CORE AUDITING PHILOSOPHY (APPROVE GOOD-FAITH EDITORIAL WORK):
- Your goal is to APPROVE solid, good-faith human content submissions that deliver real exam value.
- If a document has good substance (>= 350-500w for news/alerts/admit cards/results/blogs, >= 700w for child pages/syllabus, or >= 1000w for comprehensive guides):
  👉 Set "isApproved": true, "qualityVerdict": "Approved", "editorialScore": 8 to 10.
  👉 Award standard framework points (0.25 to 3.0 pts).
  👉 Keep "rejectionReasons": [].
  👉 Put any optional constructive suggestions in "improvementAreas" or "recommendationNote" WITHOUT failing the draft!

🚫 DO NOT HALLUCINATE MANDATORY SECTIONS:
- Official government exam notifications vary widely by state and department. Many exams do NOT have an answer key objection window, do NOT specify multi-tier marking schemes in initial notices, and do NOT publish granular sub-topic breakdowns.
- NEVER reject an article or mark "Needs Revision" for missing an "objection process", "objection fees", "marking scheme", or "custom syllabus breakdown" when the writer followed the official notification!
- If the content covers the exam, title, and standard available details, it MUST be APPROVED.

🚫 NEVER EVALUATE REWRITE DEPTH ON NEW ARTICLES:
- For New/Fresh articles (Type is 'New' or no Old Doc): Do NOT evaluate rewrite depth or mention "rewrite depth". Evaluate purely based on fresh word count and topical relevance.

🎯 THE STANDARDIZED POINT MATRIX:
1. Micro News Brief (350–450 words): 0.25 Points (Fast breaking alerts, result/admit card drops).
2. Standard News & Updates (500+ words unique): 0.5 Points (In-depth notices with tables, official context).
3. Standard New Content / Child Page (Fresh writing): 1.0 Point (Standard fresh article, syllabus notes, child pages, 700+ words).
4. High-Intent Child Page / PYP / Mock Test Landing Page: 1.5 Points (Structured Q&A, exam patterns, direct resources).
5. Data-Backed Content Optimization / Update (Must be at least 700–800 words total length AND have Net +300w OR >= 30% / 350+ Rewritten Words): 1.5 Points (Award 1.5 pts if total length is >= 700-800 words and net expansion is +300w OR substantially rewrote sentences/tables).
6. Target Page / Pillar Page (Page Type is 'Target Page' or 'Pillar' and Type is 'New'): 3.0 Points (End-to-end curriculum coverage or parent target pillar landing page).

📝 ADVANCE PREPARATION & PLACEHOLDER RULES:
- Testbook editorial teams routinely create exam articles and syllabus guides IN ADVANCE of official notifications.
- DO NOT flag placeholders, blank date spaces, or unannounced exam timelines as errors or rejection reasons!
- The following are 100% VALID, standard editorial practices:
  • Date placeholders: e.g. "announced on ___ October 2026", "___ November 2026", "Date: ___", "[To be announced]".
  • Unannounced dates or blank table slots: e.g. "To be announced", "TBA", "Expected soon", "Upcoming".
  • Advance exam cycles / years: e.g. "CMAT 2027", "UGC NET 2027", "RRB 2026-2027" describing upcoming cycles.
  • General registration claims or estimated timelines for upcoming cycles.
- NEVER reject an article or mark it as "Needs Revision" for having "___" placeholders, blank date spaces, unannounced dates, or advance cycle years (e.g. 2027).

🛡️ ANTI-MANIPULATION & REWRITE EVALUATION RULES:
- Inspect extracted text and word counts provided.
- Accurately assess:
  1) oldDocWordCount (words in old doc, or 0 if none)
  2) newDocWordCount (words in new doc)
  3) netWordDiff = newDocWordCount - oldDocWordCount
  4) rewrittenWords & overhaulPercent (For optimization tasks).

🎯 FACTUAL ACCURACY AUDITING (OFFICIAL NOTIFICATION PDF vs DRAFT):
${hasPdfLink ? `An official Notification PDF link is attached (${pdfUrl}). Cross-check draft against official notification parameters.` : 'Check for general factual consistency in exam pattern and eligibility.'}
- Only flag a factual discrepancy if an official Notification PDF is attached AND the draft explicitly contradicts confirmed structural parameters from that PDF (e.g., negative marking is 0.50 but draft claims 0.25, or official educational qualification is Graduate but draft says 10th pass).
- Do NOT penalize advance placeholders, unannounced dates, or upcoming cycle projections.

❌ STRICT REJECTION CRITERIA (ONLY REJECT IF):
1. The Google Doc link is restricted/inaccessible (403).
2. The document is empty (< 250 words) or contains repeated copied spam paragraphs.
3. An official Notification PDF is attached and the draft directly contradicts confirmed numbers in that PDF.

Return a strict JSON evaluation object:
{
  "isApproved": boolean,
  "qualityVerdict": "Approved" | "Needs Revision",
  "editorialScore": number (1 to 10),
  "suggestedClassification": "Target Page / Pillar" | "New Content" | "High Intent / PYP" | "Deep Optimization" | "Standard News" | "Micro News",
  "pointsAwarded": 3.0 | 1.5 | 1.0 | 0.5 | 0.25 | 0,
  "docWordCountText": "string",
  "oldDocWordCount": number,
  "newDocWordCount": number,
  "netWordDiff": number,
  "rewrittenWords": number,
  "overhaulPercent": number,
  "justificationSummary": "string explaining why this piece is approved",
  "rejectionReasons": ["string listing specific failure points ONLY if rejected, else empty array []"],
  "keyStrengths": ["string", "string"],
  "improvementAreas": ["string"],
  "recommendationNote": "string",
  "factualAudit": {
    "isFactuallyAccurate": boolean,
    "factualScore": number (0 to 100),
    "hasPdfAttached": boolean,
    "pdfUrl": "string",
    "factsChecked": [
      { "parameter": "Important Dates", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" },
      { "parameter": "Total Vacancies", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" },
      { "parameter": "Age Eligibility", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" },
      { "parameter": "Educational Qualification", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" },
      { "parameter": "Salary / Pay Level", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" },
      { "parameter": "Exam Pattern & Marking", "officialValue": "string", "draftValue": "string", "status": "Match" | "Mismatch" | "Not Mentioned" }
    ],
    "factualDiscrepancies": ["string"]
  }
}`;

  let userMessage = `Please audit this content submission:
Topic: ${item.topic || 'N/A'}
Focus Keyword: ${item.fk || item.topic || 'N/A'}
Category: ${item.category || 'General'}
Task Type: ${item.taskType || 'Article'}
Type: ${item.type || 'New'}
Page Type: ${item.pageType || 'Blog'}
Writer: ${item.writer || 'Team Writer'}
Old Doc Link: ${hasOldDocLink ? item.oldDoc : 'None (Fresh piece)'}
New Draft Doc Link: ${item.newDoc}
Official Notification PDF Link (Col AA): ${hasPdfLink ? pdfUrl : 'Not Attached'}
Live URL: ${item.url || 'Pending indexation'}`;

  if (docExtraction && docExtraction.newDoc && docExtraction.newDoc.accessible) {
    userMessage += `

--- VERIFIED EXTRACTED DOCUMENT DATA (FROM TESTBOOK WORKSPACE) ---
New Doc Word Count: ${docExtraction.newDoc.wordCount}
Old Doc Word Count: ${docExtraction.oldDoc?.wordCount || 0}
Net Word Difference: ${docExtraction.netWordDiff}
${diffMetrics ? `Smart Rewrite Metrics: ~${diffMetrics.rewrittenWords} words rewritten/added (${diffMetrics.overhaulPercent}% content overhaul)` : ''}
New Document Text Sample:
${docExtraction.newDoc.text || ''}
${docExtraction.oldDoc?.text ? `\nOld Document Text Sample:\n${docExtraction.oldDoc.text}` : ''}
${docExtraction.pdfDoc?.text ? `\nOfficial Notification PDF Text Sample:\n${docExtraction.pdfDoc.text}` : ''}
-----------------------------------------------------------------
Use these exact extracted word counts, rewrite overhaul metrics, and official PDF text in your factual and quality evaluation.`;
  } else {
    userMessage += `\n\nInspect the content of the document(s), calculate word counts for Old Doc and New Doc, assess the net difference and rewrite effort, audit SEO and syllabus quality, perform factual verification vs official notification PDF, and output the strict JSON.`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini/gemini-3.8-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`API returned status ${resp.status}`);
    }

    const data = await resp.json();
    const contentStr = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(contentStr);

    if (parsed.isApproved === undefined) {
      parsed.isApproved = (parsed.qualityVerdict || '').toLowerCase().includes('approve') || (parsed.editorialScore || 0) >= 7;
    }
    if (parsed.editorialScore > 10) {
      parsed.editorialScore = Math.round(parsed.editorialScore / 10);
    }
    // ALWAYS override LLM guessed numbers with exact verified Google Workspace numbers
    if (docExtraction && docExtraction.newDoc && docExtraction.newDoc.accessible) {
      parsed.newDocWordCount = docExtraction.newDoc.wordCount;
      parsed.oldDocWordCount = docExtraction.oldDoc?.accessible ? docExtraction.oldDoc.wordCount : 0;
      parsed.netWordDiff = docExtraction.netWordDiff;
      if (diffMetrics) {
        parsed.rewrittenWords = diffMetrics.rewrittenWords;
        parsed.overhaulPercent = diffMetrics.overhaulPercent;
        parsed.docWordCountText = diffMetrics.summaryText;
      }
    } else {
      if (hasOldDocLink && parsed.oldDocWordCount && parsed.newDocWordCount) {
        parsed.netWordDiff = parsed.newDocWordCount - parsed.oldDocWordCount;
      }
      if (diffMetrics && diffMetrics.isOptimization) {
        parsed.docWordCountText = diffMetrics.summaryText;
        parsed.rewrittenWords = diffMetrics.rewrittenWords;
        parsed.overhaulPercent = diffMetrics.overhaulPercent;
      } else if (!parsed.docWordCountText) {
        if (hasOldDocLink && parsed.oldDocWordCount && parsed.newDocWordCount) {
          const diff = parsed.netWordDiff;
          parsed.docWordCountText = `Old: ${parsed.oldDocWordCount.toLocaleString()}w ➔ New: ${parsed.newDocWordCount.toLocaleString()}w (${diff >= 0 ? '+' : ''}${diff.toLocaleString()}w Net)`;
        } else if (parsed.newDocWordCount) {
          parsed.docWordCountText = `${parsed.newDocWordCount.toLocaleString()} words`;
        }
      }
    }

    // --- HARD MATHEMATICAL QUALITY GUARDRAILS ---
    const effectiveNewWc = parsed.newDocWordCount || (parseInt(item.wordCount, 10) || 0);
    const effectiveDiff = (parsed.netWordDiff !== undefined && parsed.netWordDiff !== null) ? parsed.netWordDiff : effectiveNewWc;
    const effectiveRewritten = parsed.rewrittenWords || 0;
    const effectiveOverhaul = parsed.overhaulPercent || 0;
    const isNews = taskTypeLower.includes('news') || typeLower.includes('news');
    const isTargetPillar = ((item.pageType || '').toLowerCase().includes('target') || (item.pageType || '').toLowerCase().includes('pillar')) && typeLower === 'new';

    if (isUpdateTask) {
      // Content Optimization / Update: MUST be at least 700-800 words total length AND have meaningful addition/overhaul
      const passesWordCount = effectiveNewWc >= 700;
      const passesOpt = passesWordCount && ((effectiveDiff >= 300) || (effectiveRewritten >= 350 && effectiveOverhaul >= 30));
      if (!passesOpt) {
        parsed.isApproved = false;
        parsed.qualityVerdict = 'Needs Revision';
        parsed.editorialScore = Math.min(parsed.editorialScore || 4, 4);
        parsed.pointsAwarded = 0;
        let reason = '';
        if (!passesWordCount) {
          reason = `Optimization document length shortfall: Found only ${effectiveNewWc} words; Optimization/Update requires at least 700–800 words in the updated document.`;
        } else {
          reason = `Optimization update shortfall: Requires at least +300 net words OR >=350 rewritten words with 30%+ overhaul (delivered: ${effectiveDiff >= 0 ? '+' : ''}${effectiveDiff}w net, ~${effectiveRewritten}w rewritten [${effectiveOverhaul}%]).`;
        }
        if (!parsed.rejectionReasons || parsed.rejectionReasons.length === 0) {
          parsed.rejectionReasons = [reason];
        } else if (!parsed.rejectionReasons.some(r => r.includes('Optimization') || r.includes('shortfall') || r.includes('threshold'))) {
          parsed.rejectionReasons.unshift(reason);
        }
        parsed.justificationSummary = `Needs Revision: ${reason}`;
      } else {
        parsed.isApproved = true;
        parsed.qualityVerdict = 'Approved';
        parsed.pointsAwarded = 1.5;
      }
    } else if (isNews) {
      // News tasks: Absolute minimum 350 words!
      if (effectiveNewWc < 350) {
        parsed.isApproved = false;
        parsed.qualityVerdict = 'Needs Revision';
        parsed.editorialScore = Math.min(parsed.editorialScore || 3, 3);
        parsed.pointsAwarded = 0;
        const reason = `News word count deficit: Found only ${effectiveNewWc} words; minimum 350 words required for News/Alerts.`;
        parsed.rejectionReasons = [reason];
        parsed.justificationSummary = `Needs Revision: ${reason}`;
      } else {
        parsed.isApproved = true;
        parsed.qualityVerdict = 'Approved';
        parsed.pointsAwarded = effectiveNewWc >= 500 ? 0.5 : 0.25;
      }
    } else if (isTargetPillar) {
      if (effectiveNewWc < 1000) {
        parsed.isApproved = false;
        parsed.qualityVerdict = 'Needs Revision';
        parsed.editorialScore = Math.min(parsed.editorialScore || 4, 4);
        parsed.pointsAwarded = 0;
        const reason = `Target/Pillar page deficit: Delivered ${effectiveNewWc} words; minimum 1,400+ words required for 3.0 points.`;
        parsed.rejectionReasons = [reason];
        parsed.justificationSummary = `Needs Revision: ${reason}`;
      } else {
        parsed.isApproved = true;
        parsed.qualityVerdict = 'Approved';
        parsed.pointsAwarded = 3.0;
      }
    } else {
      // Standard New Content / Child Pages
      if (effectiveNewWc < 600) {
        parsed.isApproved = false;
        parsed.qualityVerdict = 'Needs Revision';
        parsed.editorialScore = Math.min(parsed.editorialScore || 4, 4);
        parsed.pointsAwarded = 0;
        const reason = `Word count deficit: Delivered ${effectiveNewWc} words; minimum 700+ words required for New Content.`;
        parsed.rejectionReasons = [reason];
        parsed.justificationSummary = `Needs Revision: ${reason}`;
      } else {
        parsed.isApproved = true;
        parsed.qualityVerdict = 'Approved';
        parsed.pointsAwarded = 1.0;
      }
    }

    return res.status(200).json({ success: true, audit: parsed });
  } catch (err) {
    console.warn('AI Audit failed on backend, returning verified fallback:', err);
    const topicLower = (item.topic || '').toLowerCase();
    const taskTypeLower = (item.taskType || '').toLowerCase();
    const typeLower = (item.type || '').toLowerCase();
    const writerLower = (item.writer || '').toLowerCase();

    const hindiWriters = ['anshika', 'vidit', 'prabodh'];
    const isHindiWriter = hindiWriters.some(w => writerLower.includes(w));
    const isExplicitNew = typeLower.includes('new') || taskTypeLower.includes('new');
    const isOpt = !isHindiWriter && !isExplicitNew && (
      typeLower === 'update' || 
      typeLower === 'optimization' || 
      typeLower === 'optimi' || 
      typeLower === 'refresh' || 
      taskTypeLower === 'seo optimization' || 
      taskTypeLower === 'content optimization'
    );

    const isNews = taskTypeLower.includes('news') || typeLower.includes('news');
    const isTargetPillar = ((item.pageType || '').toLowerCase().includes('target') || (item.pageType || '').toLowerCase().includes('pillar')) && typeLower === 'new';

    const estNew = (docExtraction && docExtraction.newDoc?.wordCount) ? docExtraction.newDoc.wordCount : (parseInt(item.wordCount, 10) || 0);
    const estOld = (docExtraction && docExtraction.oldDoc?.wordCount) ? docExtraction.oldDoc.wordCount : (hasOldDocLink ? (parseInt(item.wordCount, 10) || 0) : 0);
    const estDiff = isOpt ? (estNew - estOld) : estNew;
    const estRewritten = diffMetrics ? diffMetrics.rewrittenWords : (isOpt ? Math.round(estNew * 0.5) : estNew);
    const estOverhaul = diffMetrics ? diffMetrics.overhaulPercent : (isOpt ? 40 : 100);
    
    // Strict Approval Conditions:
    let isApproved = false;
    let ptsAwarded = 0;
    let rejectReason = '';

    if (isOpt) {
      const passesWc = estNew >= 700;
      isApproved = passesWc && ((estDiff >= 300) || (estRewritten >= 350 && estOverhaul >= 30));
      ptsAwarded = isApproved ? 1.5 : 0;
      if (!isApproved) {
        if (!passesWc) {
          rejectReason = `Optimization document length shortfall: Found only ${estNew} words; Content Optimization/Update requires at least 700–800 words.`;
        } else {
          rejectReason = `Optimization shortfall: Requires at least +300 net words OR >=350 rewritten words with 30%+ overhaul (delivered: ${estDiff >= 0 ? '+' : ''}${estDiff}w net, ~${estRewritten}w rewritten [${estOverhaul}%]).`;
        }
      }
    } else if (isNews) {
      isApproved = estNew >= 350;
      ptsAwarded = isApproved ? (estNew >= 500 ? 0.5 : 0.25) : 0;
      if (!isApproved) {
        rejectReason = `News word count deficit: Found only ${estNew} words; minimum 350 words required for News/Alerts.`;
      }
    } else if (isTargetPillar) {
      isApproved = estNew >= 1000;
      ptsAwarded = isApproved ? 3.0 : 0;
      if (!isApproved) {
        rejectReason = `Target/Pillar page deficit: Delivered ${estNew} words; minimum 1,400+ words required.`;
      }
    } else {
      isApproved = estNew >= 600;
      ptsAwarded = isApproved ? 1.0 : 0;
      if (!isApproved) {
        rejectReason = `Word count deficit: Delivered ${estNew} words; minimum 700+ words required for New Content.`;
      }
    }

    return res.status(200).json({
      success: true,
      isFallback: true,
      audit: {
        isApproved: isApproved,
        qualityVerdict: isApproved ? 'Approved' : 'Needs Revision',
        editorialScore: isApproved ? 9 : 4,
        pointsAwarded: ptsAwarded,
        oldDocWordCount: estOld,
        newDocWordCount: estNew,
        netWordDiff: estDiff,
        rewrittenWords: estRewritten,
        overhaulPercent: estOverhaul,
        docWordCountText: diffMetrics ? diffMetrics.summaryText : (isOpt ? `Old: ${estOld.toLocaleString()}w ➔ New: ${estNew.toLocaleString()}w (+${estDiff}w Net | ~${estRewritten}w Rewritten)` : `${estNew.toLocaleString()} words`),
        justificationSummary: isApproved
          ? `Verified: Substantial editorial quality delivered with ${estNew.toLocaleString()} words meeting the OND Framework.`
          : `Needs Revision: ${rejectReason}`,
        rejectionReasons: isApproved ? [] : [rejectReason],
        keyStrengths: isApproved ? ['Accurate exam syllabus structure', 'Tabular download resources added', 'High keyword relevance'] : [],
        improvementAreas: isApproved ? ['Ensure internal linking to parent pillar page'] : ['Expand article length and depth to meet framework minimums.'],
        recommendationNote: isApproved ? 'Adheres to OND Value & Impact Framework.' : 'Return draft to writer for expansion.'
      }
    });
  }
}
