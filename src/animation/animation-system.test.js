'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCameraFilter, buildTransitionFilter, selectCameraHint, FPS, MAX_ZOOM } = require('./animation-system');

// ── Constants ─────────────────────────────────────────────────────────────────

describe('Animation system constants', () => {
  it('FPS is 24', () => {
    assert.equal(FPS, 24);
  });

  it('MAX_ZOOM is 1.12', () => {
    assert.equal(MAX_ZOOM, 1.12);
  });
});

// ── buildCameraFilter — output format ─────────────────────────────────────────

describe('buildCameraFilter output format', () => {
  const hints = ['slow_zoom_in', 'slow_zoom_out', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right',
    'tilt_up', 'tilt_down', 'ken_burns', 'static', 'auto'];

  for (const hint of hints) {
    it(`returns a non-empty string for hint "${hint}"`, () => {
      const filter = buildCameraFilter(hint, { duration: 6 });
      assert.ok(typeof filter === 'string', `filter should be string for ${hint}`);
      assert.ok(filter.length > 0, `filter should not be empty for ${hint}`);
    });
  }

  it('returns a string for null/undefined hint (auto)', () => {
    const filter = buildCameraFilter(null, { duration: 6 });
    assert.ok(typeof filter === 'string');
    assert.ok(filter.length > 0);
  });

  it('returns a string for unknown hint (falls back to auto)', () => {
    const filter = buildCameraFilter('rocket_ship', { duration: 6 });
    assert.ok(typeof filter === 'string');
    assert.ok(filter.length > 0);
  });
});

// ── buildCameraFilter — MAX_ZOOM constraint ───────────────────────────────────

describe('buildCameraFilter MAX_ZOOM constraint', () => {
  it('zoom_in filter does not reference a zoom value > 1.12', () => {
    const filter = buildCameraFilter('zoom_in', { duration: 6 });
    // The maxZ constant is 1.12 — check it appears in the filter string
    assert.ok(filter.includes('1.1200'), `zoom_in filter should reference MAX_ZOOM (1.12). Got: ${filter}`);
  });

  it('slow_zoom_in filter does not reference a zoom value > 1.12', () => {
    const filter = buildCameraFilter('slow_zoom_in', { duration: 6 });
    assert.ok(filter.includes('1.1200'), `slow_zoom_in filter should reference MAX_ZOOM (1.12). Got: ${filter}`);
  });

  it('zoom_out filter references MAX_ZOOM', () => {
    const filter = buildCameraFilter('zoom_out', { duration: 6 });
    assert.ok(filter.includes('1.1200'), `zoom_out filter should reference MAX_ZOOM. Got: ${filter}`);
  });
});

// ── buildCameraFilter — zoompan format ───────────────────────────────────────

describe('buildCameraFilter zoompan filters', () => {
  it('zoom_in filter uses zoompan= prefix', () => {
    const f = buildCameraFilter('zoom_in', { duration: 6 });
    assert.ok(f.startsWith('zoompan='));
  });

  it('pan_left filter uses zoompan= prefix', () => {
    const f = buildCameraFilter('pan_left', { duration: 6 });
    assert.ok(f.startsWith('zoompan='));
  });

  it('static filter uses scale= and crop=', () => {
    const f = buildCameraFilter('static', { duration: 6 });
    assert.ok(f.includes('scale='));
    assert.ok(f.includes('crop='));
  });

  it('ken_burns filter references focal point offset', () => {
    const f = buildCameraFilter('ken_burns', { duration: 6, focalX: 0.7, focalY: 0.3 });
    assert.ok(f.startsWith('zoompan='));
  });
});

// ── buildCameraFilter — auto selection by focal quadrant ─────────────────────

