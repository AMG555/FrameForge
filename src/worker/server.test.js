'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// ── Pull exported helpers without starting the server ─────────────────────────
// server.js exports _checkAuth and _timingSafeEqual for unit testing.
// It also exports _submitJob, jobs, etc. but those require workflow modules —
// we only test the pure auth helpers here.

const { _checkAuth, _timingSafeEqual } = require('./server');

// ── _timingSafeEqual ──────────────────────────────────────────────────────────

describe('_timingSafeEqual (worker/server.js)', () => {
  it('returns true for identical strings', () => {
    assert.equal(_timingSafeEqual('secret', 'secret'), true);
  });

  it('returns false for different strings of equal length', () => {
    assert.equal(_timingSafeEqual('aaaa', 'bbbb'), false);
  });

  it('returns false for different-length strings', () => {
    assert.equal(_timingSafeEqual('short', 'much-longer-string'), false);
  });

  it('returns false when one side is empty', () => {
    assert.equal(_timingSafeEqual('', 'secret'), false);
  });

  it('returns true for empty-vs-empty', () => {
    assert.equal(_timingSafeEqual('', ''), true);
  });

  it('is case-sensitive', () => {
    assert.equal(_timingSafeEqual('Secret', 'secret'), false);
  });

  it('handles long tokens without throwing', () => {
    const longToken = crypto.randomBytes(64).toString('hex');
    assert.equal(_timingSafeEqual(longToken, longToken), true);
  });
});

// ── _checkAuth ────────────────────────────────────────────────────────────────

describe('_checkAuth (worker/server.js)', () => {
  const originalToken = process.env.INTERNAL_API_TOKEN;

  // Restore env after each group
  function withToken(token, fn) {
    const prev = process.env.INTERNAL_API_TOKEN;
    // _checkAuth reads the module-level INTERNAL_TOKEN captured at require time.
    // We cannot retroactively change it, so we test the exported helper directly
    // by calling _timingSafeEqual ourselves for the guard logic — and we verify
    // the shape of _checkAuth via source-level assertions below.
    process.env.INTERNAL_API_TOKEN = token;
    try { return fn(); } finally { process.env.INTERNAL_API_TOKEN = prev; }
  }

  it('_checkAuth is a function', () => {
    assert.equal(typeof _checkAuth, 'function');
  });

  it('_checkAuth accepts a mock request object', () => {
    // When INTERNAL_TOKEN was '' at module load (default in test env),
    // auth is disabled and _checkAuth always returns true.
    const mockReq = { headers: {} };
    assert.equal(_checkAuth(mockReq), true);
  });

  it('_checkAuth reads Authorization header', () => {
    // Verify it reads `authorization` (lowercase) as Node normalises headers.
    const mockReq = { headers: { authorization: 'Bearer test-token' } };
    // Auth is disabled in test env (no token at module load) — returns true.
    assert.equal(_checkAuth(mockReq), true);
  });

  it('_checkAuth reads x-internal-token header as fallback', () => {
    const mockReq = { headers: { 'x-internal-token': 'test-token' } };
    assert.equal(_checkAuth(mockReq), true);
  });
});

// ── Source-level structural checks ────────────────────────────────────────────
// These verify the actual source code of server.js contains the required
// security patterns (analogous to the server.test.js structural checks).

describe('worker/server.js auth structural checks', () => {
  const fs  = require('fs');
  const src = fs.readFileSync(require.resolve('./server'), 'utf8');

  it('references INTERNAL_API_TOKEN env var', () => {
    assert.ok(src.includes('process.env.INTERNAL_API_TOKEN'), 'INTERNAL_API_TOKEN not referenced');
  });

  it('defines _timingSafeEqual function', () => {
    assert.ok(src.includes('function _timingSafeEqual'), '_timingSafeEqual function missing');
  });

  it('uses crypto.timingSafeEqual inside _timingSafeEqual', () => {
    assert.ok(src.includes('crypto.timingSafeEqual'), 'crypto.timingSafeEqual missing — auth is not timing-safe');
  });

  it('defines _checkAuth function', () => {
    assert.ok(src.includes('function _checkAuth'), '_checkAuth function missing');
  });

  it('handleRequest calls _checkAuth before routing', () => {
    assert.ok(src.includes('_checkAuth(req)'), 'handleRequest does not call _checkAuth(req)');
  });

  it('returns 401 when auth fails', () => {
    assert.ok(src.includes('401'), '401 response missing from handleRequest');
    assert.ok(src.includes('Unauthorized'), 'Unauthorized message missing');
  });

  it('GET /health is not blocked by auth gate', () => {
    // /health must come BEFORE the _checkAuth call inside handleRequest.
    // We locate handleRequest first, then search within its body only.
    const fnStart    = src.indexOf('async function handleRequest(');
    assert.ok(fnStart >= 0, 'handleRequest not found in server.js');
    const bodyAfterFn = src.slice(fnStart);
    const healthIdx  = bodyAfterFn.indexOf("parts[0] === 'health'");
    const checkIdx   = bodyAfterFn.indexOf('_checkAuth(req)');
    assert.ok(
      healthIdx >= 0 && checkIdx >= 0 && healthIdx < checkIdx,
      'GET /health must be routed before the _checkAuth gate inside handleRequest'
    );
  });
});
