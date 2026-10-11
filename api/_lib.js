import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { list, put, del } from '@vercel/blob';

const PREFIX = 'cms/posts-';
const COOKIE = 'elyza_session';
const WEEK = 60 * 60 * 24 * 7;

export const CATEGORIES = ['glam', 'play', 'peaks', 'shred', 'life'];

/* ---------- storage: one JSON file in Vercel Blob, new file per save ---------- */
async function snapshots() {
  const { blobs } = await list({ prefix: PREFIX });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function readPosts() {
  const [latest] = await snapshots();
  if (!latest) return [];
  const res = await fetch(latest.url, { cache: 'no-store' });
  return res.ok ? res.json() : [];
}

export async function writePosts(posts) {
  const old = await snapshots();
  await put(`${PREFIX}${Date.now()}.json`, JSON.stringify(posts), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  });
  if (old.length) await del(old.map((b) => b.url));
}

/* ---------- auth: password from env, signed session cookie ---------- */
const password = () => process.env.ADMIN_PASSWORD || '';
const sign = (value) => createHmac('sha256', `session:${password()}`).update(value).digest('hex');
const same = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkPassword(attempt) {
  if (!password() || typeof attempt !== 'string') return false;
  // compare digests so length differences don't leak
  return same(sign(`pw:${attempt}`), sign(`pw:${password()}`));
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + WEEK);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthed(req) {
  if (!password()) return false;
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([a-f0-9]+)`));
  if (!match) return false;
  const [, exp, sig] = match;
  return Number(exp) > Date.now() / 1000 && same(sig, sign(exp));
}

/* ---------- posts ---------- */
const finish = (post, category, caption) => ({
  id: randomUUID(),
  ...post,
  category: CATEGORIES.includes(category) ? category : 'life',
  caption: String(caption || '').slice(0, 140),
  addedAt: new Date().toISOString(),
});

// a photo or clip she uploaded straight to our Blob store
export function toUploadPost(upload, category, caption) {
  let url;
  try { url = new URL(String(upload?.url)); } catch { return null; }
  const ours = url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') && url.pathname.startsWith('/uploads/');
  const type = String(upload?.contentType || '');
  const platform = type.startsWith('image/') ? 'photo' : type.startsWith('video/') ? 'video' : null;
  if (!ours || !platform) return null;
  return finish({ url: url.href, platform, src: url.href }, category, caption);
}

export const deleteUpload = (url) => del(url);

// a pasted link from Instagram, TikTok, Facebook or YouTube
export async function toPost(rawUrl, category, caption) {
  let url;
  try { url = new URL(String(rawUrl).trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  let host = url.hostname.replace(/^(www|m|vm|vt)\./, '');

  // TikTok share links are short redirects; follow them to get the video id
  if (host === 'tiktok.com' && !/\/video\/\d+/.test(url.pathname)) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const final = new URL(res.url);
      if (final.hostname.endsWith('tiktok.com')) url = final;
    } catch { /* fall through to the failure below */ }
  }

  let platform, embed, m;
  if (host === 'instagram.com' && (m = url.pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/))) {
    platform = 'instagram';
    embed = `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed`;
  } else if (host === 'tiktok.com' && (m = url.pathname.match(/\/video\/(\d+)/))) {
    platform = 'tiktok';
    embed = `https://www.tiktok.com/embed/v2/${m[1]}`;
  } else if (host === 'facebook.com' || host === 'fb.watch') {
    platform = 'facebook';
    const video = host === 'fb.watch' || /\/(videos|reel|watch)\b/.test(url.pathname);
    embed = `https://www.facebook.com/plugins/${video ? 'video' : 'post'}.php?href=${encodeURIComponent(url.href)}&show_text=false&width=350`;
  } else if (host === 'youtu.be' || host === 'youtube.com') {
    const id = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || (url.pathname.match(/\/(shorts|embed)\/([\w-]+)/) || [])[2];
    if (!id || !/^[\w-]+$/.test(id)) return null;
    platform = 'youtube';
    embed = `https://www.youtube.com/embed/${id}`;
  } else {
    return null;
  }

  url.hash = '';
  const clean = url.origin + url.pathname + (platform === 'youtube' || platform === 'facebook' ? url.search : '');
  return finish({ url: clean, platform, embed }, category, caption);
}
