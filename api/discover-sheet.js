import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function getGoogleAccessToken(creds) {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsignedJwt = b64(header) + '.' + b64(claim);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedJwt);
    const signature = sign.sign(creds.private_key, 'base64url');
    const jwt = unsignedJwt + '.' + signature;
    const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;
    const req = https.request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error('Auth failed: ' + data));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function fetchSheets(token, spreadsheetId, range) {
  return new Promise((resolve, reject) => {
    https.get('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/' + encodeURIComponent(range), {
      headers: { Authorization: 'Bearer ' + token }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let creds = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      } catch (e) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY env var:', e);
      }
    }

    if (!creds) {
      const candidates = [
        path.join(process.cwd(), 'credentials.json.json'),
        path.join(process.cwd(), 'credentials.json'),
        path.join(process.cwd(), '..', 'credentials.json.json')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            creds = JSON.parse(fs.readFileSync(p, 'utf8'));
            break;
          } catch (e) {}
        }
      }
    }

    if (!creds || !creds.client_email || !creds.private_key) {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'No service account credentials configured. Relying on baseline snapshot.'
      });
    }

    const token = await getGoogleAccessToken(creds);
    const sheetData = await fetchSheets(token, '18imVb9swd70AiRbQEyEgLoqOrxOzZSpuqiwbUcfmUHs', "'New Content'!A:P");
    const rows = sheetData.values || [];

    const formattedRows = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const date = (r[0] || '').trim();
      const assignedBy = (r[1] || '').trim();
      const datePicked = (r[2] || '').trim();
      const pickedBy = (r[3] || '').trim();
      const priority = (r[4] || '').trim();
      const category = (r[5] || '').trim();
      const page = (r[6] || '').trim();
      const type = (r[7] || '').trim();
      const draftUrl = (r[8] || '').trim();
      const docLink = (r[9] || '').trim();
      const url = (r[10] || '').trim();
      const publishedUrl = (r[11] || '').trim();
      const seoSuggestion = (r[12] || '').trim();
      const status = (r[13] || '').trim();
      const keywords = (r[14] || '').trim();
      const reference = (r[15] || '').trim();

      const topic = page || seoSuggestion || keywords || draftUrl || '(Untitled)';
      const isPicked = Boolean(pickedBy && pickedBy !== '-' && pickedBy.toLowerCase() !== 'none' && pickedBy.toLowerCase() !== 'unassigned');

      formattedRows.push({
        date,
        assignedBy,
        datePicked,
        pickedBy,
        priority,
        category,
        page,
        topic,
        type,
        draftUrl,
        docLink,
        url: url || publishedUrl || draftUrl,
        publishedUrl,
        seoSuggestion,
        status: status || (isPicked ? 'Done' : 'Pending'),
        keywords,
        reference
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      count: formattedRows.length,
      rows: formattedRows
    });
  } catch (err) {
    console.error('Error in discover-sheet API:', err);
    return res.status(200).json({
      success: false,
      fallback: true,
      error: err.message
    });
  }
}
