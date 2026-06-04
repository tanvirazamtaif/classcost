const jwt = require('jsonwebtoken');

/**
 * User authentication for student-facing routes.
 *
 * SAFE ROLLOUT: enforcement is gated by REQUIRE_AUTH==='true'. While it is off
 * (the default), the guard is a no-op — tokens are issued at login and sent by
 * the client, but missing/mismatched tokens are NOT rejected. Flip REQUIRE_AUTH
 * to 'true' only once clients are sending tokens (existing sessions re-login once).
 *
 * When ON, every request to a "userId-first" route must carry a valid token whose
 * subject equals the :userId in the URL — closing the "trust the ID in the URL" hole.
 */

const SECRET = process.env.USER_JWT_SECRET || 'classcost-user-secret-change-me';
const TOKEN_TTL = process.env.USER_JWT_TTL || '60d';

// Resources whose path is /api/<resource>/<userId>/... (the second segment is the userId).
// Excludes: auth (login), admin (own JWT), institutions (global, no userId),
// semester-engine (userId comes via query, guarded separately if needed).
const USERID_FIRST = new Set([
  'expenses', 'semesters', 'loans', 'settings', 'coaching', 'batches', 'tutors',
  'clubs', 'events', 'uniforms', 'education-fees', 'housing', 'entities', 'trackers',
  'obligations', 'ledger', 'allocations', 'recurring', 'reports', 'closure', 'circles',
]);

function signUserToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: TOKEN_TTL });
}

function verifyUserToken(token) {
  return jwt.verify(token, SECRET); // throws on invalid/expired
}

// Express middleware mounted at '/api'. req.path is relative to the mount,
// e.g. '/recurring/<userId>/slots'.
function userAuthGuard(req, res, next) {
  if (process.env.REQUIRE_AUTH !== 'true') return next(); // transitional: not enforced

  const parts = req.path.split('/').filter(Boolean); // [resource, userId, ...]
  const resource = parts[0];
  if (!USERID_FIRST.has(resource)) return next(); // not a userId-first route
  const userId = parts[1];
  if (!userId) return next();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = verifyUserToken(token);
    if (decoded.sub !== userId) return res.status(403).json({ error: 'Forbidden' });
    req.authUserId = decoded.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { signUserToken, verifyUserToken, userAuthGuard, USERID_FIRST, SECRET };
