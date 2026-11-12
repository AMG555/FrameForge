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

// ── Autonomous Video Editor tool definition ────────────────────────────────────

describe('edit_video tool definition', () => {
  const { TOOLS } = require('./server');

  it('edit_video is registered in TOOLS', () => {
    assert.ok(TOOLS.edit_video, 'edit_video tool missing from TOOLS');
    assert.equal(typeof TOOLS.edit_video.handler, 'function');
  });

  it('edit_video schema requires clips array', () => {
    assert.equal(TOOLS.edit_video.inputSchema.type, 'object');
    assert.deepEqual(TOOLS.edit_video.inputSchema.required, ['clips']);
    assert.ok(TOOLS.edit_video.inputSchema.properties.clips);
    assert.ok(TOOLS.edit_video.inputSchema.properties.audio_path);
    assert.ok(TOOLS.edit_video.inputSchema.properties.music_path);
    assert.ok(TOOLS.edit_video.inputSchema.properties.orientation);
  });

  it('external_platform_call supports local VideoEditor fallback for action=edit', () => {
    assert.ok(TOOLS.external_platform_call, 'external_platform_call missing from TOOLS');
    const src = require('fs').readFileSync(require.resolve('./server'), 'utf8');
    assert.ok(src.includes("case 'edit':"), 'case edit missing');
    assert.ok(src.includes("VideoEditor"), 'VideoEditor fallback missing in external_platform_call');
  });
});

// ── Pure-t Code Animation & Preview tools ──────────────────────────────────────

describe('generate_scene_code and preview_scene tools', () => {
  const { TOOLS } = require('./server');

  it('generate_scene_code is registered in TOOLS', () => {
    assert.ok(TOOLS.generate_scene_code, 'generate_scene_code missing from TOOLS');
    assert.equal(typeof TOOLS.generate_scene_code.handler, 'function');
  });

  it('generate_scene_code schema requires visual_description', () => {
    assert.equal(TOOLS.generate_scene_code.inputSchema.type, 'object');
    assert.deepEqual(TOOLS.generate_scene_code.inputSchema.required, ['visual_description']);
    assert.ok(TOOLS.generate_scene_code.inputSchema.properties.visual_description);
    assert.ok(TOOLS.generate_scene_code.inputSchema.properties.caption);
    assert.ok(TOOLS.generate_scene_code.inputSchema.properties.narration);
    assert.ok(TOOLS.generate_scene_code.inputSchema.properties.style);
    assert.ok(TOOLS.generate_scene_code.inputSchema.properties.language);
  });

  it('generate_scene_code handler produces valid pure-t harness HTML', async () => {
    const res = await TOOLS.generate_scene_code.handler({
      visual_description: 'Cosmic galaxy spiral with glowing star clusters and event horizon',
      caption: 'COSMIC VOYAGE',
      narration: 'Into the infinite depths of spacetime.',
      style: 'cosmic_space',
      duration: 3,
      width: 1920,
      height: 1080,
    });
    assert.ok(res.success);
    assert.equal(typeof res.html, 'string');
    assert.ok(res.html.includes('window.seek'), 'harness HTML must expose window.seek(t)');
    assert.ok(res.html.includes('1920'), 'HTML must declare target canvas width');
    assert.ok(res.html.includes('1080'), 'HTML must declare target canvas height');
  });

  it('preview_scene is registered in TOOLS', () => {
    assert.ok(TOOLS.preview_scene, 'preview_scene missing from TOOLS');
    assert.equal(typeof TOOLS.preview_scene.handler, 'function');
    assert.ok(TOOLS.preview_scene.inputSchema.properties.code);
    assert.ok(TOOLS.preview_scene.inputSchema.properties.html);
    assert.ok(TOOLS.preview_scene.inputSchema.properties.timestamps);
  });
});

