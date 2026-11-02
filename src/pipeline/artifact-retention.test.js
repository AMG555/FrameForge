'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { applyRetentionRules, sweepExpiredIntermediates, classifyRetention } = require('./artifact-retention');

// ── classifyRetention ─────────────────────────────────────────────────────────

describe('classifyRetention', () => {
  it('classifies final_video_*.mp4 as permanent', () => {
    assert.equal(classifyRetention('/files/final_video_abc123.mp4'), 'permanent');
  });

  it('classifies short_*.mp4 as permanent', () => {
    assert.equal(classifyRetention('/files/short_clip_001.mp4'), 'permanent');
  });

  it('classifies thumbnail as permanent', () => {
    assert.equal(classifyRetention('/files/thumbnail_prod001.jpg'), 'permanent');
    assert.equal(classifyRetention('/files/thumbnail_prod001.png'), 'permanent');
    assert.equal(classifyRetention('/files/thumbnail_prod001.webp'), 'permanent');
  });

  it('classifies manifest.json as permanent', () => {
    assert.equal(classifyRetention('/artifacts/prod001/manifest.json'), 'permanent');
  });

  it('classifies paths under assets/ as permanent', () => {
    assert.equal(classifyRetention('/files/assets/narrator/body.png'), 'permanent');
  });

  it('classifies scene_N_out.mp4 as 30_day', () => {
    assert.equal(classifyRetention('/video_tmp/scene_0_out.mp4'), '30_day');
    assert.equal(classifyRetention('/video_tmp/scene_42_out.mp4'), '30_day');
  });

  it('classifies scene voice audio as 30_day', () => {
    assert.equal(classifyRetention('/video_tmp/scene_3_voice.m4a'), '30_day');
    assert.equal(classifyRetention('/video_tmp/scene_3_voice.mp3'), '30_day');
    assert.equal(classifyRetention('/video_tmp/scene_3_voice.aac'), '30_day');
  });

  it('classifies scene image as 30_day', () => {
    assert.equal(classifyRetention('/video_tmp/scene_5_image.png'), '30_day');
    assert.equal(classifyRetention('/video_tmp/scene_5_image.jpg'), '30_day');
    assert.equal(classifyRetention('/video_tmp/scene_5_image.webp'), '30_day');
  });

  it('classifies concat_main.txt as 30_day', () => {
    assert.equal(classifyRetention('/video_tmp/concat_main.txt'), '30_day');
  });

  it('classifies raw_concat_*.mp4 as 30_day', () => {
    assert.equal(classifyRetention('/video_tmp/raw_concat_abc.mp4'), '30_day');
  });

  it('classifies _raw.mp3 as temp', () => {
    assert.equal(classifyRetention('/video_tmp/scene_0_voice_raw.mp3'), 'temp');
  });

  it('classifies .tmp files as temp', () => {
    assert.equal(classifyRetention('/video_tmp/upload.tmp'), 'temp');
  });

  it('classifies .part files as temp', () => {
    assert.equal(classifyRetention('/video_tmp/download.part'), 'temp');
  });

  it('returns unknown for unrecognised paths', () => {
    assert.equal(classifyRetention('/some/random/file.txt'), 'unknown');
    assert.equal(classifyRetention('/logs/app.log'), 'unknown');
  });
});

// ── applyRetentionRules ───────────────────────────────────────────────────────

describe('applyRetentionRules', () => {
  let filesDir;

  before(() => {
    filesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-retention-test-'));
  });

  after(() => {
    fs.rmSync(filesDir, { recursive: true, force: true });
  });

  it('deletes temp files immediately', () => {
    // Create a temp file in filesDir
    const tmpFile = path.join(filesDir, 'upload.tmp');
    fs.writeFileSync(tmpFile, 'temp', 'utf8');

    const { deleted } = applyRetentionRules({ productionId: 'prod_001', filesDir });
    assert.ok(deleted.some(f => f.endsWith('.tmp')));
    assert.equal(fs.existsSync(tmpFile), false);
  });

  it('tags intermediate scene files in video_tmp', () => {
    const vdir = path.join(filesDir, 'video_tmp');
    fs.mkdirSync(vdir, { recursive: true });
    const sceneFile = path.join(vdir, 'scene_0_out.mp4');
    fs.writeFileSync(sceneFile, 'fake-mp4', 'utf8');

    const { tagged } = applyRetentionRules({ productionId: 'prod_002', filesDir });
    assert.ok(tagged.some(f => f.endsWith('scene_0_out.mp4')));
    // Retention tag file should exist
    assert.ok(fs.existsSync(sceneFile + '.retention'));
    const tag = JSON.parse(fs.readFileSync(sceneFile + '.retention', 'utf8'));
    assert.equal(tag.policy, '30_day');
    assert.ok(tag.expires_at);
    assert.equal(tag.production_id, 'prod_002');
  });

  it('dryRun=true does not delete files', () => {
    const tmpFile = path.join(filesDir, 'nodry.tmp');
    fs.writeFileSync(tmpFile, 'should stay', 'utf8');

    const { deleted } = applyRetentionRules({ productionId: 'prod_dry', filesDir, dryRun: true });
    assert.ok(deleted.length >= 0); // may list it
    assert.ok(fs.existsSync(tmpFile)); // file should remain
  });
});

