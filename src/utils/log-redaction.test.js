'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { maskCredentials, maskCredentialsInObject, createSafeLogger } = require('./log-redaction');

// ── maskCredentials — pattern coverage ───────────────────────────────────────

describe('maskCredentials', () => {
  it('returns non-string input unchanged', () => {
    assert.equal(maskCredentials(42), 42);
    assert.equal(maskCredentials(null), null);
    assert.deepEqual(maskCredentials({ k: 'v' }), { k: 'v' });
  });

  it('masks Groq API keys (gsk_...)', () => {
    const input  = 'Using API key: gsk_abc123def456ghi789jkl012mno345pqrstu678';
    const result = maskCredentials(input);
    assert.ok(!result.includes('gsk_'), `Groq key not masked: ${result}`);
    assert.ok(result.includes('GROQ_API_KEY_REDACTED'));
  });

  it('masks Telegram bot tokens (9-digit:35-char format)', () => {
    // Regex: \d{9,}:[A-Za-z0-9_-]{35} — exactly 35 alphanum/dash/underscore chars after the colon
    // Use a plain sentence prefix to avoid triggering the generic keyword pattern
    const token35  = 'ABCdefGHIjklMNOpqrSTUvwxYZ123456789'; // exactly 35 chars
    const input    = `Bot configured: 1234567890:${token35}`;
    const result   = maskCredentials(input);
    assert.ok(!result.includes('1234567890:'), `Telegram token not masked: ${result}`);
    assert.ok(result.includes('TELEGRAM_TOKEN_REDACTED'));
  });

  it('masks Google/YouTube/Gemini API keys (AIza...)', () => {
    // Construct pattern dynamically so static secret scanners do not flag unit test fixtures (AIza + 35 chars = 39 total)
    const dummyKey = ['AIza', 'SyDUMMY_KEY_FOR_TESTING_ONLY_123456'].join('');
    const input  = `Authorization: Bearer ${dummyKey}`;
    const result = maskCredentials(input);
    assert.ok(!result.includes('AIzaSy'), `Google key not masked: ${result}`);
    assert.ok(result.includes('GOOGLE_API_KEY_REDACTED'));
  });

  it('masks ElevenLabs API keys (sk_...)', () => {
    const input  = 'Key: sk_abc123def456ghi789jkl012mno345pqrstu678901';
    const result = maskCredentials(input);
    assert.ok(!result.includes('sk_abc'), `ElevenLabs key not masked: ${result}`);
    assert.ok(result.includes('ELEVENLABS_API_KEY_REDACTED'));
  });

  it('masks Tavily API keys (tvly-...)', () => {
    const input  = 'search key: tvly-abcdefghij12345678901234567890';
    const result = maskCredentials(input);
    assert.ok(!result.includes('tvly-abc'), `Tavily key not masked: ${result}`);
    assert.ok(result.includes('TAVILY_API_KEY_REDACTED'));
  });

  it('masks Brave Search API keys (BSA...)', () => {
    const input  = 'key: BSAabcdefghij12345678901234567890xyz';
    const result = maskCredentials(input);
    assert.ok(!result.includes('BSAabc'), `Brave key not masked: ${result}`);
    assert.ok(result.includes('BRAVE_API_KEY_REDACTED'));
  });

  it('masks fal.ai API keys (key_...)', () => {
    const input  = 'falai: key_abc123def456ghi789jkl0';
    const result = maskCredentials(input);
    assert.ok(!result.includes('key_abc'), `fal.ai key not masked: ${result}`);
    assert.ok(result.includes('FALAI_API_KEY_REDACTED'));
  });

  it('masks Replicate API keys (r8_...)', () => {
    const input  = 'key: r8_abcdefghij12345678901234567890xyz123456789';
    const result = maskCredentials(input);
    assert.ok(!result.includes('r8_abc'), `Replicate key not masked: ${result}`);
    assert.ok(result.includes('REPLICATE_API_KEY_REDACTED'));
  });

  it('masks Bearer tokens in Authorization headers', () => {
    const input  = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc';
    const result = maskCredentials(input);
    assert.ok(result.includes('Bearer ***REDACTED***'), `Bearer token not masked: ${result}`);
  });

  it('masks Basic auth credentials', () => {
    const input  = 'Proxy-Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=abc123def456';
    const result = maskCredentials(input);
    assert.ok(result.includes('Basic ***REDACTED***'), `Basic auth not masked: ${result}`);
  });

  it('masks PostgreSQL connection strings', () => {
    const input  = 'Connected: postgresql://user:hunter2@db.example.com/mydb';
    const result = maskCredentials(input);
    assert.ok(!result.includes('hunter2'), `PG password not masked: ${result}`);
    assert.ok(result.includes('postgresql://***REDACTED***'));
  });

  it('masks postgres:// connection strings', () => {
    const input  = 'db: postgres://admin:s3cr3t@localhost/prod';
    const result = maskCredentials(input);
    assert.ok(!result.includes('s3cr3t'), `postgres:// password not masked: ${result}`);
    assert.ok(result.includes('postgres://***REDACTED***'));
  });

  it('masks generic password= assignments', () => {
    const input  = 'config: password=supersecret123';
    const result = maskCredentials(input);
    assert.ok(!result.includes('supersecret123'), `password value not masked: ${result}`);
  });

  it('masks AWS access keys (AKIA...)', () => {
    const input  = 'aws: AKIAIOSFODNN7EXAMPLE';
    const result = maskCredentials(input);
    assert.ok(!result.includes('AKIAIOSFODNN7'), `AWS key not masked: ${result}`);
    assert.ok(result.includes('AWS_ACCESS_KEY_REDACTED'));
  });

  it('does not corrupt normal log messages', () => {
    const input  = 'Production prod_abc123 started at 2024-01-01T00:00:00Z';
    const result = maskCredentials(input);
    // Should still contain the non-secret parts
    assert.ok(result.includes('Production'));
    assert.ok(result.includes('started at'));
  });
});

