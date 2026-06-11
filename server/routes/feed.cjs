const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { prisma } = require('../db.cjs');
const { verifyUserToken } = require('../lib/userAuth.cjs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'feed');

// Every feed action is tied to the signed-in user (token.sub).
function authUser(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Authentication required' }); return null; }
  try { return verifyUserToken(token).sub; }
  catch { res.status(401).json({ error: 'Invalid or expired session' }); return null; }
}

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const normHandle = (h) => String(h || '').trim().replace(/^@/, '').toLowerCase();

// Fire-and-forget notification. DMs collapse into one unread row per sender so a
// chat burst doesn't flood the list; never notify yourself.
async function notify(userId, actorId, type, postId, text) {
  if (!userId || !actorId || userId === actorId) return;
  try {
    if (type === 'dm') {
      const ex = await prisma.feedNotification.findFirst({ where: { userId, actorId, type: 'dm', readAt: null }, orderBy: { createdAt: 'desc' } });
      if (ex) { await prisma.feedNotification.update({ where: { id: ex.id }, data: { text: text || null, createdAt: new Date() } }); return; }
    }
    await prisma.feedNotification.create({ data: { userId, actorId, type, postId: postId || null, text: text || null } });
  } catch (err) { console.error('notify:', err); }
}

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
    const set = {};
    if (req.body.displayName !== undefined) set.displayName = String(req.body.displayName).slice(0, 60).trim() || null;
    if (req.body.bio !== undefined) set.bio = String(req.body.bio).slice(0, 200).trim() || null;
    if (req.body.avatarUrl !== undefined) set.avatarUrl = req.body.avatarUrl || null;
    const profile = await prisma.feedProfile.upsert({
      where: { userId },
      update: { handle, ...set },
      create: { userId, handle, ...set },
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
        handle: p.author?.handle, displayName: p.author?.displayName, avatarUrl: p.author?.avatarUrl,
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
    res.json({ post: { id: post.id, text: post.text, imageUrl: post.imageUrl, createdAt: post.createdAt, handle: profile.handle, displayName: profile.displayName, avatarUrl: profile.avatarUrl, likes: 0, comments: 0, likedByMe: false, mine: true } });
    try { // tell followers
      const followers = await prisma.feedFollow.findMany({ where: { followingId: userId }, select: { followerId: true } });
      if (followers.length) await prisma.feedNotification.createMany({ data: followers.map((f) => ({ userId: f.followerId, actorId: userId, type: 'follow_post', postId: post.id, text: (text || '📷 photo').slice(0, 80) })) });
    } catch (err) { console.error('notify followers:', err); }
  } catch (err) { console.error('feed post:', err); res.status(500).json({ error: 'Failed to post' }); }
});

