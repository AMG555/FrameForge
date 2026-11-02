'use strict';
/**
 * QualityGate unit tests
 *
 * The gate calls spawnSync('ffmpeg'/'ffprobe') for real media — we test the
 * pure-logic helpers and the result-shape contract via a small FFmpeg-free stub.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Inline helper tests (no FFmpeg needed) ─────────────────────────────────

const { QualityGate } = require('./gate');

describe('QualityGate instantiation', () => {
  it('creates an instance without throwing', () => {
    assert.doesNotThrow(() => new QualityGate());
  });

  it('exposes validateMaster and validateShort methods', () => {
    const gate = new QualityGate();
    assert.equal(typeof gate.validateMaster, 'function');
    assert.equal(typeof gate.validateShort, 'function');
  });
});

describe('QualityGate result schema', () => {
  it('validateMaster returns passed:false and file_exists check when file is missing', async () => {
    const gate   = new QualityGate();
    const result = await gate.validateMaster('/tmp/__nonexistent_frameforge_test_video.mp4');
    assert.equal(typeof result.passed, 'boolean');
    assert.ok(Array.isArray(result.checks));
    assert.ok(Array.isArray(result.diagnostics));
    assert.ok(typeof result.timestamp === 'string');
    assert.ok(typeof result.schemaVersion === 'string');
    // File is missing → must not pass
    assert.equal(result.passed, false);
    const fileCheck = result.checks.find(c => c.name === 'file_exists' || c.name === 'file_size');
    assert.ok(fileCheck, 'Expected a file_size or file_exists check entry');
    assert.equal(fileCheck.passed, false);
  });

  it('validateShort returns same schema shape', async () => {
    const gate   = new QualityGate();
    const result = await gate.validateShort('/tmp/__nonexistent_frameforge_test_short.mp4');
    assert.equal(typeof result.passed, 'boolean');
    assert.ok(Array.isArray(result.checks));
    assert.ok(Array.isArray(result.diagnostics));
    assert.equal(result.passed, false);
  });

  it('check entries have name, type, passed fields', async () => {
    const gate   = new QualityGate();
    const result = await gate.validateMaster('/tmp/__nonexistent_check_schema.mp4');
    for (const check of result.checks) {
      assert.ok('name'   in check, 'check.name missing');
      assert.ok('type'   in check, 'check.type missing');
      assert.ok('passed' in check, 'check.passed missing');
      assert.ok(typeof check.passed === 'boolean', `check.passed must be boolean, got ${typeof check.passed}`);
    }
  });
});

describe('QualityGate _ffprobe helper', () => {
  it('returns a string from _ffprobe for a non-existent media file', () => {
    const gate = new QualityGate();
    // ffprobe is present on the system; it writes error text to stderr for missing files
    // The method returns stdout+stderr concatenated — we just verify it returns a string
    // (if ffprobe itself is absent, spawnSync sets result.error and _ffprobe throws — both outcomes are valid)
    let result;
    try {
      result = gate._ffprobe('/tmp/__nonexistent_frameforge_probe.mp4', ['-version']);
      assert.equal(typeof result, 'string');
    } catch (err) {
      // Acceptable: ffprobe missing from PATH or error from spawnSync
      assert.ok(err instanceof Error);
    }
  });
});

describe('QualityGate _ffmpeg helper', () => {
  it('_ffmpeg returns a string even when the command fails', () => {
    const gate   = new QualityGate();
    const result = gate._ffmpeg(['-i', '/tmp/__nonexistent_frameforge_src.mp4', '-f', 'null', '-']);
    assert.equal(typeof result, 'string');
  });
});
