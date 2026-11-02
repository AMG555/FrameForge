'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { ArtifactManifest } = require('./artifact-manifest');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ff-manifest-test-'));
}

const SAMPLE_SCENES = [
  { scene_id: 1, narration: 'Hello world', visual_description: 'A bright sunrise' },
  { scene_id: 2, narration: 'Second scene', visual_description: 'A city skyline' },
];

// ── create() ──────────────────────────────────────────────────────────────────

describe('ArtifactManifest.create', () => {
  let tmpDir;

  before(() => { tmpDir = makeTmpDir(); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('requires productionId', () => {
    assert.throws(() => new ArtifactManifest({ artifactsDir: tmpDir }),
      /productionId is required/);
  });

  it('creates a manifest file on disk', () => {
    const m = new ArtifactManifest({ productionId: 'prod_create_001', artifactsDir: tmpDir });
    m.create({ narrationText: 'hello', scenes: SAMPLE_SCENES });
    const p = path.join(tmpDir, 'prod_create_001', 'manifest.json');
    assert.ok(fs.existsSync(p), 'manifest.json should exist');
  });

  it('manifest has correct schema_version', () => {
    const m = new ArtifactManifest({ productionId: 'prod_schema_001', artifactsDir: tmpDir });
    const data = m.create({ narrationText: 'text', scenes: SAMPLE_SCENES });
    assert.equal(data.schema_version, '1.0.0');
  });

  it('manifest has narration_hash set', () => {
    const m = new ArtifactManifest({ productionId: 'prod_hash_001', artifactsDir: tmpDir });
    const data = m.create({ narrationText: 'narration text here' });
    assert.ok(data.narration_hash, 'narration_hash should be set');
    assert.equal(data.narration_hash.length, 64); // sha256 hex
  });

  it('scene entries are initialised with pending status', () => {
    const m = new ArtifactManifest({ productionId: 'prod_scenes_001', artifactsDir: tmpDir });
    const data = m.create({ scenes: SAMPLE_SCENES });
    assert.equal(data.scenes.length, 2);
    for (const s of data.scenes) {
      assert.equal(s.status, 'pending');
      assert.equal(s.image_path, null);
      assert.equal(s.voice_path, null);
      assert.equal(s.rendered_path, null);
    }
  });

  it('master is initialised with quality_passed=false', () => {
    const m = new ArtifactManifest({ productionId: 'prod_master_001', artifactsDir: tmpDir });
    const data = m.create({});
    assert.equal(data.master.quality_passed, false);
    assert.equal(data.master.path, null);
  });
});

// ── load() and loadOrCreate() ─────────────────────────────────────────────────

describe('ArtifactManifest.load / loadOrCreate', () => {
  let tmpDir;

  before(() => { tmpDir = makeTmpDir(); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('load() returns null when no manifest exists', () => {
    const m = new ArtifactManifest({ productionId: 'prod_no_manifest', artifactsDir: tmpDir });
    assert.equal(m.load(), null);
  });

  it('load() returns manifest data after create()', () => {
    const m = new ArtifactManifest({ productionId: 'prod_loadable_001', artifactsDir: tmpDir });
    m.create({ narrationText: 'load test', scenes: SAMPLE_SCENES });
    const loaded = m.load();
    assert.equal(loaded.production_id, 'prod_loadable_001');
    assert.equal(loaded.scenes.length, 2);
  });

  it('loadOrCreate() resumes when narration_hash matches', () => {
    const m1 = new ArtifactManifest({ productionId: 'prod_resume_001', artifactsDir: tmpDir });
    m1.create({ narrationText: 'same narration', scenes: SAMPLE_SCENES });

    const m2 = new ArtifactManifest({ productionId: 'prod_resume_001', artifactsDir: tmpDir });
    const { resumed } = m2.loadOrCreate({ narrationText: 'same narration', scenes: SAMPLE_SCENES });
    assert.equal(resumed, true);
  });

  it('loadOrCreate() creates fresh when narration_hash differs', () => {
    const m1 = new ArtifactManifest({ productionId: 'prod_overwrite_001', artifactsDir: tmpDir });
    m1.create({ narrationText: 'original narration' });

    const m2 = new ArtifactManifest({ productionId: 'prod_overwrite_001', artifactsDir: tmpDir });
    const { resumed } = m2.loadOrCreate({ narrationText: 'completely different narration' });
    assert.equal(resumed, false);
  });

  it('throws on corrupt manifest JSON', () => {
    const pid = 'prod_corrupt_001';
    const dir = path.join(tmpDir, pid);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), '{invalid json{{', 'utf8');

    const m = new ArtifactManifest({ productionId: pid, artifactsDir: tmpDir });
    assert.throws(() => m.load(), /Corrupt manifest/);
  });
});

// ── Scene and master artifact updates ─────────────────────────────────────────

describe('ArtifactManifest scene artifact updates', () => {
  let tmpDir;

  before(() => { tmpDir = makeTmpDir(); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('setSceneImage sets image_path on scene', () => {
    const m = new ArtifactManifest({ productionId: 'prod_img_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    m.setSceneImage(0, '/fake/path/scene_0.png');
    assert.equal(m.scenes[0].image_path, '/fake/path/scene_0.png');
  });

  it('setSceneVoice sets voice_path on scene', () => {
    const m = new ArtifactManifest({ productionId: 'prod_voice_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    m.setSceneVoice(1, '/fake/path/voice_1.m4a');
    assert.equal(m.scenes[1].voice_path, '/fake/path/voice_1.m4a');
  });

  it('setSceneRendered sets status=complete', () => {
    const m = new ArtifactManifest({ productionId: 'prod_render_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    m.setSceneRendered(0, '/fake/path/scene_0_out.mp4');
    assert.equal(m.scenes[0].status, 'complete');
    assert.equal(m.scenes[0].rendered_path, '/fake/path/scene_0_out.mp4');
  });

  it('setSceneFailed sets status=failed', () => {
    const m = new ArtifactManifest({ productionId: 'prod_fail_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    m.setSceneFailed(0, 'FFmpeg error');
    assert.equal(m.scenes[0].status, 'failed');
    assert.equal(m.scenes[0].fail_reason, 'FFmpeg error');
  });

  it('_getScene throws for out-of-range index', () => {
    const m = new ArtifactManifest({ productionId: 'prod_oob_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    assert.throws(() => m.setSceneImage(99, '/path'), /Scene index 99 not in manifest/);
  });

  it('_getScene throws when manifest not loaded', () => {
    const m = new ArtifactManifest({ productionId: 'prod_notloaded_001', artifactsDir: tmpDir });
    assert.throws(() => m.setSceneImage(0, '/path'), /Manifest not loaded/);
  });
});

// ── isSceneComplete / isMasterComplete ────────────────────────────────────────

describe('ArtifactManifest completion checks', () => {
  let tmpDir;

  before(() => { tmpDir = makeTmpDir(); });
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('isSceneComplete returns false for pending scene', () => {
    const m = new ArtifactManifest({ productionId: 'prod_check_001', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    assert.equal(m.isSceneComplete(0), false);
  });

  it('isSceneComplete returns false when rendered_path does not exist on disk', () => {
    const m = new ArtifactManifest({ productionId: 'prod_check_002', artifactsDir: tmpDir });
    m.create({ scenes: SAMPLE_SCENES });
    m.setSceneRendered(0, '/nonexistent/path/scene_0_out.mp4');
    assert.equal(m.isSceneComplete(0), false);
  });

  it('isMasterComplete returns false when master path is null', () => {
    const m = new ArtifactManifest({ productionId: 'prod_master_check_001', artifactsDir: tmpDir });
    m.create({});
    assert.equal(m.isMasterComplete(), false);
  });

  it('recordStageDuration stores duration in telemetry', () => {
    const m = new ArtifactManifest({ productionId: 'prod_duration_001', artifactsDir: tmpDir });
    m.create({});
    m.recordStageDuration('Script', 15000);
    assert.equal(m.data.telemetry.stage_durations_ms['Script'], 15000);
  });

  it('addCost accumulates total_cost_usd', () => {
    const m = new ArtifactManifest({ productionId: 'prod_cost_001', artifactsDir: tmpDir });
    m.create({});
    m.addCost(0.01);
    m.addCost(0.005);
    assert.ok(Math.abs(m.data.telemetry.total_cost_usd - 0.015) < 0.000001);
  });
});
