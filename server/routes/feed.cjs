const express = require('express');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { verifyUserToken } = require('../lib/userAuth.cjs');

// Every feed action is tied to the signed-in user (token.sub).
function authUser(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null; }
  try { return verifyUserToken(token).sub; }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); return null; }
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const normHandle = (h) => String(h || '').trim().replace(/^@/, '').toLowerCase();

// GET /api/feed/profile/me — my feed profile (null if not claimed)
router.get('/profile/me', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const profile = await prisma.feedProfile.findUnique({ where: { userId } });
    res.json({ profile });
  } catch (err) { console.error('feed me:', err); res.status(500).json({ error: 'Failed to load profile' }); }
});

// GET /api/feed/profile/check?handle= — availability
router.get('/profile/check', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const handle = normHandle(req.query.handle);
  if (!HANDLE_RE.test(handle)) return res.json({ available: false, reason: 'invalid' });
  try {
    const existing = await prisma.feedProfile.findUnique({ where: { handle } });
    res.json({ available: !existing || existing.userId === userId, handle });
  } catch (err) { console.error('feed check:', err); res.status(500).json({ error: 'Failed' }); }
});

// POST /api/feed/profile  { handle, displayName? } — claim / update handle
router.post('/profile', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const handle = normHandle(req.body.handle);
  if (!HANDLE_RE.test(handle)) return res.status(400).json({ error: 'Handle must be 3-20 chars: a-z, 0-9, _' });
  try {
    const taken = await prisma.feedProfile.findUnique({ where: { handle } });
    if (taken && taken.userId !== userId) return res.status(409).json({ error: 'That handle is taken' });
    const profile = await prisma.feedProfile.upsert({
      where: { userId },
      update: { handle, displayName: req.body.displayName || undefined },
      create: { userId, handle, displayName: req.body.displayName || null },
    });
    res.json({ profile });
  } catch (err) { console.error('feed claim:', err); res.status(500).json({ error: 'Failed to claim handle' }); }
});

// GET /api/feed/posts?cursor= — recent posts (all public)
router.get('/posts', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const take = 20;
    const posts = await prisma.feedPost.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      ...(req.query.cursor ? { skip: 1, cursor: { id: String(req.query.cursor) } } : {}),
      include: { author: true, _count: { select: { likes: true, comments: true } } },
    });
    const ids = posts.map((p) => p.id);
    const mine = ids.length ? await prisma.feedLike.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } }) : [];
    const likedSet = new Set(mine.map((l) => l.postId));
    res.json({
      posts: posts.map((p) => ({
        id: p.id, text: p.text, imageUrl: p.imageUrl, createdAt: p.createdAt,
        handle: p.author?.handle, displayName: p.author?.displayName,
        likes: p._count.likes, comments: p._count.comments, likedByMe: likedSet.has(p.id), mine: p.authorId === userId,
      })),
      nextCursor: posts.length === take ? posts[posts.length - 1].id : null,
    });
  } catch (err) { console.error('feed list:', err); res.status(500).json({ error: 'Failed to load feed' }); }
});

// POST /api/feed/posts  { text, imageUrl? } — create a post
router.post('/posts', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const text = String(req.body.text || '').trim();
  if (!text && !req.body.imageUrl) return res.status(400).json({ error: 'Write something first' });
  if (text.length > 2000) return res.status(400).json({ error: 'Post is too long' });
  try {
    const profile = await prisma.feedProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(400).json({ error: 'Claim a handle first' });
    const post = await prisma.feedPost.create({ data: { authorId: userId, text, imageUrl: req.body.imageUrl || null } });
    res.json({ post: { id: post.id, text: post.text, imageUrl: post.imageUrl, createdAt: post.createdAt, handle: profile.handle, displayName: profile.displayName, likes: 0, comments: 0, likedByMe: false, mine: true } });
  } catch (err) { console.error('feed post:', err); res.status(500).json({ error: 'Failed to post' }); }
});

module.exports = router;
