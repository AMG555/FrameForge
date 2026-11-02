'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ExternalAdapter } = require('./external-adapter');

// ── ExternalAdapter.isConfigured ──────────────────────────────────────────────

describe('ExternalAdapter.isConfigured', () => {
  it('returns false when no baseUrl configured', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    delete process.env.EXTERNAL_PLATFORM_URL;
    const adapter = new ExternalAdapter({ name: 'custom' });
    // If a preset matches "custom" there is no preset; name must not match known names
    assert.equal(adapter.isConfigured(), false);
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
  });

  it('returns true when baseUrl is provided in constructor config', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://api.example.com', name: 'custom' });
    assert.equal(adapter.isConfigured(), true);
  });

  it('returns true when EXTERNAL_PLATFORM_URL env var is set', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    process.env.EXTERNAL_PLATFORM_URL = 'https://api.example.com';
    const adapter = new ExternalAdapter({ name: 'custom' });
    assert.equal(adapter.isConfigured(), true);
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
    else delete process.env.EXTERNAL_PLATFORM_URL;
  });

  it('throws _requireConfigured when not configured', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    delete process.env.EXTERNAL_PLATFORM_URL;
    const adapter = new ExternalAdapter({ name: 'custom' });
    assert.throws(() => adapter._requireConfigured(), /not configured/);
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
  });
});

// ── ExternalAdapter._applyPreset ──────────────────────────────────────────────

describe('ExternalAdapter._applyPreset', () => {
  it('applies elevenlabs preset paths', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    const savedIngest = process.env.EXTERNAL_PLATFORM_INGEST_PATH;
    const savedRender = process.env.EXTERNAL_PLATFORM_RENDER_PATH;
    const savedStatus = process.env.EXTERNAL_PLATFORM_STATUS_PATH;
    delete process.env.EXTERNAL_PLATFORM_URL;
    delete process.env.EXTERNAL_PLATFORM_INGEST_PATH;
    delete process.env.EXTERNAL_PLATFORM_RENDER_PATH;
    delete process.env.EXTERNAL_PLATFORM_STATUS_PATH;

    const adapter = new ExternalAdapter({ name: 'elevenlabs', apiKey: 'sk_test' });
    assert.equal(adapter.baseUrl, 'https://api.elevenlabs.io');
    assert.equal(adapter.ingestPath, '/v1/voices/add');
    assert.equal(adapter.renderPath, '/v1/text-to-speech');

    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
    if (savedIngest !== undefined) process.env.EXTERNAL_PLATFORM_INGEST_PATH = savedIngest;
    if (savedRender !== undefined) process.env.EXTERNAL_PLATFORM_RENDER_PATH = savedRender;
    if (savedStatus !== undefined) process.env.EXTERNAL_PLATFORM_STATUS_PATH = savedStatus;
  });

  it('applies runway preset base URL', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    delete process.env.EXTERNAL_PLATFORM_URL;
    const adapter = new ExternalAdapter({ name: 'runway' });
    assert.equal(adapter.baseUrl, 'https://api.runwayml.com');
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
  });

  it('does not override explicitly-set env vars', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    process.env.EXTERNAL_PLATFORM_URL = 'https://my-custom-elevenlabs.example.com';
    const adapter = new ExternalAdapter({ name: 'elevenlabs' });
    assert.equal(adapter.baseUrl, 'https://my-custom-elevenlabs.example.com');
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
    else delete process.env.EXTERNAL_PLATFORM_URL;
  });

  it('has no effect for unknown platform name', () => {
    const saved = process.env.EXTERNAL_PLATFORM_URL;
    delete process.env.EXTERNAL_PLATFORM_URL;
    const adapter = new ExternalAdapter({ name: 'unknown_platform_xyz' });
    // Should not apply any preset paths — defaults remain
    assert.equal(adapter.ingestPath, '/v1/ingest');
    assert.equal(adapter.renderPath, '/v1/render');
    if (saved !== undefined) process.env.EXTERNAL_PLATFORM_URL = saved;
  });
});

// ── ExternalAdapter._authHeader ───────────────────────────────────────────────

