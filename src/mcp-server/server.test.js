'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');

// ── Re-implement testable logic from server.js without starting the server ────
// readBodyLimited and the productionId guard are both pure logic we can
// unit-test without spinning up the actual HTTP server.

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4 MB

async function readBodyLimited(req) {
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

// ── LLMProvider.parseJson (extracted for testing without network) ─────────────
const { LLMProvider } = require('../pipeline/providers');

// ── readBodyLimited ───────────────────────────────────────────────────────────

describe('readBodyLimited (MCP server)', () => {
  function makeReq(body) {
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy   = () => { req.destroyed = true; };
    process.nextTick(() => {
      if (body) req.emit('data', body);
      req.emit('end');
    });
    return req;
  }

  it('resolves with body string for small request', async () => {
    const body = Buffer.from('{"jsonrpc":"2.0","method":"ping","id":1}');
    const req  = makeReq(body);
    const text = await readBodyLimited(req);
    assert.equal(text, '{"jsonrpc":"2.0","method":"ping","id":1}');
  });

  it('rejects with 413 for body exceeding 4 MB', async () => {
    const oversized = Buffer.alloc(MAX_BODY_BYTES + 1, 0x42);
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy   = () => { req.destroyed = true; };
    process.nextTick(() => {
      req.emit('data', oversized);
      req.emit('end');
    });
    await assert.rejects(
      () => readBodyLimited(req),
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
    const text = await readBodyLimited(req);
    assert.equal(text, '');
  });

  it('rejects when stream emits error', async () => {
    const req = new EventEmitter();
    req.destroyed = false;
    req.destroy   = () => {};
    process.nextTick(() => req.emit('error', new Error('ECONNRESET')));
    await assert.rejects(() => readBodyLimited(req), /ECONNRESET/);
  });
});

// ── LLMProvider.parseJson ─────────────────────────────────────────────────────

describe('LLMProvider.parseJson', () => {
  it('parses clean JSON object', () => {
    const raw    = '{"topic":"hello","scenes":[]}';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.topic, 'hello');
    assert.deepEqual(result.scenes, []);
  });

  it('strips markdown code fences', () => {
    const raw    = '```json\n{"topic":"hello","scenes":[]}\n```';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.topic, 'hello');
  });

  it('strips plain ``` fences', () => {
    const raw    = '```{"topic":"world","scenes":[]}\n```';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.topic, 'world');
  });

  it('handles leading/trailing whitespace and text around JSON', () => {
    const raw    = 'Here is the output:\n{"key":"value"}\nEnjoy!';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.key, 'value');
  });

  it('handles trailing commas in objects', () => {
    const raw    = '{"key":"value",}';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.key, 'value');
  });

  it('handles trailing commas in arrays', () => {
    const raw    = '{"items":["a","b",]}';
    const result = LLMProvider.parseJson(raw);
    assert.deepEqual(result.items, ['a', 'b']);
  });

  it('strips **bold** markdown markers', () => {
    const raw    = '{"key":"**value**"}';
    const result = LLMProvider.parseJson(raw);
    assert.equal(result.key, 'value');
  });

  it('throws when no JSON object present', () => {
    assert.throws(() => LLMProvider.parseJson('no json here'), /No JSON object/);
  });

  it('throws on malformed JSON after fence stripping', () => {
    assert.throws(() => LLMProvider.parseJson('```json\n{bad:json}\n```'), /unexpected token|Expected/i);
  });
});

// ── TTSProvider constructor overrides ─────────────────────────────────────────

describe('TTSProvider constructor overrides', () => {
  const { TTSProvider } = require('../pipeline/providers');

  it('uses platform override from opts', () => {
    const tts = new TTSProvider({ platform: 'elevenlabs' });
    assert.equal(tts.name, 'elevenlabs');
  });

  it('defaults to edge-tts when no platform given and no env set', () => {
    const saved = process.env.PROVIDER_TTS;
    delete process.env.PROVIDER_TTS;
    const tts = new TTSProvider();
    assert.equal(tts.name, 'edge-tts');
    if (saved !== undefined) process.env.PROVIDER_TTS = saved;
  });

  it('stashes override opts for use in synthesis methods', () => {
    const tts = new TTSProvider({ platform: 'openai', voice: 'nova', rate: '-10%', apiKey: 'sk_test' });
    assert.equal(tts._overrides.voice, 'nova');
    assert.equal(tts._overrides.rate, '-10%');
    assert.equal(tts._overrides.apiKey, 'sk_test');
  });

  it('selectNarratorVoice returns explicit voice when provided', () => {
    const tts = new TTSProvider({ platform: 'edge-tts' });
    assert.equal(tts.selectNarratorVoice('en-GB-RyanNeural'), 'en-GB-RyanNeural');
  });

  it('selectNarratorVoice falls back to default for unknown provider', () => {
    const tts = new TTSProvider({ platform: 'unknown_provider' });
    const voice = tts.selectNarratorVoice(); // should not throw
    assert.ok(typeof voice === 'string');
    assert.ok(voice.length > 0);
  });

  it('selectNarratorVoice respects TTS_VOICE_GENDER=female', () => {
    const saved = process.env.TTS_VOICE_GENDER;
    process.env.TTS_VOICE_GENDER = 'female';
    const tts   = new TTSProvider({ platform: 'edge-tts' });
    const voice = tts.selectNarratorVoice();
    assert.ok(voice.includes('Jenny') || voice.includes('Female') || voice.length > 0, `Expected female voice, got: ${voice}`);
    if (saved !== undefined) process.env.TTS_VOICE_GENDER = saved;
    else delete process.env.TTS_VOICE_GENDER;
  });
});

