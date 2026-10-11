import { readPosts, writePosts, isAuthed, toPost, toUploadPost, deleteUpload } from './_lib.js';

const MAX_POSTS = 200;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.json({ posts: await readPosts() });
    if (!isAuthed(req)) return res.status(401).json({ error: 'Please log in again.' });

    const posts = await readPosts();
    const body = req.body || {};

    if (req.method === 'POST') {
      if (posts.length >= MAX_POSTS) return res.status(400).json({ error: 'Portfolio is full. Remove a post first.' });
      const post = body.upload ? toUploadPost(body.upload, body.category, body.caption) : await toPost(body.url, body.category, body.caption);
      if (!post) {
        return res.status(400).json({ error: body.upload ? "That upload didn't work. Try again." : "That link didn't work. Paste a post link from Instagram, TikTok, Facebook or YouTube." });
      }
      const key = (p) => p.embed || p.src;
      if (posts.some((p) => key(p) === key(post))) return res.status(400).json({ error: 'That post is already in the portfolio.' });
      posts.unshift(post);
    } else if (req.method === 'DELETE') {
      const i = posts.findIndex((p) => p.id === req.query.id);
      if (i < 0) return res.status(404).json({ error: 'Post not found.' });
      const [gone] = posts.splice(i, 1);
      if (gone.src) await deleteUpload(gone.src).catch((err) => console.error(err));
    } else if (req.method === 'PUT') {
      // reorder: body.order is the full list of ids in the new order
      const order = Array.isArray(body.order) ? body.order : [];
      posts.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    } else {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    await writePosts(posts);
    return res.json({ posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong saving. Try again.' });
  }
}