// ── sweepExpiredIntermediates ─────────────────────────────────────────────────

describe('sweepExpiredIntermediates', () => {
  let filesDir;

  before(() => {
    filesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-sweep-test-'));
  });

  after(() => {
    fs.rmSync(filesDir, { recursive: true, force: true });
  });

  it('sweeps files whose retention tag has expired', () => {
    const vdir = path.join(filesDir, 'video_tmp');
    fs.mkdirSync(vdir, { recursive: true });

    const sceneFile = path.join(vdir, 'scene_99_out.mp4');
    fs.writeFileSync(sceneFile, 'fake-mp4', 'utf8');

    // Create an already-expired retention tag
    const expiredTag = {
      production_id: 'prod_expired',
      created_at:    new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at:    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // expired 10d ago
      policy:        '30_day',
    };
    fs.writeFileSync(sceneFile + '.retention', JSON.stringify(expiredTag), 'utf8');

    const { swept } = sweepExpiredIntermediates({ filesDir });
    assert.ok(swept.includes(sceneFile), 'expired file should be swept');
    assert.equal(fs.existsSync(sceneFile), false);
    assert.equal(fs.existsSync(sceneFile + '.retention'), false);
  });

  it('skips files whose retention tag has not expired', () => {
    const vdir = path.join(filesDir, 'video_tmp2');
    fs.mkdirSync(vdir, { recursive: true });

    const sceneFile = path.join(vdir, 'scene_1_out.mp4');
    fs.writeFileSync(sceneFile, 'fake-mp4', 'utf8');

    const futureTag = {
      production_id: 'prod_future',
      created_at:    new Date().toISOString(),
      expires_at:    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30d from now
      policy:        '30_day',
    };
    fs.writeFileSync(sceneFile + '.retention', JSON.stringify(futureTag), 'utf8');

    const { swept, skipped } = sweepExpiredIntermediates({ filesDir });
    assert.equal(swept.includes(sceneFile), false, 'future-expiry file should not be swept');
    assert.ok(skipped >= 1);
    assert.ok(fs.existsSync(sceneFile));
  });

  it('removes corrupt retention tags during sweep', () => {
    const vdir = path.join(filesDir, 'video_tmp3');
    fs.mkdirSync(vdir, { recursive: true });

    const sceneFile = path.join(vdir, 'scene_2_out.mp4');
    fs.writeFileSync(sceneFile, 'fake-mp4', 'utf8');
    fs.writeFileSync(sceneFile + '.retention', '{corrupt json{{{', 'utf8');

    const { swept } = sweepExpiredIntermediates({ filesDir });
    assert.ok(swept.includes(sceneFile), 'corrupt-tag file should be swept');
  });

  it('dryRun=true does not delete files', () => {
    const vdir = path.join(filesDir, 'video_tmp4');
    fs.mkdirSync(vdir, { recursive: true });

    const sceneFile = path.join(vdir, 'scene_3_out.mp4');
    fs.writeFileSync(sceneFile, 'fake-mp4', 'utf8');
    const expiredTag = {
      production_id: 'prod_drysweep',
      created_at:    new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at:    new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      policy:        '30_day',
    };
    fs.writeFileSync(sceneFile + '.retention', JSON.stringify(expiredTag), 'utf8');

    const { swept } = sweepExpiredIntermediates({ filesDir, dryRun: true });
    assert.ok(swept.includes(sceneFile));
    assert.ok(fs.existsSync(sceneFile), 'dryRun should not delete file');
  });
});
