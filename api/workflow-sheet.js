import https from 'https';

function fetchUrlWithRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrlWithRedirects(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  // Cache for 30s at edge, revalidate stale up to 60s
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1ihLeB9ZOJdaF841qGLoTWBULSRNsF9BjtxUXRxKuK2A/export?format=csv&gid=436581067';
    const csvData = await fetchUrlWithRedirects(csvUrl);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvData);
  } catch (err) {
    console.error('Error fetching workflow CSV in API:', err);
    return res.status(500).json({ error: err.message });
  }
}
