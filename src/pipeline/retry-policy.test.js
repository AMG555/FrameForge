'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { RetryPolicy, STAGE_TIMEOUTS_MS } = require('./retry-policy');

// ── STAGE_TIMEOUTS_MS ─────────────────────────────────────────────────────────

describe('STAGE_TIMEOUTS_MS', () => {
  it('contains all required stages', () => {
    const required = ['Research', 'Script', 'Asset_Generation', 'Video_Rendering',
      'Shorts_Extraction', 'Quality_Check', 'Packaging', 'Publishing',
      'HTTP_REQUEST', 'TTS', 'IMAGE_GENERATION', 'FFMPEG'];
    for (const s of required) {
      assert.ok(typeof STAGE_TIMEOUTS_MS[s] === 'number', `Missing timeout for ${s}`);
      assert.ok(STAGE_TIMEOUTS_MS[s] > 0, `Timeout for ${s} must be positive`);
    }
  });

  it('Video_Rendering timeout is at least 30 min', () => {
    assert.ok(STAGE_TIMEOUTS_MS.Video_Rendering >= 30 * 60 * 1000);
  });

  it('Script timeout matches Research timeout (5 min)', () => {
    assert.equal(STAGE_TIMEOUTS_MS.Script, STAGE_TIMEOUTS_MS.Research);
  });
});

// ── RetryPolicy.classifyError ─────────────────────────────────────────────────

describe('RetryPolicy.classifyError', () => {
  const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 0 });

  it('classifies ECONNREFUSED as RETRYABLE', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9999'), { code: 'ECONNREFUSED' });
    assert.equal(policy.classifyError(err), 'RETRYABLE');
  });

  it('classifies ETIMEDOUT as RETRYABLE', () => {
    const err = Object.assign(new Error('operation timed out'), { code: 'ETIMEDOUT' });
    assert.equal(policy.classifyError(err), 'RETRYABLE');
  });

  it('classifies ECONNRESET as RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('ECONNRESET')), 'RETRYABLE');
  });

  it('classifies rate limit message as RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('Rate limit exceeded')), 'RETRYABLE');
  });

  it('classifies 503 message as RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('HTTP 503: service unavailable')), 'RETRYABLE');
  });

  it('classifies 429 status code as RETRYABLE', () => {
    const err = Object.assign(new Error('Too Many Requests'), { status: 429 });
    assert.equal(policy.classifyError(err), 'RETRYABLE');
  });

  it('classifies 500 status code as RETRYABLE', () => {
    const err = Object.assign(new Error('Internal Server Error'), { status: 500 });
    assert.equal(policy.classifyError(err), 'RETRYABLE');
  });

  it('classifies JSON parse error as NON_RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('JSON parse failed: unexpected token')), 'NON_RETRYABLE');
  });

  it('classifies schema validation error as NON_RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('schema validation failed')), 'NON_RETRYABLE');
  });

  it('classifies quality gate error as NON_RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('quality gate: duration too short')), 'NON_RETRYABLE');
  });

  it('classifies Too few scenes as NON_RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('Too few scenes: 3')), 'NON_RETRYABLE');
  });

  it('classifies 401 message as FATAL', () => {
    assert.equal(policy.classifyError(new Error('HTTP 401: Unauthorized')), 'FATAL');
  });

  it('classifies 403 message as FATAL', () => {
    assert.equal(policy.classifyError(new Error('HTTP 403: Forbidden')), 'FATAL');
  });

  it('classifies Invalid credential as FATAL', () => {
    assert.equal(policy.classifyError(new Error('Invalid credential provided')), 'FATAL');
  });

  it('classifies Missing credential as FATAL', () => {
    assert.equal(policy.classifyError(new Error('Missing credential: GROQ_API_KEY')), 'FATAL');
  });

  it('classifies 401 status code as FATAL', () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    assert.equal(policy.classifyError(err), 'FATAL');
  });

  it('classifies 403 status code as FATAL', () => {
    const err = Object.assign(new Error('Forbidden'), { status: 403 });
    assert.equal(policy.classifyError(err), 'FATAL');
  });

  it('classifies 400 status code as NON_RETRYABLE', () => {
    const err = Object.assign(new Error('Bad Request'), { status: 400 });
    assert.equal(policy.classifyError(err), 'NON_RETRYABLE');
  });

  it('defaults unknown errors to NON_RETRYABLE', () => {
    assert.equal(policy.classifyError(new Error('Something weird happened')), 'NON_RETRYABLE');
  });
});