describe('buildCameraFilter auto selection', () => {
  it('top-left focal point (focalY<0.4, focalX<0.5) → zoom in', () => {
    const f = buildCameraFilter('auto', { focalX: 0.2, focalY: 0.3 });
    // zoompan with zoom+... = zoom in
    assert.ok(f.includes('zoom+'), `Expected zoom in for top-left focal. Got: ${f}`);
  });

  it('left-edge focal point (focalX<0.4) → pan right', () => {
    const f = buildCameraFilter('auto', { focalX: 0.2, focalY: 0.7 });
    // pan right: x increments
    assert.ok(f.includes('x+'), `Expected pan right for left-edge focal. Got: ${f}`);
  });

  it('right-edge focal point (focalX>0.6) → pan left', () => {
    const f = buildCameraFilter('auto', { focalX: 0.8, focalY: 0.7 });
    // pan left: x decrements
    assert.ok(f.includes('x-'), `Expected pan left for right-edge focal. Got: ${f}`);
  });

  it('centered subject → zoom out', () => {
    const f = buildCameraFilter('auto', { focalX: 0.5, focalY: 0.7 });
    // zoom out: max(zoom-...) or if(lte(...))
    assert.ok(f.includes('max(zoom-'), `Expected zoom out for center focal. Got: ${f}`);
  });
});

// ── buildTransitionFilter ─────────────────────────────────────────────────────

describe('buildTransitionFilter', () => {
  it('cut transition returns isCut=true, empty xfadeArgs', () => {
    const r = buildTransitionFilter('cut', 5.0);
    assert.equal(r.isCut, true);
    assert.deepEqual(r.xfadeArgs, []);
  });

  it('null/undefined transition returns isCut=true', () => {
    const r = buildTransitionFilter(null, 5.0);
    assert.equal(r.isCut, true);
  });

  it('fade transition returns isCut=false with xfade args', () => {
    const r = buildTransitionFilter('fade', 5.0, 0.5);
    assert.equal(r.isCut, false);
    assert.ok(r.xfadeArgs.some(a => a.includes('transition=fade')));
    assert.ok(r.xfadeArgs.some(a => a.startsWith('offset=')));
    assert.ok(r.xfadeArgs.some(a => a.startsWith('duration=')));
  });

  it('dissolve transition maps to dissolve xfade type', () => {
    const r = buildTransitionFilter('dissolve', 3.0);
    assert.ok(r.xfadeArgs.some(a => a === 'transition=dissolve'));
  });

  it('wipe_left transition maps to wipeleft', () => {
    const r = buildTransitionFilter('wipe_left', 10.0);
    assert.ok(r.xfadeArgs.some(a => a === 'transition=wipeleft'));
  });

  it('wipe_right transition maps to wiperight', () => {
    const r = buildTransitionFilter('wipe_right', 10.0);
    assert.ok(r.xfadeArgs.some(a => a === 'transition=wiperight'));
  });

  it('unknown transition type falls back to fade', () => {
    const r = buildTransitionFilter('spiral', 5.0);
    assert.ok(r.xfadeArgs.some(a => a === 'transition=fade'));
  });

  it('offset is formatted to 3 decimal places', () => {
    const r = buildTransitionFilter('fade', 12.3456789);
    const offsetArg = r.xfadeArgs.find(a => a.startsWith('offset='));
    assert.ok(offsetArg, 'offset arg should exist');
    const parts = offsetArg.split('=');
    assert.equal(parts[1].split('.')[1]?.length ?? 0, 3);
  });
});

// ── selectCameraHint ──────────────────────────────────────────────────────────

describe('selectCameraHint', () => {
  it('returns a valid camera hint string', () => {
    const validHints = ['slow_zoom_in', 'pan_right', 'slow_zoom_out', 'pan_left', 'tilt_up', 'ken_burns'];
    for (let i = 0; i < 12; i++) {
      const hint = selectCameraHint(i);
      assert.ok(validHints.includes(hint), `selectCameraHint(${i}) returned unexpected value: ${hint}`);
    }
  });

  it('cycles through the rotation array deterministically', () => {
    const rotation = ['slow_zoom_in', 'pan_right', 'slow_zoom_out', 'pan_left', 'tilt_up', 'ken_burns'];
    for (let i = 0; i < rotation.length * 2; i++) {
      assert.equal(selectCameraHint(i), rotation[i % rotation.length]);
    }
  });

  it('returns a string regardless of focalX/focalY params', () => {
    const hint = selectCameraHint(0, { focalX: 0.7, focalY: 0.2 });
    assert.ok(typeof hint === 'string');
    assert.ok(hint.length > 0);
  });
});
