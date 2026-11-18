const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

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

async function main() {
  const credPath = fs.existsSync('credentials.json.json') ? 'credentials.json.json' : 'credentials.json';
  const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  console.log('Authenticating with service account...');
  const token = await getGoogleAccessToken(creds);

  console.log('Fetching sheet rows from 18imVb9swd70AiRbQEyEgLoqOrxOzZSpuqiwbUcfmUHs (New Content)...');
  const res = await fetchSheets(token, '18imVb9swd70AiRbQEyEgLoqOrxOzZSpuqiwbUcfmUHs', "'New Content'!A:P");
  const rows = res.values || [];
  console.log(`Retrieved ${rows.length} total rows.`);

  const headers = rows[0] || [];
  console.log('Headers:', headers);

  const formattedRows = [];
  let discoverCount = 0;
  let pickedCount = 0;

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

    // Determine topic: either page or keywords or seoSuggestion or draftUrl
    const topic = page || seoSuggestion || keywords || draftUrl || '(Untitled)';

    const isDiscover = type.toLowerCase().includes('discover');
    const isPicked = Boolean(pickedBy && pickedBy !== '-' && pickedBy.toLowerCase() !== 'none' && pickedBy.toLowerCase() !== 'unassigned');

    if (isDiscover) {
      discoverCount++;
      if (isPicked) pickedCount++;
    }

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

  console.log(`Processed ${formattedRows.length} items. Discover: ${discoverCount} assigned, ${pickedCount} picked.`);

  const fileContent = `/**
 * Baseline Snapshot of Hindi SEO Content Requirement - "New Content" (Google Sheet gid: 557440598)
 * Spreadsheet ID: 18imVb9swd70AiRbQEyEgLoqOrxOzZSpuqiwbUcfmUHs
 * Last Generated: ${new Date().toISOString()}
 */
const BASELINE_HINDI_NEW_CONTENT_DATA = ${JSON.stringify(formattedRows, null, 2)};
`;

  fs.writeFileSync('hindi-new-content-data.js', fileContent, 'utf8');
  console.log('Successfully saved hindi-new-content-data.js! Size:', fs.statSync('hindi-new-content-data.js').size, 'bytes');
}

main().catch(console.error);
