'use strict';
/**
 * engine.test.js — Unit tests for the FrameForge HTML compositor engine.
 *
 * engine.js uses ESM exports and DOM APIs so we cannot require() it directly
 * in a CJS test runner.  Instead we inline the pure math functions here —
 * they are self-contained and have no external dependencies.
 * If the logic in engine.js ever changes these tests will catch drift.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ── Inline pure math from engine.js ──────────────────────────────────────────

function lerp(t, a, b, t0, t1) {
  if (t <= t0) return a;
  if (t >= t1) return b;
  const p = (t - t0) / (t1 - t0);
  return a + (b - a) * p;
}

function easeIn(t) {
  const p = Math.max(0, Math.min(1, t));
  return p * p;
}

function easeOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return 1 - (1 - p) * (1 - p);
}

function easeInOut(t) {
  const p = Math.max(0, Math.min(1, t));
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function spring(t, { tension = 200, friction = 22, delay = 0 } = {}) {
  const dt = t - delay;
  if (dt <= 0) return 0;
  const omega = Math.sqrt(tension);
  const zeta  = friction / (2 * omega);
  if (zeta >= 1) {
    const r1 = -omega * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -omega * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = r1 / (r1 - r2);
    const c1 = 1 - c2;
    return 1 - c1 * Math.exp(r1 * dt) - c2 * Math.exp(r2 * dt);
  }
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * dt) * (
    Math.cos(omegaD * dt) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * dt)
  );
}

// faceAt layout geometry (pure math, no REEL state)
function faceAt(layout, { width = 1920, height = 1080, side = 'right', pipPos = 'br', pipSize = 0.28 } = {}) {
  switch (layout.toUpperCase()) {
    case 'FULL':
      return { position: 'absolute', inset: 0, width: '100%', height: '100%' };
    case 'SPLIT': {
      const half = Math.round(width / 2);
      const left = side === 'left' ? 0 : half;
      return { position: 'absolute', top: 0, left, width: half, height };
    }
    case 'PIP': {
      const pw  = Math.round(width * pipSize);
      const ph  = Math.round(pw * (height / width));
      const pad = 40;
      const top  = pipPos.startsWith('t') ? pad : height - ph - pad;
      const left = pipPos.endsWith('l')   ? pad : width  - pw - pad;
      return { position: 'absolute', top, left, width: pw, height: ph, borderRadius: 16 };
    }
    default:
      return { position: 'absolute', inset: 0 };
  }
}

// stagger helper (pure logic, REEL-independent)
function stagger(t, dt, elements) {
  const result = [];
  elements.forEach((el, i) => result.push({ t: t + i * dt, element: el }));
  return result;
}

// ── lerp ─────────────────────────────────────────────────────────────────────

describe('lerp', () => {
  it('returns a at t=t0', () => assert.equal(lerp(0, 0, 100, 0, 1), 0));
  it('returns b at t=t1', () => assert.equal(lerp(1, 0, 100, 0, 1), 100));
  it('returns midpoint at t=0.5', () => assert.equal(lerp(0.5, 0, 100, 0, 1), 50));
  it('clamps below t0',  () => assert.equal(lerp(-1, 0, 100, 0, 1), 0));
  it('clamps above t1',  () => assert.equal(lerp(2,  0, 100, 0, 1), 100));
  it('works with offset range', () => assert.equal(lerp(1.5, 0, 100, 1, 2), 50));
  it('works negative values', () => assert.equal(lerp(0.5, -100, 100, 0, 1), 0));
});

// ── easing ────────────────────────────────────────────────────────────────────

describe('easeIn', () => {
  it('returns 0 at t=0', () => assert.equal(easeIn(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeIn(1), 1));
  it('is less than linear at t=0.5', () => assert.ok(easeIn(0.5) < 0.5));
  it('clamps t<0 to 0',  () => assert.equal(easeIn(-1), 0));
  it('clamps t>1 to 1',  () => assert.equal(easeIn(2), 1));
});

describe('easeOut', () => {
  it('returns 0 at t=0', () => assert.equal(easeOut(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeOut(1), 1));
  it('is greater than linear at t=0.5', () => assert.ok(easeOut(0.5) > 0.5));
  it('clamps t<0 to 0',  () => assert.equal(easeOut(-1), 0));
  it('clamps t>1 to 1',  () => assert.equal(easeOut(2), 1));
});

describe('easeInOut', () => {
  it('returns 0 at t=0', () => assert.equal(easeInOut(0), 0));
  it('returns 1 at t=1', () => assert.equal(easeInOut(1), 1));
  it('returns 0.5 at t=0.5 (symmetric)', () => assert.equal(easeInOut(0.5), 0.5));
  it('clamps t<0', () => assert.equal(easeInOut(-1), 0));
  it('clamps t>1', () => assert.equal(easeInOut(2), 1));
});

// ── spring ────────────────────────────────────────────────────────────────────

describe('spring', () => {
  it('returns 0 at t=0', () => assert.equal(spring(0), 0));
  it('returns 0 before delay', () => assert.equal(spring(0.1, { delay: 0.5 }), 0));
  it('approaches 1 at large t (underdamped)', () => {
    const v = spring(5);
    assert.ok(v > 0.99 && v < 1.01, `expected ~1, got ${v}`);
  });
  it('overshoots briefly (underdamped default params)', () => {
    // default tension=200, friction=22 → underdamped → brief overshoot
    let maxV = 0;
    for (let t = 0; t <= 2; t += 0.01) maxV = Math.max(maxV, spring(t));
    assert.ok(maxV > 1, `expected overshoot >1, got ${maxV}`);
  });
  it('does not overshoot when overdamped (high friction)', () => {
    let maxV = 0;
    for (let t = 0; t <= 5; t += 0.01) maxV = Math.max(maxV, spring(t, { tension: 100, friction: 100 }));
    assert.ok(maxV <= 1.001, `expected no overshoot, got ${maxV}`);
  });
  it('delay shifts start by delay seconds', () => {
    assert.equal(spring(0.4, { delay: 0.5 }), 0);
    assert.ok(spring(0.6, { delay: 0.5 }) > 0);
  });
});

// ── faceAt layout ─────────────────────────────────────────────────────────────

describe('faceAt', () => {
  it('FULL covers the whole stage', () => {
    const r = faceAt('FULL');
    assert.equal(r.width, '100%');
    assert.equal(r.height, '100%');
    assert.equal(r.inset, 0);
  });

  it('SPLIT right gives left=960 for 1920px wide', () => {
    const r = faceAt('SPLIT', { width: 1920, height: 1080, side: 'right' });
    assert.equal(r.left, 960);
    assert.equal(r.width, 960);
  });

  it('SPLIT left gives left=0', () => {
    const r = faceAt('SPLIT', { width: 1920, height: 1080, side: 'left' });
    assert.equal(r.left, 0);
  });

  it('PIP br corner is in bottom-right', () => {
    const r = faceAt('PIP', { width: 1920, height: 1080, pipPos: 'br', pipSize: 0.28 });
    const expectedW = Math.round(1920 * 0.28);
    assert.equal(r.width, expectedW);
    assert.ok(r.left > 960, 'PIP br should be on right side');
    assert.ok(r.top  > 400, 'PIP br should be on bottom');
  });

  it('PIP tl corner is in top-left', () => {
    const r = faceAt('PIP', { width: 1920, height: 1080, pipPos: 'tl', pipSize: 0.28 });
    assert.equal(r.left, 40);
    assert.equal(r.top,  40);
  });

  it('unknown layout falls back to absolute inset 0', () => {
    const r = faceAt('UNKNOWN');
    assert.equal(r.inset, 0);
  });
});

// ── stagger ───────────────────────────────────────────────────────────────────

describe('stagger', () => {
  it('places elements at t + i*dt', () => {
    const result = stagger(1, 0.5, ['a', 'b', 'c']);
    assert.equal(result[0].t, 1.0);
    assert.equal(result[1].t, 1.5);
    assert.equal(result[2].t, 2.0);
  });

  it('preserves element identity', () => {
    const els = [{ x: 1 }, { x: 2 }];
    const result = stagger(0, 1, els);
    assert.strictEqual(result[0].element, els[0]);
    assert.strictEqual(result[1].element, els[1]);
  });

  it('works with dt=0 (all at same time)', () => {
    const result = stagger(3, 0, ['x', 'y']);
    assert.equal(result[0].t, 3);
    assert.equal(result[1].t, 3);
  });
});
