import { handleUpload } from '@vercel/blob/client';
import { isAuthed } from './_lib.js';

const MB = 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];

// Hands the browser a short-lived token so files go straight to Blob storage
// (uploads are too big to pass through a serverless function).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const result = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAuthed(req)) throw new Error('Please log in again.');
        if (!pathname.startsWith('uploads/')) throw new Error('Bad upload path.');
        return { allowedContentTypes: TYPES, maximumSizeInBytes: 60 * MB, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
