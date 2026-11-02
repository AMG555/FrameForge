'use strict';
/**
 * ShortsExtractor unit tests
 *
 * FFmpeg/ffprobe calls are only triggered on real video files.
 * We test the pure-logic helpers directly.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { ShortsExtractor } = require('./extractor');

describe('ShortsExtractor instantiation', () => {
  it('creates an instance with default filesDir', () => {
    const ext = new ShortsExtractor();
    assert.ok(ext.filesDir);
    assert.equal(typeof ext.filesDir, 'string');
  });

  it('accepts a custom filesDir', () => {
    const ext = new ShortsExtractor({ filesDir: '/tmp/test' });
    assert.equal(ext.filesDir, '/tmp/test');
  });
});

describe('ShortsExtractor._focalToFFmpegX', () => {
  it('center focal produces center offset', () => {
    const ext = new ShortsExtractor();
    // INPUT_W=1920, CROP_W=608 → center = (1920-608)/2 = 656
    const result = ext._focalToFFmpegX(0.5);
    assert.ok(result >= 654 && result <= 658, `expected ~656, got ${result}`);
  });

  it('clamps to 0 for left edge (focalX=0)', () => {
    const ext = new ShortsExtractor();
    const result = ext._focalToFFmpegX(0);
    assert.equal(result, 0);
  });

  it('clamps to max for right edge (focalX=1)', () => {
    const ext = new ShortsExtractor();
    // max = 1920 - 608 = 1312; force even → 1312
    const result = ext._focalToFFmpegX(1);
    assert.equal(result, 1312);
  });

  it('always returns an even number (libx264 requirement)', () => {
    const ext = new ShortsExtractor();
    for (const focalX of [0, 0.1, 0.33, 0.5, 0.7, 0.9, 1.0]) {
      const result = ext._focalToFFmpegX(focalX);
      assert.equal(result % 2, 0, `_focalToFFmpegX(${focalX}) = ${result} is odd`);
    }
  });

  it('never produces a negative offset', () => {
    const ext = new ShortsExtractor();
    const result = ext._focalToFFmpegX(-0.5);
    assert.equal(result, 0);
  });
});

describe('ShortsExtractor._focalToFFmpegY', () => {
  it('always returns 0 (retain full height for portrait reformat)', () => {
    const ext = new ShortsExtractor();
    assert.equal(ext._focalToFFmpegY(), 0);
  });
});

describe('ShortsExtractor._defaultFocalY', () => {
  it('returns 0.35 when no scenes provided', () => {
    const ext = new ShortsExtractor();
    assert.equal(ext._defaultFocalY([]), 0.35);
  });

  it('returns 0.35 when scenes have no focal_point', () => {
    const ext    = new ShortsExtractor();
    const scenes = [{ scene_id: 1 }, { scene_id: 2 }];
    assert.equal(ext._defaultFocalY(scenes), 0.35);
  });

  it('returns scene focal_point.y when y <= 0.5', () => {
    const ext    = new ShortsExtractor();
    const scenes = [{ focal_point: { x: 0.5, y: 0.3 } }];
    assert.equal(ext._defaultFocalY(scenes), 0.3);
  });

  it('skips focal_point.y when y > 0.5 and falls back to 0.35', () => {
    const ext    = new ShortsExtractor();
    const scenes = [{ focal_point: { x: 0.5, y: 0.7 } }];
    assert.equal(ext._defaultFocalY(scenes), 0.35);
  });
});

describe('ShortsExtractor._focalPointForSegment', () => {
  it('returns x from coveredScenes focal_point when present', () => {
    const ext     = new ShortsExtractor();
    const segment = { coveredScenes: [{ focal_point: { x: 0.3, y: 0.4 } }] };
    const result  = ext._focalPointForSegment(segment, []);
    assert.equal(result.x, 0.3);
    assert.equal(result.y, 0.4);
  });

  it('falls back to x=0.5 when no focal_point on covered scenes', () => {
    const ext     = new ShortsExtractor();
    const segment = { coveredScenes: [{ scene_id: 1 }] };
    const result  = ext._focalPointForSegment(segment, []);
    assert.equal(result.x, 0.5);
  });

  it('defaults y to 0.35 when focal_point.y is absent', () => {
    const ext     = new ShortsExtractor();
    const segment = { coveredScenes: [{ focal_point: { x: 0.4 } }] };
    const result  = ext._focalPointForSegment(segment, []);
    assert.equal(result.y, 0.35);
  });
});

describe('ShortsExtractor._scoreSegment', () => {
  it('returns a number between 0 and 1', () => {
    const ext       = new ShortsExtractor();
    const candidate = { start: 60, end: 110, duration: 50, coveredScenes: [{}, {}, {}] };
    const score     = ext._scoreSegment(candidate);
    assert.ok(score >= 0 && score <= 1, `score ${score} out of [0,1]`);
  });

  it('scores segment in sweet-spot duration (45-70s) higher than short segment', () => {
    const ext       = new ShortsExtractor();
    const sweet     = { start: 60, end: 120, duration: 60, coveredScenes: [{}, {}, {}] };
    const notSweet  = { start: 60,  end: 91, duration: 31, coveredScenes: [{}, {}, {}] };
    assert.ok(ext._scoreSegment(sweet) >= ext._scoreSegment(notSweet));
  });
});

describe('ShortsExtractor._selectSegments', () => {
  it('returns empty array for empty candidates', () => {
    const ext = new ShortsExtractor();
    assert.deepEqual(ext._selectSegments([]), []);
  });

  it('selects at most 5 non-overlapping segments', () => {
    const ext = new ShortsExtractor();
    // Build 10 distinct non-overlapping candidates (each 60s apart)
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      start: i * 100,
      end:   i * 100 + 60,
      duration: 60,
      coveredScenes: [],
      score: 0.8 - i * 0.01,
    }));
    const selected = ext._selectSegments(candidates);
    assert.ok(selected.length <= 5, `expected ≤5, got ${selected.length}`);
  });

  it('selected segments do not overlap', () => {
    const ext        = new ShortsExtractor();
    const candidates = Array.from({ length: 8 }, (_, i) => ({
      start: i * 80,
      end:   i * 80 + 60,
      duration: 60,
      coveredScenes: [],
      score: 1 - i * 0.1,
    }));
    const selected = ext._selectSegments(candidates);
    for (let i = 0; i < selected.length - 1; i++) {
      assert.ok(
        selected[i].end <= selected[i + 1].start,
        `Segments overlap: [${selected[i].start},${selected[i].end}] and [${selected[i+1].start},${selected[i+1].end}]`
      );
    }
  });
});

describe('ShortsExtractor._silenceToBoundaries', () => {
  it('always includes 0 and totalDuration', () => {
    const ext       = new ShortsExtractor();
    const silences  = [{ start: 10, end: 12 }, { start: 50, end: 52 }];
    const bounds    = ext._silenceToBoundaries(silences, 120);
    assert.ok(bounds.includes(0));
    assert.ok(bounds.includes(120));
  });

  it('returns sorted array', () => {
    const ext      = new ShortsExtractor();
    const silences = [{ start: 50, end: 52 }, { start: 10, end: 12 }];
    const bounds   = ext._silenceToBoundaries(silences, 100);
    for (let i = 1; i < bounds.length; i++) {
      assert.ok(bounds[i] >= bounds[i - 1], 'boundaries not sorted');
    }
  });

  it('deduplicates identical timestamps', () => {
    const ext      = new ShortsExtractor();
    const silences = [{ start: 10, end: 10 }];
    const bounds   = ext._silenceToBoundaries(silences, 100);
    const unique   = new Set(bounds);
    assert.equal(unique.size, bounds.length, 'boundaries contain duplicates');
  });
});

describe('ShortsExtractor.extractCandidates — error on too-short video', () => {
  it('throws when ffprobe reports 0 duration', async () => {
    const ext = new ShortsExtractor({ filesDir: '/tmp' });
    // _getDuration returns 0 for a non-existent file
    assert.throws(
      () => ext.extractCandidates('/tmp/__nonexistent_shorts_test.mp4'),
      (err) => err instanceof Error && /too short/i.test(err.message)
    );
  });
});