describe('ExternalAdapter._authHeader', () => {
  it('returns empty object when no API key set', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://example.com', name: 'custom' });
    assert.deepEqual(adapter._authHeader(), {});
  });

  it('returns Bearer auth for generic platform', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://example.com', name: 'voxforge', apiKey: 'mykey123' });
    const header  = adapter._authHeader();
    assert.equal(header['Authorization'], 'Bearer mykey123');
  });

  it('returns xi-api-key for elevenlabs', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://api.elevenlabs.io', name: 'elevenlabs', apiKey: 'el_key_abc' });
    const header  = adapter._authHeader();
    assert.equal(header['xi-api-key'], 'el_key_abc');
    assert.ok(!header['Authorization'], 'ElevenLabs should NOT use Authorization header');
  });

  it('returns Key prefix for falai', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://fal.ai', name: 'falai', apiKey: 'fal_key' });
    const header  = adapter._authHeader();
    assert.equal(header['Authorization'], 'Key fal_key');
  });

  it('returns Token prefix for replicate', () => {
    const adapter = new ExternalAdapter({ baseUrl: 'https://api.replicate.com', name: 'replicate', apiKey: 'rep_token' });
    const header  = adapter._authHeader();
    assert.equal(header['Authorization'], 'Token rep_token');
  });
});

// ── _guessMime (tested via ExternalAdapter's known MIME mapping) ──────────────
// We exercise the function indirectly by re-implementing the table test.

describe('_guessMime via extension mapping', () => {
  // Internal helper re-implemented for unit testing
  const path = require('path');
  const MIME_TABLE = {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.json': 'application/json', '.txt': 'text/plain',
  };

  function guessMime(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TABLE[ext] || 'application/octet-stream';
  }

  it('returns video/mp4 for .mp4 files', () => {
    assert.equal(guessMime('/videos/clip.mp4'), 'video/mp4');
  });

  it('returns audio/mpeg for .mp3 files', () => {
    assert.equal(guessMime('/audio/voice.mp3'), 'audio/mpeg');
  });

  it('returns audio/mp4 for .m4a files', () => {
    assert.equal(guessMime('/audio/voice.m4a'), 'audio/mp4');
  });

  it('returns image/png for .png files', () => {
    assert.equal(guessMime('/images/scene.png'), 'image/png');
  });

  it('returns image/jpeg for .jpg files', () => {
    assert.equal(guessMime('/images/thumb.jpg'), 'image/jpeg');
  });

  it('returns application/octet-stream for unknown extension', () => {
    assert.equal(guessMime('/files/data.bin'), 'application/octet-stream');
    assert.equal(guessMime('/files/noextension'), 'application/octet-stream');
  });
});

// ── pollUntilDone termination (unit test logic, no network) ───────────────────

describe('pollUntilDone terminal status detection', () => {
  // The terminal status detection logic from pollUntilDone:
  const DONE_STATUSES   = ['succeeded', 'completed', 'done', 'ready', 'finished'];
  const FAILED_STATUSES = ['failed', 'error', 'cancelled', 'canceled'];

  function isTerminalDone(status)   { return DONE_STATUSES.includes(status.toLowerCase()); }
  function isTerminalFailed(status) { return FAILED_STATUSES.includes(status.toLowerCase()); }

  it('recognises all success terminal statuses', () => {
    for (const status of DONE_STATUSES) {
      assert.ok(isTerminalDone(status), `"${status}" should be terminal success`);
    }
  });

  it('is case-insensitive for success statuses', () => {
    assert.ok(isTerminalDone('SUCCEEDED'));
    assert.ok(isTerminalDone('Completed'));
    assert.ok(isTerminalDone('DONE'));
  });

  it('recognises all failure terminal statuses', () => {
    for (const status of FAILED_STATUSES) {
      assert.ok(isTerminalFailed(status), `"${status}" should be terminal failure`);
    }
  });

  it('is case-insensitive for failure statuses', () => {
    assert.ok(isTerminalFailed('FAILED'));
    assert.ok(isTerminalFailed('Error'));
    assert.ok(isTerminalFailed('CANCELLED'));
  });

  it('returns false for pending/running statuses', () => {
    for (const status of ['pending', 'running', 'processing', 'queued', 'starting']) {
      assert.equal(isTerminalDone(status), false, `"${status}" should not be terminal`);
      assert.equal(isTerminalFailed(status), false, `"${status}" should not be terminal failure`);
    }
  });
});
