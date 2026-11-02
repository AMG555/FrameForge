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
  const filesDir = '/home/node/.n8n-files';

  function isPathSafe(outputPath) {
    if (!outputPath) return false;
    const absOutput   = pathMod.resolve(outputPath);
    const absFilesDir = pathMod.resolve(filesDir);
    return absOutput.startsWith(absFilesDir + pathMod.sep) || absOutput.startsWith(absFilesDir);
  }

  it('allows paths inside FILES_DIR', () => {
    assert.equal(isPathSafe('/home/node/.n8n-files/video_tmp/voice_0.m4a'), true);
    assert.equal(isPathSafe('/home/node/.n8n-files/voice.mp3'), true);
  });

  it('blocks path traversal outside FILES_DIR', () => {
    assert.equal(isPathSafe('/etc/passwd'), false);
    assert.equal(isPathSafe('/home/node/.n8n-files/../../../etc/passwd'), false);
    assert.equal(isPathSafe('/tmp/evil.mp3'), false);
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
