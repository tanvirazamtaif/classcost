import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import auth from '../../server/lib/userAuth.cjs';

const { signUserToken, userAuthGuard } = auth;

// Minimal req/res doubles for the express middleware.
function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}
const run = (req) => {
  const res = mockRes();
  let nexted = false;
  userAuthGuard(req, res, () => { nexted = true; });
  return { res, nexted };
};

describe('userAuthGuard', () => {
  const OLD = process.env.REQUIRE_AUTH;
  afterEach(() => { process.env.REQUIRE_AUTH = OLD; });

  describe('enforcement OFF (default/transitional)', () => {
    beforeEach(() => { process.env.REQUIRE_AUTH = 'false'; });
    it('lets everything through, even with no token', () => {
      const { nexted, res } = run({ path: '/recurring/userA/slots', headers: {} });
      expect(nexted).toBe(true);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('enforcement ON', () => {
    beforeEach(() => { process.env.REQUIRE_AUTH = 'true'; });

    it('allows a valid token whose subject matches the :userId', () => {
      const token = signUserToken('userA');
      const { nexted } = run({ path: '/recurring/userA/slots', headers: { authorization: `Bearer ${token}` } });
      expect(nexted).toBe(true);
    });

    it('rejects when no token is present (401)', () => {
      const { nexted, res } = run({ path: '/ledger/userA', headers: {} });
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it("rejects accessing another user's data (403) — the core fix", () => {
      const token = signUserToken('attacker');
      const { nexted, res } = run({ path: '/recurring/victim/slots', headers: { authorization: `Bearer ${token}` } });
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(403);
    });

    it('rejects a garbage/expired token (401)', () => {
      const { nexted, res } = run({ path: '/reports/userA/summary', headers: { authorization: 'Bearer not.a.jwt' } });
      expect(nexted).toBe(false);
      expect(res.statusCode).toBe(401);
    });

    it('ignores non-userId-first routes (auth/institutions) even when ON', () => {
      expect(run({ path: '/auth/verify-otp', headers: {} }).nexted).toBe(true);
      expect(run({ path: '/institutions/search', headers: {} }).nexted).toBe(true);
    });
  });
});
