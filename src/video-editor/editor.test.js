'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { spawnSync } = require('child_process');

const {
  VideoEditor,
  parseTimestamp,
  buildColorFilter,
  buildSpeedFilters,
  buildCaptionFilter,
  COLOR_GRADES,
  VALID_TRANSITIONS,
} = require('./editor');

describe('parseTimestamp', () => {
  it('parses numeric values directly', () => {
    assert.equal(parseTimestamp(0), 0);
    assert.equal(parseTimestamp(12), 12);
    assert.equal(parseTimestamp(45.75), 45.75);
  });

  it('parses string seconds and seconds with "s" suffix', () => {
    assert.equal(parseTimestamp('15'), 15);
    assert.equal(parseTimestamp('15.5'), 15.5);
    assert.equal(parseTimestamp('15s'), 15);
    assert.equal(parseTimestamp('20.25S'), 20.25);
  });

  it('parses MM:SS format', () => {
    assert.equal(parseTimestamp('01:30'), 90);
    assert.equal(parseTimestamp('00:45.5'), 45.5);
    assert.equal(parseTimestamp('10:00'), 600);
  });

  it('parses HH:MM:SS format', () => {
    assert.equal(parseTimestamp('01:00:00'), 3600);
    assert.equal(parseTimestamp('01:02:03'), 3723);
    assert.equal(parseTimestamp('00:01:30.500'), 90.5);
  });

  it('gracefully handles empty, null, or invalid inputs', () => {
    assert.equal(parseTimestamp(null), 0);
    assert.equal(parseTimestamp(''), 0);
    assert.equal(parseTimestamp(undefined), 0);
    assert.equal(parseTimestamp('invalid'), 0);
    assert.equal(parseTimestamp(-5), 0);
  });
});

describe('buildColorFilter', () => {
  it('returns valid filter strings for supported presets', () => {
    assert.ok(buildColorFilter('cinematic').includes('curves='));
    assert.ok(buildColorFilter('warm').includes('curves='));
    assert.ok(buildColorFilter('cool').includes('curves='));
    assert.ok(buildColorFilter('vintage').includes('curves=vintage'));
    assert.ok(buildColorFilter('bw').includes('hue=s=0'));
    assert.ok(buildColorFilter('monochrome').includes('hue=s=0'));
    assert.ok(buildColorFilter('vibrant').includes('saturation=1.35'));
    assert.ok(buildColorFilter('cyberpunk').includes('curves='));
  });

  it('handles casing and hyphens', () => {
    assert.ok(buildColorFilter('Cinematic').includes('curves='));
    assert.ok(buildColorFilter('cyber-punk').includes('curves='));
    assert.ok(buildColorFilter('WARM').includes('curves='));
  });

  it('returns null for none or unknown presets', () => {
    assert.equal(buildColorFilter('none'), null);
    assert.equal(buildColorFilter(''), null);
    assert.equal(buildColorFilter(null), null);
    assert.equal(buildColorFilter('unknown_preset_123'), null);
  });
});

describe('buildSpeedFilters', () => {
  it('returns identity for speed 1.0', () => {
    const res = buildSpeedFilters(1.0);
    assert.equal(res.speed, 1.0);
    assert.equal(res.videoFilter, 'setpts=1.000000*PTS');
    assert.equal(res.audioFilter, '');
  });

  it('handles slow motion (0.5x)', () => {
    const res = buildSpeedFilters(0.5);
    assert.equal(res.speed, 0.5);
    assert.equal(res.videoFilter, 'setpts=2.000000*PTS');
    assert.equal(res.audioFilter, 'atempo=0.5000');
  });

  it('handles fast motion (2.0x)', () => {
    const res = buildSpeedFilters(2.0);
    assert.equal(res.speed, 2.0);
    assert.equal(res.videoFilter, 'setpts=0.500000*PTS');
    assert.equal(res.audioFilter, 'atempo=2.0000');
  });

  it('chains atempo for speed > 2.0', () => {
    const res = buildSpeedFilters(4.0);
    assert.equal(res.speed, 4.0);
    assert.equal(res.audioFilter, 'atempo=2.0,atempo=2.0000');
  });

  it('chains atempo for speed < 0.5', () => {
    const res = buildSpeedFilters(0.25);
    assert.equal(res.speed, 0.25);
    assert.equal(res.audioFilter, 'atempo=0.5,atempo=0.5000');
  });
});

describe('buildCaptionFilter', () => {
  it('returns empty string for empty caption', () => {
    assert.equal(buildCaptionFilter(''), '');
    assert.equal(buildCaptionFilter(null), '');
  });

  it('generates drawtext filter for English text', () => {
    const filter = buildCaptionFilter('Hello World');
    if (filter) {
      assert.ok(filter.startsWith('drawtext='));
      assert.ok(filter.includes('HELLO WORLD'));
    }
  });

  it('preserves Indic / Malayalam characters and applies shaping', () => {
    const filter = buildCaptionFilter('സ്വാഗതം');
    if (filter) {
      assert.ok(filter.includes('text_shaping=1'));
      assert.ok(filter.includes('സ്വാഗതം'));
    }
  });
});

