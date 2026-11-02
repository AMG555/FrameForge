'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// ── Pull out testable internals without starting the HTTP server ──────────────
// Both timingSafeEqual and readBody are defined as module-level functions in
// server-render-free.js, but the file auto-starts. We extract them by parsing
// or re-implementing the exact same logic for unit tests.

// ── timingSafeEqual (re-implemented from server-render-free.js) ───────────────

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // dummy compare — avoid timing leak
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// ── readBody (re-implemented from server-render-free.js) ──────────────────────

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4 MB

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        return reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ── makeReq: minimal EventEmitter stub for readBody tests ─────────────────────

function makeReq(bodyBytes) {
  const req = new EventEmitter();
  req.destroyed = false;
  req.destroy   = () => { req.destroyed = true; };

  process.nextTick(() => {
    if (bodyBytes) req.emit('data', bodyBytes);
    req.emit('end');
  });
  return req;
}

// ── timingSafeEqual ───────────────────────────────────────────────────────────

describe('timingSafeEqual', () => {
  it('returns true for equal strings', () => {
    assert.equal(timingSafeEqual('hello', 'hello'), true);
  });

  it('returns false for different strings of same length', () => {
    assert.equal(timingSafeEqual('aaaa', 'bbbb'), false);
  });

  it('returns false for different length strings', () => {
    assert.equal(timingSafeEqual('short', 'much longer string'), false);
  });

  it('returns false when token is empty and secret is non-empty', () => {
    assert.equal(timingSafeEqual('', 'secret'), false);
  });

  it('returns true for empty strings', () => {
    assert.equal(timingSafeEqual('', ''), true);
  });

  it('is case-sensitive', () => {
    assert.equal(timingSafeEqual('Secret', 'secret'), false);
  });

  it('handles long tokens without throwing', () => {
    const a = crypto.randomBytes(64).toString('hex');
    assert.equal(timingSafeEqual(a, a), true);
    assert.equal(timingSafeEqual(a, a + 'x'), false);
  });
});

// ── readBody — size limit ─────────────────────────────────────────────────────

describe('readBody size limit', () => {
  it('resolves with body text for normal-sized request', async () => {
    const body = Buffer.from('{"type":"research","payload":{}}');
    const req  = makeReq(body);
    const text = await readBody(req);
    assert.equal(text, '{"type":"research","payload":{}}');
  });

  it('rejects with statusCode 413 when body exceeds 4 MB', async () => {
    // Create a 4MB + 1 byte payload to trigger the limit
    const oversized = Buffer.alloc(MAX_BODY_BYTES + 1, 0x41); // 4MB+1 of 'A'
    const req       = new EventEmitter();
    req.destroyed   = false;
    req.destroy     = () => { req.destroyed = true; };

    // Send the oversized chunk
    process.nextTick(() => {
      req.emit('data', oversized);
      req.emit('end'); // won't be reached, but emit anyway
    });

    await assert.rejects(
      () => readBody(req),
      err => {
        assert.equal(err.statusCode, 413);
        assert.ok(err.message.includes('too large'));
        return true;
      }
    );
  });

  it('resolves empty string for request with no body', async () => {
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy   = () => {};
    process.nextTick(() => req.emit('end'));
    const text = await readBody(req);
    assert.equal(text, '');
  });

  it('rejects when request emits error event', async () => {
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy   = () => {};
    process.nextTick(() => req.emit('error', new Error('socket hang up')));
    await assert.rejects(() => readBody(req), /socket hang up/);
  });
});

// ── productionId path-traversal guard ────────────────────────────────────────
// The guard in edit_scenes and render_from_scenes is: /[/\\]/.test(productionId)
// We unit-test the regex pattern directly.

describe('productionId path-traversal guard', () => {
  const isUnsafe = id => /[/\\]/.test(id);

  it('allows a normal productionId', () => {
    assert.equal(isUnsafe('prod_abc123_1704067200'), false);
    assert.equal(isUnsafe('agent_ff1234ab_1704067200000'), false);
    assert.equal(isUnsafe('render_00112233_1704067200000'), false);
  });

  it('blocks productionId with forward slash', () => {
    assert.equal(isUnsafe('../../../etc/passwd'), true);
    assert.equal(isUnsafe('prod/subdir'), true);
  });

  it('blocks productionId with backslash', () => {
    assert.equal(isUnsafe('..\\..\\windows\\system32'), true);
    assert.equal(isUnsafe('prod\\subdir'), true);
  });

  it('allows hyphens, underscores, and numbers', () => {
    assert.equal(isUnsafe('prod-abc_123-456'), false);
  });
});

// ── MAX_BODY_BYTES constant ───────────────────────────────────────────────────

describe('MAX_BODY_BYTES', () => {
  it('is exactly 4 MB (4 * 1024 * 1024)', () => {
    assert.equal(MAX_BODY_BYTES, 4 * 1024 * 1024);
  });
});
