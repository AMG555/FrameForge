'use strict';
/**
 * VideoRenderer unit tests
 *
 * Only tests pure-logic helpers — no FFmpeg calls on real media.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const { VideoRenderer } = require('./renderer');

describe('VideoRenderer instantiation', () => {
  it('creates an instance with default filesDir', () => {
    const renderer = new VideoRenderer();
    assert.ok(renderer.filesDir);
    assert.equal(typeof renderer.filesDir, 'string');
  });

  it('sets vdir to <filesDir>/video_tmp', () => {
    const base     = path.join(os.tmpdir(), 'renderer-test');
    const renderer = new VideoRenderer({ filesDir: base });
    assert.equal(renderer.vdir, path.join(base, 'video_tmp'));
  });

  it('accepts a custom filesDir', () => {
    const base     = path.join(os.tmpdir(), 'custom-dir');
    const renderer = new VideoRenderer({ filesDir: base });
    assert.equal(renderer.filesDir, base);
  });

  it('exposes a mixer instance', () => {
    const renderer = new VideoRenderer();
    assert.ok(renderer.mixer, 'Expected AudioMixer instance');
    assert.equal(typeof renderer.mixer.mixVideo, 'function');
  });
});

describe('VideoRenderer._captionFilter', () => {
  it('returns empty string when caption is null', () => {
    const renderer = new VideoRenderer();
    assert.equal(renderer._captionFilter(null), '');
  });

  it('returns empty string when caption is empty string', () => {
    const renderer = new VideoRenderer();
    assert.equal(renderer._captionFilter(''), '');
  });

  it('returns empty string when font is not set', () => {
    // Override font to simulate no font found
    const renderer  = new VideoRenderer();
    const savedFont = renderer.font;
    renderer.font   = '';
    assert.equal(renderer._captionFilter('HELLO'), '');
    renderer.font   = savedFont;
  });

  it('returns a non-empty drawtext filter when font exists', () => {
    const renderer = new VideoRenderer();
    if (!renderer.font) return; // skip if no system font available in CI
    const filter   = renderer._captionFilter('TEST CAPTION');
    assert.ok(filter.startsWith('drawtext='), `Expected drawtext filter, got: ${filter.slice(0, 40)}`);
    assert.ok(filter.includes('TEST CAPTION'));
  });

  it('strips special characters that would break FFmpeg drawtext', () => {
    const renderer = new VideoRenderer();
    if (!renderer.font) return;
    const filter   = renderer._captionFilter('Hello: World; Test!');
    // Colons and semicolons must be absent from the text value
    assert.ok(!filter.includes(':World'));
  });

  it('upper-cases caption text', () => {
    const renderer = new VideoRenderer();
    if (!renderer.font) return;
    const filter   = renderer._captionFilter('lower case');
    assert.ok(filter.includes('LOWER CASE'));
  });

  it('truncates caption to 45 characters', () => {
    const renderer  = new VideoRenderer();
    if (!renderer.font) return;
    const longCap   = 'A'.repeat(60);
    const filter    = renderer._captionFilter(longCap);
    // The text in the filter should be at most 45 chars
    const textMatch = filter.match(/text='([^']+)'/);
    if (textMatch) {
      assert.ok(textMatch[1].length <= 45, `Caption not truncated: length=${textMatch[1].length}`);
    }
  });

  it('preserves Malayalam Unicode characters and enables text_shaping=1', () => {
    const renderer = new VideoRenderer();
    if (!renderer.font) return;
    const filter = renderer._captionFilter('ഫ്രെയിംഫോർജ്');
    assert.ok(filter.includes('text_shaping=1'), 'Expected text_shaping=1 for Indic text');
    assert.ok(filter.includes('ഫ്രെയിംഫോർജ്'), 'Expected Malayalam Unicode text preserved in filter');
  });
});

describe('VideoRenderer._discoverScenes', () => {
  // _hasValidStreams calls ffprobe on real files; stub it to always return true
  // for _discoverScenes tests so they can focus on size-filter and ordering logic
  // without requiring real MP4 media files in the test suite.
  function makeRenderer(filesDir) {
    const r = new VideoRenderer({ filesDir });
    r._hasValidStreams = () => true; // stub: test logic only, no ffprobe calls
    return r;
  }

  it('returns empty array when vdir does not exist', () => {
    const renderer = new VideoRenderer({ filesDir: '/tmp/__nonexistent_vrenderer_dir' });
    assert.deepEqual(renderer._discoverScenes(null), []);
  });

  it('returns discovered scene files in scene order', async () => {
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-renderer-'));
    const vDir    = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);

    // Create fake scene files large enough to pass the >10 KB size filter
    const big = Buffer.alloc(60 * 1024);
    fs.writeFileSync(path.join(vDir, 'scene_1_out.mp4'), big);
    fs.writeFileSync(path.join(vDir, 'scene_3_out.mp4'), big);
    fs.writeFileSync(path.join(vDir, 'scene_2_out.mp4'), big);
    // Also create a file that should NOT match the pattern
    fs.writeFileSync(path.join(vDir, 'concat_main.txt'), 'dummy');

    const renderer = makeRenderer(tmpDir);
    const scenes   = renderer._discoverScenes(null);

    assert.equal(scenes.length, 3);
    // Verify numeric order: scene_1, scene_2, scene_3
    const names = scenes.map(f => path.basename(f));
    assert.equal(names[0], 'scene_1_out.mp4');
    assert.equal(names[1], 'scene_2_out.mp4');
    assert.equal(names[2], 'scene_3_out.mp4');

    // Clean up
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('filters out small scene files (< 10 KB)', () => {
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-renderer-small-'));
    const vDir    = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);

    // One big file (60 KB), one tiny file (100 bytes — below 10 KB threshold)
    fs.writeFileSync(path.join(vDir, 'scene_1_out.mp4'), Buffer.alloc(60 * 1024));
    fs.writeFileSync(path.join(vDir, 'scene_2_out.mp4'), Buffer.alloc(100));

    const renderer = makeRenderer(tmpDir);
    const scenes   = renderer._discoverScenes(null);
    assert.equal(scenes.length, 1);
    assert.ok(scenes[0].endsWith('scene_1_out.mp4'));

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('excludes scene files with invalid or missing streams', () => {
    // _hasValidStreams is NOT stubbed here — we verify the real exclusion behaviour.
    // Buffer.alloc dummy files are not valid MP4s so ffprobe returns nothing → excluded.
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-renderer-streams-'));
    const vDir    = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);

    fs.writeFileSync(path.join(vDir, 'scene_1_out.mp4'), Buffer.alloc(60 * 1024));
    fs.writeFileSync(path.join(vDir, 'scene_2_out.mp4'), Buffer.alloc(60 * 1024));

    const renderer = new VideoRenderer({ filesDir: tmpDir }); // real _hasValidStreams
    const scenes   = renderer._discoverScenes(null);
    // Both files are dummy buffers — ffprobe finds no streams → both excluded
    assert.equal(scenes.length, 0, 'Dummy files with no valid streams must be excluded from concat');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('respects sceneCount cap', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-renderer-cap-'));
    const vDir   = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);
    const big    = Buffer.alloc(60 * 1024);
    for (let i = 1; i <= 8; i++) {
      fs.writeFileSync(path.join(vDir, `scene_${i}_out.mp4`), big);
    }

    const renderer = makeRenderer(tmpDir);
    const scenes   = renderer._discoverScenes(5);
    assert.equal(scenes.length, 5);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('VideoRenderer._findRandomMusicFile', () => {
  it('returns null when music directory does not exist', () => {
    const renderer = new VideoRenderer({ filesDir: '/tmp/__nonexistent_music_vrenderer' });
    assert.equal(renderer._findRandomMusicFile(), null);
  });

  it('returns null when music directory has no audio files', () => {
    const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-music-'));
    const musicDir = path.join(tmpDir, 'music');
    fs.mkdirSync(musicDir);
    // Write a non-audio file
    fs.writeFileSync(path.join(musicDir, 'readme.txt'), 'no music here');

    const renderer = new VideoRenderer({ filesDir: tmpDir });
    assert.equal(renderer._findRandomMusicFile(), null);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns a music file path when a valid large-enough file exists', () => {
    const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-music-valid-'));
    const musicDir = path.join(tmpDir, 'music');
    fs.mkdirSync(musicDir);
    // Big enough file (> 50 KB)
    fs.writeFileSync(path.join(musicDir, 'bgm.mp3'), Buffer.alloc(60 * 1024));

    const renderer = new VideoRenderer({ filesDir: tmpDir });
    const music    = renderer._findRandomMusicFile();
    assert.ok(music !== null);
    assert.ok(music.endsWith('bgm.mp3'));

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('VideoRenderer.renderScene — error handling', () => {
  it('throws when voicePath does not exist on disk', () => {
    // Fix 1: voicePath is validated before calling ffprobe to prevent NaN duration.
    // A missing voice file must throw immediately rather than silently passing NaN to ffmpeg.
    const renderer = new VideoRenderer({ filesDir: os.tmpdir() });
    assert.throws(
      () => renderer.renderScene({ sceneIndex: 0, voicePath: '/tmp/__fake_voice.m4a' }),
      (err) => err instanceof Error && /voicePath is missing or does not exist/.test(err.message)
    );
  });

  it('throws when voicePath is null', () => {
    const renderer = new VideoRenderer({ filesDir: os.tmpdir() });
    assert.throws(
      () => renderer.renderScene({ sceneIndex: 0, voicePath: null }),
      (err) => err instanceof Error && /voicePath is missing or does not exist/.test(err.message)
    );
  });

  it('throws on no-image fallback when voicePath exists but ffmpeg fails', () => {
    // When voicePath exists but is not a real audio file, ffmpeg exits non-zero.
    // We use the test file itself as a stand-in "voice file" so existence check passes.
    const renderer = new VideoRenderer({ filesDir: os.tmpdir() });
    assert.throws(
      () => renderer.renderScene({ sceneIndex: 0, voicePath: __filename }), // __filename always exists
      (err) => err instanceof Error && /no-image fallback/.test(err.message)
    );
  });
});

describe('VideoRenderer.assembleMain — error handling', () => {
  it('throws when zero scene files are available', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-assemble-'));
    const vDir   = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);
    // No scenes at all — should throw

    const renderer = new VideoRenderer({ filesDir: tmpDir });
    assert.throws(
      () => renderer.assembleMain({ productionId: 'test-001', withMusic: false }),
      (err) => err instanceof Error && /Too few scenes/.test(err.message)
    );

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('does not throw with 2 scene files (short-form content)', () => {
    // assembleMain must accept fewer than 5 scenes for demos and short-form content.
    // It will fail later at FFmpeg concat (no real media), but the scene-count guard
    // itself must not block short-form content.
    // _hasValidStreams is stubbed so the dummy buffer files pass the stream check —
    // the goal here is to verify the scene-count guard, not stream-validity logic.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-assemble-2-'));
    const vDir   = path.join(tmpDir, 'video_tmp');
    fs.mkdirSync(vDir);
    const big = Buffer.alloc(60 * 1024);
    fs.writeFileSync(path.join(vDir, 'scene_1_out.mp4'), big);
    fs.writeFileSync(path.join(vDir, 'scene_2_out.mp4'), big);

    const renderer = new VideoRenderer({ filesDir: tmpDir });
    renderer._hasValidStreams = () => true; // stub: test scene-count guard only

    // Should NOT throw "Too few scenes" — may throw FFmpeg error instead
    try {
      renderer.assembleMain({ productionId: 'test-short-001', withMusic: false });
    } catch (err) {
      assert.ok(
        !/Too few scenes/.test(err.message),
        `Expected no "Too few scenes" error, got: ${err.message}`
      );
    }

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('VideoRenderer._getAudioDuration', () => {
  it('returns 3 (fallback) when audioPath is null', () => {
    const renderer = new VideoRenderer();
    assert.equal(renderer._getAudioDuration(null), 3);
  });

  it('returns 3 (fallback) when audioPath is undefined', () => {
    const renderer = new VideoRenderer();
    assert.equal(renderer._getAudioDuration(undefined), 3);
  });

  it('returns 3 (fallback) for a non-existent file path', () => {
    const renderer = new VideoRenderer();
    const dur = renderer._getAudioDuration('/tmp/__nonexistent_audio_renderer_test.m4a');
    assert.equal(dur, 3);
  });

  it('returns 3 (fallback) for a dummy non-audio buffer file', () => {
    const tmpFile = path.join(os.tmpdir(), '__audio_dur_dummy_renderer.m4a');
    fs.writeFileSync(tmpFile, Buffer.alloc(512));
    try {
      const renderer = new VideoRenderer();
      const dur = renderer._getAudioDuration(tmpFile);
      assert.equal(dur, 3, 'Dummy file with no valid audio should return fallback 3s');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('always returns a finite number, never NaN', () => {
    const renderer = new VideoRenderer();
    const cases = [null, undefined, '', '/nonexistent/path.m4a'];
    for (const c of cases) {
      const dur = renderer._getAudioDuration(c);
      assert.ok(Number.isFinite(dur), `Expected finite number for input ${JSON.stringify(c)}, got ${dur}`);
    }
  });
});
