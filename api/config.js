/**
 * Vercel Serverless Function: /api/config
 * Exposes configurable environment settings like Dashboard PIN
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pin = process.env.DASHBOARD_PIN || process.env.PIN || '7730';
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SVP_PASSWORD || 'SEO@2XTraffc';

  return res.status(200).json({
    success: true,
    pin: String(pin).trim(),
    adminPassword: String(adminPassword).trim()
  });
}