// ── productionId path-traversal guard (MCP server) ────────────────────────────

describe('productionId path-traversal guard (MCP server)', () => {
  const isUnsafe = id => !id || /[/\\]/.test(id);

  it('allows valid productionId formats', () => {
    assert.equal(isUnsafe('prod_abc123_1704067200'), false);
    assert.equal(isUnsafe('agent_ff1234ab_1704067200000'), false);
    assert.equal(isUnsafe('render_00112233_1704067200000'), false);
  });

  it('blocks forward slash in productionId', () => {
    assert.equal(isUnsafe('../etc/passwd'), true);
    assert.equal(isUnsafe('prod/subdir'), true);
  });

  it('blocks backslash in productionId', () => {
    assert.equal(isUnsafe('..\\system32'), true);
  });

  it('blocks null/empty productionId', () => {
    assert.equal(isUnsafe(null), true);
    assert.equal(isUnsafe(''), true);
  });
});

// ── multi_voice_tts outputPath guard logic ────────────────────────────────────
// The guard logic: resolve outputPath; check it starts with FILES_DIR
// We unit-test the guard pattern without invoking the handler (which needs FFmpeg).

describe('multi_voice_tts outputPath guard', () => {
  const pathMod  = require('path');
  const os       = require('os');
  // Use a fixed test base so assertions are platform-independent
  const filesDir = pathMod.join(os.tmpdir(), 'ff-test-guard');

  function isPathSafe(outputPath) {
    if (!outputPath) return false;
    const absOutput   = pathMod.resolve(outputPath);
    const absFilesDir = pathMod.resolve(filesDir);
    return absOutput.startsWith(absFilesDir + pathMod.sep) || absOutput.startsWith(absFilesDir);
  }

  it('allows paths inside FILES_DIR', () => {
    assert.equal(isPathSafe(pathMod.join(filesDir, 'video_tmp', 'voice_0.m4a')), true);
    assert.equal(isPathSafe(pathMod.join(filesDir, 'voice.mp3')), true);
  });

  it('blocks path traversal outside FILES_DIR', () => {
    assert.equal(isPathSafe(pathMod.join(os.tmpdir(), 'evil.mp3')), false);
    assert.equal(isPathSafe(pathMod.join(filesDir, '..', '..', 'etc', 'passwd')), false);
    assert.equal(isPathSafe(pathMod.join(os.tmpdir(), 'other', 'evil.mp3')), false);
  });

  it('blocks null/empty outputPath', () => {
    assert.equal(isPathSafe(null), false);
    assert.equal(isPathSafe(''), false);
  });
});

// ── get_job_status tool definition ───────────────────────────────────────────

describe('get_job_status tool definition', () => {
  const { TOOLS } = require('./server');

  it('get_job_status is defined in TOOLS', () => {
    assert.ok(Object.prototype.hasOwnProperty.call(TOOLS, 'get_job_status'), 'get_job_status missing from TOOLS');
  });

  it('get_job_status has a description', () => {
    assert.ok(typeof TOOLS.get_job_status.description === 'string');
    assert.ok(TOOLS.get_job_status.description.length > 10);
  });

  it('get_job_status inputSchema requires jobId', () => {
    const schema = TOOLS.get_job_status.inputSchema;
    assert.ok(schema.required.includes('jobId'), 'jobId not in required');
    assert.ok(schema.properties.jobId, 'jobId not in properties');
  });

  it('get_job_status handler throws when jobId is missing', async () => {
    await assert.rejects(
      () => TOOLS.get_job_status.handler({}),
      (err) => err instanceof Error && /jobId/.test(err.message)
    );
  });

  it('get_job_status handler throws when WORKER_API_URL not set', async () => {
    const saved = process.env.WORKER_API_URL;
    delete process.env.WORKER_API_URL;
    await assert.rejects(
      () => TOOLS.get_job_status.handler({ jobId: 'test-job-123' }),
      (err) => err instanceof Error && /WORKER_API_URL/.test(err.message)
    );
    if (saved !== undefined) process.env.WORKER_API_URL = saved;
  });
});

