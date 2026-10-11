import { checkPassword, sessionCookie, clearCookie, isAuthed } from './_lib.js';

// GET = am I logged in, POST = log in, DELETE = log out
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.json({ authed: isAuthed(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie());
    return res.json({ authed: false });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'No password has been set up yet.' });
  if (!checkPassword((req.body || {}).password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return res.status(401).json({ error: 'Wrong password.' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  return res.json({ authed: true });
}