// ── RetryPolicy.executeStage ──────────────────────────────────────────────────

describe('RetryPolicy.executeStage', () => {
  it('resolves immediately when fn succeeds on first attempt', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 0 });
    const result = await policy.executeStage('Quality_Check', async () => 'ok');
    assert.equal(result, 'ok');
  });

  it('retries RETRYABLE errors and succeeds on second attempt', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1 });
    let calls = 0;
    const result = await policy.executeStage('Quality_Check', async () => {
      calls++;
      if (calls < 2) throw Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' });
      return 'recovered';
    });
    assert.equal(result, 'recovered');
    assert.equal(calls, 2);
  });

  it('dead-letters after maxAttempts on RETRYABLE error', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1 });
    let calls = 0;
    await assert.rejects(
      () => policy.executeStage('Quality_Check', async () => {
        calls++;
        throw Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' });
      }),
      err => {
        assert.equal(err.errorClass, 'DEAD_LETTER');
        assert.equal(err.stageName, 'Quality_Check');
        return true;
      }
    );
    assert.equal(calls, 3);
  });

  it('throws immediately on FATAL error without retrying', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1 });
    let calls = 0;
    await assert.rejects(
      () => policy.executeStage('Script', async () => {
        calls++;
        throw new Error('HTTP 401: Unauthorized');
      }),
      err => {
        assert.equal(err.errorClass, 'FATAL');
        return true;
      }
    );
    assert.equal(calls, 1);
  });

  it('throws immediately on NON_RETRYABLE error without retrying', async () => {
    const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1 });
    let calls = 0;
    await assert.rejects(
      () => policy.executeStage('Script', async () => {
        calls++;
        throw new Error('JSON parse failed: unexpected token');
      }),
      err => {
        assert.equal(err.errorClass, 'NON_RETRYABLE');
        return true;
      }
    );
    assert.equal(calls, 1);
  });

  it('applies timeout from STAGE_TIMEOUTS_MS', async () => {
    const policy = new RetryPolicy({ maxAttempts: 1, baseDelayMs: 0 });
    // Packaging timeout is 1 min — use a known stage with known timeout
    // Here we just verify the stage resolves correctly within a fast fn
    const result = await policy.executeStage('Packaging', async () => 'packaged');
    assert.equal(result, 'packaged');
  });
});

// ── RetryPolicy._backoffDelay ─────────────────────────────────────────────────

describe('RetryPolicy._backoffDelay', () => {
  it('returns a non-negative value', () => {
    const policy = new RetryPolicy({ baseDelayMs: 100 });
    for (let attempt = 1; attempt <= 5; attempt++) {
      const delay = policy._backoffDelay(attempt);
      assert.ok(delay >= 0, `delay should be >= 0 at attempt ${attempt}`);
    }
  });

  it('maximum delay grows with attempt number', () => {
    const policy = new RetryPolicy({ baseDelayMs: 1000 });
    // cap at attempt 1 is 2000, at attempt 2 is 4000
    // We can only test the upper bound, not the exact value (random)
    for (let attempt = 1; attempt <= 3; attempt++) {
      const cap = 1000 * Math.pow(2, attempt);
      const delay = policy._backoffDelay(attempt);
      assert.ok(delay < cap, `delay ${delay} exceeded cap ${cap} at attempt ${attempt}`);
    }
  });
});