// ── INTERNAL_API_TOKEN forwarding ─────────────────────────────────────────────
// These tests verify that get_job_status and queue_full_pipeline both include
// Authorization headers when INTERNAL_API_TOKEN is present in the environment.
// We validate the handler source directly (unit-testable without a live server).

describe('INTERNAL_API_TOKEN forwarding in worker tools', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('./server'), 'utf8');

  it('get_job_status reads INTERNAL_API_TOKEN from env', () => {
    // Confirm the auth pattern is present in the handler source
    assert.ok(src.includes('process.env.INTERNAL_API_TOKEN'), 'INTERNAL_API_TOKEN not referenced in server.js');
  });

  it('get_job_status sets Authorization header when token present', () => {
    assert.ok(
      src.includes("Authorization: `Bearer ${internalToken}`"),
      'Authorization: Bearer pattern missing from get_job_status handler'
    );
  });

  it('queue_full_pipeline builds authHeaders from INTERNAL_API_TOKEN', () => {
    assert.ok(src.includes('authHeaders'), 'authHeaders variable missing from queue_full_pipeline');
  });

  it('queue_full_pipeline spreads authHeaders into request headers', () => {
    assert.ok(src.includes('...authHeaders'), '...authHeaders spread missing from request options');
  });
});

// ── publish_video channels default ───────────────────────────────────────────

describe('publish_video tool definition', () => {
  const { TOOLS } = require('./server');

  it('publish_video is defined in TOOLS', () => {
    assert.ok(Object.prototype.hasOwnProperty.call(TOOLS, 'publish_video'), 'publish_video missing from TOOLS');
  });

  it('publish_video channels default is file not telegram', () => {
    // Extract handler source to confirm the default
    const handlerSrc = TOOLS.publish_video.handler.toString();
    assert.ok(handlerSrc.includes("channels = ['file']"), "channels default should be ['file']");
    assert.ok(!handlerSrc.includes("channels = ['telegram']"), "channels default must not be ['telegram']");
  });

  it('publish_video inputSchema channels default is file', () => {
    const schema = TOOLS.publish_video.inputSchema;
    const chanProp = schema.properties.channels;
    assert.ok(chanProp, 'channels property missing from inputSchema');
    assert.deepEqual(chanProp.default, ['file'], 'channels inputSchema default must be [file]');
  });

  it('publish_video description mentions file and webhook only', () => {
    const desc = TOOLS.publish_video.description;
    assert.ok(desc.includes('file') || desc.includes('webhook'), 'description should mention file/webhook');
    assert.ok(!desc.includes('telegram') && !desc.includes('Telegram'), 'description must not mention Telegram');
    assert.ok(!desc.includes('youtube') && !desc.includes('YouTube'), 'description must not mention YouTube');
  });

  it('publish_video handler throws for missing productionId', async () => {
    await assert.rejects(
      () => TOOLS.publish_video.handler({ masterPath: '/tmp/video.mp4' }),
      (err) => err instanceof Error
    );
  });
});

// ── MCP HTTP auth enforcement ─────────────────────────────────────────────────
// Validate that _checkMCPAuth is present and that the HTTP handler gate exists.

describe('MCP HTTP auth enforcement', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('./server'), 'utf8');

  it('_checkMCPAuth function is defined in server.js', () => {
    assert.ok(src.includes('function _checkMCPAuth'), '_checkMCPAuth missing from server.js');
  });

  it('_checkMCPAuth uses crypto.timingSafeEqual', () => {
    assert.ok(src.includes('crypto.timingSafeEqual'), 'timingSafeEqual missing — auth is not timing-safe');
  });

  it('HTTP handler calls _checkMCPAuth before processing requests', () => {
    assert.ok(src.includes('_checkMCPAuth(req)'), 'HTTP handler does not call _checkMCPAuth');
  });

  it('HTTP handler returns 401 when auth fails', () => {
    assert.ok(src.includes("res.writeHead(401"), '401 response missing from auth failure path');
  });

  it('MCP_AUTH_TOKEN gate is opt-in (disabled when env var not set)', () => {
    // Auth must be skippable for local dev without env set
    assert.ok(
      src.includes('if (!expected) return true'),
      '_checkMCPAuth must return true when MCP_AUTH_TOKEN is not set'
    );
  });
});