// GET /api/feed/posts/:id — one post (notification tap-through)
router.get('/posts/:id', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const p = await prisma.feedPost.findUnique({ where: { id: req.params.id }, include: { author: true, _count: { select: { likes: true, comments: true } } } });
    if (!p) return res.status(404).json({ error: 'Post not found' });
    const liked = await prisma.feedLike.findUnique({ where: { postId_userId: { postId: p.id, userId } } });
    res.json({ post: { id: p.id, text: p.text, imageUrl: p.imageUrl, createdAt: p.createdAt, handle: p.author.handle, displayName: p.author.displayName, avatarUrl: p.author.avatarUrl, likes: p._count.likes, comments: p._count.comments, likedByMe: !!liked, mine: p.authorId === userId } });
  } catch (err) { console.error('post get:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── notifications ──
router.get('/notifications', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const items = await prisma.feedNotification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 });
    const actorIds = [...new Set(items.map((n) => n.actorId))];
    const profiles = actorIds.length ? await prisma.feedProfile.findMany({ where: { userId: { in: actorIds } } }) : [];
    const byU = Object.fromEntries(profiles.map((p) => [p.userId, p]));
    const unread = await prisma.feedNotification.count({ where: { userId, readAt: null } });
    res.json({
      unread,
      notifications: items.map((n) => ({ id: n.id, type: n.type, postId: n.postId, text: n.text, createdAt: n.createdAt, read: !!n.readAt, handle: byU[n.actorId]?.handle, displayName: byU[n.actorId]?.displayName, avatarUrl: byU[n.actorId]?.avatarUrl })),
    });
  } catch (err) { console.error('notifications:', err); res.status(500).json({ error: 'Failed' }); }
});
router.post('/notifications/read', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try { await prisma.feedNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }); res.json({ ok: true }); }
  catch (err) { console.error('notifications read:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── likes ──
router.post('/posts/:id/like', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const already = await prisma.feedLike.findUnique({ where: { postId_userId: { postId: req.params.id, userId } } });
    await prisma.feedLike.upsert({ where: { postId_userId: { postId: req.params.id, userId } }, update: {}, create: { postId: req.params.id, userId } });
    const likes = await prisma.feedLike.count({ where: { postId: req.params.id } });
    res.json({ likes, likedByMe: true });
    if (!already) {
      const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
      if (post) notify(post.authorId, userId, 'like', post.id, (post.text || '').slice(0, 80));
    }
  } catch (err) { console.error('like:', err); res.status(500).json({ error: 'Failed' }); }
});
router.delete('/posts/:id/like', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    await prisma.feedLike.deleteMany({ where: { postId: req.params.id, userId } });
    const likes = await prisma.feedLike.count({ where: { postId: req.params.id } });
    res.json({ likes, likedByMe: false });
  } catch (err) { console.error('unlike:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── comments ──
router.get('/posts/:id/comments', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const comments = await prisma.feedComment.findMany({ where: { postId: req.params.id }, orderBy: { createdAt: 'asc' }, take: 200 });
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const profiles = userIds.length ? await prisma.feedProfile.findMany({ where: { userId: { in: userIds } } }) : [];
    const byU = Object.fromEntries(profiles.map((p) => [p.userId, p]));
    res.json({ comments: comments.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, handle: byU[c.userId]?.handle, displayName: byU[c.userId]?.displayName, avatarUrl: byU[c.userId]?.avatarUrl, mine: c.userId === userId })) });
  } catch (err) { console.error('comments:', err); res.status(500).json({ error: 'Failed' }); }
});
router.post('/posts/:id/comments', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Write a comment' });
  if (text.length > 1000) return res.status(400).json({ error: 'Too long' });
  try {
    const profile = await prisma.feedProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(400).json({ error: 'Claim a handle first' });
    const c = await prisma.feedComment.create({ data: { postId: req.params.id, userId, text } });
    res.json({ comment: { id: c.id, text: c.text, createdAt: c.createdAt, handle: profile.handle, displayName: profile.displayName, avatarUrl: profile.avatarUrl, mine: true } });
    const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
    if (post) notify(post.authorId, userId, 'comment', post.id, text.slice(0, 120));
  } catch (err) { console.error('comment add:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── delete own content ──
router.delete('/posts/:id', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'Not your post' });
    await prisma.feedPost.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { console.error('post delete:', err); res.status(500).json({ error: 'Failed to delete' }); }
});
router.delete('/posts/:id/comments/:cid', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const c = await prisma.feedComment.findUnique({ where: { id: req.params.cid } });
    if (!c || c.postId !== req.params.id) return res.status(404).json({ error: 'Comment not found' });
    let allowed = c.userId === userId;
    if (!allowed) { const post = await prisma.feedPost.findUnique({ where: { id: c.postId } }); allowed = !!post && post.authorId === userId; }
    if (!allowed) return res.status(403).json({ error: 'Not allowed' });
    await prisma.feedComment.delete({ where: { id: req.params.cid } });
    res.json({ ok: true });
  } catch (err) { console.error('comment delete:', err); res.status(500).json({ error: 'Failed to delete' }); }
});

