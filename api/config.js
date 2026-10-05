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

  return res.status(200).json({
    success: true,
    pin: String(pin).trim()
  });
}