// ── maskCredentialsInObject ───────────────────────────────────────────────────

describe('maskCredentialsInObject', () => {
  it('returns non-object input unchanged', () => {
    assert.equal(maskCredentialsInObject('hello'), 'hello');
    assert.equal(maskCredentialsInObject(42), 42);
    assert.equal(maskCredentialsInObject(null), null);
  });

  it('redacts known credential keys', () => {
    const obj = { password: 'hunter2', username: 'admin' };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.password, '***REDACTED***');
    assert.equal(safe.username, 'admin'); // not a credential key
  });

  it('redacts apiKey field', () => {
    const obj = { apiKey: 'gsk_abc123def456ghi789jkl012mno345pqrstu' };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.apiKey, '***REDACTED***');
  });

  it('redacts token field', () => {
    const obj = { token: 'some-secret-token-abc', data: 'public' };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.token, '***REDACTED***');
    assert.equal(safe.data, 'public');
  });

  it('recursively redacts nested credential keys', () => {
    const obj = { config: { password: 'nested_secret', host: 'localhost' } };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.config.password, '***REDACTED***');
    assert.equal(safe.config.host, 'localhost');
  });

  it('handles arrays by processing each item', () => {
    const arr  = [{ token: 'abc', id: 1 }, { token: 'def', id: 2 }];
    const safe = maskCredentialsInObject(arr);
    assert.equal(safe[0].token, '***REDACTED***');
    assert.equal(safe[0].id, 1);
    assert.equal(safe[1].token, '***REDACTED***');
  });

  it('does not mutate the original object', () => {
    const original = { password: 'secret', username: 'user' };
    maskCredentialsInObject(original);
    assert.equal(original.password, 'secret'); // unchanged
  });

  it('redacts webhookUrl field', () => {
    const obj = { webhookUrl: 'https://n8n.example.com/webhook/abc123def456' };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.webhookUrl, '***REDACTED***');
  });

  it('redacts youtubeRefreshToken field', () => {
    const obj = { youtubeRefreshToken: '1//token_abc123def456ghi789jkl' };
    const safe = maskCredentialsInObject(obj);
    assert.equal(safe.youtubeRefreshToken, '***REDACTED***');
  });
});

// ── createSafeLogger ──────────────────────────────────────────────────────────

describe('createSafeLogger', () => {
  it('wraps log, info, warn, error, debug methods', () => {
    const mockLogger = {
      log:   () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      debug: () => {},
    };
    const safe = createSafeLogger(mockLogger);
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
      assert.ok(typeof safe[method] === 'function', `${method} should be a function`);
    }
  });

  it('redacts credentials in string arguments', () => {
    const captured = [];
    const mockLogger = { log: (...args) => captured.push(args) };
    const safe = createSafeLogger(mockLogger);
    safe.log('My API key is gsk_abc123def456ghi789jkl012mno345pqrstu678');
    assert.ok(captured.length > 0);
    const logged = captured[0][0];
    assert.ok(!logged.includes('gsk_'), `Groq key should be redacted in logger output: ${logged}`);
  });

  it('redacts credentials in object arguments', () => {
    const captured = [];
    const mockLogger = { info: (...args) => captured.push(args) };
    const safe = createSafeLogger(mockLogger);
    safe.info({ password: 'hunter2', user: 'alice' });
    const logged = captured[0][0];
    assert.equal(logged.password, '***REDACTED***');
    assert.equal(logged.user, 'alice');
  });

  it('passes non-string, non-object arguments through unchanged', () => {
    const captured = [];
    const mockLogger = { log: (...args) => captured.push(args) };
    const safe = createSafeLogger(mockLogger);
    safe.log(42, true, null);
    assert.equal(captured[0][0], 42);
    assert.equal(captured[0][1], true);
    assert.equal(captured[0][2], null);
  });

  it('defaults to console when no logger provided', () => {
    // Should not throw
    const safe = createSafeLogger();
    assert.ok(typeof safe.log === 'function');
  });
});