// ── follow ──
router.post('/follow/:handle', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const target = await prisma.feedProfile.findUnique({ where: { handle: normHandle(req.params.handle) } });
    if (!target) return res.status(404).json({ error: 'No such user' });
    if (target.userId === userId) return res.status(400).json({ error: "You can't follow yourself" });
    const already = await prisma.feedFollow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: target.userId } } });
    await prisma.feedFollow.upsert({ where: { followerId_followingId: { followerId: userId, followingId: target.userId } }, update: {}, create: { followerId: userId, followingId: target.userId } });
    res.json({ following: true });
    if (!already) notify(target.userId, userId, 'follow', null, null);
  } catch (err) { console.error('follow:', err); res.status(500).json({ error: 'Failed' }); }
});
router.delete('/follow/:handle', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const target = await prisma.feedProfile.findUnique({ where: { handle: normHandle(req.params.handle) } });
    if (target) await prisma.feedFollow.deleteMany({ where: { followerId: userId, followingId: target.userId } });
    res.json({ following: false });
  } catch (err) { console.error('unfollow:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── user search ──
router.get('/users', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ users: [] });
  const h = q.replace(/^@/, '').toLowerCase();
  try {
    const profiles = await prisma.feedProfile.findMany({
      where: { OR: [{ handle: { contains: h } }, { displayName: { contains: q, mode: 'insensitive' } }] },
      take: 20,
    });
    const ids = profiles.map((p) => p.userId);
    const following = ids.length ? await prisma.feedFollow.findMany({ where: { followerId: userId, followingId: { in: ids } }, select: { followingId: true } }) : [];
    const fSet = new Set(following.map((f) => f.followingId));
    res.json({ users: profiles.map((p) => ({ handle: p.handle, displayName: p.displayName, avatarUrl: p.avatarUrl, isFollowing: fSet.has(p.userId), isMe: p.userId === userId })) });
  } catch (err) { console.error('search:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── a user's public profile + posts ──
router.get('/profile/u/:handle', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const profile = await prisma.feedProfile.findUnique({ where: { handle: normHandle(req.params.handle) } });
    if (!profile) return res.status(404).json({ error: 'No such user' });
    const [posts, followers, following, isF] = await Promise.all([
      prisma.feedPost.count({ where: { authorId: profile.userId } }),
      prisma.feedFollow.count({ where: { followingId: profile.userId } }),
      prisma.feedFollow.count({ where: { followerId: profile.userId } }),
      prisma.feedFollow.findFirst({ where: { followerId: userId, followingId: profile.userId } }),
    ]);
    res.json({ handle: profile.handle, displayName: profile.displayName, bio: profile.bio, avatarUrl: profile.avatarUrl, counts: { posts, followers, following }, isFollowing: !!isF, isMe: profile.userId === userId });
  } catch (err) { console.error('profile:', err); res.status(500).json({ error: 'Failed' }); }
});
router.get('/profile/u/:handle/posts', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const profile = await prisma.feedProfile.findUnique({ where: { handle: normHandle(req.params.handle) } });
    if (!profile) return res.status(404).json({ error: 'No such user' });
    const posts = await prisma.feedPost.findMany({ where: { authorId: profile.userId }, orderBy: { createdAt: 'desc' }, take: 30, include: { author: true, _count: { select: { likes: true, comments: true } } } });
    const ids = posts.map((p) => p.id);
    const mine = ids.length ? await prisma.feedLike.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } }) : [];
    const likedSet = new Set(mine.map((l) => l.postId));
    res.json({ posts: posts.map((p) => ({ id: p.id, text: p.text, imageUrl: p.imageUrl, createdAt: p.createdAt, handle: p.author?.handle, displayName: p.author?.displayName, avatarUrl: p.author?.avatarUrl, likes: p._count.likes, comments: p._count.comments, likedByMe: likedSet.has(p.id), mine: p.authorId === userId })) });
  } catch (err) { console.error('profile posts:', err); res.status(500).json({ error: 'Failed' }); }
});