describe('VideoEditor with real media operations', () => {
  const tmpDir = path.join(os.tmpdir(), `ff_editor_test_${Date.now()}`);
  let clip1Path, clip2Path, voicePath, musicPath;
  let editor;

  before(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    editor = new VideoEditor({ filesDir: tmpDir });

    clip1Path = path.join(tmpDir, 'test_clip1.mp4');
    clip2Path = path.join(tmpDir, 'test_clip2.mp4');
    voicePath = path.join(tmpDir, 'test_voice.m4a');
    musicPath = path.join(tmpDir, 'test_music.mp3');

    // Create 2-second test video clip 1 with audio tone
    spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=640x360:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      clip1Path,
    ], { encoding: 'utf8' });

    // Create 2-second test video clip 2 with audio tone
    spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=2:size=640x360:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k',
      clip2Path,
    ], { encoding: 'utf8' });

    // Create 3-second voice test audio
    spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=500:duration=3',
      '-c:a', 'aac', '-b:a', '128k',
      voicePath,
    ], { encoding: 'utf8' });

    // Create 4-second music test audio (size > 5000 bytes)
    spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4',
      '-c:a', 'libmp3lame', '-b:a', '192k',
      musicPath,
    ], { encoding: 'utf8' });
  });

  after(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('probeMedia inspects video stream accurately', () => {
    const probe = editor.probeMedia(clip1Path);
    assert.equal(probe.hasVideo, true);
    assert.equal(probe.hasAudio, true);
    assert.equal(probe.width, 640);
    assert.equal(probe.height, 360);
    assert.ok(probe.duration >= 1.9 && probe.duration <= 2.2);
    assert.equal(probe.fps, 24);
  });

  it('probeMedia throws error for non-existent file', () => {
    assert.throws(
      () => editor.probeMedia(path.join(tmpDir, 'does_not_exist.mp4')),
      /probeMedia failed/
    );
  });

  it('editClip trims, reframes to portrait 9:16, grades, and adjusts speed', () => {
    const outPath = path.join(tmpDir, 'edited_clip1.mp4');
    const result = editor.editClip({
      videoPath: clip1Path,
      startTime: 0.2,
      duration: 1.0,
      speed: 1.0,
      colorGrade: 'cinematic',
      caption: 'TEST CAPTION',
      orientation: 'portrait',
      outputPath: outPath,
    });

    assert.equal(fs.existsSync(outPath), true);
    assert.equal(result.width, 1080);
    assert.equal(result.height, 1920);

    const probe = editor.probeMedia(outPath);
    assert.equal(probe.width, 1080);
    assert.equal(probe.height, 1920);
    assert.ok(probe.duration >= 0.8 && probe.duration <= 1.2);
  });

  it('concatClipsWithTransitions joins clips with xfade transition', () => {
    const outPath = path.join(tmpDir, 'concat_xfade.mp4');
    const result = editor.concatClipsWithTransitions({
      clips: [
        { path: clip1Path, duration: 2.0, transition: 'fade', transitionDuration: 0.5 },
        { path: clip2Path, duration: 2.0, transition: 'fade', transitionDuration: 0.5 },
      ],
      outputPath: outPath,
    });

    assert.equal(fs.existsSync(outPath), true);
    assert.equal(result.clipCount, 2);

    const probe = editor.probeMedia(outPath);
    // 2s + 2s - 0.5s transition = 3.5s total duration
    assert.ok(probe.duration >= 3.2 && probe.duration <= 3.8);
  });

  it('editAndAssemble assembles multi-clip video with master audio and music', () => {
    const outPath = path.join(tmpDir, 'master_assembled.mp4');
    const result = editor.editAndAssemble({
      clips: [
        { video_path: clip1Path, start_time: 0, duration: 1.5, color_grade: 'warm', caption: 'PART 1' },
        { video_path: clip2Path, start_time: 0, duration: 1.5, color_grade: 'cool', caption: 'PART 2' },
      ],
      audioPath: voicePath,
      musicPath: musicPath,
      musicVolume: 0.05,
      orientation: 'landscape',
      transition: 'fade',
      transitionDuration: 0.3,
      outputPath: outPath,
    });

    assert.equal(fs.existsSync(outPath), true);
    assert.equal(result.clipCount, 2);
    assert.ok(result.sizeBytes > 5000);

    const probe = editor.probeMedia(outPath);
    assert.equal(probe.width, 1920);
    assert.equal(probe.height, 1080);
    assert.ok(probe.duration > 2.0);
  });

  it('applyOperations handles cut, color, caption, and speed operations', async () => {
    const outPath = path.join(tmpDir, 'ops_assembled.mp4');
    const result = await editor.applyOperations({
      operations: [
        { op: 'cut', clip: 0, start: '00:00.2', duration: 1.2 },
        { op: 'color', clip: 0, grade: 'vintage' },
        { op: 'caption', clip: 0, text: 'VINTAGE SCENE' },
        { op: 'speed', clip: 0, speed: 1.2 },
      ],
      files: [clip1Path],
      outputPath: outPath,
      orientation: 'landscape',
    });

    assert.equal(result.status, 'success');
    assert.equal(result.operationsApplied, 4);
    assert.equal(fs.existsSync(outPath), true);
  });
});

