'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs').promises;
const path = require('path');
const os   = require('os');
const { Telemetry, estimateCost } = require('./telemetry');

// ── estimateCost ──────────────────────────────────────────────────────────────

describe('estimateCost', () => {
  it('calculates groq token cost', () => {
    const cost = estimateCost('groq', 'script_generation', 1_000_000);
    assert.ok(cost > 0, 'groq token cost should be > 0');
    // $0.59/1M tokens = 0.59
    assert.ok(Math.abs(cost - 0.59) < 0.001);
  });

  it('calculates elevenlabs character cost', () => {
    const cost = estimateCost('elevenlabs', 'tts_synthesis', 1_000_000);
    // $30/1M chars = 30
    assert.ok(Math.abs(cost - 30) < 0.01);
  });

  it('calculates falai image cost', () => {
    const cost = estimateCost('falai', 'scene_image_generation', 10);
    assert.ok(Math.abs(cost - 0.03) < 0.001);
  });

  it('returns 0 for local (ollama) tokens', () => {
    assert.equal(estimateCost('ollama', 'script_generation', 100000), 0);
  });

  it('returns 0 for free tier pollinations images', () => {
    assert.equal(estimateCost('pollinations', 'scene_image_generation', 1), 0);
  });

  it('returns 0 for ffmpeg render operations', () => {
    assert.equal(estimateCost('ffmpeg', 'master_render', 300), 0);
  });

  it('returns 0 for unknown provider', () => {
    assert.equal(estimateCost('unknown_provider', 'script_generation', 1000), 0);
  });

  it('routes voice/tts operation to characters cost', () => {
    const cost = estimateCost('openai_tts', 'tts_synthesis', 1000);
    // $0.000015/char * 1000 = 0.015
    assert.ok(Math.abs(cost - 0.015) < 0.0001);
  });

  it('routes video/render operation to seconds cost', () => {
    const cost = estimateCost('ffmpeg', 'video_render', 100);
    assert.equal(cost, 0); // ffmpeg is free
  });
});

// ── Telemetry (file mode) ─────────────────────────────────────────────────────

describe('Telemetry (file mode)', () => {
  let tmpDir;
  let logPath;
  let telemetry;

  before(async () => {
    tmpDir  = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-telemetry-test-'));
    logPath = path.join(tmpDir, 'usage.ndjson');
    telemetry = new Telemetry({ mode: 'file', logPath });
    await telemetry.init();
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('track() returns an event object with required fields', async () => {
    const event = await telemetry.track({
      productionId: 'prod_test_001',
      stage: 'Script',
      provider: 'groq',
      operation: 'script_generation',
      units: 14500,
    });
    assert.ok(event.id);
    assert.equal(event.productionId, 'prod_test_001');
    assert.equal(event.stage, 'Script');
    assert.equal(event.provider, 'groq');
    assert.equal(event.units, 14500);
    assert.equal(event.schemaVersion, '1.0.0');
    assert.ok(typeof event.estimatedCostUsd === 'number');
    assert.ok(event.timestamp);
  });

  it('track() appends valid NDJSON to the log file', async () => {
    await telemetry.track({ productionId: 'prod_ndjson_001', stage: 'Research', provider: 'groq', operation: 'research', units: 5000 });
    const raw = await fs.readFile(logPath, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      const obj = JSON.parse(line); // should not throw
      assert.ok(obj.id);
      assert.ok(obj.productionId);
    }
  });

  it('costReport() aggregates by provider and stage', async () => {
    const pid = 'prod_report_001';
    await telemetry.track({ productionId: pid, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 10000 });
    await telemetry.track({ productionId: pid, stage: 'TTS', provider: 'edge-tts', operation: 'tts_synthesis', units: 5000 });
    await telemetry.track({ productionId: pid, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 8000 });

    const report = await telemetry.costReport(pid);
    assert.equal(report.productionId, pid);
    assert.ok(typeof report.totalCostUsd === 'number');
    assert.ok(typeof report.byProvider === 'object');
    assert.ok(typeof report.byStage === 'object');
    assert.equal(report.events, 3);
    assert.ok('groq' in report.byProvider);
    assert.ok('Script' in report.byStage);
  });

  it('costReport() returns 0-event report for unknown productionId', async () => {
    const report = await telemetry.costReport('prod_nonexistent_xyz');
    assert.equal(report.events, 0);
    assert.equal(report.totalCostUsd, 0);
  });

  it('costReport() filters to specific productionId only', async () => {
    const pid1 = 'prod_filter_aaa';
    const pid2 = 'prod_filter_bbb';
    await telemetry.track({ productionId: pid1, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 1000 });
    await telemetry.track({ productionId: pid2, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 2000 });

    const r1 = await telemetry.costReport(pid1);
    const r2 = await telemetry.costReport(pid2);
    assert.equal(r1.events, 1);
    assert.equal(r2.events, 1);
  });

  it('totalCostUsd is rounded to 6 decimal places', async () => {
    const pid = 'prod_round_001';
    // Groq: 0.00000059/token * 1 = 0.00000059 — has many decimal places
    await telemetry.track({ productionId: pid, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 1 });
    const report = await telemetry.costReport(pid);
    const decimals = (report.totalCostUsd.toString().split('.')[1] || '').length;
    assert.ok(decimals <= 6, `totalCostUsd has too many decimal places: ${report.totalCostUsd}`);
  });
});