// ── image upload (raw bytes; image/* content-type bypasses the global JSON parser) ──
const IMG_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
router.post('/upload', express.raw({ type: IMG_TYPES, limit: '6mb' }), (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const buf = req.body;
  if (!buf || !buf.length) return res.status(400).json({ error: 'No image received' });
  if (buf.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Image too large (max 5MB)' });
  const ct = String(req.headers['content-type'] || '');
  const ext = /png/.test(ct) ? 'png' : /webp/.test(ct) ? 'webp' : /gif/.test(ct) ? 'gif' : 'jpg';
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = `${userId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    res.json({ url: `/uploads/feed/${name}` });
  } catch (err) { console.error('upload:', err); res.status(500).json({ error: 'Upload failed' }); }
});

// ── report (reactive moderation: report -> review -> remove/block) ──
router.post('/report', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const { targetType, targetId, reason } = req.body || {};
  if (!['post', 'comment'].includes(targetType) || !targetId) return res.status(400).json({ error: 'Bad report' });
  try {
    await prisma.feedReport.create({ data: { targetType, targetId: String(targetId), reporterId: userId, reason: reason ? String(reason).slice(0, 500) : null } });
    res.json({ ok: true });
  } catch (err) { console.error('report:', err); res.status(500).json({ error: 'Failed to report' }); }
});

// ── Direct messages ──────────────────────────────────────────────
const orderPair = (a, b) => (a < b ? [a, b] : [b, a]);

// GET /api/feed/dm — my conversations, most recent first
router.get('/dm', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  try {
    const threads = await prisma.dmThread.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { lastAt: 'desc' },
      take: 50,
    });
    const otherIds = [...new Set(threads.map((t) => (t.userAId === userId ? t.userBId : t.userAId)))];
    const profs = otherIds.length ? await prisma.feedProfile.findMany({ where: { userId: { in: otherIds } } }) : [];
    const byId = Object.fromEntries(profs.map((p) => [p.userId, p]));
    const conversations = [];
    for (const t of threads) {
      const otherId = t.userAId === userId ? t.userBId : t.userAId;
      const p = byId[otherId];
      if (!p) continue;
      const last = await prisma.dmMessage.findFirst({ where: { threadId: t.id }, orderBy: { createdAt: 'desc' } });
      conversations.push({
        threadId: t.id,
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        lastText: last ? last.text : '',
        lastAt: last ? last.createdAt : t.lastAt,
        mine: last ? last.senderId === userId : false,
      });
    }
    res.json({ conversations });
  } catch (err) { console.error('dm list:', err); res.status(500).json({ error: 'Failed to load conversations' }); }
});

// GET /api/feed/dm/:handle — open (or create) a thread with @handle + its messages
router.get('/dm/:handle', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const handle = normHandle(req.params.handle);
  try {
    const other = await prisma.feedProfile.findUnique({ where: { handle } });
    if (!other) return res.status(404).json({ error: 'No such handle' });
    if (other.userId === userId) return res.status(400).json({ error: "You can't message yourself" });
    const [a, b] = orderPair(userId, other.userId);
    const thread = await prisma.dmThread.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      update: {},
      create: { userAId: a, userBId: b },
    });
    const messages = await prisma.dmMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 300 });
    res.json({
      threadId: thread.id,
      other: { handle: other.handle, displayName: other.displayName, avatarUrl: other.avatarUrl },
      messages: messages.map((m) => ({ id: m.id, text: m.text, mine: m.senderId === userId, createdAt: m.createdAt })),
    });
  } catch (err) { console.error('dm open:', err); res.status(500).json({ error: 'Failed to open conversation' }); }
});

// POST /api/feed/dm/:handle  { text } — send a message to @handle
router.post('/dm/:handle', async (req, res) => {
  const userId = authUser(req, res); if (!userId) return;
  const handle = normHandle(req.params.handle);
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Message is empty' });
  if (text.length > 2000) return res.status(400).json({ error: 'Message too long' });
  try {
    const other = await prisma.feedProfile.findUnique({ where: { handle } });
    if (!other) return res.status(404).json({ error: 'No such handle' });
    if (other.userId === userId) return res.status(400).json({ error: "You can't message yourself" });
    const [a, b] = orderPair(userId, other.userId);
    const thread = await prisma.dmThread.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      update: {},
      create: { userAId: a, userBId: b },
    });
    const msg = await prisma.dmMessage.create({ data: { threadId: thread.id, senderId: userId, text } });
    await prisma.dmThread.update({ where: { id: thread.id }, data: { lastAt: msg.createdAt } });
    res.json({ message: { id: msg.id, text: msg.text, mine: true, createdAt: msg.createdAt } });
    notify(other.userId, userId, 'dm', null, text.slice(0, 120));
  } catch (err) { console.error('dm send:', err); res.status(500).json({ error: 'Failed to send' }); }
});

module.exports = router;