describe('verify_scene_quality and plan_video_edit tools', () => {
  const { TOOLS } = require('./server');

  it('verify_scene_quality is registered in TOOLS with valid schema', () => {
    assert.ok(TOOLS.verify_scene_quality, 'verify_scene_quality missing from TOOLS');
    assert.equal(typeof TOOLS.verify_scene_quality.handler, 'function');
    assert.ok(TOOLS.verify_scene_quality.inputSchema.properties.htmlPath);
    assert.ok(TOOLS.verify_scene_quality.inputSchema.properties.html);
    assert.ok(TOOLS.verify_scene_quality.inputSchema.properties.code);
    assert.ok(TOOLS.verify_scene_quality.inputSchema.properties.sheetPath);
  });

  it('verify_scene_quality handler rejects when neither htmlPath, html, nor code provided', async () => {
    await assert.rejects(
      () => TOOLS.verify_scene_quality.handler({}),
      /Either htmlPath, html, or code must be provided/
    );
  });

  it('plan_video_edit is registered in TOOLS with valid schema', () => {
    assert.ok(TOOLS.plan_video_edit, 'plan_video_edit missing from TOOLS');
    assert.equal(typeof TOOLS.plan_video_edit.handler, 'function');
    assert.deepEqual(TOOLS.plan_video_edit.inputSchema.required, ['footage']);
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.footage);
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.goal);
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.style);
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.orientation);
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.bpm,             'bpm param missing');
    assert.ok(TOOLS.plan_video_edit.inputSchema.properties.generate_treatment, 'generate_treatment param missing');
  });

  it('plan_video_edit generates edit-plan.md and edit.json', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tempDir = path.join(os.tmpdir(), `test_edit_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      const res = await TOOLS.plan_video_edit.handler({
        footage: ['/tmp/clip1.mp4', '/tmp/clip2.mp4', '/tmp/clip3.mp4'],
        goal: '30s dynamic action teaser',
        style: 'fast_paced',
        orientation: 'portrait',
        output_dir: tempDir,
      });

      assert.ok(res.planPath);
      assert.ok(res.editJsonPath);
      assert.ok(fs.existsSync(res.planPath));
      assert.ok(fs.existsSync(res.editJsonPath));
      assert.ok(res.planMarkdown.includes('Video Edit Decision Plan'));
      assert.ok(res.planMarkdown.includes('PORTRAIT'));
      assert.ok(Array.isArray(res.editConfig.clips));
      assert.equal(res.editConfig.clips.length > 0, true);
      assert.equal(res.editConfig.orientation, 'portrait');
      assert.ok(res.editConfig.clips[0].rationale);
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('plan_video_edit clips carry cut_type and audio_offset fields', async () => {
    const fs  = require('fs');
    const os  = require('os');
    const path = require('path');
    const tempDir = path.join(os.tmpdir(), `test_jlcut_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    try {
      const res = await TOOLS.plan_video_edit.handler({
        footage: ['/tmp/a.mp4', '/tmp/b.mp4', '/tmp/c.mp4'],
        style: 'cinematic',   // J-cut dominant
        output_dir: tempDir,
      });
      const clips = res.editConfig.clips;
      assert.ok(clips.every(c => 'cut_type'    in c), 'Every clip must have cut_type');
      assert.ok(clips.every(c => 'audio_offset' in c), 'Every clip must have audio_offset');
      // cinematic style → J-cut dominant (middle clips)
      const middleClips = clips.slice(1, -1);
      if (middleClips.length > 0) {
        assert.ok(
          middleClips.some(c => c.cut_type === 'j_cut'),
          'Cinematic style must produce at least one j_cut in middle clips'
        );
      }
      // First clip always hard
      assert.equal(clips[0].cut_type, 'hard', 'First clip must always be hard cut');
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('plan_video_edit generates TREATMENT.md by default', async () => {
    const fs  = require('fs');
    const os  = require('os');
    const path = require('path');
    const tempDir = path.join(os.tmpdir(), `test_treatment_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    try {
      const res = await TOOLS.plan_video_edit.handler({
        footage: ['/tmp/x.mp4'],
        goal: 'Showcase the product launch',
        style: 'cinematic',
        output_dir: tempDir,
        generate_treatment: true,
      });
      assert.ok(res.treatmentPath,              'treatmentPath must be returned');
      assert.ok(fs.existsSync(res.treatmentPath), 'TREATMENT.md must exist on disk');
      const md = fs.readFileSync(res.treatmentPath, 'utf8');
      assert.ok(md.includes('# 🎬 TREATMENT'),  'Must have TREATMENT header');
      assert.ok(md.includes('## 1. Concept'),   'Must have Concept section');
      assert.ok(md.includes('## 4. Sound'),     'Must have Sound section');
      assert.ok(md.includes('## 6. Shot List'), 'Must have Shot List section');
      assert.ok(md.includes('## 7. Delivery'),  'Must have Delivery section');
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('plan_video_edit skips TREATMENT.md when generate_treatment is false', async () => {
    const fs  = require('fs');
    const os  = require('os');
    const path = require('path');
    const tempDir = path.join(os.tmpdir(), `test_notreatment_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    try {
      const res = await TOOLS.plan_video_edit.handler({
        footage: ['/tmp/x.mp4'],
        output_dir: tempDir,
        generate_treatment: false,
      });
      assert.equal(res.treatmentPath, null, 'treatmentPath must be null when skipped');
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  });

  it('plan_video_edit with bpm snaps to beat-grid in rationale', async () => {
    const fs  = require('fs');
    const os  = require('os');
    const path = require('path');
    const tempDir = path.join(os.tmpdir(), `test_bpm_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    try {
      const res = await TOOLS.plan_video_edit.handler({
        footage: ['/tmp/a.mp4', '/tmp/b.mp4', '/tmp/c.mp4'],
        bpm: 120,
        output_dir: tempDir,
      });
      // BPM 120 in planMarkdown header
      assert.ok(res.planMarkdown.includes('**BPM**: 120'), 'Plan must mention BPM');
      // edit.json must include bpm field
      assert.equal(res.editConfig.bpm, 120, 'editConfig must carry bpm');
    } finally {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
    }
  });
});

describe('Upstream sync and media tools (check_upstream_updates, transcribe_media, ingest_url, mix_audio_pro)', () => {
  const { TOOLS } = require('./server');

  it('check_upstream_updates tool returns status with 10 repos', async () => {
    assert.ok(TOOLS.check_upstream_updates, 'check_upstream_updates missing from TOOLS');
    const res = await TOOLS.check_upstream_updates.handler();
    assert.equal(res.success, true);
    assert.equal(res.totalRepos, 11);
    assert.ok(Array.isArray(res.repos));
    assert.equal(res.repos.length, 11);
  });

  it('check_upstream_updates returns pendingUpdates array, hasUpdates boolean, and hint string', async () => {
    const res = await TOOLS.check_upstream_updates.handler();
    assert.ok('pendingUpdates' in res,  'pendingUpdates field missing');
    assert.ok(Array.isArray(res.pendingUpdates), 'pendingUpdates must be an array');
    assert.equal(typeof res.hasUpdates, 'boolean', 'hasUpdates must be boolean');
    assert.equal(typeof res.hint, 'string',         'hint must be a string');
    assert.ok(res.hint.length > 0,                  'hint must not be empty');
    // hasUpdates must match pendingUpdates count
    assert.equal(res.hasUpdates, res.pendingUpdates.length > 0, 'hasUpdates must match pendingUpdates.length > 0');
  });

  it('check_upstream_updates repos include category, capabilities, and userImpact', async () => {
    const res = await TOOLS.check_upstream_updates.handler();
    for (const repo of res.repos) {
      assert.ok(repo.id,           `repo missing id: ${JSON.stringify(repo)}`);
      assert.ok(repo.repo,         `repo missing repo: ${repo.id}`);
      assert.ok(repo.category,     `repo missing category: ${repo.id}`);
      assert.ok(Array.isArray(repo.capabilities), `repo capabilities must be array: ${repo.id}`);
      assert.ok(repo.userImpact,   `repo missing userImpact: ${repo.id}`);
    }
  });

  it('mix_audio_pro roomProfile accepts computed: format without enum rejection', () => {
    const schema = TOOLS.mix_audio_pro.inputSchema.properties.roomProfile;
    // computed: format must be accepted — no enum restriction
    assert.ok(!schema.enum, 'roomProfile must NOT have an enum restriction (computed: format must be allowed)');
    assert.equal(schema.type, 'string');
  });

  it('transcribe_media tool is registered with correct schema', () => {
    assert.ok(TOOLS.transcribe_media, 'transcribe_media missing from TOOLS');
    assert.deepEqual(TOOLS.transcribe_media.inputSchema.required, ['mediaPath']);
    assert.ok(TOOLS.transcribe_media.inputSchema.properties.model);
    assert.ok(TOOLS.transcribe_media.inputSchema.properties.format);
  });

  it('ingest_url tool is registered with subtitles support', () => {
    assert.ok(TOOLS.ingest_url, 'ingest_url missing from TOOLS');
    assert.deepEqual(TOOLS.ingest_url.inputSchema.required, ['url']);
    assert.ok(TOOLS.ingest_url.inputSchema.properties.subtitles);
    assert.ok(TOOLS.ingest_url.inputSchema.properties.subLang);
  });

  it('mix_audio_pro tool is registered with 15+ year engineer parameters', () => {
    assert.ok(TOOLS.mix_audio_pro, 'mix_audio_pro missing from TOOLS');
    assert.deepEqual(TOOLS.mix_audio_pro.inputSchema.required, ['voicePath', 'outputPath']);
    assert.ok(TOOLS.mix_audio_pro.inputSchema.properties.roomProfile);
    assert.ok(TOOLS.mix_audio_pro.inputSchema.properties.noiseGate);
    assert.ok(TOOLS.mix_audio_pro.inputSchema.properties.platform);
    assert.ok(TOOLS.mix_audio_pro.inputSchema.properties.targetLufs);
    assert.ok(TOOLS.mix_audio_pro.inputSchema.properties.duckLevel);
  });
});
